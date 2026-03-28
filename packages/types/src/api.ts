export interface ApiResponse<T> {
  statusCode: number
  data: T
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
