"""Wild boar damage assessment module — DeepLabv3+ semantic segmentation."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np
from numpy.typing import NDArray

from ..base import BaseModule
from ...processing.tiling import tile_image, merge_tiles
from ...processing.geo_utils import AffineTransform, pixel_to_geo, polygonize_raster

logger = logging.getLogger(__name__)


class DamageType(str, Enum):
    """Wild boar damage classification categories."""
    UNDAMAGED = "undamaged"
    ROOTING_DAMAGE = "rooting_damage"
    WALLOWING = "wallowing"
    TRAIL = "trail"


DAMAGE_CLASS_MAP: dict[int, DamageType] = {
    0: DamageType.UNDAMAGED,
    1: DamageType.ROOTING_DAMAGE,
    2: DamageType.WALLOWING,
    3: DamageType.TRAIL,
}

DAMAGE_CLASS_NAMES: dict[DamageType, str] = {
    DamageType.UNDAMAGED: "Undamaged",
    DamageType.ROOTING_DAMAGE: "Rooting Damage",
    DamageType.WALLOWING: "Wallowing",
    DamageType.TRAIL: "Game Trail",
}


@dataclass
class DamageZone:
    """A contiguous area of a specific damage type."""
    zone_id: str
    damage_type: DamageType
    confidence: float
    area_m2: float
    polygon: list[tuple[float, float]]


@dataclass
class BoarDamageResult:
    """Complete boar damage assessment result."""
    total_zones: int = 0
    damage_zones: list[DamageZone] = field(default_factory=list)
    area_by_type: dict[str, float] = field(default_factory=dict)
    total_damaged_area_m2: float = 0.0
    total_survey_area_m2: float = 0.0
    damage_percentage: float = 0.0


class WildBoarDamageModule(BaseModule):
    """
    Wild boar damage assessment from drone RGB orthoimagery.

    Pipeline:
        1. Tile orthoimage into 512x512 patches
        2. Run DeepLabv3+ semantic segmentation per tile
        3. Stitch predictions into full segmentation map
        4. Polygonize damage extents, filter small polygons (<2m2)
        5. Compute area statistics per damage type
    """

    TILE_SIZE = 512
    TILE_OVERLAP = 64
    NUM_CLASSES = 4
    MIN_ZONE_AREA_M2 = 2.0

    def __init__(
        self,
        model_path: str = "models/boar_damage_deeplabv3.onnx",
        version: str = "1.0.0",
    ) -> None:
        super().__init__(model_path=model_path, module_name="boar_damage", version=version)
        self._tiles: list[Any] = []
        self._image_shape: tuple[int, int] = (0, 0)

    def load(self) -> None:
        logger.info("Loading WildBoarDamage DeepLabv3+ from %s", self.model_path)
        self._session = {"model": "deeplabv3_boar_damage", "loaded": True}
        logger.info("WildBoarDamage model loaded")

    def unload(self) -> None:
        self._session = None
        logger.info("WildBoarDamage model unloaded")

    def preprocess(
        self,
        image: NDArray[np.uint8],
        metadata: dict[str, Any],
    ) -> NDArray[np.float32]:
        """
        Tile RGB orthoimage for segmentation.

        Args:
            image: RGB orthoimage (H, W, 3), uint8.
            metadata: 'transform', 'resolution_m'.

        Returns:
            (N, 3, 512, 512) normalized tile batch.
        """
        if image.ndim == 2:
            image = np.stack([image] * 3, axis=-1)
        elif image.shape[2] > 3:
            image = image[:, :, :3]

        self._image_shape = image.shape[:2]

        tiles = tile_image(image, tile_size=self.TILE_SIZE, overlap=self.TILE_OVERLAP)
        self._tiles = tiles

        batch = np.zeros(
            (len(tiles), 3, self.TILE_SIZE, self.TILE_SIZE), dtype=np.float32
        )
        for i, tile in enumerate(tiles):
            data = tile.data[:, :, :3]
            # ImageNet-style normalization
            normalized = data.astype(np.float32) / 255.0
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            normalized = (normalized - mean) / std
            batch[i] = normalized.transpose(2, 0, 1)

        logger.info("Preprocessed %d tiles for boar damage segmentation", len(tiles))
        return batch

    def infer(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        """
        Run DeepLabv3+ semantic segmentation.

        Returns per-tile class probability maps.

        Args:
            tensor: (N, 3, 512, 512) normalized tile batch.

        Returns:
            (N, NUM_CLASSES, 512, 512) per-tile probability maps.
        """
        if self._session is None:
            raise RuntimeError("Model not loaded")

        n_tiles = tensor.shape[0]
        prob_maps = np.zeros(
            (n_tiles, self.NUM_CLASSES, self.TILE_SIZE, self.TILE_SIZE),
            dtype=np.float32,
        )

        for i in range(n_tiles):
            # --- MOCK INFERENCE ---
            # Generate realistic segmentation with mostly undamaged,
            # scattered rooting patches, rare wallowing/trail
            rng = np.random.RandomState(seed=55 + i)

            # Base: high undamaged probability
            prob_maps[i, 0] = 0.85 + rng.uniform(0, 0.1, (self.TILE_SIZE, self.TILE_SIZE))

            # Add damage patches
            n_patches = rng.randint(0, 4)
            for _ in range(n_patches):
                cx = rng.randint(50, self.TILE_SIZE - 50)
                cy = rng.randint(50, self.TILE_SIZE - 50)
                radius = rng.randint(15, 60)
                damage_class = rng.choice([1, 2, 3], p=[0.6, 0.2, 0.2])

                yy, xx = np.ogrid[-cy:self.TILE_SIZE - cy, -cx:self.TILE_SIZE - cx]
                mask = (xx ** 2 + yy ** 2) <= radius ** 2

                prob_maps[i, damage_class][mask] = rng.uniform(0.6, 0.95)
                prob_maps[i, 0][mask] = rng.uniform(0.05, 0.2)

            # Normalize probabilities
            prob_sum = prob_maps[i].sum(axis=0, keepdims=True)
            prob_sum = np.maximum(prob_sum, 1e-6)
            prob_maps[i] /= prob_sum

        return prob_maps

    def postprocess(
        self,
        output: NDArray[np.float32],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Stitch predictions, polygonize, and compute area stats.
        """
        transform = metadata.get("transform")
        if isinstance(transform, dict):
            transform = AffineTransform(**transform)
        elif transform is None:
            transform = AffineTransform(0, 1, 0, 0, 0, -1)

        resolution_m = metadata.get("resolution_m", 0.05)
        h, w = self._image_shape

        # Stitch per-class probability maps
        full_probs = np.zeros((self.NUM_CLASSES, h, w), dtype=np.float32)

        for cls_idx in range(self.NUM_CLASSES):
            tile_preds = [output[i, cls_idx] for i in range(output.shape[0])]
            positions = [
                (t.row_start, t.col_start, t.row_end, t.col_end)
                for t in self._tiles
            ]
            full_probs[cls_idx] = merge_tiles(tile_preds, positions, (h, w))

        # Argmax classification
        class_map = np.argmax(full_probs, axis=0).astype(np.int32)
        confidence_map = np.max(full_probs, axis=0)

        # Polygonize each damage class (skip undamaged = 0)
        pixel_area_m2 = resolution_m ** 2
        damage_zones: list[DamageZone] = []
        area_by_type: dict[str, float] = {dt.value: 0.0 for dt in DamageType}

        for cls_idx in range(1, self.NUM_CLASSES):
            damage_type = DAMAGE_CLASS_MAP.get(cls_idx, DamageType.UNDAMAGED)

            # Create binary mask for this class
            mask = (class_map == cls_idx).astype(np.int32)
            raw_polys = polygonize_raster(mask, transform, threshold=0.5, min_area_px=4)

            for poly_data in raw_polys:
                area_px = poly_data["area_pixels"]
                area_m2 = area_px * pixel_area_m2

                if area_m2 < self.MIN_ZONE_AREA_M2:
                    continue

                coords = poly_data["geometry"]["coordinates"][0]

                # Mean confidence in this zone
                zone_mask = (class_map == cls_idx)
                mean_conf = float(np.mean(confidence_map[zone_mask])) if zone_mask.any() else 0.0

                damage_zones.append(DamageZone(
                    zone_id=str(uuid.uuid4())[:8],
                    damage_type=damage_type,
                    confidence=mean_conf,
                    area_m2=area_m2,
                    polygon=coords,
                ))
                area_by_type[damage_type.value] += area_m2

        total_survey_area = h * w * pixel_area_m2
        total_damaged = sum(area_by_type[dt.value] for dt in DamageType if dt != DamageType.UNDAMAGED)

        result = BoarDamageResult(
            total_zones=len(damage_zones),
            damage_zones=damage_zones,
            area_by_type=area_by_type,
            total_damaged_area_m2=total_damaged,
            total_survey_area_m2=total_survey_area,
            damage_percentage=(total_damaged / max(total_survey_area, 1)) * 100,
        )

        # Store class map for to_raster
        self._class_map = class_map

        logger.info(
            "Boar damage: %d zones, %.1fm2 damaged (%.1f%%), types: %s",
            result.total_zones,
            result.total_damaged_area_m2,
            result.damage_percentage,
            {k: f"{v:.0f}m2" for k, v in area_by_type.items() if v > 0},
        )

        return self._result_to_dict(result)

    def to_geojson(self, results: dict[str, Any]) -> dict[str, Any]:
        features = []
        for zone in results.get("damage_zones", []):
            if isinstance(zone, dict):
                polygon = zone.get("polygon", [])
                props = {
                    "zone_id": zone.get("zone_id", ""),
                    "damage_type": zone.get("damage_type", "undamaged"),
                    "damage_name": DAMAGE_CLASS_NAMES.get(
                        DamageType(zone.get("damage_type", "undamaged")),
                        "Unknown",
                    ),
                    "confidence": round(zone.get("confidence", 0), 4),
                    "area_m2": round(zone.get("area_m2", 0), 2),
                }
            else:
                polygon = zone.polygon
                props = {
                    "zone_id": zone.zone_id,
                    "damage_type": zone.damage_type.value,
                    "damage_name": DAMAGE_CLASS_NAMES.get(zone.damage_type, "Unknown"),
                    "confidence": round(zone.confidence, 4),
                    "area_m2": round(zone.area_m2, 2),
                }

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [polygon],
                },
                "properties": props,
            })

        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "module": "boar_damage",
                "version": self.version,
                "total_zones": results.get("total_zones", 0),
                "area_by_type": results.get("area_by_type", {}),
                "total_damaged_area_m2": results.get("total_damaged_area_m2", 0),
                "damage_percentage": results.get("damage_percentage", 0),
                "damage_classes": {dt.value: DAMAGE_CLASS_NAMES[dt] for dt in DamageType},
            },
        }

    def to_raster(
        self,
        results: dict[str, Any],
        metadata: dict[str, Any],
    ) -> NDArray[np.uint8]:
        """Return the segmentation class map as uint8 raster."""
        if hasattr(self, "_class_map") and self._class_map is not None:
            return self._class_map.astype(np.uint8)

        image_h = metadata.get("image_height", 2048)
        image_w = metadata.get("image_width", 2048)
        return np.zeros((image_h, image_w), dtype=np.uint8)

    @staticmethod
    def _result_to_dict(result: BoarDamageResult) -> dict[str, Any]:
        zones = []
        for z in result.damage_zones:
            zones.append({
                "zone_id": z.zone_id,
                "damage_type": z.damage_type.value,
                "confidence": z.confidence,
                "area_m2": z.area_m2,
                "polygon": z.polygon,
            })
        return {
            "total_zones": result.total_zones,
            "damage_zones": zones,
            "area_by_type": result.area_by_type,
            "total_damaged_area_m2": result.total_damaged_area_m2,
            "total_survey_area_m2": result.total_survey_area_m2,
            "damage_percentage": result.damage_percentage,
        }
