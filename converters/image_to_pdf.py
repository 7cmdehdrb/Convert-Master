"""
Image to PDF converter implementation.
"""

from typing import List
from fastapi import UploadFile, HTTPException
from fastapi.responses import StreamingResponse
import img2pdf
from PIL import Image
import io

from .base import BaseConverter


class ImageToPdfConverter(BaseConverter):
    """
    Converter for transforming multiple images into a single PDF file.

    Uses img2pdf for fast, lossless conversion that preserves image quality.
    """

    def __init__(self, max_file_size: int = 50 * 1024 * 1024, max_files: int = 100):
        """
        Initialize the Image to PDF converter.

        Args:
            max_file_size: Maximum size per file in bytes (default: 50MB)
            max_files: Maximum number of files allowed (default: 100)
        """
        super().__init__()
        self.max_file_size = max_file_size
        self.max_files = max_files

    def _validate_image(self, file_content: bytes, filename: str) -> bool:
        """
        Validate if the uploaded file is a valid image using Pillow.

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            True if valid image, False otherwise
        """
        try:
            image = Image.open(io.BytesIO(file_content))
            image.verify()  # Verify it's actually an image
            return True
        except Exception as e:
            self.logger.warning(f"Invalid image file {filename}: {str(e)}")
            return False

    async def validate(self, files: List[UploadFile]) -> List[bytes]:
        """
        Validate uploaded image files.

        Checks:
        - File count is within limits
        - Each file size is within limits
        - Each file is a valid image

        Args:
            files: List of uploaded files

        Returns:
            List of validated file contents

        Raises:
            HTTPException: If validation fails
        """
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        if len(files) > self.max_files:
            raise HTTPException(
                status_code=400, detail=f"Maximum {self.max_files} images allowed"
            )

        self.logger.info(f"Validating {len(files)} image files")

        validated_images = []

        for idx, file in enumerate(files):
            # Read file content
            file_content = await file.read()

            # Check file size
            if len(file_content) > self.max_file_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds maximum size of {self.max_file_size // (1024 * 1024)}MB",
                )

            # Validate image
            if not self._validate_image(file_content, file.filename):
                raise HTTPException(
                    status_code=400, detail=f"File {file.filename} is not a valid image"
                )

            validated_images.append(file_content)
            self.logger.info(f"Validated image {idx + 1}/{len(files)}: {file.filename}")

        return validated_images

    async def convert(self, file_contents: List[bytes]) -> bytes:
        """
        Convert validated images to a single PDF file.

        Uses img2pdf library for fast, lossless conversion.

        Args:
            file_contents: List of validated image file contents

        Returns:
            PDF file as bytes

        Raises:
            HTTPException: If conversion fails
        """
        try:
            self.logger.info(f"Converting {len(file_contents)} images to PDF")

            # Convert images to PDF using img2pdf
            # This preserves image quality and is very fast
            pdf_bytes = img2pdf.convert(file_contents)

            self.logger.info("PDF conversion successful")
            return pdf_bytes

        except Exception as e:
            self.logger.error(f"PDF conversion failed: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to convert images to PDF: {str(e)}"
            )

    def get_response(
        self, converted_data: bytes, filename: str = "converted_images.pdf"
    ) -> StreamingResponse:
        """
        Create a streaming response with the PDF data.

        Args:
            converted_data: PDF file bytes
            filename: Output filename (default: converted_images.pdf)

        Returns:
            StreamingResponse for immediate download
        """
        pdf_stream = io.BytesIO(converted_data)

        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(converted_data)),
            },
        )
