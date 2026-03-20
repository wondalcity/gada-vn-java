import { IsIn, IsString } from 'class-validator';

export class RegisterFcmDto {
  @IsString()
  token: string;

  @IsIn(['IOS', 'ANDROID'])
  platform: 'IOS' | 'ANDROID';
}
