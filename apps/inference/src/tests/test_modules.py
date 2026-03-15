"""Tests for BeetleSense AI analysis modules.

Covers instantiation, preprocessing, postprocessing, GeoJSON schema validity,
and severity grading thresholds. All tests use mock data — no trained models
or GPU required.
"""

from __future__ import annotations

import json
from typing import Any

import numpy as np
import pytest

from ..models.modules.tree_count import (
    TreeCountModule,
    TreeCountResult,
    DetectionSource,
)
from ..models.modules.species_id import (
    SpeciesIDModule,
    NORDIC_SPECIES,
    SPECIES_IDS,
)
from ..models.modules.animal_inventory import (
    AnimalInventoryModule,
    NORDIC_WILDLIFE,
)
from ..models.modules.beetle_detection import (
    BeetleDetectionModule,
    BeetleSeverity,
    classify_severity,
    VOCReading,
)
from ..models.modules.boar_damage import (
    WildBoarDamageModule,
    DamageType,
)
from ..models.modules.module_6 import Module6Placeholder
from ..processing.tiling import tile_image, apply_nms, Detection
from ..processing.geo_utils import (
    AffineTransform,
    pixel_to_geo,
    geo_to_pixel,
    douglas_peucker,
)
from ..processing.spectral import (
    compute_ndvi,
    compute_chlorophyll_index,
    compute_moisture_index,
    detect_spectral_anomalies,
)


# ========================================================================
# Helpers
# ========================================================================

def _make_metadata(
    image_h: int = 512,
    image_w: int = 512,
    resolution_m: float = 0.1,
) -> dict[str, Any]:
    """Create standard metadata dict for testing."""
    return {
        "transform": {
            "origin_x": 13.0,
            "pixel_width": resolution_m,
            "x_skew": 0.0,
            "origin_y": 57.0,
            "y_skew": 0.0,
            "pixel_height": -resolution_m,
        },
        "resolution_m": resolution_m,
        "image_height": image_h,
        "image_width": image_w,
    }


def _validate_geojson_feature_collection(geojson: dict[str, Any]) -> None:
    """Assert basic GeoJSON FeatureCollection validity."""
    assert geojson["type"] == "FeatureCollection"
    assert "features" in geojson
    assert isinstance(geojson["features"], list)
    for feature in geojson["features"]:
        assert feature["type"] == "Feature"
        assert "geometry" in feature
        assert "properties" in feature
        assert feature["geometry"]["type"] in (
            "Point", "Polygon", "MultiPolygon", "LineString",
        )
        assert "coordinates" in feature["geometry"]


# ========================================================================
# Module instantiation tests
# ========================================================================

class TestModuleInstantiation:
    """Test that all modules can be instantiated and loaded."""

    def test_tree_count_instantiation(self) -> None:
        m = TreeCountModule()
        assert m.module_name == "tree_count"
        assert not m.is_loaded

    def test_species_id_instantiation(self) -> None:
        m = SpeciesIDModule()
        assert m.module_name == "species_id"
        assert not m.is_loaded

    def test_animal_inventory_instantiation(self) -> None:
        m = AnimalInventoryModule()
        assert m.module_name == "animal_inventory"
        assert not m.is_loaded

    def test_beetle_detection_instantiation(self) -> None:
        m = BeetleDetectionModule()
        assert m.module_name == "beetle_detection"
        assert not m.is_loaded

    def test_boar_damage_instantiation(self) -> None:
        m = WildBoarDamageModule()
        assert m.module_name == "boar_damage"
        assert not m.is_loaded

    def test_module_6_instantiation(self) -> None:
        m = Module6Placeholder()
        assert m.module_name == "module_6_placeholder"
        assert not m.is_loaded

    def test_all_modules_load_unload(self) -> None:
        modules = [
            TreeCountModule(),
            SpeciesIDModule(),
            AnimalInventoryModule(),
            BeetleDetectionModule(),
            WildBoarDamageModule(),
            Module6Placeholder(),
        ]
        for m in modules:
            m.load()
            assert m.is_loaded, f"{m.module_name} should be loaded"
            m.unload()
            assert not m.is_loaded, f"{m.module_name} should be unloaded"


# ========================================================================
# Tree Count tests
# ========================================================================

