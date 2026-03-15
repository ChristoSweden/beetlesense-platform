"""Spectral analysis utilities for multispectral drone and satellite imagery."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import numpy as np
from numpy.typing import NDArray

logger = logging.getLogger(__name__)


@dataclass
class SpectralStats:
    """Baseline statistics for a spectral band or index."""

    mean: float
    std: float
    min_val: float
    max_val: float
    percentile_2: float
    percentile_98: float


def compute_ndvi(
    nir: NDArray[np.float32],
    red: NDArray[np.float32],
) -> NDArray[np.float32]:
    """
    Compute Normalized Difference Vegetation Index.

    NDVI = (NIR - Red) / (NIR + Red)

    Values range from -1.0 to 1.0.  Healthy vegetation is typically > 0.3.

    Args:
        nir: Near-infrared band array.
        red: Red band array.

    Returns:
        NDVI array with same spatial shape, values in [-1, 1].
    """
    nir = nir.astype(np.float32)
    red = red.astype(np.float32)

    denominator = nir + red
    # Avoid division by zero: set NDVI to 0 where both bands are 0
    valid = denominator != 0
    ndvi = np.where(valid, (nir - red) / denominator, 0.0)

    return np.clip(ndvi, -1.0, 1.0).astype(np.float32)


def compute_chlorophyll_index(
    red_edge: NDArray[np.float32],
    nir: NDArray[np.float32],
) -> NDArray[np.float32]:
    """
    Compute Chlorophyll Index using Red Edge and NIR bands.

    CI_red_edge = (NIR / RedEdge) - 1

    Higher values indicate more chlorophyll / healthier vegetation.
    Bark beetle attack causes chlorophyll degradation, lowering this index.

    Args:
        red_edge: Red Edge band (~720 nm) array.
        nir: Near-infrared band (~780-900 nm) array.

    Returns:
        Chlorophyll index array.
    """
    red_edge = red_edge.astype(np.float32)
    nir = nir.astype(np.float32)

    valid = red_edge > 0
    ci = np.where(valid, (nir / red_edge) - 1.0, 0.0)

    return ci.astype(np.float32)


def compute_moisture_index(
    nir: NDArray[np.float32],
    swir: NDArray[np.float32],
) -> NDArray[np.float32]:
    """
    Compute Normalized Difference Moisture Index (NDMI).

    NDMI = (NIR - SWIR) / (NIR + SWIR)

    Sensitive to water content in vegetation canopy. Beetle-infested trees
    show decreased moisture content.

    Args:
        nir: Near-infrared band array.
        swir: Short-wave infrared band (~1.6 um) array.

    Returns:
        NDMI array with values in [-1, 1].
    """
    nir = nir.astype(np.float32)
    swir = swir.astype(np.float32)

    denominator = nir + swir
    valid = denominator != 0
    ndmi = np.where(valid, (nir - swir) / denominator, 0.0)

    return np.clip(ndmi, -1.0, 1.0).astype(np.float32)


def detect_spectral_anomalies(
    bands: dict[str, NDArray[np.float32]],
    baseline_stats: dict[str, SpectralStats] | None = None,
    z_threshold: float = 2.5,
) -> NDArray[np.float32]:
    """
    Flag spectrally anomalous pixels using multi-band z-score analysis.

    Computes per-pixel anomaly score based on deviation from baseline
    statistics across all provided spectral bands/indices. Pixels with
    high anomaly scores are candidates for vegetation stress.

    Args:
        bands: Dict mapping band/index names to 2D arrays.
            Expected keys include any of: 'ndvi', 'ci', 'ndmi', 'red_edge',
            'nir', 'swir'.
        baseline_stats: Optional baseline statistics per band (from healthy
            reference areas). If None, statistics are computed from the input
            data itself.
        z_threshold: Number of standard deviations to flag as anomalous.

    Returns:
        Per-pixel anomaly probability array in [0, 1].
    """
    if not bands:
        raise ValueError("At least one spectral band must be provided")

    # Get consistent shape from first band
    ref_shape: tuple[int, ...] | None = None
    for name, arr in bands.items():
        if ref_shape is None:
            ref_shape = arr.shape
        elif arr.shape != ref_shape:
            raise ValueError(
                f"Band '{name}' shape {arr.shape} does not match "
                f"reference shape {ref_shape}"
            )
    assert ref_shape is not None

    # Compute or use baseline stats
    if baseline_stats is None:
        baseline_stats = {}
        for name, arr in bands.items():
            flat = arr.flatten()
            valid = flat[np.isfinite(flat)]
            if len(valid) == 0:
                valid = np.array([0.0])
            baseline_stats[name] = SpectralStats(
                mean=float(np.mean(valid)),
                std=float(max(np.std(valid), 1e-6)),
                min_val=float(np.min(valid)),
                max_val=float(np.max(valid)),
                percentile_2=float(np.percentile(valid, 2)),
                percentile_98=float(np.percentile(valid, 98)),
            )

    # Compute per-band z-scores and aggregate
    z_scores = np.zeros(ref_shape, dtype=np.float64)
    n_bands = 0

    for name, arr in bands.items():
        if name not in baseline_stats:
            continue
        stats = baseline_stats[name]
        z = np.abs((arr.astype(np.float64) - stats.mean) / max(stats.std, 1e-6))
        z_scores += z
        n_bands += 1

    if n_bands == 0:
        return np.zeros(ref_shape, dtype=np.float32)

    # Average z-score across bands
    mean_z = z_scores / n_bands

    # Convert to probability using sigmoid-like mapping
    # P(anomaly) transitions from ~0 at z=0 to ~1 at z=2*threshold
    anomaly_prob = 1.0 / (1.0 + np.exp(-(mean_z - z_threshold)))

    logger.info(
        "Spectral anomaly detection: %d bands, mean z-score range [%.2f, %.2f], "
        "%d anomalous pixels (>%.1f sigma)",
        n_bands,
        float(np.min(mean_z)),
        float(np.max(mean_z)),
        int(np.sum(mean_z > z_threshold)),
        z_threshold,
    )

    return anomaly_prob.astype(np.float32)
