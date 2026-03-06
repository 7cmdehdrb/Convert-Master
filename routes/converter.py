"""
API routes for file conversion operations.
"""

from fastapi import APIRouter, File, UploadFile, Body
from fastapi.responses import Response, StreamingResponse
from typing import List
from pydantic import BaseModel
import base64
from PIL import Image
import io

from converters import ImageToPdfConverter, PdfToImageConverter
from config import settings
from utils import create_zip

# Create router
router = APIRouter(prefix="/api/convert", tags=["conversion"])

# Initialize converters
image_to_pdf_converter = ImageToPdfConverter(
    max_file_size=settings.max_file_size, max_files=settings.max_files_per_request
)

pdf_to_image_converter = PdfToImageConverter(max_file_size=settings.max_file_size)


@router.post("/image-to-pdf", response_class=Response)
async def convert_images_to_pdf(files: List[UploadFile] = File(...)) -> Response:
    """
    Convert multiple uploaded images to a single PDF file.

    The order of files in the request determines the order in the PDF.
    Returns a streaming PDF response for immediate download.

    Args:
        files: List of uploaded image files in desired order

    Returns:
        StreamingResponse with PDF content

    Raises:
        HTTPException: If validation or conversion fails
    """
    return await image_to_pdf_converter.process(
        files=files, output_filename="converted_images.pdf"
    )


@router.post("/pdf-to-image")
async def extract_images_from_pdf(file: List[UploadFile] = File(...)):
    """
    Extract all images from an uploaded PDF file.

    Returns JSON with base64-encoded images and metadata.

    Args:
        file: Single PDF file

    Returns:
        JSONResponse with extracted images

    Raises:
        HTTPException: If extraction fails
    """
    return await pdf_to_image_converter.process(file)


# Download request model
class DownloadRequest(BaseModel):
    images: List[str]  # Base64 encoded images
    format: str = "png"  # Output format: png, jpeg, webp


@router.post("/download-images")
async def download_images(request: DownloadRequest = Body(...)):
    """
    Download selected images with format conversion.

    Returns single image or ZIP archive depending on count.

    Args:
        request: Download request with images and format

    Returns:
        StreamingResponse with image or ZIP file
    """
    images_data = []
    output_format = request.format.lower()

    # Validate format
    if output_format not in ["png", "jpeg", "jpg", "webp"]:
        output_format = "png"

    # Handle jpeg alias
    if output_format == "jpg":
        output_format = "jpeg"

    # Convert each image to requested format
    for idx, image_base64 in enumerate(request.images):
        try:
            # Decode base64
            image_bytes = base64.b64decode(image_base64)

            # Open with Pillow
            img = Image.open(io.BytesIO(image_bytes))

            # Convert RGBA to RGB for JPEG
            if output_format == "jpeg" and img.mode == "RGBA":
                img = img.convert("RGB")

            # Save to bytes with new format
            output_buffer = io.BytesIO()
            img.save(output_buffer, format=output_format.upper())
            output_buffer.seek(0)
            converted_bytes = output_buffer.getvalue()

            filename = f"image_{idx + 1}.{output_format}"
            images_data.append((converted_bytes, filename))

        except Exception as e:
            # Skip invalid images
            continue

    # Return single image or ZIP
    if len(images_data) == 1:
        # Single image download
        image_bytes, filename = images_data[0]

        return StreamingResponse(
            io.BytesIO(image_bytes),
            media_type=f"image/{output_format}",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    else:
        # Multiple images as ZIP
        zip_data = create_zip(images_data)

        return StreamingResponse(
            io.BytesIO(zip_data),
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=images.zip"},
        )
