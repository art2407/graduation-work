import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationStatus } from '@prisma/client';

// In-memory QR token store (в продакшене - Redis)
const qrTokens = new Map<string, { eventId: string; expiresAt: Date }>();

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async generateQr(eventId: string, organizerUserId: string) {
    const profile = await this.prisma.organizerProfile.findUnique({
      where: { userId: organizerUserId },
    });
    const event = await this.prisma.event.findUnique({ where: { id: eventId, deletedAt: null } });

    if (!event) throw new NotFoundException('Event not found');
    if (!profile || event.organizerId !== profile.id) throw new ForbiddenException('Access denied');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 1000); // 30 секунд

    qrTokens.set(token, { eventId, expiresAt });

    // Чистим старые токены
    setTimeout(() => qrTokens.delete(token), 30000);

    return { qrToken: token, expiresAt };
  }

  async checkIn(qrToken: string, userId: string) {
    const tokenData = qrTokens.get(qrToken);

    if (!tokenData || new Date() > tokenData.expiresAt) {
      throw new BadRequestException('Invalid or expired QR token');
    }

    const { eventId } = tokenData;

    const registration = await this.prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration || registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('No active registration found for this event');
    }

    if (registration.checkedInAt) {
      throw new BadRequestException('Already checked in');
    }

    const updated = await this.prisma.registration.update({
      where: { id: registration.id },
      data: {
        checkedInAt: new Date(),
        checkInSource: 'QR_SCAN',
        status: RegistrationStatus.ATTENDED,
      },
    });

    return { message: 'Check-in successful', checkedInAt: updated.checkedInAt };
  }
}
