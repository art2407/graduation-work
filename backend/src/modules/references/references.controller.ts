import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateInstituteDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
}

const EVENT_TYPES = [
  { id: 'academic', name: 'Академическое' },
  { id: 'career', name: 'Карьерное' },
  { id: 'cultural', name: 'Культурное' },
  { id: 'sport', name: 'Спортивное' },
  { id: 'social', name: 'Социальное' },
  { id: 'volunteer', name: 'Волонтёрское' },
  { id: 'hackathon', name: 'Хакатон' },
  { id: 'other', name: 'Другое' },
];

@ApiTags('References')
@Controller('references')
export class ReferencesController {
  constructor(private prisma: PrismaService) {}

  @Get('institutes')
  @ApiOperation({ summary: 'Get institutes dictionary' })
  async getInstitutes() {
    const institutes = await this.prisma.instituteDict.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { institutes };
  }

  @Post('institutes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create institute (Admin only)' })
  async createInstitute(@Body() dto: CreateInstituteDto) {
    return this.prisma.instituteDict.create({ data: dto });
  }

  @Put('institutes/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle institute active status (Admin only)' })
  async toggleInstitute(@Param('id') id: string) {
    const inst = await this.prisma.instituteDict.findUnique({ where: { id } });
    return this.prisma.instituteDict.update({
      where: { id },
      data: { isActive: !inst?.isActive },
    });
  }

  @Get('event-types')
  @ApiOperation({ summary: 'Get event types' })
  getEventTypes() {
    return { types: EVENT_TYPES };
  }
}
