export type JobStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED';

export interface JobBenefits {
  meals?: boolean;
  transport?: boolean;
  accommodation?: boolean;
  insurance?: boolean;
  [key: string]: boolean | undefined;
}

export interface ConstructionSite {
  id: string;
  managerId: string;
  name: string;
  address: string;
  province: string;
  district: string | null;
  lat: number | null;
  lng: number | null;
  siteType: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  siteId: string;
  managerId: string;
  title: string;
  description: string | null;
  tradeId: number | null;
  workDate: Date;
  startTime: string | null;
  endTime: string | null;
  dailyWage: number; // VND as integer
  currency: string;
  benefits: JobBenefits;
  slotsTotal: number;
  slotsFilled: number;
  status: JobStatus;
  slug: string | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobWithSite extends Job {
  site: ConstructionSite;
  distanceKm?: number; // populated when using geo search
}

export interface JobListQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  date?: string; // YYYY-MM-DD
  tradeId?: number;
  minWage?: number;
  maxWage?: number;
  province?: string;
  page?: number;
  limit?: number;
}
