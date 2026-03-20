export type UserRole = 'WORKER' | 'MANAGER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';

export interface User {
  id: string;
  firebaseUid: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  fullName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  experienceMonths: number;
  primaryTradeId: number | null;
  currentProvince: string | null;
  currentDistrict: string | null;
  lat: number | null;
  lng: number | null;
  idNumber: string | null;
  idFrontS3Key: string | null;
  idBackS3Key: string | null;
  idVerified: boolean;
  idVerifiedAt: Date | null;
  signatureS3Key: string | null;
  profileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagerProfile {
  id: string;
  userId: string;
  businessType: 'INDIVIDUAL' | 'CORPORATE';
  companyName: string | null;
  representativeName: string;
  businessRegNumber: string | null;
  businessRegS3Key: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  province: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerTradeSkill {
  workerId: string;
  tradeId: number;
  years: number;
}
