"""Geospatial utilities for coordinate transforms, raster I/O, and vector operations."""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

import numpy as np
from numpy.typing import NDArray

logger = logging.getLogger(__name__)


@dataclass
class AffineTransform:
    """
    Minimal affine transform matching GDAL/rasterio convention.

    Maps pixel (col, row) to geographic (x, y):
        x = origin_x + col * pixel_width + row * x_skew
        y = origin_y + col * y_skew   + row * pixel_height

    For north-up images: x_skew = 0, y_skew = 0, pixel_height < 0.
    """

    origin_x: float
    pixel_width: float
    x_skew: float
    origin_y: float
    y_skew: float
    pixel_height: float  # Typically negative for north-up

    @classmethod
    def from_bounds(
        cls,
        west: float,
        south: float,
        east: float,
        north: float,
        width_px: int,
        height_px: int,
    ) -> "AffineTransform":
        """Create transform from geographic bounds and pixel dimensions."""
        pixel_w = (east - west) / width_px
        pixel_h = -(north - south) / height_px  # Negative for north-up
        return cls(
            origin_x=west,
            pixel_width=pixel_w,
            x_skew=0.0,
            origin_y=north,
            y_skew=0.0,
            pixel_height=pixel_h,
        )

    def to_tuple(self) -> tuple[float, float, float, float, float, float]:
        return (
            self.origin_x,
            self.pixel_width,
            self.x_skew,
            self.origin_y,
            self.y_skew,
            self.pixel_height,
        )


def pixel_to_geo(
    x: float,
    y: float,
    transform: AffineTransform,
) -> tuple[float, float]:
    """
    Convert pixel coordinates (col, row) to geographic coordinates.

    Args:
        x: Column index (can be fractional).
        y: Row index (can be fractional).
        transform: Affine transform for the raster.

    Returns:
        (longitude_or_easting, latitude_or_northing).
    """
    geo_x = transform.origin_x + x * transform.pixel_width + y * transform.x_skew
    geo_y = transform.origin_y + x * transform.y_skew + y * transform.pixel_height
    return geo_x, geo_y


def geo_to_pixel(
    lon: float,
    lat: float,
    transform: AffineTransform,
) -> tuple[float, float]:
    """
    Convert geographic coordinates to pixel coordinates (col, row).

    Args:
        lon: Longitude or easting.
        lat: Latitude or northing.
        transform: Affine transform for the raster.

    Returns:
        (col, row) as floats (caller may round/floor as needed).
    """
    # Solve the affine system for x (col) and y (row):
    #   lon = origin_x + col * pixel_width + row * x_skew
    #   lat = origin_y + col * y_skew   + row * pixel_height
    det = transform.pixel_width * transform.pixel_height - transform.x_skew * transform.y_skew
    if abs(det) < 1e-12:
        raise ValueError("Singular transform — cannot invert")

    dx = lon - transform.origin_x
    dy = lat - transform.origin_y

    col = (transform.pixel_height * dx - transform.x_skew * dy) / det
    row = (-transform.y_skew * dx + transform.pixel_width * dy) / det
    return col, row


