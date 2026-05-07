import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStudentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instituteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() group?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(6) yearOfStudy?: number;
}

export class UpdateOrganizerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organizationInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contacts?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
}
