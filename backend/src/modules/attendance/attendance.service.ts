import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationStatus } from '@prisma/client';

const QR_SECRET = process.env.QR_SECRET ?? 'qr-fallback-secret-change-in-prod';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // ── Генерация подписанного токена ────────────────────────────────────────

  static buildToken(payload: Record<string, any>): string {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
    return `${data}.${sig}`;
  }

  static verifyToken(token: string): Record<string, any> | null {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
    if (sig !== expected) return null;
    try {
      return JSON.parse(Buffer.from(data, 'base64url').toString());
    } catch {
      return null;
    }
  }

  // ── Генерация токена при регистрации ─────────────────────────────────────

  async generateTokenForRegistration(
    registrationId: string,
    userId: string,
    eventId: string,
    fullName: string,
    group: string,
    institute: string,
  ): Promise<string> {
    const token = AttendanceService.buildToken({
      rid: registrationId,
      uid: userId,
      eid: eventId,
      name: fullName,
      group,
      institute,
      iat: Math.floor(Date.now() / 1000),
    });

    await this.prisma.registration.update({
      where: { id: registrationId },
      data: { qrToken: token },
    });

    return token;
  }

  // ── Получение QR-кода студентом ───────────────────────────────────────────

  async getStudentQr(registrationId: string, userId: string): Promise<string> {
    const reg = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: { select: { title: true, startAt: true, organizer: { select: { organizationName: true } } } },
        user: {
          select: {
            studentProfile: {
              select: { fullName: true, group: true, institute: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!reg) throw new NotFoundException('Регистрация не найдена');
    if (reg.userId !== userId) throw new ForbiddenException('Нет доступа');
    if (reg.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('Регистрация отменена');
    }

    // Генерируем токен, если ещё нет
    if (!reg.qrToken) {
      const sp = reg.user.studentProfile;
      const token = await this.generateTokenForRegistration(
        reg.id, userId, reg.eventId,
        sp?.fullName ?? '', sp?.group ?? '', sp?.institute?.name ?? '',
      );
      const dataUrl = await QRCode.toDataURL(token, { width: 400, margin: 2 });
      return dataUrl;
    }

    const dataUrl = await QRCode.toDataURL(reg.qrToken, { width: 400, margin: 2 });
    return dataUrl;
  }

  // ── Сканирование организатором ────────────────────────────────────────────

  async scanQr(rawToken: string, organizerUserId: string, callerRole = 'ORGANIZER') {
    const payload = AttendanceService.verifyToken(rawToken);
    if (!payload) {
      throw new BadRequestException('Недействительный QR-код');
    }

    const { rid, uid, eid, name, group, institute } = payload;

    // Проверяем, что сканирующий — организатор данного мероприятия
    const event = await this.prisma.event.findUnique({
      where: { id: eid, deletedAt: null },
      include: { organizer: true },
    });
    if (!event) throw new NotFoundException('Мероприятие не найдено');

    const organizerProfile = await this.prisma.organizerProfile.findUnique({
      where: { userId: organizerUserId },
    });
    if (callerRole !== 'ADMIN' && (!organizerProfile || event.organizerId !== organizerProfile.id)) {
      throw new ForbiddenException('Вы не являетесь организатором этого мероприятия');
    }

    // Мероприятие ещё не началось
    if (new Date() < new Date(event.startAt)) {
      const startsIn = Math.ceil(
        (new Date(event.startAt).getTime() - Date.now()) / 60000,
      );
      throw new BadRequestException(
        `Мероприятие ещё не началось. До начала: ${startsIn} мин.`,
      );
    }

    // Находим регистрацию
    const reg = await this.prisma.registration.findUnique({
      where: { id: rid },
    });
    if (!reg || reg.userId !== uid || reg.eventId !== eid) {
      throw new BadRequestException('QR-код не соответствует регистрации');
    }

    // Уже отмечен
    if (reg.status === RegistrationStatus.ATTENDED) {
      return {
        alreadyCheckedIn: true,
        checkedInAt: reg.checkedInAt,
        participant: { name, group, institute },
      };
    }

    if (reg.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('Регистрация не активна');
    }

    const updated = await this.prisma.registration.update({
      where: { id: rid },
      data: {
        checkedInAt: new Date(),
        checkInSource: 'QR_SCAN',
        status: RegistrationStatus.ATTENDED,
      },
    });

    return {
      alreadyCheckedIn: false,
      checkedInAt: updated.checkedInAt,
      participant: { name, group, institute },
    };
  }
}
