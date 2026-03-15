"""Abstract base class for all BeetleSense analysis modules."""

from abc import ABC, abstractmethod
from typing import Any

import numpy as np
from numpy.typing import NDArray


class BaseModule(ABC):
    """
    Abstract base for all AI analysis modules.

    Each module follows a pipeline:
      preprocess() -> infer() -> postprocess() -> to_geojson() / to_raster()

    Subclasses must implement all abstract methods.
    """

    def __init__(self, model_path: str, module_name: str, version: str) -> None:
        self.model_path = model_path
        self.module_name = module_name
        self.version = version
        self._session: Any | None = None

    @abstractmethod
    def load(self) -> None:
        """Load the ONNX model into an inference session."""
        ...

    @abstractmethod
    def unload(self) -> None:
        """Release GPU memory and unload the model."""
        ...

    @property
    def is_loaded(self) -> bool:
        """Whether the model is currently loaded in memory."""
        return self._session is not None

    @abstractmethod
    def preprocess(
        self,
        image: NDArray[np.uint8],
        metadata: dict[str, Any],
    ) -> NDArray[np.float32]:
        """
        Preprocess raw input image/raster into model input tensor.

        Args:
            image: Raw image array (H, W, C) or raster (C, H, W).
            metadata: Capture metadata (CRS, resolution, bounds, etc.).

        Returns:
            Preprocessed tensor ready for inference (N, C, H, W).
        """
        ...

    @abstractmethod
    def infer(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        """
        Run ONNX inference on preprocessed tensor.

        Args:
            tensor: Model input tensor.

        Returns:
            Raw model output tensor.
        """
        ...

    @abstractmethod
    def postprocess(
        self,
        output: NDArray[np.float32],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Convert raw model output into structured results.

        Args:
            output: Raw model output tensor.
            metadata: Original capture metadata for georeferencing.

        Returns:
            Structured result dict with detections, counts, masks, etc.
        """
        ...

    @abstractmethod
    def to_geojson(self, results: dict[str, Any]) -> dict[str, Any]:
        """
        Convert structured results to GeoJSON FeatureCollection.

        Args:
            results: Output from postprocess().

        Returns:
            GeoJSON FeatureCollection dict.
        """
        ...

    @abstractmethod
    def to_raster(
        self,
        results: dict[str, Any],
        metadata: dict[str, Any],
    ) -> NDArray[np.uint8]:
        """
        Convert structured results to a georeferenced raster (mask/heatmap).

        Args:
            results: Output from postprocess().
            metadata: CRS and transform info for output raster.

        Returns:
            Output raster array.
        """
        ...

    def run(
        self,
        image: NDArray[np.uint8],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Full pipeline: preprocess -> infer -> postprocess.

        Args:
            image: Raw input image/raster.
            metadata: Capture metadata.

        Returns:
            Structured results dict.
        """
        if not self.is_loaded:
            self.load()
        tensor = self.preprocess(image, metadata)
        output = self.infer(tensor)
        return self.postprocess(output, metadata)
