export type ApplicationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'CONTRACTED';

export interface JobApplication {
  id: string;
  jobId: string;
  workerId: string;
  status: ApplicationStatus;
  appliedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  notes: string | null;
}

export interface ApplicationWithWorker extends JobApplication {
  workerName: string;
  workerPhone: string | null;
  workerAddress: string | null;
  workerExperienceMonths: number;
  workerProfilePictureUrl: string | null;
  lastHiredAt: Date | null;
}
