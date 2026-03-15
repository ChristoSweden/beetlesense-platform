"""Module 6 placeholder — reserved for future analysis capability."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from numpy.typing import NDArray

from ..base import BaseModule

logger = logging.getLogger(__name__)


class Module6Placeholder(BaseModule):
    """
    Placeholder for the sixth analysis module (not yet implemented).

    All pipeline methods return valid empty results so the module can be
    registered in the registry without breaking enumeration or status checks.
    """

    def __init__(
        self,
        model_path: str = "",
        version: str = "0.0.1",
    ) -> None:
        super().__init__(
            model_path=model_path,
            module_name="module_6_placeholder",
            version=version,
        )

    def load(self) -> None:
        logger.warning("Module 6 is not yet implemented — load() is a no-op")
        self._session = {"placeholder": True}

    def unload(self) -> None:
        self._session = None
        logger.info("Module 6 placeholder unloaded")

    def preprocess(
        self,
        image: NDArray[np.uint8],
        metadata: dict[str, Any],
    ) -> NDArray[np.float32]:
        logger.warning("Module 6 is not yet implemented — preprocess() returns empty tensor")
        return np.zeros((1, 1, 1, 1), dtype=np.float32)

    def infer(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        logger.warning("Module 6 is not yet implemented — infer() returns empty tensor")
        return np.zeros((1,), dtype=np.float32)

    def postprocess(
        self,
        output: NDArray[np.float32],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        logger.warning("Module 6 is not yet implemented — postprocess() returns empty result")
        return {
            "status": "not_implemented",
            "message": "Module 6 is not yet implemented",
            "results": [],
        }

    def to_geojson(self, results: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": "FeatureCollection",
            "features": [],
            "properties": {
                "module": "module_6_placeholder",
                "version": self.version,
                "status": "not_implemented",
            },
        }

    def to_raster(
        self,
        results: dict[str, Any],
        metadata: dict[str, Any],
    ) -> NDArray[np.uint8]:
        return np.zeros((1, 1), dtype=np.uint8)

    def run(
        self,
        image: NDArray[np.uint8],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Override run() to log the not-implemented warning."""
        logger.warning("Module 6 is not yet implemented — run() returns placeholder result")
        return {
            "status": "not_implemented",
            "message": "Module 6 is not yet implemented. "
            "This placeholder ensures the module slot is reserved in the registry.",
            "results": [],
        }
