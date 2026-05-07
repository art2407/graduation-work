import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, UserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class ModerateEventDto {
  @ApiPropertyOptional() @IsEnum(['approve', 'reject']) action: 'approve' | 'reject';
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
}

class UpdateUserDto {
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('moderation')
  @ApiOperation({ summary: 'Get events moderation queue' })
  getModerationQueue(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getModerationQueue(page, limit);
  }

  @Put('events/:id/moderate')
  @ApiOperation({ summary: 'Approve or reject event' })
  moderateEvent(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ModerateEventDto,
  ) {
    return this.adminService.moderateEvent(id, adminId, dto.action, dto.rejectionReason);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  getUsers(
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getUsers({ role, status, search }, page, limit);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user (block, change role)' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics' })
  getAnalytics(@Query('period') period?: 'day' | 'week' | 'month' | 'year') {
    return this.adminService.getAnalytics(period);
  }
}
