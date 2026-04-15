import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class GenerateQrDto {
  @ApiProperty() @IsString() @IsNotEmpty() eventId: string;
}

class CheckInDto {
  @ApiProperty() @IsString() @IsNotEmpty() eventId: string;
  @ApiProperty() @IsString() @IsNotEmpty() qrToken: string;
}

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('generate-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate QR code for event check-in (Organizer only)' })
  generateQr(@CurrentUser('id') userId: string, @Body() dto: GenerateQrDto) {
    return this.attendanceService.generateQr(dto.eventId, userId);
  }

  @Post('check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check-in by QR token (Student)' })
  checkIn(@CurrentUser('id') userId: string, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto.qrToken, userId);
  }
}
