"""
Base converter abstract class for all file conversion operations.

This module provides the foundation for implementing various file converters
in a consistent, extensible manner.
"""

from abc import ABC, abstractmethod
from typing import List, Any
from fastapi import UploadFile
from fastapi.responses import Response
import logging

logger = logging.getLogger(__name__)


class BaseConverter(ABC):
    """
    Abstract base class for all file converters.

    All converter implementations should inherit from this class and implement
    the required abstract methods. This ensures a consistent interface across
    different conversion types.
    """

    def __init__(self):
        """Initialize the converter with a logger."""
        self.logger = logging.getLogger(self.__class__.__name__)

    @abstractmethod
    async def validate(self, files: List[UploadFile]) -> List[bytes]:
        """
        Validate uploaded files and return their contents.

        Args:
            files: List of uploaded files to validate

        Returns:
            List of validated file contents as bytes

        Raises:
            HTTPException: If validation fails
        """
        pass

    @abstractmethod
    async def convert(self, file_contents: List[bytes]) -> bytes:
        """
        Convert the validated files to the target format.

        Args:
            file_contents: List of validated file contents

        Returns:
            Converted file as bytes

        Raises:
            HTTPException: If conversion fails
        """
        pass

    @abstractmethod
    def get_response(self, converted_data: bytes, filename: str) -> Response:
        """
        Create an HTTP response with the converted data.

        Args:
            converted_data: The converted file data
            filename: Output filename

        Returns:
            FastAPI Response object
        """
        pass

    async def process(self, files: List[UploadFile], output_filename: str) -> Response:
        """
        Complete conversion pipeline: validate -> convert -> respond.

        This is the main entry point that orchestrates the conversion process.

        Args:
            files: List of uploaded files
            output_filename: Desired output filename

        Returns:
            FastAPI Response with converted file
        """
        self.logger.info(f"Starting conversion process for {len(files)} file(s)")

        # Step 1: Validate files
        validated_contents = await self.validate(files)

        # Step 2: Convert files
        converted_data = await self.convert(validated_contents)

        # Step 3: Create response
        response = self.get_response(converted_data, output_filename)

        self.logger.info(f"Conversion completed successfully")
        return response
