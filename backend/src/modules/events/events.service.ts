import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, UserRole } from '@prisma/client';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: EventQueryDto, userId?: string) {
    const { page = 1, limit = 20, type, instituteId, status, dateFrom, dateTo, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      status: status ? status as EventStatus : { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
    };

    if (type) where.type = type;
    if (instituteId) where.instituteId = instituteId;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
    if (dateFrom || dateTo) {
      where.startAt = {};
      if (dateFrom) where.startAt.gte = new Date(dateFrom);
      if (dateTo) where.startAt.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' },
        include: {
          organizer: { select: { id: true, organizationName: true } },
          institute: { select: { id: true, name: true } },
          _count: { select: { registrations: true } },
          images: { orderBy: { order: 'asc' }, take: 1 },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: data.map(({ _count, images, ...e }) => ({
        ...e,
        registeredCount: _count.registrations,
        imageUrl: images[0]?.url ?? e.coverImageUrl ?? null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, userId?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id, deletedAt: null },
      include: {
        organizer: { select: { id: true, organizationName: true, contacts: true } },
        institute: { select: { id: true, name: true } },
        images: { orderBy: { order: 'asc' } },
        _count: { select: { registrations: true } },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    let isRegistered = false;
    let isCheckedIn = false;

    if (userId) {
      const reg = await this.prisma.registration.findUnique({
        where: { eventId_userId: { eventId: id, userId } },
      });
      isRegistered = !!reg && reg.status === 'CONFIRMED';
      isCheckedIn = !!reg?.checkedInAt;
    }

    const { _count, ...eventData } = event;
    return {
      ...eventData,
      registeredCount: _count.registrations,
      isRegistered,
      isCheckedIn,
    };
  }

  async create(organizerUserId: string, dto: CreateEventDto) {
    const profile = await this.prisma.organizerProfile.findUnique({
      where: { userId: organizerUserId },
    });

    if (!profile) throw new ForbiddenException('Organizer profile not found');

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        registrationDeadline: dto.registrationDeadline
          ? new Date(dto.registrationDeadline) : undefined,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        instituteId: dto.instituteId,
        capacity: dto.capacity,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        chatLink: dto.chatLink,
        organizerId: profile.id,
        status: EventStatus.MODERATION,
      },
    });

    return { id: event.id, message: 'Event created and sent for moderation', status: event.status };
  }

  async update(id: string, organizerUserId: string, dto: UpdateEventDto) {
    const event = await this.findEventWithOwnerCheck(id, organizerUserId);

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.type && { type: dto.type }),
        ...(dto.startAt && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: dto.endAt ? new Date(dto.endAt) : null }),
        ...(dto.registrationDeadline !== undefined && {
          registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : null,
        }),
        ...(dto.address && { address: dto.address }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.instituteId !== undefined && { instituteId: dto.instituteId }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.chatLink !== undefined && { chatLink: dto.chatLink }),
        status: EventStatus.MODERATION,
      },
    });

    return { message: 'Event updated and sent for re-moderation', event: updated };
  }

  async remove(id: string, organizerUserId: string) {
    await this.findEventWithOwnerCheck(id, organizerUserId);

    await this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date(), status: EventStatus.CANCELLED },
    });

    return { message: 'Event deleted successfully' };
  }

  async getMyEvents(organizerUserId: string, page = 1, limit = 20) {
    const profile = await this.prisma.organizerProfile.findUnique({
      where: { userId: organizerUserId },
    });

    if (!profile) throw new ForbiddenException('Organizer profile not found');

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { organizerId: profile.id, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { registrations: true } } },
      }),
      this.prisma.event.count({ where: { organizerId: profile.id, deletedAt: null } }),
    ]);

    return {
      data: data.map(({ _count, ...e }) => ({ ...e, registeredCount: _count.registrations })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async findEventWithOwnerCheck(id: string, organizerUserId: string) {
    const profile = await this.prisma.organizerProfile.findUnique({
      where: { userId: organizerUserId },
    });

    const event = await this.prisma.event.findUnique({ where: { id, deletedAt: null } });

    if (!event) throw new NotFoundException('Event not found');
    if (!profile || event.organizerId !== profile.id) {
      throw new ForbiddenException('Access denied');
    }

    return event;
  }
}
