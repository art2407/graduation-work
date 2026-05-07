import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class StudentProfileDto {
  @ApiProperty() @IsString() @IsNotEmpty() fullName: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instituteId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() group?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(6) yearOfStudy?: number;
}

export class OrganizerProfileDto {
  @ApiProperty() @IsString() @IsNotEmpty() fullName: string;
  @ApiProperty() @IsString() @IsNotEmpty() organizationName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organizationInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contacts?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() position?: string;
}

export class RegisterDto {
  @ApiProperty() @IsString() @IsNotEmpty() login: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string;

  @ApiProperty({ enum: [UserRole.STUDENT, UserRole.ORGANIZER] })
  @IsEnum([UserRole.STUDENT, UserRole.ORGANIZER])
  role: UserRole;

  @ApiPropertyOptional({ type: StudentProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentProfileDto)
  studentProfile?: StudentProfileDto;

  @ApiPropertyOptional({ type: OrganizerProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizerProfileDto)
  organizerProfile?: OrganizerProfileDto;
}
