"""BeetleSense Inference Service — FastAPI application."""

import logging
import time
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .config import settings
from .models.registry import ModelRegistry
from .models.modules import (
    TreeCountModule,
    SpeciesIDModule,
    AnimalInventoryModule,
    BeetleDetectionModule,
    WildBoarDamageModule,
    Module6Placeholder,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))

registry = ModelRegistry(
    cache_dir=settings.model_cache_dir,
    gpu_memory_limit_mb=settings.gpu_memory_limit_mb,
)

# ---------- Module definitions ----------

MODULE_DEFINITIONS: dict[str, dict[str, Any]] = {
    "tree_count": {
        "class": TreeCountModule,
        "model_path": "models/tree_count_yolov8.onnx",
        "estimated_gpu_mb": 800,
        "description": "Tree count and inventory from drone RGB + optional LiDAR CHM",
        "input_types": ["rgb_orthoimage"],
        "optional_inputs": ["lidar_chm"],
    },
    "species_id": {
        "class": SpeciesIDModule,
        "model_path": "models/species_resnet50.onnx",
        "estimated_gpu_mb": 600,
        "description": "Tree species classification from multispectral imagery + Sentinel-2 phenology",
        "input_types": ["multispectral_image"],
        "optional_inputs": ["sentinel2_ndvi_timeseries", "tree_locations"],
    },
    "animal_inventory": {
        "class": AnimalInventoryModule,
        "model_path": "models/animal_yolov8_dual.onnx",
        "estimated_gpu_mb": 900,
        "description": "Wildlife detection and counting from drone RGB + thermal imagery",
        "input_types": ["rgb_image"],
        "optional_inputs": ["thermal_image"],
    },
    "beetle_detection": {
        "class": BeetleDetectionModule,
        "model_path": "models/beetle_spectral_cnn.onnx",
        "estimated_gpu_mb": 1200,
        "description": "Bark beetle infestation detection (FLAGSHIP) — spectral + VOC dual-modality",
        "input_types": ["multispectral_image"],
        "optional_inputs": ["voc_sensor_csv", "sentinel2_timeseries"],
    },
    "boar_damage": {
        "class": WildBoarDamageModule,
        "model_path": "models/boar_damage_deeplabv3.onnx",
        "estimated_gpu_mb": 700,
        "description": "Wild boar damage assessment from drone RGB orthoimage",
        "input_types": ["rgb_orthoimage"],
        "optional_inputs": [],
    },
    "module_6_placeholder": {
        "class": Module6Placeholder,
        "model_path": "",
        "estimated_gpu_mb": 0,
        "description": "Reserved placeholder for future module",
        "input_types": [],
        "optional_inputs": [],
    },
}


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    """Startup and shutdown lifecycle hooks."""
    logger.info("BeetleSense Inference Service starting...")
    logger.info(
        "GPU memory limit: %d MB, Provider: %s",
        settings.gpu_memory_limit_mb,
        settings.onnx_execution_provider,
    )

    # Register all modules
    for name, defn in MODULE_DEFINITIONS.items():
        module_cls = defn["class"]
        instance = module_cls(model_path=defn["model_path"])
        registry.register(name, instance, estimated_gpu_mb=defn["estimated_gpu_mb"])

    logger.info("Registered %d analysis modules", len(MODULE_DEFINITIONS))
    yield
    logger.info("Shutting down inference service...")
    registry.unload_all()


app = FastAPI(
    title="BeetleSense Inference Service",
    description="ONNX-based geospatial AI analysis modules for forestry and land management",
    version="0.2.0",
    lifespan=lifespan,
)


# ---------- Schemas ----------


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    gpu_provider: str


class RegistryStatusResponse(BaseModel):
    registered: list[str]
    loaded: list[str]
    gpu_usage_mb: int
    gpu_limit_mb: int
    cache_dir: str
    cache_size_files: int


