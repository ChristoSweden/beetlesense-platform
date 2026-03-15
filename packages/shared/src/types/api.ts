export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

export interface ApiError {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
  requestId?: string
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    requestId: string
    timestamp: string
  }
}

export interface ApiErrorResponse {
  error: ApiError
  meta?: {
    requestId: string
    timestamp: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  meta?: {
    requestId: string
    timestamp: string
  }
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
