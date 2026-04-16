import {
  Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, RegistrationStatus } from '@prisma/client';

@Injectable()
export class RegistrationService {
  constructor(private prisma: PrismaService) {}

  async register(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId, deletedAt: null } });

    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Event is not available for registration');
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new BadRequestException('Registration deadline has passed');
    }

    if (event.capacity) {
      const count = await this.prisma.registration.count({
        where: { eventId, status: RegistrationStatus.CONFIRMED },
      });
      if (count >= event.capacity) throw new BadRequestException('Event is full');
    }

    const existing = await this.prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      if (existing.status === RegistrationStatus.CONFIRMED) {
        throw new ConflictException('Already registered');
      }
      const updated = await this.prisma.registration.update({
        where: { id: existing.id },
        data: { status: RegistrationStatus.CONFIRMED, cancelledAt: null, registeredAt: new Date() },
      });
      return { message: 'Successfully registered', registration: updated };
    }

    const registration = await this.prisma.registration.create({
      data: { eventId, userId, status: RegistrationStatus.CONFIRMED },
    });

    return { message: 'Successfully registered', registration };
  }

  async cancel(eventId: string, userId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: true },
    });

    if (!registration || registration.status !== RegistrationStatus.CONFIRMED) {
      throw new NotFoundException('Active registration not found');
    }

    const twoHoursBefore = new Date(registration.event.startAt);
    twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);

    if (new Date() > twoHoursBefore) {
      throw new BadRequestException('Cannot cancel registration less than 2 hours before event');
    }

    await this.prisma.registration.update({
      where: { id: registration.id },
      data: { status: RegistrationStatus.CANCELLED, cancelledAt: new Date() },
    });

    return { message: 'Registration cancelled successfully' };
  }

  async getAttendees(eventId: string, callerUserId: string, callerRole: string, status?: string, page: any = 1, limit: any = 50) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 50);
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    if (callerRole !== 'ADMIN') {
      const profile = await this.prisma.organizerProfile.findUnique({
        where: { userId: callerUserId },
      });
      if (!profile || event.organizerId !== profile.id) throw new ForbiddenException('Access denied');
    }

    const skip = (p - 1) * l;
    const where: any = { eventId };
    if (status) where.status = status as RegistrationStatus;

    const [data, total] = await Promise.all([
      this.prisma.registration.findMany({
        where,
        skip,
        take: l,
        orderBy: { registeredAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              studentProfile: { select: { fullName: true, group: true, institute: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.registration.count({ where }),
    ]);

    return {
      data,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }
}