class ModuleInfo(BaseModel):
    """Information about a single analysis module."""
    name: str
    description: str
    version: str
    is_loaded: bool
    estimated_gpu_mb: int
    input_types: list[str]
    optional_inputs: list[str]


class ModulesListResponse(BaseModel):
    """Response listing all available modules."""
    modules: list[ModuleInfo]
    total: int


class InferenceRequest(BaseModel):
    """Request body for inference endpoint."""
    survey_id: str
    input_paths: dict[str, str] = {}
    parameters: dict[str, Any] = {}


class InferenceResponse(BaseModel):
    """Response body from inference endpoint."""
    module: str
    survey_id: str
    status: str
    results: dict[str, Any] = {}
    geojson: dict[str, Any] | None = None
    processing_time_ms: float | None = None


class LegacyInferenceRequest(BaseModel):
    """Legacy request body (v0.1 compat)."""
    module: str
    survey_id: str
    analysis_result_id: str
    storage_path: str
    metadata: dict[str, Any] = {}


class LegacyInferenceResponse(BaseModel):
    """Legacy response body (v0.1 compat)."""
    module: str
    survey_id: str
    analysis_result_id: str
    status: str
    results: dict[str, Any] = {}
    processing_time_ms: float | None = None


class ModuleConfigUpdate(BaseModel):
    """Configuration update for a module."""
    parameters: dict[str, Any] = {}


# ---------- Endpoints ----------


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        service="beetlesense-inference",
        version="0.2.0",
        gpu_provider=settings.onnx_execution_provider,
    )


@app.get("/models", response_model=RegistryStatusResponse)
async def model_registry_status() -> RegistryStatusResponse:
    """Return the current model registry status."""
    status = registry.status()
    return RegistryStatusResponse(**status)


@app.get("/modules", response_model=ModulesListResponse)
async def list_modules() -> ModulesListResponse:
    """List all available analysis modules with their status."""
    modules: list[ModuleInfo] = []

    for name, defn in MODULE_DEFINITIONS.items():
        instance = registry.get(name)
        modules.append(ModuleInfo(
            name=name,
            description=defn["description"],
            version=instance.version if instance else "unknown",
            is_loaded=instance.is_loaded if instance else False,
            estimated_gpu_mb=defn["estimated_gpu_mb"],
            input_types=defn["input_types"],
            optional_inputs=defn["optional_inputs"],
        ))

    return ModulesListResponse(modules=modules, total=len(modules))


@app.post("/infer/{module_name}", response_model=InferenceResponse)
async def infer_module(module_name: str, request: InferenceRequest) -> InferenceResponse:
    """
    Run inference for a specific named module.

    The full pipeline:
        1. Load the module if not already loaded
        2. Download input data from storage paths
        3. Run preprocess -> infer -> postprocess
        4. Generate GeoJSON output
        5. Return structured results

    In development mode, uses mock data; in production, reads from S3.
    """
    start = time.monotonic()

    module_instance = registry.get(module_name)
    if module_instance is None:
        raise HTTPException(
            status_code=404,
            detail=f"Module '{module_name}' is not registered. "
            f"Available: {registry.registered_models}",
        )

    # Ensure module is loaded
    try:
        registry.load(module_name)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    # Build metadata from parameters and input paths
    metadata: dict[str, Any] = {
        "survey_id": request.survey_id,
        "input_paths": request.input_paths,
        **request.parameters,
    }

    # In development: create mock input data
    image_h = request.parameters.get("image_height", 2048)
    image_w = request.parameters.get("image_width", 2048)
    n_channels = request.parameters.get("n_channels", 3)
    mock_image = np.random.randint(
        0, 255, (image_h, image_w, n_channels), dtype=np.uint8
    )

    metadata.setdefault("image_height", image_h)
    metadata.setdefault("image_width", image_w)
    metadata.setdefault("resolution_m", 0.05)

    logger.info(
        "Running inference: module=%s, survey=%s, image=(%d,%d,%d)",
        module_name, request.survey_id, image_h, image_w, n_channels,
    )

    # Run full pipeline
    try:
        results = module_instance.run(mock_image, metadata)
        geojson = module_instance.to_geojson(results)
    except Exception as e:
        logger.exception("Inference failed for module '%s'", module_name)
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(e)}",
        )

    elapsed_ms = (time.monotonic() - start) * 1000

    return InferenceResponse(
        module=module_name,
        survey_id=request.survey_id,
        status="completed",
        results=results,
        geojson=geojson,
        processing_time_ms=round(elapsed_ms, 2),
    )


