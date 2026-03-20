import { IsString, IsOptional, IsNumber, IsDateString, IsObject, Min } from 'class-validator';

export class CreateJobDto {
  @IsString()
  siteId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  tradeId?: number;

  @IsDateString()
  workDate: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsNumber()
  @Min(0)
  dailyWage: number;

  @IsNumber()
  @Min(1)
  slotsTotal: number;

  @IsOptional()
  @IsObject()
  benefits?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  requirements?: Record<string, unknown>;
}
