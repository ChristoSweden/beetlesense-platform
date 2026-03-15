"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Inference service configuration."""

    # Service
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    log_level: str = "info"
    environment: str = "development"

    # Model storage (S3-compatible)
    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "beetlesense-models"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "eu-north-1"

    # Model cache directory (local filesystem)
    model_cache_dir: str = "/tmp/beetlesense-models"

    # GPU settings
    gpu_memory_limit_mb: int = 4096
    onnx_execution_provider: str = "CUDAExecutionProvider"  # or CPUExecutionProvider

    # Supabase (for writing results)
    supabase_url: str = "http://localhost:54321"
    supabase_service_key: str = ""

    model_config = {"env_prefix": "", "env_file": ".env", "extra": "ignore"}


settings = Settings()