@app.post("/infer", response_model=LegacyInferenceResponse)
async def infer_legacy(request: LegacyInferenceRequest) -> LegacyInferenceResponse:
    """
    Legacy inference endpoint (v0.1 compatibility).

    Routes to the named module via the updated pipeline.
    """
    start = time.monotonic()

    module_instance = registry.get(request.module)
    if module_instance is None:
        raise HTTPException(
            status_code=404,
            detail=f"Module '{request.module}' is not registered. "
            f"Available modules: {registry.registered_models}",
        )

    try:
        registry.load(request.module)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Module '{request.module}' not found")

    metadata = {"survey_id": request.survey_id, **request.metadata}
    metadata.setdefault("image_height", 1024)
    metadata.setdefault("image_width", 1024)
    metadata.setdefault("resolution_m", 0.05)

    image_h = metadata["image_height"]
    image_w = metadata["image_width"]
    mock_image = np.random.randint(0, 255, (image_h, image_w, 3), dtype=np.uint8)

    try:
        results = module_instance.run(mock_image, metadata)
    except Exception as e:
        logger.exception("Legacy inference failed for module '%s'", request.module)
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    elapsed_ms = (time.monotonic() - start) * 1000

    return LegacyInferenceResponse(
        module=request.module,
        survey_id=request.survey_id,
        analysis_result_id=request.analysis_result_id,
        status="completed",
        results=results,
        processing_time_ms=round(elapsed_ms, 2),
    )


@app.post("/models/{module_name}/load")
async def load_model(module_name: str) -> dict[str, str]:
    """Manually load a model into GPU memory."""
    try:
        registry.load(module_name)
        return {"status": "loaded", "module": module_name}
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"Module '{module_name}' is not registered",
        )


@app.post("/models/{module_name}/unload")
async def unload_model(module_name: str) -> dict[str, str]:
    """Manually unload a model from GPU memory."""
    registry.unload(module_name)
    return {"status": "unloaded", "module": module_name}


@app.get("/modules/{module_name}", response_model=ModuleInfo)
async def get_module_info(module_name: str) -> ModuleInfo:
    """Get detailed information about a specific module."""
    if module_name not in MODULE_DEFINITIONS:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    defn = MODULE_DEFINITIONS[module_name]
    instance = registry.get(module_name)

    return ModuleInfo(
        name=module_name,
        description=defn["description"],
        version=instance.version if instance else "unknown",
        is_loaded=instance.is_loaded if instance else False,
        estimated_gpu_mb=defn["estimated_gpu_mb"],
        input_types=defn["input_types"],
        optional_inputs=defn["optional_inputs"],
    )


@app.put("/modules/{module_name}/config")
async def update_module_config(
    module_name: str, config: ModuleConfigUpdate
) -> dict[str, Any]:
    """Update runtime configuration for a module."""
    instance = registry.get(module_name)
    if instance is None:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    # Apply configuration parameters to the module instance
    applied: dict[str, Any] = {}
    for key, value in config.parameters.items():
        if hasattr(instance, key.upper()):
            setattr(instance, key.upper(), value)
            applied[key] = value
        elif hasattr(instance, key):
            setattr(instance, key, value)
            applied[key] = value
        else:
            logger.warning(
                "Config key '%s' not recognized for module '%s'", key, module_name
            )

    return {
        "module": module_name,
        "applied": applied,
        "status": "updated",
    }
