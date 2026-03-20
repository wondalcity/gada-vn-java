export type ContractStatus =
  | 'PENDING_WORKER_SIGN'
  | 'PENDING_MANAGER_SIGN'
  | 'FULLY_SIGNED'
  | 'VOID';

export interface Contract {
  id: string;
  applicationId: string;
  jobId: string;
  workerId: string;
  managerId: string;
  contractHtml: string;
  contractPdfS3Key: string | null;
  workerSignatureS3Key: string | null;
  managerSignatureS3Key: string | null;
  workerSignedAt: Date | null;
  managerSignedAt: Date | null;
  workerSignedIp: string | null;
  managerSignedIp: string | null;
  status: ContractStatus;
  createdAt: Date;
  updatedAt: Date;
}
