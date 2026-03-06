"""
PDF to Image converter implementation.
"""

from typing import List, Dict
from fastapi import UploadFile, HTTPException
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
from PIL import Image
import io
import base64

from .base import BaseConverter


class PdfToImageConverter(BaseConverter):
    """
    Converter for extracting images from PDF files.

    Uses PyMuPDF (fitz) to extract embedded images from PDF pages.
    """

    def __init__(self, max_file_size: int = 50 * 1024 * 1024):
        """
        Initialize the PDF to Image converter.

        Args:
            max_file_size: Maximum size per file in bytes (default: 50MB)
        """
        super().__init__()
        self.max_file_size = max_file_size

    def _validate_pdf(self, file_content: bytes, filename: str) -> bool:
        """
        Validate if the uploaded file is a valid PDF.

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            True if valid PDF, False otherwise
        """
        try:
            # Try to open as PDF
            pdf_doc = fitz.open(stream=file_content, filetype="pdf")
            pdf_doc.close()
            return True
        except Exception as e:
            self.logger.warning(f"Invalid PDF file {filename}: {str(e)}")
            return False

    async def validate(self, files: List[UploadFile]) -> List[bytes]:
        """
        Validate uploaded PDF file.

        Args:
            files: List of uploaded files (should be single PDF)

        Returns:
            List with single PDF file content

        Raises:
            HTTPException: If validation fails
        """
        if not files:
            raise HTTPException(status_code=400, detail="No file provided")

        if len(files) > 1:
            raise HTTPException(
                status_code=400, detail="Please upload only one PDF file"
            )

        file = files[0]
        self.logger.info(f"Validating PDF file: {file.filename}")

        # Read file content
        file_content = await file.read()

        # Check file size
        if len(file_content) > self.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum size of {self.max_file_size // (1024 * 1024)}MB",
            )

        # Validate PDF
        if not self._validate_pdf(file_content, file.filename):
            raise HTTPException(
                status_code=400, detail=f"File {file.filename} is not a valid PDF"
            )

        self.logger.info(f"PDF validation successful: {file.filename}")
        return [file_content]

    async def convert(self, file_contents: List[bytes]) -> bytes:
        """
        Extract images from PDF.

        This method extracts images but returns them as JSON data
        instead of converting to a single file.

        Args:
            file_contents: List with single PDF file content

        Returns:
            JSON-encoded data with extracted images (not used directly)

        Raises:
            HTTPException: If extraction fails
        """
        # This method is not used for PDF to Image
        # We override get_response instead
        return file_contents[0]

    def extract_images(self, pdf_content: bytes) -> List[Dict]:
        """
        Extract all images from PDF pages.

        Args:
            pdf_content: PDF file content as bytes

        Returns:
            List of dicts with image data and metadata
        """
        try:
            pdf_doc = fitz.open(stream=pdf_content, filetype="pdf")
            images = []

            self.logger.info(f"Extracting images from PDF ({pdf_doc.page_count} pages)")

            for page_num in range(pdf_doc.page_count):
                page = pdf_doc[page_num]
                image_list = page.get_images()

                for img_index, img in enumerate(image_list):
                    xref = img[0]  # XREF number

                    # Extract image
                    base_image = pdf_doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]

                    # Convert to base64 for JSON transmission
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

                    # Get image dimensions
                    image_pil = Image.open(io.BytesIO(image_bytes))
                    width, height = image_pil.size

                    images.append(
                        {
                            "id": len(images),
                            "page": page_num + 1,
                            "format": image_ext,
                            "width": width,
                            "height": height,
                            "data": image_base64,
                            "size": len(image_bytes),
                        }
                    )

                    self.logger.info(
                        f"Extracted image {len(images)}: "
                        f"page {page_num + 1}, {width}x{height}, {image_ext}"
                    )

            pdf_doc.close()

            self.logger.info(f"Successfully extracted {len(images)} images")
            return images

        except Exception as e:
            self.logger.error(f"Image extraction failed: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to extract images from PDF: {str(e)}"
            )

    def get_response(self, converted_data: bytes, filename: str = None) -> JSONResponse:
        """
        Create JSON response with extracted images.

        Args:
            converted_data: PDF file bytes
            filename: Not used

        Returns:
            JSONResponse with image list
        """
        images = self.extract_images(converted_data)

        return JSONResponse(
            content={"success": True, "image_count": len(images), "images": images}
        )

    async def process(self, files: List[UploadFile], output_filename: str = None):
        """
        Override process to return JSON instead of file download.

        Args:
            files: List of uploaded files
            output_filename: Not used

        Returns:
            JSONResponse with extracted images
        """
        self.logger.info(f"Starting PDF image extraction")

        # Validate
        validated_contents = await self.validate(files)

        # Extract and return JSON
        response = self.get_response(validated_contents[0])

        self.logger.info("PDF image extraction completed")
        return response
