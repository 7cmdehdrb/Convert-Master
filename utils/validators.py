"""
Validation utilities for file uploads and processing.
"""

from fastapi import HTTPException, UploadFile
from typing import List
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)


def validate_file_count(files: List[UploadFile], max_count: int) -> None:
    """
    Validate that the number of files is within limits.

    Args:
        files: List of uploaded files
        max_count: Maximum allowed file count

    Raises:
        HTTPException: If file count exceeds limit or no files provided
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    if len(files) > max_count:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {max_count} files allowed, got {len(files)}",
        )


def validate_file_size(file_content: bytes, filename: str, max_size: int) -> None:
    """
    Validate that a file size is within limits.

    Args:
        file_content: File content as bytes
        filename: Original filename for error messages
        max_size: Maximum allowed file size in bytes

    Raises:
        HTTPException: If file size exceeds limit
    """
    if len(file_content) > max_size:
        max_size_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"File {filename} exceeds maximum size of {max_size_mb}MB",
        )


def validate_image(file_content: bytes, filename: str) -> bool:
    """
    Validate if file content represents a valid image.

    Uses Pillow to verify the file is a readable image format.

    Args:
        file_content: Raw file bytes
        filename: Original filename for logging

    Returns:
        True if valid image, False otherwise
    """
    try:
        image = Image.open(io.BytesIO(file_content))
        image.verify()  # Verify it's actually an image
        return True
    except Exception as e:
        logger.warning(f"Invalid image file {filename}: {str(e)}")
        return False


def validate_file_type(filename: str, allowed_extensions: set) -> bool:
    """
    Validate file extension is in allowed list.

    Args:
        filename: Original filename
        allowed_extensions: Set of allowed extensions (e.g., {'.jpg', '.png'})

    Returns:
        True if extension is allowed, False otherwise
    """
    if not filename:
        return False

    extension = filename.lower().split(".")[-1] if "." in filename else ""
    return f".{extension}" in allowed_extensions or extension in {
        ext.lstrip(".") for ext in allowed_extensions
    }
