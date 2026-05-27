import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationStatus } from '@prisma/client';

@Injectable()
export class AttendanceService implements OnModuleInit {
  private qrSecret: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    this.qrSecret = this.config.getOrThrow<string>('QR_SECRET');
  }

  // ── Генерация подписанного токена ────────────────────────────────────────

  buildToken(payload: Record<string, any>): string {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', this.qrSecret).update(data).digest('hex');
    return `${data}.${sig}`;
  }

  verifyToken(token: string): Record<string, any> | null {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', this.qrSecret).update(data).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    try {
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
      return payload;
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
    eventStartAt: Date,
  ): Promise<string> {
    const expireAt = new Date(eventStartAt);
    expireAt.setHours(expireAt.getHours() + 24);

    const token = this.buildToken({
      rid: registrationId,
      uid: userId,
      eid: eventId,
      name: fullName,
      group,
      institute,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expireAt.getTime() / 1000),
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

    if (!reg.qrToken) {
      const sp = reg.user.studentProfile;
      const token = await this.generateTokenForRegistration(
        reg.id, userId, reg.eventId,
        sp?.fullName ?? '', sp?.group ?? '', sp?.institute?.name ?? '',
        reg.event.startAt,
      );
      return QRCode.toDataURL(token, { width: 400, margin: 2 });
    }

    // Проверяем не истёк ли существующий токен
    const verified = this.verifyToken(reg.qrToken);
    if (!verified) {
      const sp = reg.user.studentProfile;
      const token = await this.generateTokenForRegistration(
        reg.id, userId, reg.eventId,
        sp?.fullName ?? '', sp?.group ?? '', sp?.institute?.name ?? '',
        reg.event.startAt,
      );
      return QRCode.toDataURL(token, { width: 400, margin: 2 });
    }

    return QRCode.toDataURL(reg.qrToken, { width: 400, margin: 2 });
  }

  // ── Сканирование организатором ────────────────────────────────────────────

  async scanQr(rawToken: string, organizerUserId: string, callerRole = 'ORGANIZER') {
    const payload = this.verifyToken(rawToken);
    if (!payload) {
      throw new BadRequestException('Недействительный или просроченный QR-код');
    }

    const { rid, uid, eid, name, group, institute } = payload;

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

    if (new Date() < new Date(event.startAt)) {
      const startsIn = Math.ceil(
        (new Date(event.startAt).getTime() - Date.now()) / 60000,
      );
      throw new BadRequestException(
        `Мероприятие ещё не началось. До начала: ${startsIn} мин.`,
      );
    }

    const reg = await this.prisma.registration.findUnique({
      where: { id: rid },
    });
    if (!reg || reg.userId !== uid || reg.eventId !== eid) {
      throw new BadRequestException('QR-код не соответствует регистрации');
    }

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
