import { Controller, Post, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Registration')
@Controller('events')
export class RegistrationController {
  constructor(private registrationService: RegistrationService) {}

  @Post(':id/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for event (Student only)' })
  register(@Param('id') eventId: string, @CurrentUser('id') userId: string) {
    return this.registrationService.register(eventId, userId);
  }

  @Delete(':id/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel registration' })
  cancel(@Param('id') eventId: string, @CurrentUser('id') userId: string) {
    return this.registrationService.cancel(eventId, userId);
  }

  @Get(':id/attendees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event attendees (Organizer/Admin only)' })
  getAttendees(
    @Param('id') eventId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.registrationService.getAttendees(eventId, userId, status, page, limit);
  }
}
