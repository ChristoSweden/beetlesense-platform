"""Image tiling utilities for large orthoimage processing."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Sequence

import numpy as np
from numpy.typing import NDArray

logger = logging.getLogger(__name__)


@dataclass
class TileInfo:
    """Metadata for a single image tile."""

    tile_index: int
    row_start: int
    col_start: int
    row_end: int
    col_end: int
    data: NDArray[np.uint8]


@dataclass
class Detection:
    """A single bounding-box detection in pixel coordinates."""

    x_min: float
    y_min: float
    x_max: float
    y_max: float
    confidence: float
    class_id: int = 0
    class_name: str = ""
    tile_offset_x: int = 0
    tile_offset_y: int = 0

    @property
    def cx(self) -> float:
        return (self.x_min + self.x_max) / 2.0

    @property
    def cy(self) -> float:
        return (self.y_min + self.y_max) / 2.0

    @property
    def width(self) -> float:
        return self.x_max - self.x_min

    @property
    def height(self) -> float:
        return self.y_max - self.y_min

    @property
    def area(self) -> float:
        return max(0.0, self.width) * max(0.0, self.height)


def tile_image(
    image: NDArray[np.uint8],
    tile_size: int = 1024,
    overlap: int = 128,
) -> list[TileInfo]:
    """
    Split a large raster image into overlapping tiles.

    Args:
        image: Input image array of shape (H, W, C) or (H, W).
        tile_size: Size of each square tile in pixels.
        overlap: Overlap between adjacent tiles in pixels.

    Returns:
        List of TileInfo objects containing tile data and position metadata.
    """
    if image.ndim == 2:
        h, w = image.shape
    else:
        h, w = image.shape[:2]

    stride = tile_size - overlap
    tiles: list[TileInfo] = []
    tile_idx = 0

    for row_start in range(0, h, stride):
        for col_start in range(0, w, stride):
            row_end = min(row_start + tile_size, h)
            col_end = min(col_start + tile_size, w)

            # Extract tile
            if image.ndim == 2:
                tile_data = image[row_start:row_end, col_start:col_end]
            else:
                tile_data = image[row_start:row_end, col_start:col_end, :]

            # Pad tile if it's smaller than tile_size (edge tiles)
            pad_h = tile_size - (row_end - row_start)
            pad_w = tile_size - (col_end - col_start)
            if pad_h > 0 or pad_w > 0:
                if image.ndim == 2:
                    tile_data = np.pad(
                        tile_data,
                        ((0, pad_h), (0, pad_w)),
                        mode="constant",
                        constant_values=0,
                    )
                else:
                    tile_data = np.pad(
                        tile_data,
                        ((0, pad_h), (0, pad_w), (0, 0)),
                        mode="constant",
                        constant_values=0,
                    )

            tiles.append(
                TileInfo(
                    tile_index=tile_idx,
                    row_start=row_start,
                    col_start=col_start,
                    row_end=row_end,
                    col_end=col_end,
                    data=tile_data,
                )
            )
            tile_idx += 1

    logger.info(
        "Tiled image (%d x %d) into %d tiles of %dpx with %dpx overlap",
        h, w, len(tiles), tile_size, overlap,
    )
    return tiles


def merge_tiles(
    tiles: list[NDArray[np.float32]],
    positions: list[tuple[int, int, int, int]],
    image_shape: tuple[int, ...],
) -> NDArray[np.float32]:
    """
    Stitch tile predictions back into a full-image prediction map.

    Uses averaging in overlap regions to produce smooth boundaries.

    Args:
        tiles: List of per-tile prediction arrays (H_tile, W_tile) or (H_tile, W_tile, C).
        positions: List of (row_start, col_start, row_end, col_end) for each tile.
        image_shape: Shape of the full output image (H, W) or (H, W, C).

    Returns:
        Merged prediction array of shape *image_shape*.
    """
    accumulator = np.zeros(image_shape, dtype=np.float64)
    weight_map = np.zeros(image_shape[:2], dtype=np.float64)

    for tile_pred, (r0, c0, r1, c1) in zip(tiles, positions):
        tile_h = r1 - r0
        tile_w = c1 - c0
        cropped = tile_pred[:tile_h, :tile_w] if tile_pred.ndim == 2 else tile_pred[:tile_h, :tile_w, :]

        if accumulator.ndim == 2:
            accumulator[r0:r1, c0:c1] += cropped
        else:
            accumulator[r0:r1, c0:c1, :] += cropped
        weight_map[r0:r1, c0:c1] += 1.0

    # Avoid division by zero
    weight_map = np.maximum(weight_map, 1.0)

    if accumulator.ndim == 2:
        merged = accumulator / weight_map
    else:
        merged = accumulator / weight_map[..., np.newaxis]

    return merged.astype(np.float32)


def _compute_iou(a: Detection, b: Detection) -> float:
    """Compute Intersection over Union between two detections."""
    x_min = max(a.x_min, b.x_min)
    y_min = max(a.y_min, b.y_min)
    x_max = min(a.x_max, b.x_max)
    y_max = min(a.y_max, b.y_max)

    inter_w = max(0.0, x_max - x_min)
    inter_h = max(0.0, y_max - y_min)
    inter_area = inter_w * inter_h

    union_area = a.area + b.area - inter_area
    if union_area <= 0:
        return 0.0
    return inter_area / union_area


def apply_nms(
    detections: list[Detection],
    iou_threshold: float = 0.3,
) -> list[Detection]:
    """
    Non-maximum suppression across tile boundaries.

    Detections must already be in global (full-image) coordinates.

    Args:
        detections: List of Detection objects in global pixel coordinates.
        iou_threshold: IoU threshold above which the lower-confidence detection
            is suppressed.

    Returns:
        Filtered list of detections after NMS.
    """
    if not detections:
        return []

    # Sort by confidence descending
    sorted_dets = sorted(detections, key=lambda d: d.confidence, reverse=True)
    keep: list[Detection] = []

    while sorted_dets:
        best = sorted_dets.pop(0)
        keep.append(best)

        remaining: list[Detection] = []
        for det in sorted_dets:
            if _compute_iou(best, det) < iou_threshold:
                remaining.append(det)
        sorted_dets = remaining

    logger.debug(
        "NMS: %d detections -> %d after suppression (IoU=%.2f)",
        len(detections), len(keep), iou_threshold,
    )
    return keep