def create_geotiff(
    data: NDArray[Any],
    transform: AffineTransform,
    crs: str,
    path: str | Path,
    dtype: str = "float32",
    nodata: float | None = None,
) -> str:
    """
    Write a numpy array as a GeoTIFF file.

    Uses raw TIFF writing when rasterio is not available (development mode).

    Args:
        data: 2D (H, W) or 3D (C, H, W) array.
        transform: Affine transform for georeferencing.
        crs: Coordinate reference system string (e.g. "EPSG:4326").
        path: Output file path.
        dtype: Numpy dtype string for the output.
        nodata: NoData value, if applicable.

    Returns:
        Absolute path to the written file.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if data.ndim == 2:
        bands = 1
        height, width = data.shape
    elif data.ndim == 3:
        bands, height, width = data.shape
    else:
        raise ValueError(f"Expected 2D or 3D array, got {data.ndim}D")

    try:
        import rasterio
        from rasterio.transform import Affine

        rio_transform = Affine(
            transform.pixel_width,
            transform.x_skew,
            transform.origin_x,
            transform.y_skew,
            transform.pixel_height,
            transform.origin_y,
        )

        profile = {
            "driver": "GTiff",
            "dtype": dtype,
            "width": width,
            "height": height,
            "count": bands,
            "crs": crs,
            "transform": rio_transform,
            "compress": "deflate",
        }
        if nodata is not None:
            profile["nodata"] = nodata

        with rasterio.open(str(path), "w", **profile) as dst:
            if data.ndim == 2:
                dst.write(data.astype(dtype), 1)
            else:
                for i in range(bands):
                    dst.write(data[i].astype(dtype), i + 1)

        logger.info("Wrote GeoTIFF: %s (%d bands, %dx%d, %s)", path, bands, width, height, crs)

    except ImportError:
        # Fallback: save as raw numpy with sidecar metadata
        np.save(str(path).replace(".tif", ".npy"), data.astype(dtype))
        meta_path = str(path).replace(".tif", "_meta.json")
        import json

        with open(meta_path, "w") as f:
            json.dump(
                {
                    "transform": transform.to_tuple(),
                    "crs": crs,
                    "shape": list(data.shape),
                    "dtype": dtype,
                    "nodata": nodata,
                },
                f,
            )
        logger.warning(
            "rasterio not installed — saved raw numpy + metadata instead of GeoTIFF: %s", path
        )

    return str(path.resolve())


def polygonize_raster(
    raster: NDArray[Any],
    transform: AffineTransform,
    threshold: float | None = None,
    min_area_px: int = 4,
) -> list[dict[str, Any]]:
    """
    Convert a classification/probability raster to vector polygons.

    Groups connected pixels of the same value into polygon geometries.

    Args:
        raster: 2D integer or float array.
        transform: Affine transform for the raster.
        threshold: If set, binarize float rasters at this threshold first.
        min_area_px: Minimum polygon area in pixels to keep.

    Returns:
        List of dicts with 'geometry' (GeoJSON polygon) and 'value' keys.
    """
    if threshold is not None:
        raster = (raster >= threshold).astype(np.int32)
    else:
        raster = raster.astype(np.int32)

    h, w = raster.shape
    visited = np.zeros_like(raster, dtype=bool)
    polygons: list[dict[str, Any]] = []

    # Simple connected-component flood fill for polygonization
    for row in range(h):
        for col in range(w):
            if visited[row, col]:
                continue
            val = raster[row, col]
            if val == 0:
                visited[row, col] = True
                continue

            # BFS flood fill
            component_pixels: list[tuple[int, int]] = []
            queue = [(row, col)]
            visited[row, col] = True

            while queue:
                r, c = queue.pop(0)
                component_pixels.append((r, c))
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < h and 0 <= nc < w and not visited[nr, nc] and raster[nr, nc] == val:
                        visited[nr, nc] = True
                        queue.append((nr, nc))

            if len(component_pixels) < min_area_px:
                continue

            # Build a convex hull-like bounding polygon from edge pixels
            boundary = _extract_boundary(component_pixels, h, w, raster, val)
            geo_coords = [pixel_to_geo(c + 0.5, r + 0.5, transform) for r, c in boundary]
            if geo_coords and geo_coords[0] != geo_coords[-1]:
                geo_coords.append(geo_coords[0])

            polygons.append(
                {
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [geo_coords],
                    },
                    "value": int(val),
                    "area_pixels": len(component_pixels),
                }
            )

    logger.info("Polygonized raster: %d polygons extracted", len(polygons))
    return polygons


def _extract_boundary(
    pixels: list[tuple[int, int]],
    h: int,
    w: int,
    raster: NDArray[Any],
    val: int,
) -> list[tuple[int, int]]:
    """Extract boundary pixels of a connected component."""
    pixel_set = set(pixels)
    boundary: list[tuple[int, int]] = []

    for r, c in pixels:
        is_edge = False
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            if (nr, nc) not in pixel_set:
                is_edge = True
                break
        if is_edge:
            boundary.append((r, c))

    if not boundary:
        return pixels[:1]

    # Order boundary clockwise using angle from centroid
    cr = sum(r for r, _ in boundary) / len(boundary)
    cc = sum(c for _, c in boundary) / len(boundary)
    boundary.sort(key=lambda p: math.atan2(p[0] - cr, p[1] - cc))

    return boundary


def kriging_interpolation(
    points: NDArray[np.float64],
    values: NDArray[np.float64],
    grid_shape: tuple[int, int],
    transform: AffineTransform,
    variogram_range: float = 50.0,
    variogram_sill: float = 1.0,
    variogram_nugget: float = 0.01,
) -> NDArray[np.float32]:
    """
    Simple ordinary kriging interpolation of point observations to a regular grid.

    Uses a spherical variogram model. Falls back to IDW if the kriging system
    is singular.

    Args:
        points: (N, 2) array of point coordinates (x, y) in the same CRS as
            the transform.
        values: (N,) array of observed values at each point.
        grid_shape: (rows, cols) of the output grid.
        transform: Affine transform for the output grid.
        variogram_range: Range parameter of the spherical variogram.
        variogram_sill: Sill (total variance) of the variogram.
        variogram_nugget: Nugget (measurement noise) of the variogram.

    Returns:
        Interpolated grid as float32 array of shape *grid_shape*.
    """
    n_points = len(points)
    rows, cols = grid_shape

    if n_points == 0:
        return np.zeros(grid_shape, dtype=np.float32)

    if n_points == 1:
        return np.full(grid_shape, values[0], dtype=np.float32)

    def spherical_variogram(h: float) -> float:
        if h <= 0:
            return 0.0
        if h >= variogram_range:
            return variogram_sill + variogram_nugget
        ratio = h / variogram_range
        return variogram_nugget + variogram_sill * (1.5 * ratio - 0.5 * ratio**3)

    # Build kriging matrix (N+1 x N+1) with Lagrange multiplier row/column
    K = np.zeros((n_points + 1, n_points + 1), dtype=np.float64)
    for i in range(n_points):
        for j in range(i + 1, n_points):
            dist = np.sqrt(np.sum((points[i] - points[j]) ** 2))
            gamma = spherical_variogram(dist)
            K[i, j] = gamma
            K[j, i] = gamma
    K[:n_points, n_points] = 1.0
    K[n_points, :n_points] = 1.0

    try:
        K_inv = np.linalg.inv(K)
    except np.linalg.LinAlgError:
        logger.warning("Kriging system singular — falling back to IDW interpolation")
        return _idw_interpolation(points, values, grid_shape, transform)

    # Interpolate each grid cell
    grid = np.zeros(grid_shape, dtype=np.float32)
    values_ext = np.append(values, 0.0)  # Extended with Lagrange multiplier = 0

    for r in range(rows):
        for c in range(cols):
            gx, gy = pixel_to_geo(c + 0.5, r + 0.5, transform)

            k_vec = np.zeros(n_points + 1, dtype=np.float64)
            for i in range(n_points):
                dist = np.sqrt((gx - points[i, 0]) ** 2 + (gy - points[i, 1]) ** 2)
                k_vec[i] = spherical_variogram(dist)
            k_vec[n_points] = 1.0

            weights = K_inv @ k_vec
            grid[r, c] = np.dot(weights[:n_points], values)

    return np.clip(grid, 0.0, 1.0).astype(np.float32)


def _idw_interpolation(
    points: NDArray[np.float64],
    values: NDArray[np.float64],
    grid_shape: tuple[int, int],
    transform: AffineTransform,
    power: float = 2.0,
) -> NDArray[np.float32]:
    """Inverse Distance Weighting fallback interpolation."""
    rows, cols = grid_shape
    grid = np.zeros(grid_shape, dtype=np.float32)

    for r in range(rows):
        for c in range(cols):
            gx, gy = pixel_to_geo(c + 0.5, r + 0.5, transform)
            dists = np.sqrt((points[:, 0] - gx) ** 2 + (points[:, 1] - gy) ** 2)
            dists = np.maximum(dists, 1e-10)
            weights = 1.0 / dists**power
            grid[r, c] = np.average(values, weights=weights)

    return np.clip(grid, 0.0, 1.0).astype(np.float32)


def douglas_peucker(
    coords: list[tuple[float, float]],
    tolerance: float = 2.0,
) -> list[tuple[float, float]]:
    """
    Douglas-Peucker line/polygon simplification.

    Args:
        coords: List of (x, y) coordinate tuples.
        tolerance: Maximum perpendicular distance for point removal.

    Returns:
        Simplified coordinate list.
    """
    if len(coords) <= 2:
        return coords

    # Find the point with maximum distance from the line between first and last
    start = np.array(coords[0])
    end = np.array(coords[-1])
    line_vec = end - start
    line_len = np.linalg.norm(line_vec)

    max_dist = 0.0
    max_idx = 0

    for i in range(1, len(coords) - 1):
        pt = np.array(coords[i])
        if line_len < 1e-10:
            dist = float(np.linalg.norm(pt - start))
        else:
            # Perpendicular distance from point to line
            cross = abs(line_vec[0] * (start[1] - pt[1]) - line_vec[1] * (start[0] - pt[0]))
            dist = cross / line_len
        if dist > max_dist:
            max_dist = dist
            max_idx = i

    if max_dist > tolerance:
        left = douglas_peucker(coords[: max_idx + 1], tolerance)
        right = douglas_peucker(coords[max_idx:], tolerance)
        return left[:-1] + right
    else:
        return [coords[0], coords[-1]]