class TestTreeCount:
    """Test TreeCountModule preprocessing and postprocessing."""

    @pytest.fixture
    def module(self) -> TreeCountModule:
        m = TreeCountModule()
        m.load()
        return m

    def test_preprocess_tiles_image(self, module: TreeCountModule) -> None:
        image = np.random.randint(0, 255, (2048, 2048, 3), dtype=np.uint8)
        metadata = _make_metadata(2048, 2048)
        tensor = module.preprocess(image, metadata)
        assert tensor.ndim == 4
        assert tensor.shape[1] == 3  # RGB channels
        assert tensor.shape[2] == 1024
        assert tensor.shape[3] == 1024
        assert tensor.dtype == np.float32
        assert tensor.max() <= 1.0

    def test_full_pipeline(self, module: TreeCountModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        results = module.run(image, metadata)
        assert "total_trees" in results
        assert "detections" in results
        assert isinstance(results["total_trees"], int)
        assert results["total_trees"] >= 0

    def test_geojson_output(self, module: TreeCountModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        results = module.run(image, metadata)
        geojson = module.to_geojson(results)
        _validate_geojson_feature_collection(geojson)
        assert geojson["properties"]["module"] == "tree_count"

        # Each feature should be a Point with tree properties
        for feature in geojson["features"]:
            assert feature["geometry"]["type"] == "Point"
            props = feature["properties"]
            assert "tree_id" in props
            assert "confidence" in props
            assert "source" in props
            assert props["source"] in ("yolo", "lidar", "fused")

    def test_density_raster(self, module: TreeCountModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        results = module.run(image, metadata)
        raster = module.to_raster(results, metadata)
        assert raster.dtype == np.uint8
        assert raster.ndim == 2

    def test_chm_fusion(self, module: TreeCountModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        chm = np.random.uniform(0, 25, (512, 512)).astype(np.float32)
        # Create some distinct peaks
        chm[100, 100] = 20.0
        chm[200, 200] = 18.0
        chm[300, 300] = 22.0

        metadata = _make_metadata(512, 512)
        metadata["chm_data"] = chm
        results = module.run(image, metadata)
        assert results["has_chm"] is True


# ========================================================================
# Species ID tests
# ========================================================================

class TestSpeciesID:
    """Test SpeciesIDModule."""

    @pytest.fixture
    def module(self) -> SpeciesIDModule:
        m = SpeciesIDModule()
        m.load()
        return m

    def test_nordic_species_catalog(self) -> None:
        assert len(NORDIC_SPECIES) == 8
        names = [s["english"] for s in NORDIC_SPECIES]
        assert "Norway Spruce" in names
        assert "Scots Pine" in names
        assert "Birch" in names

    def test_preprocess_with_tree_locations(self, module: SpeciesIDModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 5), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        metadata["tree_locations"] = [
            {"pixel_x": 100, "pixel_y": 100, "tree_id": "t1"},
            {"pixel_x": 200, "pixel_y": 200, "tree_id": "t2"},
        ]
        tensor = module.preprocess(image, metadata)
        assert tensor.shape == (2, 5, 64, 64)

    def test_full_pipeline(self, module: SpeciesIDModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 5), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        metadata["tree_locations"] = [
            {"pixel_x": 100, "pixel_y": 100, "tree_id": "t1", "geo_x": 13.01, "geo_y": 57.01, "crown_radius_m": 3.0},
            {"pixel_x": 300, "pixel_y": 300, "tree_id": "t2", "geo_x": 13.02, "geo_y": 57.02, "crown_radius_m": 2.5},
        ]
        results = module.run(image, metadata)
        assert results["total_classified"] == 2
        for cls in results["classifications"]:
            assert cls["species_id"] in SPECIES_IDS

    def test_geojson_output(self, module: SpeciesIDModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 5), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        metadata["tree_locations"] = [
            {"pixel_x": 100, "pixel_y": 100, "tree_id": "t1", "geo_x": 13.01, "geo_y": 57.01, "crown_radius_m": 3.0},
        ]
        results = module.run(image, metadata)
        geojson = module.to_geojson(results)
        _validate_geojson_feature_collection(geojson)
        assert geojson["properties"]["module"] == "species_id"
        for feature in geojson["features"]:
            assert feature["geometry"]["type"] == "Polygon"
            assert "species_id" in feature["properties"]


# ========================================================================
# Animal Inventory tests
# ========================================================================

class TestAnimalInventory:
    """Test AnimalInventoryModule."""

    @pytest.fixture
    def module(self) -> AnimalInventoryModule:
        m = AnimalInventoryModule()
        m.load()
        return m

    def test_wildlife_catalog(self) -> None:
        assert len(NORDIC_WILDLIFE) == 6
        species = [w["id"] for w in NORDIC_WILDLIFE]
        assert "moose" in species
        assert "wild_boar" in species

    def test_full_pipeline_rgb_only(self, module: AnimalInventoryModule) -> None:
        image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        metadata = _make_metadata(640, 640)
        results = module.run(image, metadata)
        assert "total_detections" in results
        assert results["thermal_available"] is False

    def test_full_pipeline_with_thermal(self, module: AnimalInventoryModule) -> None:
        image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        thermal = np.random.randint(8000, 16000, (640, 640), dtype=np.uint16)
        metadata = _make_metadata(640, 640)
        metadata["thermal_raw"] = thermal
        results = module.run(image, metadata)
        assert results["thermal_available"] is True

    def test_geojson_output(self, module: AnimalInventoryModule) -> None:
        image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        metadata = _make_metadata(640, 640)
        results = module.run(image, metadata)
        geojson = module.to_geojson(results)
        _validate_geojson_feature_collection(geojson)
        assert geojson["properties"]["module"] == "animal_inventory"


# ========================================================================
# Beetle Detection tests (FLAGSHIP)
# ========================================================================

class TestBeetleDetection:
    """Test BeetleDetectionModule — the flagship module."""

    @pytest.fixture
    def module(self) -> BeetleDetectionModule:
        m = BeetleDetectionModule()
        m.load()
        return m

    def test_severity_grading_thresholds(self) -> None:
        """Verify severity classification at exact thresholds."""
        assert classify_severity(0.0) == BeetleSeverity.NONE
        assert classify_severity(0.1) == BeetleSeverity.NONE
        assert classify_severity(0.19) == BeetleSeverity.NONE
        assert classify_severity(0.2) == BeetleSeverity.EARLY
        assert classify_severity(0.35) == BeetleSeverity.EARLY
        assert classify_severity(0.49) == BeetleSeverity.EARLY
        assert classify_severity(0.5) == BeetleSeverity.ACTIVE
        assert classify_severity(0.65) == BeetleSeverity.ACTIVE
        assert classify_severity(0.79) == BeetleSeverity.ACTIVE
        assert classify_severity(0.8) == BeetleSeverity.SEVERE
        assert classify_severity(0.95) == BeetleSeverity.SEVERE
        assert classify_severity(1.0) == BeetleSeverity.SEVERE

    def test_severity_enum_values(self) -> None:
        assert BeetleSeverity.NONE.value == "none"
        assert BeetleSeverity.EARLY.value == "early"
        assert BeetleSeverity.ACTIVE.value == "active"
        assert BeetleSeverity.SEVERE.value == "severe"

    def test_voc_reading_dataclass(self) -> None:
        reading = VOCReading(
            timestamp="2026-03-15T10:00:00Z",
            lat=57.7749,
            lon=13.0250,
            monoterpene_alpha=120.5,
            monoterpene_beta=30.2,
            ethanol=55.0,
            sesquiterpene=20.0,
        )
        assert reading.monoterpene_alpha == 120.5
        assert reading.infestation_prob == 0.0

    def test_spectral_only_mode(self, module: BeetleDetectionModule) -> None:
        """Test with only spectral data, no VOC."""
        image = np.random.randint(0, 255, (256, 256, 5), dtype=np.uint8)
        metadata = _make_metadata(256, 256)
        results = module.run(image, metadata)
        assert results["modality"] == "spectral_only"
        assert results["voc_readings_count"] == 0

    def test_voc_only_mode(self, module: BeetleDetectionModule) -> None:
        """Test with only VOC data, minimal image."""
        image = np.zeros((64, 64, 1), dtype=np.uint8)  # Single-band = not spectral
        metadata = _make_metadata(64, 64)
        metadata["voc_readings"] = [
            {
                "timestamp": "2026-03-15T10:00:00Z",
                "lat": 57.0, "lon": 13.0,
                "monoterpene_alpha": 150.0,
                "monoterpene_beta": 25.0,
                "ethanol": 80.0,
                "sesquiterpene": 35.0,
            },
            {
                "timestamp": "2026-03-15T10:01:00Z",
                "lat": 57.001, "lon": 13.001,
                "monoterpene_alpha": 50.0,
                "monoterpene_beta": 40.0,
                "ethanol": 10.0,
                "sesquiterpene": 5.0,
            },
        ]
        results = module.run(image, metadata)
        assert results["voc_readings_count"] == 2

    def test_dual_modality_mode(self, module: BeetleDetectionModule) -> None:
        """Test with both spectral and VOC data."""
        image = np.random.randint(0, 255, (256, 256, 6), dtype=np.uint8)
        metadata = _make_metadata(256, 256)
        metadata["voc_readings"] = [
            {
                "timestamp": "2026-03-15T10:00:00Z",
                "lat": 57.0, "lon": 13.0,
                "monoterpene_alpha": 100.0,
                "monoterpene_beta": 30.0,
                "ethanol": 60.0,
                "sesquiterpene": 25.0,
            },
        ]
        results = module.run(image, metadata)
        assert results["modality"] == "dual"
        assert results["voc_readings_count"] == 1

    def test_voc_csv_parsing(self, module: BeetleDetectionModule) -> None:
        """Test CSV parsing for VOC data."""
        csv_content = (
            "timestamp,lat,lon,monoterpene_alpha,monoterpene_beta,ethanol,sesquiterpene\n"
            "2026-03-15T10:00:00Z,57.0,13.0,120.5,30.2,55.0,20.0\n"
            "2026-03-15T10:01:00Z,57.001,13.001,80.0,35.0,25.0,10.0\n"
        )
        image = np.random.randint(0, 255, (256, 256, 5), dtype=np.uint8)
        metadata = _make_metadata(256, 256)
        metadata["voc_csv"] = csv_content
        results = module.run(image, metadata)
        assert results["voc_readings_count"] == 2
        assert results["modality"] == "dual"

    def test_geojson_output(self, module: BeetleDetectionModule) -> None:
        image = np.random.randint(0, 255, (256, 256, 5), dtype=np.uint8)
        metadata = _make_metadata(256, 256)
        results = module.run(image, metadata)
        geojson = module.to_geojson(results)
        _validate_geojson_feature_collection(geojson)
        assert geojson["properties"]["module"] == "beetle_detection"

    def test_risk_raster(self, module: BeetleDetectionModule) -> None:
        image = np.random.randint(0, 255, (256, 256, 5), dtype=np.uint8)
        metadata = _make_metadata(256, 256)
        results = module.run(image, metadata)
        raster = module.to_raster(results, metadata)
        assert raster.dtype == np.uint8
        assert raster.ndim == 2

    def test_float32_risk_raster(self, module: BeetleDetectionModule) -> None:
        image = np.random.randint(0, 255, (256, 256, 5), dtype=np.uint8)
        metadata = _make_metadata(256, 256)
        module.run(image, metadata)
        risk = module.get_risk_raster_float32()
        if risk is not None:
            assert risk.dtype == np.float32
            assert risk.min() >= 0.0
            assert risk.max() <= 1.0


# ========================================================================
# Boar Damage tests
# ========================================================================

class TestBoarDamage:
    """Test WildBoarDamageModule."""

    @pytest.fixture
    def module(self) -> WildBoarDamageModule:
        m = WildBoarDamageModule()
        m.load()
        return m

    def test_damage_type_enum(self) -> None:
        assert DamageType.UNDAMAGED.value == "undamaged"
        assert DamageType.ROOTING_DAMAGE.value == "rooting_damage"
        assert DamageType.WALLOWING.value == "wallowing"
        assert DamageType.TRAIL.value == "trail"

    def test_full_pipeline(self, module: WildBoarDamageModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        results = module.run(image, metadata)
        assert "total_zones" in results
        assert "damage_percentage" in results
        assert results["damage_percentage"] >= 0

    def test_geojson_output(self, module: WildBoarDamageModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        results = module.run(image, metadata)
        geojson = module.to_geojson(results)
        _validate_geojson_feature_collection(geojson)
        assert geojson["properties"]["module"] == "boar_damage"

    def test_segmentation_raster(self, module: WildBoarDamageModule) -> None:
        image = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        metadata = _make_metadata(512, 512)
        results = module.run(image, metadata)
        raster = module.to_raster(results, metadata)
        assert raster.dtype == np.uint8
        assert raster.ndim == 2
        # Values should be 0-3 (4 damage classes)
        assert raster.max() <= 3


# ========================================================================
# Module 6 Placeholder tests
# ========================================================================

class TestModule6Placeholder:
    """Test Module6Placeholder returns valid empty results."""

    def test_run_returns_not_implemented(self) -> None:
        m = Module6Placeholder()
        result = m.run(np.zeros((1, 1, 1), dtype=np.uint8), {})
        assert result["status"] == "not_implemented"

    def test_geojson_empty_but_valid(self) -> None:
        m = Module6Placeholder()
        geojson = m.to_geojson({})
        _validate_geojson_feature_collection(geojson)
        assert len(geojson["features"]) == 0

    def test_raster_empty(self) -> None:
        m = Module6Placeholder()
        raster = m.to_raster({}, {})
        assert raster.shape == (1, 1)


# ========================================================================
# Processing utility tests
# ========================================================================

class TestTilingUtils:
    """Test image tiling and NMS."""

    def test_tile_image_basic(self) -> None:
        image = np.random.randint(0, 255, (2048, 2048, 3), dtype=np.uint8)
        tiles = tile_image(image, tile_size=1024, overlap=128)
        assert len(tiles) > 0
        for t in tiles:
            assert t.data.shape[0] == 1024
            assert t.data.shape[1] == 1024

    def test_tile_image_small_image(self) -> None:
        image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        tiles = tile_image(image, tile_size=512, overlap=64)
        assert len(tiles) == 1  # Single tile with padding
        assert tiles[0].data.shape == (512, 512, 3)

    def test_nms_removes_duplicates(self) -> None:
        dets = [
            Detection(x_min=10, y_min=10, x_max=50, y_max=50, confidence=0.9),
            Detection(x_min=12, y_min=12, x_max=52, y_max=52, confidence=0.7),  # Overlaps with first
            Detection(x_min=200, y_min=200, x_max=250, y_max=250, confidence=0.8),  # No overlap
        ]
        result = apply_nms(dets, iou_threshold=0.3)
        assert len(result) == 2  # First and third kept
        assert result[0].confidence == 0.9
        assert result[1].confidence == 0.8

    def test_nms_empty(self) -> None:
        assert apply_nms([], iou_threshold=0.3) == []


class TestGeoUtils:
    """Test geospatial utilities."""

    def test_pixel_to_geo_roundtrip(self) -> None:
        transform = AffineTransform(
            origin_x=13.0, pixel_width=0.001, x_skew=0.0,
            origin_y=57.0, y_skew=0.0, pixel_height=-0.001,
        )
        geo_x, geo_y = pixel_to_geo(100, 200, transform)
        col, row = geo_to_pixel(geo_x, geo_y, transform)
        assert abs(col - 100) < 1e-6
        assert abs(row - 200) < 1e-6

    def test_douglas_peucker_simplification(self) -> None:
        # A line with many intermediate points that are collinear
        coords = [(0.0, 0.0), (1.0, 0.1), (2.0, 0.0), (3.0, 0.1), (4.0, 0.0)]
        simplified = douglas_peucker(coords, tolerance=0.5)
        assert len(simplified) < len(coords)
        assert simplified[0] == coords[0]
        assert simplified[-1] == coords[-1]

    def test_douglas_peucker_preserves_sharp_turns(self) -> None:
        coords = [(0.0, 0.0), (5.0, 10.0), (10.0, 0.0)]
        simplified = douglas_peucker(coords, tolerance=1.0)
        assert len(simplified) == 3  # All points preserved due to sharp angle

    def test_affine_from_bounds(self) -> None:
        transform = AffineTransform.from_bounds(
            west=13.0, south=57.0, east=13.1, north=57.1,
            width_px=1000, height_px=1000,
        )
        assert abs(transform.pixel_width - 0.0001) < 1e-8
        assert transform.pixel_height < 0  # North-up


class TestSpectralUtils:
    """Test spectral analysis functions."""

    def test_ndvi_healthy_vegetation(self) -> None:
        nir = np.full((10, 10), 0.8, dtype=np.float32)
        red = np.full((10, 10), 0.1, dtype=np.float32)
        ndvi = compute_ndvi(nir, red)
        assert ndvi.shape == (10, 10)
        assert np.all(ndvi > 0.5)  # Healthy vegetation has high NDVI

    def test_ndvi_bare_soil(self) -> None:
        nir = np.full((10, 10), 0.3, dtype=np.float32)
        red = np.full((10, 10), 0.3, dtype=np.float32)
        ndvi = compute_ndvi(nir, red)
        assert np.allclose(ndvi, 0.0)  # Equal bands = NDVI 0

    def test_ndvi_division_by_zero(self) -> None:
        nir = np.zeros((5, 5), dtype=np.float32)
        red = np.zeros((5, 5), dtype=np.float32)
        ndvi = compute_ndvi(nir, red)
        assert np.all(ndvi == 0.0)  # No NaN

    def test_chlorophyll_index(self) -> None:
        nir = np.full((10, 10), 0.8, dtype=np.float32)
        re = np.full((10, 10), 0.4, dtype=np.float32)
        ci = compute_chlorophyll_index(re, nir)
        assert ci.shape == (10, 10)
        assert np.all(ci > 0)  # Healthy trees have positive CI

    def test_moisture_index(self) -> None:
        nir = np.full((10, 10), 0.8, dtype=np.float32)
        swir = np.full((10, 10), 0.3, dtype=np.float32)
        ndmi = compute_moisture_index(nir, swir)
        assert ndmi.shape == (10, 10)
        assert np.all(ndmi > 0)  # Healthy vegetation has positive NDMI

    def test_spectral_anomaly_detection(self) -> None:
        rng = np.random.RandomState(42)
        bands = {
            "ndvi": rng.normal(0.6, 0.1, (100, 100)).astype(np.float32),
            "ci": rng.normal(2.0, 0.3, (100, 100)).astype(np.float32),
        }
        # Add a stressed area (low NDVI, low CI)
        bands["ndvi"][40:60, 40:60] = 0.1
        bands["ci"][40:60, 40:60] = 0.5

        anomaly = detect_spectral_anomalies(bands, z_threshold=2.0)
        assert anomaly.shape == (100, 100)
        assert anomaly.dtype == np.float32
        # Stressed area should have higher anomaly probability
        stressed_mean = float(np.mean(anomaly[40:60, 40:60]))
        healthy_mean = float(np.mean(anomaly[:20, :20]))
        assert stressed_mean > healthy_mean


# ========================================================================
# GeoJSON schema validation across all modules
# ========================================================================

class TestGeoJSONSchemaValidity:
    """Comprehensive GeoJSON schema validation for all modules."""

    def test_tree_count_geojson_serializable(self) -> None:
        m = TreeCountModule()
        m.load()
        results = m.run(np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8), _make_metadata(256, 256))
        geojson = m.to_geojson(results)
        serialized = json.dumps(geojson)
        parsed = json.loads(serialized)
        assert parsed["type"] == "FeatureCollection"

    def test_beetle_detection_geojson_serializable(self) -> None:
        m = BeetleDetectionModule()
        m.load()
        results = m.run(np.random.randint(0, 255, (128, 128, 5), dtype=np.uint8), _make_metadata(128, 128))
        geojson = m.to_geojson(results)
        serialized = json.dumps(geojson)
        parsed = json.loads(serialized)
        assert parsed["type"] == "FeatureCollection"

    def test_boar_damage_geojson_serializable(self) -> None:
        m = WildBoarDamageModule()
        m.load()
        results = m.run(np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8), _make_metadata(256, 256))
        geojson = m.to_geojson(results)
        serialized = json.dumps(geojson)
        parsed = json.loads(serialized)
        assert parsed["type"] == "FeatureCollection"

    def test_module_6_geojson_serializable(self) -> None:
        m = Module6Placeholder()
        geojson = m.to_geojson({})
        serialized = json.dumps(geojson)
        parsed = json.loads(serialized)
        assert parsed["type"] == "FeatureCollection"
        assert len(parsed["features"]) == 0
