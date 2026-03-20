export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConstructionTrade {
  id: number;
  code: string;
  nameKo: string;
  nameVi: string;
  nameEn: string | null;
}

export interface VnProvince {
  code: string;
  nameVi: string;
  nameEn: string | null;
}

export type SupportedLocale = 'ko' | 'vi' | 'en';
