"""Model registry — manages loaded modules and GPU memory."""

import logging
import os
from pathlib import Path
from typing import Any

from .base import BaseModule

logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Tracks loaded ONNX models, handles downloading from S3,
    and manages GPU memory by evicting least-recently-used models.
    """

    def __init__(
        self,
        cache_dir: str,
        gpu_memory_limit_mb: int = 4096,
    ) -> None:
        self._models: dict[str, BaseModule] = {}
        self._load_order: list[str] = []  # LRU tracking
        self._cache_dir = Path(cache_dir)
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._gpu_memory_limit_mb = gpu_memory_limit_mb
        self._estimated_usage_mb: dict[str, int] = {}

    @property
    def loaded_models(self) -> list[str]:
        """List of currently loaded model names."""
        return [name for name, m in self._models.items() if m.is_loaded]

    @property
    def registered_models(self) -> list[str]:
        """List of all registered model names (loaded or not)."""
        return list(self._models.keys())

    def register(
        self,
        name: str,
        module: BaseModule,
        estimated_gpu_mb: int = 512,
    ) -> None:
        """Register a module without loading it."""
        self._models[name] = module
        self._estimated_usage_mb[name] = estimated_gpu_mb
        logger.info(
            "Registered module '%s' (v%s, ~%d MB GPU)",
            name,
            module.version,
            estimated_gpu_mb,
        )

    def get(self, name: str) -> BaseModule | None:
        """Get a registered module by name."""
        return self._models.get(name)

    def load(self, name: str) -> BaseModule:
        """
        Load a model into GPU memory, evicting LRU models if needed.

        Raises:
            KeyError: If the model is not registered.
        """
        if name not in self._models:
            raise KeyError(f"Model '{name}' is not registered")

        module = self._models[name]
        if module.is_loaded:
            # Move to end of LRU list (most recently used)
            if name in self._load_order:
                self._load_order.remove(name)
            self._load_order.append(name)
            return module

        # Check if we need to evict models to free GPU memory
        needed_mb = self._estimated_usage_mb.get(name, 512)
        self._ensure_gpu_capacity(needed_mb)

        logger.info("Loading model '%s' from %s", name, module.model_path)
        module.load()
        self._load_order.append(name)

        return module

    def unload(self, name: str) -> None:
        """Unload a specific model from GPU memory."""
        if name not in self._models:
            return

        module = self._models[name]
        if module.is_loaded:
            module.unload()
            if name in self._load_order:
                self._load_order.remove(name)
            logger.info("Unloaded model '%s'", name)

    def unload_all(self) -> None:
        """Unload all models from GPU memory."""
        for name in list(self._load_order):
            self.unload(name)

    def _current_usage_mb(self) -> int:
        """Estimate current GPU memory usage."""
        return sum(
            self._estimated_usage_mb.get(name, 0)
            for name in self._load_order
            if self._models.get(name, None) is not None
            and self._models[name].is_loaded
        )

    def _ensure_gpu_capacity(self, needed_mb: int) -> None:
        """Evict LRU models until there is enough GPU capacity."""
        while (
            self._current_usage_mb() + needed_mb > self._gpu_memory_limit_mb
            and self._load_order
        ):
            evict_name = self._load_order[0]
            logger.warning(
                "Evicting model '%s' to free GPU memory (current: %d MB, needed: %d MB, limit: %d MB)",
                evict_name,
                self._current_usage_mb(),
                needed_mb,
                self._gpu_memory_limit_mb,
            )
            self.unload(evict_name)

    async def download_from_s3(
        self,
        model_key: str,
        *,
        s3_client: Any | None = None,
        bucket: str = "beetlesense-models",
    ) -> str:
        """
        Download a model file from S3 to local cache.

        Returns the local file path.
        """
        local_path = self._cache_dir / model_key
        if local_path.exists():
            logger.info("Model '%s' found in cache at %s", model_key, local_path)
            return str(local_path)

        local_path.parent.mkdir(parents=True, exist_ok=True)

        # Placeholder: in production, use aiobotocore or similar
        logger.info(
            "Downloading model '%s' from s3://%s/%s to %s",
            model_key,
            bucket,
            model_key,
            local_path,
        )
        # if s3_client:
        #     response = await s3_client.get_object(Bucket=bucket, Key=model_key)
        #     async with aiofiles.open(local_path, 'wb') as f:
        #         await f.write(await response['Body'].read())

        return str(local_path)

    def status(self) -> dict[str, Any]:
        """Return registry status for health/monitoring endpoints."""
        return {
            "registered": self.registered_models,
            "loaded": self.loaded_models,
            "gpu_usage_mb": self._current_usage_mb(),
            "gpu_limit_mb": self._gpu_memory_limit_mb,
            "cache_dir": str(self._cache_dir),
            "cache_size_files": len(list(self._cache_dir.rglob("*")))
            if self._cache_dir.exists()
            else 0,
        }
