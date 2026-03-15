"""Tree count and inventory module — YOLO v8 detection + optional LiDAR CHM fusion."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np
from numpy.typing import NDArray

from ..base import BaseModule
from ...processing.tiling import Detection, TileInfo, apply_nms, tile_image
from ...processing.geo_utils import AffineTransform, pixel_to_geo, create_geotiff

logger = logging.getLogger(__name__)


class DetectionSource(str, Enum):
    """How a tree detection was sourced."""
    YOLO = "yolo"
    LIDAR = "lidar"
    FUSED = "fused"


@dataclass
class TreeDetection:
    """A single detected tree with geolocation and attributes."""
    tree_id: str
    pixel_x: float
    pixel_y: float
    geo_x: float = 0.0
    geo_y: float = 0.0
    confidence: float = 0.0
    height_m: float | None = None
    crown_radius_m: float | None = None
    bbox: tuple[float, float, float, float] = (0, 0, 0, 0)  # x_min, y_min, x_max, y_max
    source: DetectionSource = DetectionSource.YOLO


@dataclass
class TreeCountResult:
    """Aggregated result from tree count analysis."""
    total_trees: int = 0
    trees_per_hectare: float = 0.0
    mean_height_m: float | None = None
    mean_crown_radius_m: float | None = None
    detections: list[TreeDetection] = field(default_factory=list)
    area_hectares: float = 0.0
    has_chm: bool = False


class TreeCountModule(BaseModule):
    """
    Tree count and inventory from drone RGB orthoimagery with optional LiDAR
    Canopy Height Model (CHM) fusion.

    Pipeline:
        1. Tile orthoimage into 1024x1024 patches with 128px overlap
        2. Run YOLO v8 object detection per tile
        3. Merge detections via NMS (IoU 0.3)
        4. If CHM available: extract height per tree, fuse with CHM local maxima
        5. Output: per-tree GeoJSON points + density heatmap GeoTIFF
    """

    TILE_SIZE = 1024
    TILE_OVERLAP = 128
    NMS_IOU_THRESHOLD = 0.3
    CONFIDENCE_THRESHOLD = 0.25
    CHM_MATCH_RADIUS_M = 2.0
    FUSED_CONFIDENCE_BOOST = 0.15

    def __init__(
        self,
        model_path: str = "models/tree_count_yolov8.onnx",
        version: str = "1.0.0",
    ) -> None:
        super().__init__(model_path=model_path, module_name="tree_count", version=version)
        self._chm_data: NDArray[np.float32] | None = None
        self._chm_transform: AffineTransform | None = None

    def load(self) -> None:
        """Load the YOLO v8 ONNX model."""
        logger.info("Loading TreeCount YOLO v8 model from %s", self.model_path)
        # In production: self._session = ort.InferenceSession(self.model_path, providers=[...])
        self._session = {"model": "yolov8_tree_detection", "loaded": True}
        logger.info("TreeCount model loaded successfully")

    def unload(self) -> None:
        """Release model from memory."""
        self._session = None
        self._chm_data = None
        self._chm_transform = None
        logger.info("TreeCount model unloaded")

    def preprocess(
        self,
        image: NDArray[np.uint8],
        metadata: dict[str, Any],
    ) -> NDArray[np.float32]:
        """
        Tile the orthoimage and prepare model input tensors.

        Also loads CHM raster if path provided in metadata.

        Args:
            image: RGB orthoimage (H, W, 3), uint8.
            metadata: Must contain 'transform' (AffineTransform or dict).
                Optional: 'chm_path', 'chm_data', 'chm_transform'.

        Returns:
            Stacked normalized tile tensors (N, 3, 1024, 1024).
        """
        # Load CHM if available
        if "chm_data" in metadata and metadata["chm_data"] is not None:
            self._chm_data = metadata["chm_data"].astype(np.float32)
            self._chm_transform = metadata.get("chm_transform")
            logger.info("CHM raster loaded: shape %s", self._chm_data.shape)
        else:
            self._chm_data = None

        # Tile the image
        tiles = tile_image(image, tile_size=self.TILE_SIZE, overlap=self.TILE_OVERLAP)

        # Store tile metadata for postprocessing
        self._tiles = tiles

        # Normalize to float32 [0, 1] and convert HWC -> CHW, stack into batch
        batch = np.zeros(
            (len(tiles), 3, self.TILE_SIZE, self.TILE_SIZE), dtype=np.float32
        )
        for i, tile in enumerate(tiles):
            tile_rgb = tile.data
            if tile_rgb.ndim == 2:
                tile_rgb = np.stack([tile_rgb] * 3, axis=-1)
            elif tile_rgb.shape[2] > 3:
                tile_rgb = tile_rgb[:, :, :3]
            # HWC -> CHW, normalize
            batch[i] = tile_rgb.transpose(2, 0, 1).astype(np.float32) / 255.0

        logger.info("Preprocessed %d tiles for inference", len(tiles))
        return batch

    def infer(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        """
        Run YOLO v8 detection on tile batch.

        Returns mock detections in production-realistic format.
        Each detection: [x_min, y_min, x_max, y_max, confidence, class_id, tile_index].

        Args:
            tensor: (N, 3, 1024, 1024) batch of normalized tiles.

        Returns:
            (M, 7) array of raw detections across all tiles.
        """
        if self._session is None:
            raise RuntimeError("Model not loaded — call load() first")

        all_detections: list[list[float]] = []
        n_tiles = tensor.shape[0]

        for tile_idx in range(n_tiles):
            # --- MOCK INFERENCE ---
            # In production: results = self._session.run(None, {"images": tensor[tile_idx:tile_idx+1]})
            # Simulate 0-5 detections per tile with realistic bounding boxes
            rng = np.random.RandomState(seed=42 + tile_idx)
            n_dets = rng.randint(0, 6)
            for _ in range(n_dets):
                cx = rng.uniform(50, 974)
                cy = rng.uniform(50, 974)
                w = rng.uniform(15, 60)
                h = rng.uniform(15, 60)
                conf = rng.uniform(0.3, 0.98)
                all_detections.append([
                    cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2,
                    conf, 0.0, float(tile_idx),
                ])

        if not all_detections:
            return np.zeros((0, 7), dtype=np.float32)

        return np.array(all_detections, dtype=np.float32)

    def postprocess(
        self,
        output: NDArray[np.float32],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Merge tile detections, apply NMS, fuse with CHM if available.

        Args:
            output: (M, 7) raw detections [x_min, y_min, x_max, y_max, conf, class, tile_idx].
            metadata: Must include 'transform' for georeferencing, 'resolution_m' for scale.

        Returns:
            TreeCountResult as dict.
        """
        transform = metadata.get("transform")
        if isinstance(transform, dict):
            transform = AffineTransform(**transform)
        elif transform is None:
            transform = AffineTransform(0, 1, 0, 0, 0, -1)

        resolution_m = metadata.get("resolution_m", 0.05)  # Default 5 cm/px

        # Convert tile-local detections to global coordinates
        global_dets: list[Detection] = []
        for row in output:
            x_min, y_min, x_max, y_max, conf, cls_id, tile_idx = row
            tile_idx_int = int(tile_idx)

            if conf < self.CONFIDENCE_THRESHOLD:
                continue

            if tile_idx_int < len(self._tiles):
                tile = self._tiles[tile_idx_int]
                x_min += tile.col_start
                y_min += tile.row_start
                x_max += tile.col_start
                y_max += tile.row_start

            global_dets.append(Detection(
                x_min=float(x_min),
                y_min=float(y_min),
                x_max=float(x_max),
                y_max=float(y_max),
                confidence=float(conf),
                class_id=int(cls_id),
                class_name="tree",
            ))

        # Apply NMS to remove overlap duplicates
        nms_dets = apply_nms(global_dets, iou_threshold=self.NMS_IOU_THRESHOLD)

        # Convert to TreeDetection with geolocation
        tree_detections: list[TreeDetection] = []
        for det in nms_dets:
            geo_x, geo_y = pixel_to_geo(det.cx, det.cy, transform)
            crown_radius_m = (det.width + det.height) / 4.0 * resolution_m

            tree = TreeDetection(
                tree_id=str(uuid.uuid4())[:8],
                pixel_x=det.cx,
                pixel_y=det.cy,
                geo_x=geo_x,
                geo_y=geo_y,
                confidence=det.confidence,
                crown_radius_m=crown_radius_m,
                bbox=(det.x_min, det.y_min, det.x_max, det.y_max),
                source=DetectionSource.YOLO,
            )

            # Extract height from CHM if available
            if self._chm_data is not None:
                height = self._extract_chm_height(det.cx, det.cy, transform, resolution_m)
                if height is not None:
                    tree.height_m = height

            tree_detections.append(tree)

        # Fuse with CHM local maxima
        if self._chm_data is not None:
            tree_detections = self._fuse_with_chm(
                tree_detections, transform, resolution_m
            )

        # Compute area in hectares
        image_h = metadata.get("image_height", 2048)
        image_w = metadata.get("image_width", 2048)
        area_m2 = image_h * resolution_m * image_w * resolution_m
        area_ha = area_m2 / 10_000.0

        # Build result
        heights = [t.height_m for t in tree_detections if t.height_m is not None]
        crown_radii = [t.crown_radius_m for t in tree_detections if t.crown_radius_m is not None]

        result = TreeCountResult(
            total_trees=len(tree_detections),
            trees_per_hectare=len(tree_detections) / max(area_ha, 0.01),
            mean_height_m=float(np.mean(heights)) if heights else None,
            mean_crown_radius_m=float(np.mean(crown_radii)) if crown_radii else None,
            detections=tree_detections,
            area_hectares=area_ha,
            has_chm=self._chm_data is not None,
        )

        logger.info(
            "Tree count: %d trees (%.0f/ha) over %.2f ha, CHM=%s",
            result.total_trees, result.trees_per_hectare, result.area_hectares, result.has_chm,
        )
        return self._result_to_dict(result)

    def _extract_chm_height(
        self,
        px_x: float,
        px_y: float,
        img_transform: AffineTransform,
        resolution_m: float,
    ) -> float | None:
        """Extract tree height from CHM at detection centroid."""
        if self._chm_data is None:
            return None

        chm = self._chm_data
        # Map pixel to CHM row/col (assumes same CRS)
        chm_h, chm_w = chm.shape[:2]

        if self._chm_transform is not None:
            geo_x, geo_y = pixel_to_geo(px_x, px_y, img_transform)
            from ...processing.geo_utils import geo_to_pixel
            chm_col, chm_row = geo_to_pixel(geo_x, geo_y, self._chm_transform)
        else:
            # Assume same grid
            chm_col, chm_row = px_x, px_y

        cr, cc = int(round(chm_row)), int(round(chm_col))
        if 0 <= cr < chm_h and 0 <= cc < chm_w:
            height = float(chm[cr, cc])
            return height if height > 0.5 else None
        return None

    def _fuse_with_chm(
        self,
        detections: list[TreeDetection],
        transform: AffineTransform,
        resolution_m: float,
    ) -> list[TreeDetection]:
        """
        Fuse YOLO detections with CHM local maxima.

        CHM local maxima that match a YOLO detection within 2m radius get
        their confidence boosted. Unmatched CHM maxima are added as
        lidar-sourced detections.
        """
        if self._chm_data is None:
            return detections

        chm = self._chm_data
        chm_h, chm_w = chm.shape[:2]

        # Find CHM local maxima (simple 5x5 window)
        local_max_positions: list[tuple[int, int, float]] = []
        kernel_r = 2
        for r in range(kernel_r, chm_h - kernel_r):
            for c in range(kernel_r, chm_w - kernel_r):
                patch = chm[r - kernel_r: r + kernel_r + 1, c - kernel_r: c + kernel_r + 1]
                center_val = chm[r, c]
                if center_val > 2.0 and center_val == patch.max():
                    local_max_positions.append((r, c, float(center_val)))

        match_radius_px = self.CHM_MATCH_RADIUS_M / max(resolution_m, 0.01)
        matched_maxima: set[int] = set()

        # Try to match each YOLO detection with a CHM maximum
        for tree in detections:
            best_dist = float("inf")
            best_idx = -1
            for i, (mr, mc, _) in enumerate(local_max_positions):
                dist = np.sqrt((tree.pixel_x - mc) ** 2 + (tree.pixel_y - mr) ** 2)
                if dist < best_dist:
                    best_dist = dist
                    best_idx = i

            if best_dist < match_radius_px and best_idx >= 0:
                matched_maxima.add(best_idx)
                tree.source = DetectionSource.FUSED
                tree.confidence = min(1.0, tree.confidence + self.FUSED_CONFIDENCE_BOOST)
                tree.height_m = local_max_positions[best_idx][2]

        # Add unmatched CHM maxima as lidar-only detections
        for i, (mr, mc, height) in enumerate(local_max_positions):
            if i in matched_maxima:
                continue
            geo_x, geo_y = pixel_to_geo(mc, mr, transform)
            detections.append(TreeDetection(
                tree_id=str(uuid.uuid4())[:8],
                pixel_x=float(mc),
                pixel_y=float(mr),
                geo_x=geo_x,
                geo_y=geo_y,
                confidence=0.6,  # Lower confidence for lidar-only
                height_m=height,
                crown_radius_m=None,
                source=DetectionSource.LIDAR,
            ))

        logger.info(
            "CHM fusion: %d maxima found, %d matched with YOLO, %d added as lidar-only",
            len(local_max_positions),
            len(matched_maxima),
            len(local_max_positions) - len(matched_maxima),
        )
        return detections

    def to_geojson(self, results: dict[str, Any]) -> dict[str, Any]:
        """Convert tree detections to GeoJSON FeatureCollection with per-tree Points."""
        detections = results.get("detections", [])

        features = []
        for det in detections:
            if isinstance(det, dict):
                geo_x = det.get("geo_x", 0)
                geo_y = det.get("geo_y", 0)
                props = {
                    "tree_id": det.get("tree_id", ""),
                    "confidence": round(det.get("confidence", 0), 4),
                    "height_m": det.get("height_m"),
                    "crown_radius_m": det.get("crown_radius_m"),
                    "source": det.get("source", "yolo"),
                }
            else:
                geo_x = det.geo_x
                geo_y = det.geo_y
                props = {
                    "tree_id": det.tree_id,
                    "confidence": round(det.confidence, 4),
                    "height_m": det.height_m,
                    "crown_radius_m": round(det.crown_radius_m, 2) if det.crown_radius_m else None,
                    "source": det.source.value if isinstance(det.source, DetectionSource) else det.source,
                }

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [geo_x, geo_y],
                },
                "properties": props,
            })

        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "module": "tree_count",
                "version": self.version,
                "total_trees": results.get("total_trees", 0),
                "trees_per_hectare": results.get("trees_per_hectare", 0),
                "area_hectares": results.get("area_hectares", 0),
                "has_chm": results.get("has_chm", False),
                "mean_height_m": results.get("mean_height_m"),
            },
        }

    def to_raster(
        self,
        results: dict[str, Any],
        metadata: dict[str, Any],
    ) -> NDArray[np.uint8]:
        """
        Generate a tree density heatmap as a raster (trees per hectare per cell).

        Uses a 50m x 50m grid cell for density computation.
        """
        resolution_m = metadata.get("resolution_m", 0.05)
        image_h = metadata.get("image_height", 2048)
        image_w = metadata.get("image_width", 2048)

        # Density grid: 50m cells
        cell_size_m = 50.0
        cell_size_px = int(cell_size_m / resolution_m)
        grid_h = max(1, image_h // cell_size_px)
        grid_w = max(1, image_w // cell_size_px)
        cell_area_ha = (cell_size_m * cell_size_m) / 10_000.0

        density = np.zeros((grid_h, grid_w), dtype=np.float32)

        detections = results.get("detections", [])
        for det in detections:
            px = det.get("pixel_x", 0) if isinstance(det, dict) else det.pixel_x
            py = det.get("pixel_y", 0) if isinstance(det, dict) else det.pixel_y
            gr = min(int(py // cell_size_px), grid_h - 1)
            gc = min(int(px // cell_size_px), grid_w - 1)
            density[gr, gc] += 1.0

        # Convert counts to trees/hectare
        density /= max(cell_area_ha, 0.001)

        # Scale to uint8 (0-255 representing 0-max_density trees/ha)
        max_density = max(float(density.max()), 1.0)
        raster = (density / max_density * 255).astype(np.uint8)

        return raster

    @staticmethod
    def _result_to_dict(result: TreeCountResult) -> dict[str, Any]:
        """Convert TreeCountResult dataclass to a plain dict."""
        det_dicts = []
        for d in result.detections:
            det_dicts.append({
                "tree_id": d.tree_id,
                "pixel_x": d.pixel_x,
                "pixel_y": d.pixel_y,
                "geo_x": d.geo_x,
                "geo_y": d.geo_y,
                "confidence": d.confidence,
                "height_m": d.height_m,
                "crown_radius_m": d.crown_radius_m,
                "bbox": d.bbox,
                "source": d.source.value if isinstance(d.source, DetectionSource) else d.source,
            })
        return {
            "total_trees": result.total_trees,
            "trees_per_hectare": result.trees_per_hectare,
            "mean_height_m": result.mean_height_m,
            "mean_crown_radius_m": result.mean_crown_radius_m,
            "detections": det_dicts,
            "area_hectares": result.area_hectares,
            "has_chm": result.has_chm,
        }
