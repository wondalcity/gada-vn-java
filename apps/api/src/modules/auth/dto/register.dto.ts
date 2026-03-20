import { IsIn } from 'class-validator';

export class RegisterDto {
  @IsIn(['WORKER', 'MANAGER'])
  role: 'WORKER' | 'MANAGER';
}
