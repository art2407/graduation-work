import {
  Controller, Get, Param, Query, UseGuards, Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { UniversityService } from './university.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('University Administration')
@Controller('university')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DEAN, UserRole.ADMIN)
@ApiBearerAuth()
export class UniversityController {
  constructor(private universityService: UniversityService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Сводная статистика для администрации' })
  getDashboard(@Query('instituteId') instituteId?: string) {
    return this.universityService.getDashboardStats(instituteId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Список всех мероприятий с фильтрами' })
  @ApiQuery({ name: 'instituteId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getEvents(@Query() query: any) {
    return this.universityService.getEvents(query);
  }

  @Get('events/:id/attendees')
  @ApiOperation({ summary: 'Список участников мероприятия' })
  getAttendees(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.universityService.getEventAttendees(id, page, limit);
  }

  @Get('events/:id/attendees/export')
  @ApiOperation({ summary: 'Экспорт участников в CSV' })
  async exportCsv(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.universityService.exportAttendesCsv(id);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendees-${id}.csv"`);
    // BOM для корректного открытия в Excel
    res.send('﻿' + csv);
  }
}
