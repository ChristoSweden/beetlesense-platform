"""BeetleSense processing utilities — tiling, geospatial, and spectral helpers."""

from .tiling import tile_image, merge_tiles, apply_nms
from .geo_utils import (
    pixel_to_geo,
    geo_to_pixel,
    create_geotiff,
    polygonize_raster,
    kriging_interpolation,
    douglas_peucker,
)
from .spectral import (
    compute_ndvi,
    compute_chlorophyll_index,
    compute_moisture_index,
    detect_spectral_anomalies,
)

__all__ = [
    "tile_image",
    "merge_tiles",
    "apply_nms",
    "pixel_to_geo",
    "geo_to_pixel",
    "create_geotiff",
    "polygonize_raster",
    "kriging_interpolation",
    "douglas_peucker",
    "compute_ndvi",
    "compute_chlorophyll_index",
    "compute_moisture_index",
    "detect_spectral_anomalies",
]
