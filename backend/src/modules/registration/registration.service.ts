import {
  Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, RegistrationStatus } from '@prisma/client';
import { AttendanceService } from '../attendance/attendance.service';

@Injectable()
export class RegistrationService {
  constructor(
    private prisma: PrismaService,
    private attendanceService: AttendanceService,
  ) {}

  async register(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId, deletedAt: null } });

    if (!event) throw new NotFoundException('Мероприятие не найдено');
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Запись на мероприятие недоступна');
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new BadRequestException('Срок регистрации истёк');
    }

    const existing = await this.prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      if (existing.status === RegistrationStatus.CONFIRMED) {
        throw new ConflictException('Вы уже зарегистрированы на это мероприятие');
      }
      if (existing.status === RegistrationStatus.ATTENDED) {
        throw new ConflictException('Вы уже посетили это мероприятие');
      }
      // Повторная запись после отмены — тоже проверяем вместимость
      if (event.capacity) {
        const count = await this.prisma.registration.count({
          where: { eventId, status: RegistrationStatus.CONFIRMED },
        });
        if (count >= event.capacity) throw new BadRequestException('Все места заняты');
      }
      const updated = await this.prisma.registration.update({
        where: { id: existing.id },
        data: { status: RegistrationStatus.CONFIRMED, cancelledAt: null, registeredAt: new Date() },
      });
      return { message: 'Вы успешно зарегистрированы', registration: updated };
    }

    const registration = await this.prisma.$transaction(async (tx) => {
      if (event.capacity) {
        const count = await tx.registration.count({
          where: { eventId, status: RegistrationStatus.CONFIRMED },
        });
        if (count >= event.capacity) throw new BadRequestException('Все места заняты');
      }
      return tx.registration.create({
        data: { eventId, userId, status: RegistrationStatus.CONFIRMED },
      });
    });

    // Генерируем QR-токен для участника
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { institute: { select: { name: true } } },
    });
    if (studentProfile) {
      await this.attendanceService.generateTokenForRegistration(
        registration.id, userId, eventId,
        studentProfile.fullName,
        studentProfile.group ?? '',
        studentProfile.institute?.name ?? '',
        event.startAt,
      );
    }

    return { message: 'Вы успешно зарегистрированы', registration };
  }

  async cancel(eventId: string, userId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: true },
    });

    if (!registration) {
      throw new NotFoundException('Регистрация не найдена');
    }
    if (registration.status === RegistrationStatus.ATTENDED) {
      throw new BadRequestException('Нельзя отменить запись — вы уже посетили мероприятие');
    }
    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('Регистрация уже отменена');
    }

    const twoHoursBefore = new Date(registration.event.startAt);
    twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);

    if (new Date() > twoHoursBefore) {
      throw new BadRequestException('Отмена регистрации невозможна менее чем за 2 часа до начала');
    }

    await this.prisma.registration.update({
      where: { id: registration.id },
      data: { status: RegistrationStatus.CANCELLED, cancelledAt: new Date() },
    });

    return { message: 'Регистрация отменена' };
  }

  async getAttendees(eventId: string, callerUserId: string, callerRole: string, status?: string, page: any = 1, limit: any = 50) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 50);
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Мероприятие не найдено');

    if (callerRole !== 'ADMIN') {
      const profile = await this.prisma.organizerProfile.findUnique({
        where: { userId: callerUserId },
      });
      if (!profile || event.organizerId !== profile.id) throw new ForbiddenException('Нет доступа');
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

  async exportCsv(eventId: string, callerUserId: string, callerRole: string): Promise<string> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true, startAt: true, organizerId: true },
    });
    if (!event) throw new NotFoundException('Мероприятие не найдено');

    if (callerRole !== 'ADMIN') {
      const profile = await this.prisma.organizerProfile.findUnique({ where: { userId: callerUserId } });
      if (!profile || event.organizerId !== profile.id) throw new ForbiddenException('Нет доступа');
    }

    const registrations = await this.prisma.registration.findMany({
      where: { eventId },
      orderBy: { registeredAt: 'asc' },
      include: {
        user: {
          select: {
            email: true,
            studentProfile: { include: { institute: { select: { name: true } } } },
          },
        },
      },
    });

    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const header = ['№', 'ФИО', 'Группа', 'Курс', 'Институт', 'Email', 'Статус', 'Зарегистрирован', 'Чек-ин'];
    const rows = registrations.map((reg, idx) => {
      const sp = reg.user.studentProfile;
      return [
        idx + 1,
        esc(sp?.fullName ?? '—'),
        esc(sp?.group ?? '—'),
        sp?.yearOfStudy ?? '—',
        esc(sp?.institute?.name ?? '—'),
        esc(reg.user.email),
        esc(reg.status),
        esc(reg.registeredAt.toLocaleString('ru-RU')),
        esc(reg.checkedInAt?.toLocaleString('ru-RU') ?? '—'),
      ].join(';');
    });

    return [header.map(esc).join(';'), ...rows].join('\r\n');
  }
}
