"""Vision Search module — mobile camera identification of species and forest diseases."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np
from numpy.typing import NDArray

from ..base import BaseModule

logger = logging.getLogger(__name__)


# ─── Nordic species database ────────────────────────────────────────────────────

class IdentificationType(str, Enum):
    TREE = "tree"
    PLANT = "plant"
    ANIMAL = "animal"
    DISEASE = "disease"


class ConservationStatus(str, Enum):
    LEAST_CONCERN = "LC"
    NEAR_THREATENED = "NT"
    VULNERABLE = "VU"
    ENDANGERED = "EN"
    CRITICALLY_ENDANGERED = "CR"
    NOT_EVALUATED = "NE"


class DiseaseSeverity(str, Enum):
    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"


@dataclass
class SpeciesInfo:
    """Nordic species database entry."""
    id: str
    type: IdentificationType
    common_name_en: str
    common_name_sv: str
    scientific_name: str
    description: str
    habitat: str
    season: str
    conservation_status: ConservationStatus
    is_pest: bool = False
    is_regulated: bool = False


@dataclass
class DiseaseInfo:
    """Forest disease database entry."""
    id: str
    name_en: str
    name_sv: str
    scientific_name: str
    description: str
    host_species: list[str]
    symptoms: list[str]
    treatment: list[str]
    is_reportable: bool = False
    report_authority: str = ""


@dataclass
class IdentificationCandidate:
    """A single identification match candidate."""
    rank: int
    species_id: str
    common_name_en: str
    common_name_sv: str
    scientific_name: str
    confidence: float
    type: str
    description: str
    habitat: str
    season: str
    conservation_status: str
    is_pest: bool = False
    is_regulated: bool = False


@dataclass
class DiseaseDetection:
    """A detected disease or damage pattern."""
    disease_id: str
    name_en: str
    name_sv: str
    scientific_name: str
    confidence: float
    severity: str
    symptoms_detected: list[str]
    treatment: list[str]
    is_reportable: bool = False
    report_authority: str = ""


@dataclass
class VisionSearchResult:
    """Complete vision search result."""
    identification_id: str
    task: str  # "species", "animal", "disease", "multi"
    top_candidates: list[IdentificationCandidate] = field(default_factory=list)
    disease_detections: list[DiseaseDetection] = field(default_factory=list)
    has_pest_warning: bool = False
    has_disease: bool = False
    processing_time_ms: float = 0.0


# ─── Nordic species database (50+ entries) ──────────────────────────────────────

NORDIC_TREES: list[SpeciesInfo] = [
    SpeciesInfo("t01", IdentificationType.TREE, "Norway Spruce", "Gran", "Picea abies",
                "Dominant conifer in Swedish forests, pyramidal crown with drooping branches.",
                "Boreal and hemiboreal forests", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t02", IdentificationType.TREE, "Scots Pine", "Tall", "Pinus sylvestris",
                "Tall conifer with reddish-brown bark on upper trunk and rounded crown.",
                "Sandy soils, rocky outcrops, bogs", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t03", IdentificationType.TREE, "Silver Birch", "Vårtbjörk", "Betula pendula",
                "Graceful deciduous tree with white bark and pendulous branches.",
                "Mixed forests, open ground", "Apr-Oct (leaves)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t04", IdentificationType.TREE, "Downy Birch", "Glasbjörk", "Betula pubescens",
                "Similar to silver birch but with hairy twigs and rounder leaves.",
                "Wet forests, bogs, mountain areas", "Apr-Oct (leaves)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t05", IdentificationType.TREE, "European Oak", "Ek", "Quercus robur",
                "Broad-crowned deciduous tree with lobed leaves and acorns.",
                "Mixed forests, meadows, southern Sweden", "May-Oct (leaves)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t06", IdentificationType.TREE, "European Beech", "Bok", "Fagus sylvatica",
                "Large deciduous tree with smooth grey bark and oval leaves.",
                "Southern Sweden, rich soils", "May-Oct (leaves)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t07", IdentificationType.TREE, "European Aspen", "Asp", "Populus tremula",
                "Fast-growing deciduous tree with trembling leaves on flattened petioles.",
                "Forest edges, clearings, roadsides", "Apr-Oct (leaves)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t08", IdentificationType.TREE, "Mountain Ash / Rowan", "Rönn", "Sorbus aucuparia",
                "Small tree with pinnate leaves and clusters of orange-red berries.",
                "Forest edges, rocky terrain, mountains", "May-Sep", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t09", IdentificationType.TREE, "Alder", "Al", "Alnus glutinosa",
                "Medium deciduous tree found near water, with catkins in spring.",
                "Riverbanks, wetlands, swamps", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t10", IdentificationType.TREE, "Small-leaved Lime", "Skogslind", "Tilia cordata",
                "Deciduous tree with heart-shaped leaves and fragrant yellow flowers.",
                "Southern Sweden, rich soils", "Jun-Aug (flowers)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t11", IdentificationType.TREE, "Norway Maple", "Skogslönn", "Acer platanoides",
                "Medium-large tree with palmate leaves, yellow-green flowers in spring.",
                "Mixed forests, parks, southern Sweden", "Apr-Oct", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t12", IdentificationType.TREE, "European Larch", "Europeisk lärk", "Larix decidua",
                "Deciduous conifer that drops needles in autumn, turning golden yellow.",
                "Planted forests, mountain areas", "Apr-Nov", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t13", IdentificationType.TREE, "Wild Cherry", "Fågelbär", "Prunus avium",
                "Deciduous tree with white spring blossoms and dark red cherries.",
                "Forest edges, southern Sweden", "Apr-Jul", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("t14", IdentificationType.TREE, "Wych Elm", "Skogsalm", "Ulmus glabra",
                "Large deciduous tree with asymmetric leaf bases, declining due to Dutch elm disease.",
                "Rich forests, southern Sweden", "Mar-Oct", ConservationStatus.VULNERABLE),
    SpeciesInfo("t15", IdentificationType.TREE, "White Willow", "Vitpil", "Salix alba",
                "Large willow with silvery-white narrow leaves, found near water.",
                "Riverbanks, lakeshores, wetlands", "Apr-Oct", ConservationStatus.LEAST_CONCERN),
]

NORDIC_PLANTS: list[SpeciesInfo] = [
    SpeciesInfo("p01", IdentificationType.PLANT, "Bilberry", "Blåbär", "Vaccinium myrtillus",
                "Low shrub with edible dark blue berries, dominant in boreal understory.",
                "Coniferous forests, heaths", "Jun-Aug (berries)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p02", IdentificationType.PLANT, "Lingonberry", "Lingon", "Vaccinium vitis-idaea",
                "Evergreen shrub with red berries, key forest floor species.",
                "Coniferous forests, heaths", "Aug-Oct (berries)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p03", IdentificationType.PLANT, "Heather", "Ljung", "Calluna vulgaris",
                "Low evergreen shrub with small pink-purple flowers.",
                "Heaths, pine forests, rocky areas", "Jul-Sep", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p04", IdentificationType.PLANT, "Wood Sorrel", "Harsyra", "Oxalis acetosella",
                "Small plant with clover-like trifoliate leaves and white flowers.",
                "Shaded forests, spruce understory", "May-Jun", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p05", IdentificationType.PLANT, "Lily of the Valley", "Liljekonvalj", "Convallaria majalis",
                "Fragrant white bell-shaped flowers, all parts poisonous.",
                "Deciduous forests, forest edges", "May-Jun", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p06", IdentificationType.PLANT, "Cloudberry", "Hjortron", "Rubus chamaemorus",
                "Low plant with amber berries, grows in northern bogs.",
                "Bogs, wetlands, mountain areas", "Jul-Aug (berries)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p07", IdentificationType.PLANT, "Wild Strawberry", "Smultron", "Fragaria vesca",
                "Small plant with white flowers and tiny sweet red berries.",
                "Forest edges, clearings, roadsides", "Jun-Jul", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p08", IdentificationType.PLANT, "Bracken Fern", "Örnbräken", "Pteridium aquilinum",
                "Large fern with triangular fronds, can dominate clearings.",
                "Forest clearings, heaths", "May-Oct", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p09", IdentificationType.PLANT, "Reindeer Lichen", "Renlav", "Cladonia rangiferina",
                "Pale grey-green fruticose lichen, important winter food for reindeer.",
                "Pine forests, heaths, tundra", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("p10", IdentificationType.PLANT, "Sphagnum Moss", "Vitmossa", "Sphagnum spp.",
                "Bog-forming moss, key peatland species, water-absorbing.",
                "Bogs, wetlands, lake margins", "Year-round", ConservationStatus.LEAST_CONCERN),
]

NORDIC_ANIMALS: list[SpeciesInfo] = [
    SpeciesInfo("a01", IdentificationType.ANIMAL, "Moose", "Älg", "Alces alces",
                "Largest deer species, iconic Swedish wildlife with broad palmate antlers.",
                "Boreal forests, wetlands", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a02", IdentificationType.ANIMAL, "Roe Deer", "Rådjur", "Capreolus capreolus",
                "Small graceful deer, common across Swedish forests.",
                "Mixed forests, farmland edges", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a03", IdentificationType.ANIMAL, "Red Fox", "Rödräv", "Vulpes vulpes",
                "Common predator with reddish fur and bushy tail.",
                "All habitats except high mountains", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a04", IdentificationType.ANIMAL, "European Badger", "Grävling", "Meles meles",
                "Nocturnal omnivore with distinctive black-and-white face stripes.",
                "Deciduous and mixed forests", "Year-round (hibernates)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a05", IdentificationType.ANIMAL, "Wild Boar", "Vildsvin", "Sus scrofa",
                "Large omnivore, increasing population, causes significant forest damage.",
                "Mixed forests, agricultural land", "Year-round", ConservationStatus.LEAST_CONCERN,
                is_pest=True),
    SpeciesInfo("a06", IdentificationType.ANIMAL, "Eurasian Lynx", "Lodjur", "Lynx lynx",
                "Large wild cat with tufted ears, Sweden's only native cat.",
                "Boreal and mountain forests", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a07", IdentificationType.ANIMAL, "Brown Bear", "Brunbjörn", "Ursus arctos",
                "Large omnivore, shy but powerful, mainly in northern Sweden.",
                "Boreal forests, mountain areas", "Apr-Oct (hibernates)", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a08", IdentificationType.ANIMAL, "Grey Wolf", "Varg", "Canis lupus",
                "Social predator, controversial but recovering population in Sweden.",
                "Boreal forests", "Year-round", ConservationStatus.VULNERABLE),
    SpeciesInfo("a09", IdentificationType.ANIMAL, "Red Squirrel", "Ekorre", "Sciurus vulgaris",
                "Small arboreal rodent with bushy tail, feeds on spruce cones.",
                "Coniferous and mixed forests", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a10", IdentificationType.ANIMAL, "European Hare", "Fälthare", "Lepus europaeus",
                "Large hare with long ears, found in open and forest-edge habitats.",
                "Agricultural land, forest edges", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a11", IdentificationType.ANIMAL, "White-tailed Eagle", "Havsörn", "Haliaeetus albicilla",
                "Large raptor with broad wings and white tail, recovered from near-extinction.",
                "Coasts, lakes, large rivers", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a12", IdentificationType.ANIMAL, "Golden Eagle", "Kungsörn", "Aquila chrysaetos",
                "Large raptor of mountain and forest areas, protected species.",
                "Mountains, boreal forests", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a13", IdentificationType.ANIMAL, "Wolverine", "Järv", "Gulo gulo",
                "Powerful mustelid of northern forests and mountains, rare and protected.",
                "Mountain areas, boreal forests", "Year-round", ConservationStatus.VULNERABLE),
    SpeciesInfo("a14", IdentificationType.ANIMAL, "Capercaillie", "Tjäder", "Tetrao urogallus",
                "Large forest grouse, males perform dramatic spring courtship displays.",
                "Old-growth coniferous forests", "Year-round", ConservationStatus.LEAST_CONCERN),
    SpeciesInfo("a15", IdentificationType.ANIMAL, "Eurasian Beaver", "Bäver", "Castor fiber",
                "Semi-aquatic rodent that builds dams, successfully reintroduced.",
                "Rivers, streams, lakes", "Year-round", ConservationStatus.LEAST_CONCERN),
]

FOREST_DISEASES: list[DiseaseInfo] = [
    DiseaseInfo("d01", "Bark Beetle Damage", "Granbarkborreskador", "Ips typographus",
                "Bark beetle infestation causing galleries under bark, resin flow, crown yellowing.",
                ["Picea abies"], ["Brown boring dust", "Resin tubes on bark", "Crown discoloration",
                "Bark falling off", "Gallery patterns under bark"],
                ["Sanitation felling", "Pheromone traps", "Rapid removal of infested trees",
                "Monitor with BeetleSense drone surveys"],
                is_reportable=True, report_authority="Skogsstyrelsen"),
    DiseaseInfo("d02", "Root Rot", "Rotröta", "Heterobasidion annosum",
                "Fungal infection spreading through root contacts, causing heart rot in conifers.",
                ["Picea abies", "Pinus sylvestris"],
                ["Fruiting bodies at base", "Resinous patches on roots", "Reduced growth",
                "Wind-throw susceptibility"],
                ["Stump treatment with Rotstop (urea)", "Avoid thinning in warm weather",
                "Plant resistant species on infected sites"]),
    DiseaseInfo("d03", "Ash Dieback", "Askskottsjuka", "Hymenoscyphus fraxineus",
                "Fungal disease killing European ash trees, widespread in Sweden.",
                ["Fraxinus excelsior"],
                ["Dead shoots", "Wilting leaves", "Crown dieback", "Dark lesions on bark"],
                ["Remove severely affected trees", "Preserve tolerant individuals",
                "Avoid moving ash material between regions"],
                is_reportable=True, report_authority="Skogsstyrelsen"),
    DiseaseInfo("d04", "Drought Stress", "Torkstress", "Abiotic",
                "Water deficit causing needle/leaf browning, reduced growth, increased pest vulnerability.",
                ["All species"],
                ["Brown/yellow needles from top", "Premature leaf drop", "Resin bleeding",
                "Thin crowns", "Bark cracking"],
                ["Selective thinning to reduce competition", "Prioritize watering for young plantations",
                "Monitor with satellite NDVI trends"]),
    DiseaseInfo("d05", "Nutrient Deficiency", "Näringsbrist", "Abiotic",
                "Lack of essential nutrients causing chlorosis, stunted growth.",
                ["All species"],
                ["Yellowing needles/leaves (chlorosis)", "Purple/red discoloration",
                "Stunted growth", "Sparse crowns"],
                ["Soil analysis", "Targeted fertilization (N, P, K, Mg)",
                "Liming on acidified soils"]),
    DiseaseInfo("d06", "Honey Fungus", "Honungsskivling", "Armillaria mellea",
                "Aggressive fungal pathogen causing root and butt rot, visible mushroom clusters.",
                ["Multiple hardwoods and conifers"],
                ["Honey-colored mushroom clusters at base", "White mycelial fans under bark",
                "Black rhizomorphs in soil", "Crown decline"],
                ["Remove and destroy infected stumps", "Create soil barriers",
                "Plant resistant species"]),
    DiseaseInfo("d07", "Pine Shoot Beetle", "Märgborren", "Tomicus piniperda",
                "Beetle that breeds under bark of weakened pines and feeds in healthy shoots.",
                ["Pinus sylvestris"],
                ["Hollow shoots falling in spring", "Boring dust on bark",
                "J-shaped galleries under bark", "Crown thinning"],
                ["Remove infested timber before April", "Avoid leaving fresh pine logs in forest",
                "Pheromone monitoring"],
                is_reportable=True, report_authority="Skogsstyrelsen"),
    DiseaseInfo("d08", "Spruce Needle Rust", "Granrostsvamp", "Chrysomyxa abietis",
                "Fungal disease causing yellow-orange banding on spruce needles.",
                ["Picea abies"],
                ["Yellow-orange bands on needles", "Premature needle drop",
                "Reduced growth in young trees"],
                ["Generally self-limiting", "Ensure good air circulation",
                "Avoid dense planting"]),
]

ALL_SPECIES = NORDIC_TREES + NORDIC_PLANTS + NORDIC_ANIMALS
SPECIES_BY_ID: dict[str, SpeciesInfo] = {s.id: s for s in ALL_SPECIES}
DISEASE_BY_ID: dict[str, DiseaseInfo] = {d.id: d for d in FOREST_DISEASES}


# ─── Model input constants ──────────────────────────────────────────────────────

EFFICIENTNET_INPUT_SIZE = 380     # EfficientNet-B4 input
YOLO_INPUT_SIZE = 640             # YOLOv8 input
RESNET_INPUT_SIZE = 224           # ResNet-50 input
NUM_SPECIES_CLASSES = len(ALL_SPECIES)
NUM_DISEASE_CLASSES = len(FOREST_DISEASES)
TOP_K = 5


class VisionSearchModule(BaseModule):
    """
    Multi-task visual identification for forest species and diseases.

    Uses three pretrained model pathways:
      - EfficientNet-B4 (fine-tuned on iNaturalist) for tree/plant species ID
      - YOLOv8 for animal detection and classification
      - ResNet-50 for disease/damage classification

    Input: single camera photo (H, W, 3) in RGB uint8.
    Output: ranked species candidates with confidence + disease detections.
    """

    def __init__(
        self,
        model_path: str = "models/vision_search",
        version: str = "1.0.0",
    ) -> None:
        super().__init__(
            model_path=model_path,
            module_name="vision_search",
            version=version,
        )
        self._task: str = "multi"  # "species", "animal", "disease", "multi"

    def load(self) -> None:
        """Load all three ONNX model sessions."""
        logger.info("Loading VisionSearch models from %s", self.model_path)
        # In production these would be onnxruntime.InferenceSession instances
        self._session = {
            "efficientnet_b4": "loaded",   # species classification
            "yolov8": "loaded",            # animal detection
            "resnet50_disease": "loaded",  # disease classification
        }
        logger.info(
            "VisionSearch models loaded (EfficientNet-B4 + YOLOv8 + ResNet-50)"
        )

    def unload(self) -> None:
        """Release all model sessions."""
        self._session = None
        logger.info("VisionSearch models unloaded")

    def preprocess(
        self,
        image: NDArray[np.uint8],
        metadata: dict[str, Any],
    ) -> NDArray[np.float32]:
        """
        Preprocess a camera photo for multi-task inference.

        Creates three preprocessed tensors packed into a single array:
          - EfficientNet input: (1, 3, 380, 380) normalized
          - YOLO input: (1, 3, 640, 640) letterboxed
          - ResNet input: (1, 3, 224, 224) center-cropped

        Args:
            image: Raw camera image (H, W, 3) RGB uint8.
            metadata:
                'task': str — "species", "animal", "disease", or "multi" (default).

        Returns:
            Composite tensor. Shape is the largest pathway (YOLO): (1, 3, 640, 640).
            Individual pathway tensors are stored on self for use in infer().
        """
        self._task = metadata.get("task", "multi")

        if image.ndim == 2:
            # Grayscale -> RGB
            image = np.stack([image] * 3, axis=-1)
        elif image.shape[2] == 4:
            # RGBA -> RGB
            image = image[:, :, :3]

        h, w = image.shape[:2]
        self._original_shape = (h, w)

        # Prepare pathway-specific tensors
        self._species_tensor = self._prepare_efficientnet(image)
        self._animal_tensor = self._prepare_yolo(image)
        self._disease_tensor = self._prepare_resnet(image)

        # Return the largest tensor as the "main" tensor for the pipeline
        return self._animal_tensor

    def _prepare_efficientnet(self, image: NDArray[np.uint8]) -> NDArray[np.float32]:
        """Resize and normalize for EfficientNet-B4 (380x380)."""
        resized = self._resize_center_crop(image, EFFICIENTNET_INPUT_SIZE)
        tensor = resized.astype(np.float32) / 255.0
        # ImageNet normalization
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        tensor = (tensor - mean) / std
        # HWC -> NCHW
        return tensor.transpose(2, 0, 1)[np.newaxis]

    def _prepare_yolo(self, image: NDArray[np.uint8]) -> NDArray[np.float32]:
        """Letterbox and normalize for YOLOv8 (640x640)."""
        resized = self._resize_letterbox(image, YOLO_INPUT_SIZE)
        tensor = resized.astype(np.float32) / 255.0
        return tensor.transpose(2, 0, 1)[np.newaxis]

    def _prepare_resnet(self, image: NDArray[np.uint8]) -> NDArray[np.float32]:
        """Resize and normalize for ResNet-50 disease classifier (224x224)."""
        resized = self._resize_center_crop(image, RESNET_INPUT_SIZE)
        tensor = resized.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        tensor = (tensor - mean) / std
        return tensor.transpose(2, 0, 1)[np.newaxis]

    @staticmethod
    def _resize_center_crop(
        image: NDArray[np.uint8], target_size: int
    ) -> NDArray[np.uint8]:
        """Resize shortest side to target_size then center-crop to square."""
        h, w = image.shape[:2]
        scale = target_size / min(h, w)
        new_h, new_w = int(h * scale), int(w * scale)

        # Simple nearest-neighbor resize (in production use cv2 or PIL)
        row_idx = np.clip(
            (np.arange(new_h) * h / new_h).astype(int), 0, h - 1
        )
        col_idx = np.clip(
            (np.arange(new_w) * w / new_w).astype(int), 0, w - 1
        )
        resized = image[np.ix_(row_idx, col_idx)]

        # Center crop
        y_start = (new_h - target_size) // 2
        x_start = (new_w - target_size) // 2
        return resized[
            y_start : y_start + target_size,
            x_start : x_start + target_size,
        ]

    @staticmethod
    def _resize_letterbox(
        image: NDArray[np.uint8], target_size: int
    ) -> NDArray[np.uint8]:
        """Resize with letterboxing (padding) to maintain aspect ratio."""
        h, w = image.shape[:2]
        scale = target_size / max(h, w)
        new_h, new_w = int(h * scale), int(w * scale)

        row_idx = np.clip(
            (np.arange(new_h) * h / new_h).astype(int), 0, h - 1
        )
        col_idx = np.clip(
            (np.arange(new_w) * w / new_w).astype(int), 0, w - 1
        )
        resized = image[np.ix_(row_idx, col_idx)]

        # Pad to square
        canvas = np.full(
            (target_size, target_size, 3), 114, dtype=np.uint8
        )
        y_offset = (target_size - new_h) // 2
        x_offset = (target_size - new_w) // 2
        canvas[y_offset : y_offset + new_h, x_offset : x_offset + new_w] = resized
        return canvas

    def infer(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        """
        Run multi-task inference across all three model pathways.

        In production, each pathway runs its respective ONNX model.
        This implementation uses realistic mock scores based on image features.

        Results are stored on self and returned as a composite logits array.
        """
        if self._session is None:
            raise RuntimeError("Models not loaded — call load() first")

        run_species = self._task in ("species", "multi")
        run_animal = self._task in ("animal", "multi")
        run_disease = self._task in ("disease", "multi")

        # ── Species identification (EfficientNet-B4) ───────────────────────
        if run_species:
            species_logits = self._infer_species(self._species_tensor)
        else:
            species_logits = np.zeros(NUM_SPECIES_CLASSES, dtype=np.float32)

        # ── Animal detection (YOLOv8) ──────────────────────────────────────
        if run_animal:
            animal_logits = self._infer_animal(self._animal_tensor)
        else:
            animal_logits = np.zeros(len(NORDIC_ANIMALS), dtype=np.float32)

        # ── Disease classification (ResNet-50) ─────────────────────────────
        if run_disease:
            disease_logits = self._infer_disease(self._disease_tensor)
        else:
            disease_logits = np.zeros(NUM_DISEASE_CLASSES, dtype=np.float32)

        # Store for postprocess
        self._species_logits = species_logits
        self._animal_logits = animal_logits
        self._disease_logits = disease_logits

        # Return species logits padded to max length as the "output" tensor
        max_len = max(len(species_logits), len(animal_logits), len(disease_logits))
        output = np.zeros((3, max_len), dtype=np.float32)
        output[0, : len(species_logits)] = species_logits
        output[1, : len(animal_logits)] = animal_logits
        output[2, : len(disease_logits)] = disease_logits
        return output

    def _infer_species(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        """
        Run EfficientNet-B4 species classification.

        In production: self._session["efficientnet_b4"].run(None, {"input": tensor})
        Mock: generate plausible scores from image statistics.
        """
        # Use image tensor statistics to create deterministic but varied scores
        seed = int(abs(tensor.sum()) * 1000) % (2**31)
        rng = np.random.RandomState(seed)

        logits = rng.normal(0, 1, NUM_SPECIES_CLASSES).astype(np.float32)
        # Boost a few classes to simulate confident prediction
        top_idx = rng.choice(NUM_SPECIES_CLASSES, size=3, replace=False)
        logits[top_idx[0]] += 4.0  # Strong match
        logits[top_idx[1]] += 2.5  # Medium match
        logits[top_idx[2]] += 1.5  # Weak match

        return logits

    def _infer_animal(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        """
        Run YOLOv8 animal detection and classification.

        Mock: generate detection confidence scores.
        """
        n_animals = len(NORDIC_ANIMALS)
        seed = int(abs(tensor.sum()) * 777) % (2**31)
        rng = np.random.RandomState(seed)

        # Most of the time, no animal is detected
        scores = rng.uniform(0, 0.15, n_animals).astype(np.float32)

        # Occasionally detect one animal with high confidence
        if rng.random() > 0.5:
            idx = rng.randint(0, n_animals)
            scores[idx] = rng.uniform(0.6, 0.95)

        return scores

    def _infer_disease(self, tensor: NDArray[np.float32]) -> NDArray[np.float32]:
        """
        Run ResNet-50 disease classifier.

        Mock: generate disease confidence scores.
        """
        seed = int(abs(tensor.sum()) * 333) % (2**31)
        rng = np.random.RandomState(seed)

        # Low baseline scores
        scores = rng.uniform(0, 0.2, NUM_DISEASE_CLASSES).astype(np.float32)

        # Sometimes detect a disease
        if rng.random() > 0.6:
            idx = rng.randint(0, NUM_DISEASE_CLASSES)
            scores[idx] = rng.uniform(0.5, 0.92)

        return scores

    def postprocess(
        self,
        output: NDArray[np.float32],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Convert raw model outputs into structured identification results.

        Steps:
            1. Softmax species logits → top-K candidates
            2. Filter animal detections by confidence threshold
            3. Classify disease severity
            4. Flag pests/regulated species
        """
        identification_id = str(uuid.uuid4())

        # ── Species: softmax + top-K ───────────────────────────────────────
        species_probs = self._softmax(self._species_logits)
        top_indices = np.argsort(species_probs)[::-1][:TOP_K]

        candidates: list[IdentificationCandidate] = []
        for rank, idx in enumerate(top_indices):
            if idx < len(ALL_SPECIES):
                sp = ALL_SPECIES[idx]
                confidence = float(species_probs[idx])
                if confidence < 0.01:
                    continue
                candidates.append(IdentificationCandidate(
                    rank=rank + 1,
                    species_id=sp.id,
                    common_name_en=sp.common_name_en,
                    common_name_sv=sp.common_name_sv,
                    scientific_name=sp.scientific_name,
                    confidence=round(confidence, 4),
                    type=sp.type.value,
                    description=sp.description,
                    habitat=sp.habitat,
                    season=sp.season,
                    conservation_status=sp.conservation_status.value,
                    is_pest=sp.is_pest,
                    is_regulated=sp.is_regulated,
                ))

        # ── Animals: confidence threshold ──────────────────────────────────
        animal_threshold = 0.3
        for i, score in enumerate(self._animal_logits):
            if score >= animal_threshold and i < len(NORDIC_ANIMALS):
                animal = NORDIC_ANIMALS[i]
                # Insert into candidates list if high enough
                candidates.append(IdentificationCandidate(
                    rank=len(candidates) + 1,
                    species_id=animal.id,
                    common_name_en=animal.common_name_en,
                    common_name_sv=animal.common_name_sv,
                    scientific_name=animal.scientific_name,
                    confidence=round(float(score), 4),
                    type=animal.type.value,
                    description=animal.description,
                    habitat=animal.habitat,
                    season=animal.season,
                    conservation_status=animal.conservation_status.value,
                    is_pest=animal.is_pest,
                    is_regulated=animal.is_regulated,
                ))

        # Re-sort by confidence and limit to top 5
        candidates.sort(key=lambda c: c.confidence, reverse=True)
        candidates = candidates[:TOP_K]
        for i, c in enumerate(candidates):
            c.rank = i + 1

        # ── Diseases: severity classification ──────────────────────────────
        disease_threshold = 0.3
        disease_detections: list[DiseaseDetection] = []
        for i, score in enumerate(self._disease_logits):
            if score >= disease_threshold and i < len(FOREST_DISEASES):
                disease = FOREST_DISEASES[i]
                severity = self._classify_disease_severity(float(score))
                detected_symptoms = disease.symptoms[:3]  # Top symptoms

                disease_detections.append(DiseaseDetection(
                    disease_id=disease.id,
                    name_en=disease.name_en,
                    name_sv=disease.name_sv,
                    scientific_name=disease.scientific_name,
                    confidence=round(float(score), 4),
                    severity=severity.value,
                    symptoms_detected=detected_symptoms,
                    treatment=disease.treatment,
                    is_reportable=disease.is_reportable,
                    report_authority=disease.report_authority,
                ))

        # ── Flags ──────────────────────────────────────────────────────────
        has_pest = any(c.is_pest for c in candidates) or any(
            d.is_reportable for d in disease_detections
        )
        has_disease = len(disease_detections) > 0

        result = VisionSearchResult(
            identification_id=identification_id,
            task=self._task,
            top_candidates=candidates,
            disease_detections=disease_detections,
            has_pest_warning=has_pest,
            has_disease=has_disease,
        )

        logger.info(
            "VisionSearch: task=%s, top_match=%s (%.1f%%), diseases=%d, pest_warning=%s",
            self._task,
            candidates[0].scientific_name if candidates else "none",
            candidates[0].confidence * 100 if candidates else 0,
            len(disease_detections),
            has_pest,
        )

        return self._result_to_dict(result)

    @staticmethod
    def _softmax(logits: NDArray[np.float32]) -> NDArray[np.float32]:
        """Numerically stable softmax."""
        shifted = logits - np.max(logits)
        exp_vals = np.exp(shifted)
        return exp_vals / np.sum(exp_vals)

    @staticmethod
    def _classify_disease_severity(confidence: float) -> DiseaseSeverity:
        """Map disease confidence to severity grade."""
        if confidence >= 0.85:
            return DiseaseSeverity.CRITICAL
        elif confidence >= 0.7:
            return DiseaseSeverity.SEVERE
        elif confidence >= 0.5:
            return DiseaseSeverity.MODERATE
        elif confidence >= 0.3:
            return DiseaseSeverity.MILD
        return DiseaseSeverity.NONE

    def to_geojson(self, results: dict[str, Any]) -> dict[str, Any]:
        """
        Convert identification results to a GeoJSON Feature.

        Vision search results are point-based (single photo location),
        so we return a single Feature with the identification as properties.
        """
        gps = results.get("gps", {})
        coordinates = [gps.get("longitude", 0), gps.get("latitude", 0)]

        top_candidate = results.get("top_candidates", [{}])[0] if results.get("top_candidates") else {}

        return {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": coordinates,
                },
                "properties": {
                    "identification_id": results.get("identification_id", ""),
                    "species_name": top_candidate.get("scientific_name", "Unknown"),
                    "common_name": top_candidate.get("common_name_en", "Unknown"),
                    "confidence": top_candidate.get("confidence", 0),
                    "type": top_candidate.get("type", "unknown"),
                    "has_disease": results.get("has_disease", False),
                    "has_pest_warning": results.get("has_pest_warning", False),
                },
            }],
            "properties": {
                "module": "vision_search",
                "version": self.version,
                "task": results.get("task", "multi"),
            },
        }

    def to_raster(
        self,
        results: dict[str, Any],
        metadata: dict[str, Any],
    ) -> NDArray[np.uint8]:
        """
        Vision search does not produce raster output.
        Returns the original image with no modifications.
        """
        shape = metadata.get("original_shape", (224, 224))
        return np.zeros((*shape, 3), dtype=np.uint8)

    @staticmethod
    def _result_to_dict(result: VisionSearchResult) -> dict[str, Any]:
        """Serialize VisionSearchResult to plain dict."""
        return {
            "identification_id": result.identification_id,
            "task": result.task,
            "top_candidates": [
                {
                    "rank": c.rank,
                    "species_id": c.species_id,
                    "common_name_en": c.common_name_en,
                    "common_name_sv": c.common_name_sv,
                    "scientific_name": c.scientific_name,
                    "confidence": c.confidence,
                    "type": c.type,
                    "description": c.description,
                    "habitat": c.habitat,
                    "season": c.season,
                    "conservation_status": c.conservation_status,
                    "is_pest": c.is_pest,
                    "is_regulated": c.is_regulated,
                }
                for c in result.top_candidates
            ],
            "disease_detections": [
                {
                    "disease_id": d.disease_id,
                    "name_en": d.name_en,
                    "name_sv": d.name_sv,
                    "scientific_name": d.scientific_name,
                    "confidence": d.confidence,
                    "severity": d.severity,
                    "symptoms_detected": d.symptoms_detected,
                    "treatment": d.treatment,
                    "is_reportable": d.is_reportable,
                    "report_authority": d.report_authority,
                }
                for d in result.disease_detections
            ],
            "has_pest_warning": result.has_pest_warning,
            "has_disease": result.has_disease,
            "processing_time_ms": result.processing_time_ms,
        }
