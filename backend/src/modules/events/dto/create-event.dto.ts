import {
  IsString, IsNotEmpty, IsDateString, IsOptional,
  IsInt, Min, IsUrl, IsEmail, IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
  @ApiProperty() @IsString() @IsNotEmpty() type: string;
  @ApiProperty() @IsDateString() startAt: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() registrationDeadline?: string;
  @ApiProperty() @IsString() @IsNotEmpty() address: string;
  @ApiProperty() @IsNumber() @Type(() => Number) latitude: number;
  @ApiProperty() @IsNumber() @Type(() => Number) longitude: number;
  @ApiPropertyOptional() @IsOptional() @IsString() instituteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chatLink?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() registrationDeadline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() instituteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chatLink?: string;
}

export class EventQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instituteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
