"""Species identification module — ResNet-50 classifier with phenological attention."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

import numpy as np
from numpy.typing import NDArray

from ..base import BaseModule
from ...processing.spectral import compute_ndvi

logger = logging.getLogger(__name__)


# Nordic tree species with Swedish common names
NORDIC_SPECIES: list[dict[str, str]] = [
    {"id": "picea_abies", "latin": "Picea abies", "english": "Norway Spruce", "swedish": "Gran"},
    {"id": "pinus_sylvestris", "latin": "Pinus sylvestris", "english": "Scots Pine", "swedish": "Tall"},
    {"id": "betula_pendula", "latin": "Betula pendula", "english": "Birch", "swedish": "Björk"},
    {"id": "quercus_robur", "latin": "Quercus robur", "english": "Oak", "swedish": "Ek"},
    {"id": "fagus_sylvatica", "latin": "Fagus sylvatica", "english": "Beech", "swedish": "Bok"},
    {"id": "alnus_glutinosa", "latin": "Alnus glutinosa", "english": "Alder", "swedish": "Al"},
    {"id": "populus_tremula", "latin": "Populus tremula", "english": "Aspen", "swedish": "Asp"},
    {"id": "other", "latin": "", "english": "Other", "swedish": "Övrigt"},
]

SPECIES_IDS = [s["id"] for s in NORDIC_SPECIES]
NUM_SPECIES = len(NORDIC_SPECIES)


@dataclass
class SpeciesClassification:
    """Classification result for a single tree crown."""
    tree_id: str
    species_id: str
    species_name: str
    confidence: float
    probabilities: dict[str, float] = field(default_factory=dict)
    crown_polygon: list[tuple[float, float]] = field(default_factory=list)
    crown_area_m2: float = 0.0
    phenology_used: bool = False


@dataclass
class SpeciesIDResult:
    """Aggregated species identification results."""
    total_classified: int = 0
    species_distribution: dict[str, int] = field(default_factory=dict)
    classifications: list[SpeciesClassification] = field(default_factory=list)
    phenology_available: bool = False


class SpeciesIDModule(BaseModule):
    """
    Tree species classification from multispectral drone imagery and
    Sentinel-2 NDVI phenological time-series.

    Pipeline:
        1. Load 5-band multispectral (R, G, B, RedEdge, NIR) drone imagery
        2. Load 12-month Sentinel-2 NDVI time-series for phenological features
        3. Extract per-tree crown patches using tree locations from TreeCount
        4. Run ResNet-50 classifier on each crown patch
        5. Apply temporal attention over NDVI phenology for deciduous/conifer disambiguation
        6. Majority vote per crown for final classification
    """

    CROWN_PATCH_SIZE = 64  # pixels per crown patch
    NUM_CLASSES = NUM_SPECIES

    def __init__(
        self,
        model_path: str = "models/species_resnet50.onnx",
        version: str = "1.0.0",
    ) -> None:
        super().__init__(model_path=model_path, module_name="species_id", version=version)
        self._tree_locations: list[dict[str, Any]] = []
        self._ndvi_series: NDArray[np.float32] | None = None

    def load(self) -> None:
        logger.info("Loading SpeciesID ResNet-50 model from %s", self.model_path)
        self._session = {"model": "resnet50_species", "loaded": True}
        logger.info("SpeciesID model loaded")

    def unload(self) -> None:
        self._session = None
        self._tree_locations = []
        self._ndvi_series = None
        logger.info("SpeciesID model unloaded")

    def preprocess(
        self,
        image: NDArray[np.uint8],
        metadata: dict[str, Any],
    ) -> NDArray[np.float32]:
        """
        Prepare per-tree crown patches from multispectral imagery.

        Args:
            image: Multispectral image (H, W, 5) with bands [R, G, B, RE, NIR].
            metadata: Must contain 'tree_locations' list of dicts with pixel_x, pixel_y.
                Optional: 'ndvi_timeseries' (12, H_s2, W_s2) Sentinel-2 monthly NDVI.

        Returns:
            (N_trees, 5, 64, 64) normalized crown patches.
        """
        self._tree_locations = metadata.get("tree_locations", [])
        self._ndvi_series = metadata.get("ndvi_timeseries")

        if image.ndim == 2:
            image = np.stack([image] * 5, axis=-1)
        elif image.shape[2] < 5:
            # Pad missing bands with zeros
            pad = np.zeros((*image.shape[:2], 5 - image.shape[2]), dtype=image.dtype)
            image = np.concatenate([image, pad], axis=2)

        h, w = image.shape[:2]
        n_trees = max(len(self._tree_locations), 1)
        half = self.CROWN_PATCH_SIZE // 2

        patches = np.zeros(
            (n_trees, 5, self.CROWN_PATCH_SIZE, self.CROWN_PATCH_SIZE),
            dtype=np.float32,
        )

        for i, loc in enumerate(self._tree_locations):
            cx = int(loc.get("pixel_x", w // 2))
            cy = int(loc.get("pixel_y", h // 2))

            # Extract patch with boundary clamping
            r0 = max(0, cy - half)
            r1 = min(h, cy + half)
            c0 = max(0, cx - half)
            c1 = min(w, cx + half)

            patch = image[r0:r1, c0:c1, :].astype(np.float32) / 255.0

            # Place in output (handles edge cases where patch is smaller)
            pr0 = half - (cy - r0)
            pc0 = half - (cx - c0)
            patches[i, :, pr0:pr0 + (r1 - r0), pc0:pc0 + (c1 - c0)] = (
                patch.transpose(2, 0, 1)
            )

        logger.info("Preprocessed %d crown patches for species classification", n_trees)
        return patches

    def infer(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        """
        Run ResNet-50 species classifier on crown patches.

        Returns per-tree class probabilities.

        Args:
            tensor: (N, 5, 64, 64) crown patches.

        Returns:
            (N, NUM_SPECIES) probability distributions.
        """
        if self._session is None:
            raise RuntimeError("Model not loaded")

        n = tensor.shape[0]
        # --- MOCK INFERENCE ---
        # Simulate realistic class probabilities with spruce/pine dominance
        rng = np.random.RandomState(seed=123)
        probs = rng.dirichlet(
            alpha=[3.0, 2.5, 1.5, 0.5, 0.3, 0.4, 0.3, 0.2],
            size=n,
        ).astype(np.float32)

        # Add phenological attention modulation if NDVI series available
        if self._ndvi_series is not None:
            # Deciduous trees show NDVI seasonality, conifers are stable
            # This would be a learned attention mechanism in production
            seasonal_amplitude = np.std(self._ndvi_series, axis=0).mean()
            if seasonal_amplitude > 0.15:
                # Boost deciduous species slightly
                probs[:, 2:7] *= 1.1  # Birch, Oak, Beech, Alder, Aspen
                probs = probs / probs.sum(axis=1, keepdims=True)

        return probs

    def postprocess(
        self,
        output: NDArray[np.float32],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Apply majority vote and build per-tree classifications.

        Args:
            output: (N, NUM_SPECIES) probability matrix.
            metadata: Contains 'tree_locations', 'resolution_m'.

        Returns:
            SpeciesIDResult as dict.
        """
        resolution_m = metadata.get("resolution_m", 0.05)
        classifications: list[SpeciesClassification] = []
        species_counts: dict[str, int] = {s["id"]: 0 for s in NORDIC_SPECIES}

        for i in range(output.shape[0]):
            probs = output[i]
            best_idx = int(np.argmax(probs))
            best_species = NORDIC_SPECIES[best_idx]
            confidence = float(probs[best_idx])

            # Build probability dict
            prob_dict = {SPECIES_IDS[j]: float(probs[j]) for j in range(NUM_SPECIES)}

            # Tree location info
            loc = self._tree_locations[i] if i < len(self._tree_locations) else {}
            tree_id = loc.get("tree_id", str(uuid.uuid4())[:8])
            crown_radius = loc.get("crown_radius_m", 3.0)

            # Approximate circular crown polygon (16 vertices)
            cx = loc.get("geo_x", 0.0)
            cy = loc.get("geo_y", 0.0)
            crown_poly: list[tuple[float, float]] = []
            for angle_idx in range(16):
                angle = 2 * np.pi * angle_idx / 16
                px = cx + crown_radius * np.cos(angle)
                py = cy + crown_radius * np.sin(angle)
                crown_poly.append((float(px), float(py)))
            crown_poly.append(crown_poly[0])  # Close polygon

            crown_area = np.pi * crown_radius ** 2

            cls_result = SpeciesClassification(
                tree_id=tree_id,
                species_id=best_species["id"],
                species_name=best_species["english"],
                confidence=confidence,
                probabilities=prob_dict,
                crown_polygon=crown_poly,
                crown_area_m2=crown_area,
                phenology_used=self._ndvi_series is not None,
            )
            classifications.append(cls_result)
            species_counts[best_species["id"]] += 1

        result = SpeciesIDResult(
            total_classified=len(classifications),
            species_distribution={k: v for k, v in species_counts.items() if v > 0},
            classifications=classifications,
            phenology_available=self._ndvi_series is not None,
        )

        logger.info(
            "Species ID: %d trees classified, distribution: %s",
            result.total_classified,
            result.species_distribution,
        )
        return self._result_to_dict(result)

    def to_geojson(self, results: dict[str, Any]) -> dict[str, Any]:
        """Convert to GeoJSON with per-tree crown Polygons."""
        features = []
        for cls in results.get("classifications", []):
            if isinstance(cls, dict):
                crown_poly = cls.get("crown_polygon", [])
                props = {
                    "tree_id": cls.get("tree_id", ""),
                    "species_id": cls.get("species_id", ""),
                    "species_name": cls.get("species_name", ""),
                    "confidence": round(cls.get("confidence", 0), 4),
                    "crown_area_m2": round(cls.get("crown_area_m2", 0), 2),
                    "phenology_used": cls.get("phenology_used", False),
                }
            else:
                crown_poly = cls.crown_polygon
                props = {
                    "tree_id": cls.tree_id,
                    "species_id": cls.species_id,
                    "species_name": cls.species_name,
                    "confidence": round(cls.confidence, 4),
                    "crown_area_m2": round(cls.crown_area_m2, 2),
                    "phenology_used": cls.phenology_used,
                }

            coords = crown_poly if crown_poly else [[0, 0]]

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords],
                },
                "properties": props,
            })

        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "module": "species_id",
                "version": self.version,
                "total_classified": results.get("total_classified", 0),
                "species_distribution": results.get("species_distribution", {}),
                "species_catalog": NORDIC_SPECIES,
            },
        }

    def to_raster(
        self,
        results: dict[str, Any],
        metadata: dict[str, Any],
    ) -> NDArray[np.uint8]:
        """Generate species classification raster (class index per pixel)."""
        image_h = metadata.get("image_height", 2048)
        image_w = metadata.get("image_width", 2048)
        resolution_m = metadata.get("resolution_m", 0.05)

        raster = np.zeros((image_h, image_w), dtype=np.uint8)

        for cls in results.get("classifications", []):
            if isinstance(cls, dict):
                species_id = cls.get("species_id", "other")
                px = int(cls.get("pixel_x", 0)) if "pixel_x" in cls else None
                py = int(cls.get("pixel_y", 0)) if "pixel_y" in cls else None
                crown_r = cls.get("crown_radius_m", 3.0)
            else:
                species_id = cls.species_id
                px, py = None, None
                crown_r = 3.0

            class_idx = SPECIES_IDS.index(species_id) + 1 if species_id in SPECIES_IDS else NUM_SPECIES
            crown_r_px = int(crown_r / resolution_m)

            if px is not None and py is not None:
                r0 = max(0, py - crown_r_px)
                r1 = min(image_h, py + crown_r_px)
                c0 = max(0, px - crown_r_px)
                c1 = min(image_w, px + crown_r_px)
                for r in range(r0, r1):
                    for c in range(c0, c1):
                        if (r - py) ** 2 + (c - px) ** 2 <= crown_r_px ** 2:
                            raster[r, c] = class_idx

        return raster

    @staticmethod
    def _result_to_dict(result: SpeciesIDResult) -> dict[str, Any]:
        cls_dicts = []
        for c in result.classifications:
            cls_dicts.append({
                "tree_id": c.tree_id,
                "species_id": c.species_id,
                "species_name": c.species_name,
                "confidence": c.confidence,
                "probabilities": c.probabilities,
                "crown_polygon": c.crown_polygon,
                "crown_area_m2": c.crown_area_m2,
                "phenology_used": c.phenology_used,
            })
        return {
            "total_classified": result.total_classified,
            "species_distribution": result.species_distribution,
            "classifications": cls_dicts,
            "phenology_available": result.phenology_available,
        }
