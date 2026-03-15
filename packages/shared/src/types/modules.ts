export enum AnalysisModule {
  TREE_COUNT = 'tree_count',
  SPECIES_ID = 'species_id',
  ANIMAL_INVENTORY = 'animal_inventory',
  BEETLE_DETECTION = 'beetle_detection',
  BOAR_DAMAGE = 'boar_damage',
  MODULE_6 = 'module_6',
}

export enum ModuleStatus {
  AVAILABLE = 'available',
  COMING_SOON = 'coming_soon',
  BETA = 'beta',
  DEPRECATED = 'deprecated',
}

export enum SurveyStatus {
  DRAFT = 'draft',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ProcessingPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export type SurveyType = 'drone' | 'smartphone' | 'satellite'

export interface ModuleDefinition {
  id: AnalysisModule
  name: string
  description: string
  status: ModuleStatus
  supportedSurveyTypes: SurveyType[]
  minimumResolutionCm: number | null
  estimatedProcessingMinutes: number
}

export const MODULE_DEFINITIONS: Record<AnalysisModule, ModuleDefinition> = {
  [AnalysisModule.TREE_COUNT]: {
    id: AnalysisModule.TREE_COUNT,
    name: 'Tree Count',
    description: 'Automated tree counting and density mapping from aerial imagery',
    status: ModuleStatus.AVAILABLE,
    supportedSurveyTypes: ['drone', 'satellite'],
    minimumResolutionCm: 50,
    estimatedProcessingMinutes: 15,
  },
  [AnalysisModule.SPECIES_ID]: {
    id: AnalysisModule.SPECIES_ID,
    name: 'Species Identification',
    description: 'Tree and plant species classification using multispectral analysis',
    status: ModuleStatus.AVAILABLE,
    supportedSurveyTypes: ['drone', 'smartphone'],
    minimumResolutionCm: 10,
    estimatedProcessingMinutes: 30,
  },
  [AnalysisModule.ANIMAL_INVENTORY]: {
    id: AnalysisModule.ANIMAL_INVENTORY,
    name: 'Animal Inventory',
    description: 'Wildlife detection and population estimation from thermal and RGB imagery',
    status: ModuleStatus.BETA,
    supportedSurveyTypes: ['drone'],
    minimumResolutionCm: 5,
    estimatedProcessingMinutes: 45,
  },
  [AnalysisModule.BEETLE_DETECTION]: {
    id: AnalysisModule.BEETLE_DETECTION,
    name: 'Bark Beetle Detection',
    description: 'Early detection of bark beetle infestations via canopy stress analysis',
    status: ModuleStatus.AVAILABLE,
    supportedSurveyTypes: ['drone', 'satellite'],
    minimumResolutionCm: 30,
    estimatedProcessingMinutes: 20,
  },
  [AnalysisModule.BOAR_DAMAGE]: {
    id: AnalysisModule.BOAR_DAMAGE,
    name: 'Wild Boar Damage',
    description: 'Detection and mapping of wild boar ground disturbance and crop damage',
    status: ModuleStatus.AVAILABLE,
    supportedSurveyTypes: ['drone', 'smartphone'],
    minimumResolutionCm: 15,
    estimatedProcessingMinutes: 20,
  },
  [AnalysisModule.MODULE_6]: {
    id: AnalysisModule.MODULE_6,
    name: 'Module 6',
    description: 'Reserved for future analysis capability',
    status: ModuleStatus.COMING_SOON,
    supportedSurveyTypes: ['drone', 'smartphone', 'satellite'],
    minimumResolutionCm: null,
    estimatedProcessingMinutes: 0,
  },
}
