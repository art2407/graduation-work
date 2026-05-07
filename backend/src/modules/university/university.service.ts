import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus } from '@prisma/client';

@Injectable()
export class UniversityService {
  constructor(private prisma: PrismaService) {}

  async getEvents(filters: {
    instituteId?: string;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: any;
    limit?: any;
  }) {
    const p = Math.max(1, parseInt(filters.page) || 1);
    const l = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
    const skip = (p - 1) * l;

    const where: any = { deletedAt: null };
    if (filters.status) {
      where.status = filters.status as EventStatus;
    } else {
      where.status = { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED, EventStatus.MODERATION] };
    }
    if (filters.instituteId) where.instituteId = filters.instituteId;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { address: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      where.startAt = {};
      if (filters.dateFrom) where.startAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.startAt.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: l,
        orderBy: { startAt: 'asc' },
        include: {
          organizer: { select: { organizationName: true, fullName: true, contacts: true } },
          institute: { select: { name: true } },
          _count: { select: { registrations: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: data.map((e) => ({
        ...e,
        registrationsCount: e._count.registrations,
      })),
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  async getEventAttendees(eventId: string, page: any = 1, limit: any = 100) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(500, Math.max(1, parseInt(limit) || 100));
    const skip = (p - 1) * l;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, startAt: true },
    });
    if (!event) throw new NotFoundException('Мероприятие не найдено');

    const [data, total] = await Promise.all([
      this.prisma.registration.findMany({
        where: { eventId },
        skip,
        take: l,
        orderBy: { registeredAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              studentProfile: {
                include: { institute: { select: { name: true } } },
              },
            },
          },
        },
      }),
      this.prisma.registration.count({ where: { eventId } }),
    ]);

    return {
      event,
      data,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  async exportAttendesCsv(eventId: string): Promise<string> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true, startAt: true },
    });
    if (!event) throw new NotFoundException('Мероприятие не найдено');

    const registrations = await this.prisma.registration.findMany({
      where: { eventId },
      orderBy: { registeredAt: 'asc' },
      include: {
        user: {
          select: {
            email: true,
            studentProfile: {
              include: { institute: { select: { name: true } } },
            },
          },
        },
      },
    });

    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;

    const header = ['№', 'ФИО', 'Группа', 'Курс', 'Институт', 'Email', 'Статус', 'Зарегистрирован', 'Чек-ин'];
    const rows = registrations.map((reg, idx) => {
      const sp = reg.user.studentProfile;
      return [
        idx + 1,
        escape(sp?.fullName ?? '—'),
        escape(sp?.group ?? '—'),
        sp?.yearOfStudy ?? '—',
        escape(sp?.institute?.name ?? '—'),
        escape(reg.user.email),
        escape(reg.status),
        escape(reg.registeredAt.toLocaleString('ru-RU')),
        escape(reg.checkedInAt?.toLocaleString('ru-RU') ?? '—'),
      ].join(';');
    });

    return [header.map(escape).join(';'), ...rows].join('\r\n');
  }

  async getDashboardStats(instituteId?: string) {
    const where: any = { deletedAt: null };
    const eventWhere: any = { deletedAt: null, status: EventStatus.PUBLISHED };
    if (instituteId) {
      where.instituteId = instituteId;
      eventWhere.instituteId = instituteId;
    }

    const now = new Date();
    const upcomingWhere = { ...eventWhere, startAt: { gte: now } };
    const pastWhere = { ...eventWhere, startAt: { lt: now } };

    const [totalEvents, upcoming, past, totalStudents, totalRegistrations] = await Promise.all([
      this.prisma.event.count({ where: eventWhere }),
      this.prisma.event.count({ where: upcomingWhere }),
      this.prisma.event.count({ where: pastWhere }),
      this.prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
      this.prisma.registration.count({
        where: instituteId
          ? { event: { instituteId } }
          : {},
      }),
    ]);

    // Топ-5 мероприятий по участникам
    const topEvents = await this.prisma.event.findMany({
      where: eventWhere,
      orderBy: { registrations: { _count: 'desc' } },
      take: 5,
      select: {
        id: true, title: true, startAt: true,
        institute: { select: { name: true } },
        _count: { select: { registrations: true } },
      },
    });

    return {
      totalEvents, upcoming, past, totalStudents, totalRegistrations,
      topEvents: topEvents.map((e) => ({
        id: e.id, title: e.title, startAt: e.startAt,
        institute: e.institute?.name,
        registrations: e._count.registrations,
      })),
    };
  }
}
