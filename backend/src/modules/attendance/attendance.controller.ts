import {
  Controller, Get, Post, Param, Body, UseGuards, Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ScanQrDto {
  @ApiProperty({ description: 'Необработанный QR-токен, считанный с экрана студента' })
  @IsString() @IsNotEmpty()
  token: string;
}

@ApiTags('Attendance / QR Check-in')
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('qr/:registrationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить QR-код для регистрации (студент)' })
  @ApiResponse({ status: 200, description: 'PNG Data URL строка QR-кода' })
  async getStudentQr(
    @Param('registrationId') registrationId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const dataUrl = await this.attendanceService.getStudentQr(registrationId, userId);
    res.json({ qrDataUrl: dataUrl });
  }

  @Post('scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отметить участника по QR-коду (организатор или администратор)' })
  scanQr(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: ScanQrDto,
  ) {
    return this.attendanceService.scanQr(dto.token, userId, role);
  }
}
