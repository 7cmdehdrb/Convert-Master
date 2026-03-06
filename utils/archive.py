"""
Archive utilities for creating ZIP files.
"""

import io
import zipfile
from typing import List, Tuple


def create_zip(images_data: List[Tuple[bytes, str]]) -> bytes:
    """
    Create a ZIP archive containing multiple images.

    Args:
        images_data: List of tuples (image_bytes, filename)

    Returns:
        ZIP file as bytes

    Example:
        >>> images = [(img1_bytes, "image1.png"), (img2_bytes, "image2.jpg")]
        >>> zip_data = create_zip(images)
    """
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for image_bytes, filename in images_data:
            zip_file.writestr(filename, image_bytes)

    zip_buffer.seek(0)
    return zip_buffer.getvalue()
