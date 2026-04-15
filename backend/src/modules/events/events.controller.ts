import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get events list with filtering' })
  findAll(@Query() query: EventQueryDto, @CurrentUser('id') userId?: string) {
    return this.eventsService.findAll(query, userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organizer own events' })
  getMyEvents(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getMyEvents(userId, page, limit);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get event details' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.eventsService.findOne(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create event (Organizer only)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(userId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event (owner only)' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete event (owner only)' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.eventsService.remove(id, userId);
  }
}
