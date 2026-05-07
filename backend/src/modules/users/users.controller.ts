import { Controller, Get, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateStudentDto, UpdateOrganizerDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateStudentDto | UpdateOrganizerDto,
  ) {
    return this.usersService.updateMe(userId, role as any, dto);
  }

  @Get('me/events-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user events history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getEventsHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getEventsHistory(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile' })
  getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}
