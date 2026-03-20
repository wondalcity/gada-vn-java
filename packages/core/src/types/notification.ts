export type NotificationType =
  | 'JOB_APPLICATION_RECEIVED'
  | 'JOB_APPLICATION_ACCEPTED'
  | 'JOB_APPLICATION_REJECTED'
  | 'CONTRACT_READY'
  | 'CONTRACT_SIGNED'
  | 'ATTENDANCE_MARKED'
  | 'JOB_CANCELLED'
  | 'MANAGER_APPROVED'
  | 'MANAGER_REJECTED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  sentViaFcm: boolean;
  fcmMessageId: string | null;
  createdAt: Date;
}

export interface FcmToken {
  userId: string;
  token: string;
  platform: 'IOS' | 'ANDROID';
  lastSeenAt: Date;
}
