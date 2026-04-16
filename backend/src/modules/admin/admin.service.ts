import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, UserStatus, UserRole } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getModerationQueue(page: any = 1, limit: any = 20) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { status: EventStatus.MODERATION, deletedAt: null },
        skip,
        take: l,
        orderBy: { createdAt: 'asc' },
        include: {
          organizer: { select: { organizationName: true, contacts: true } },
        },
      }),
      this.prisma.event.count({ where: { status: EventStatus.MODERATION, deletedAt: null } }),
    ]);

    return {
      data,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  async moderateEvent(
    id: string,
    adminId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string,
  ) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const status = action === 'approve' ? EventStatus.PUBLISHED : EventStatus.REJECTED;

    await this.prisma.event.update({
      where: { id },
      data: {
        status,
        moderatedBy: adminId,
        moderatedAt: new Date(),
        ...(rejectionReason && { rejectionReason }),
      },
    });

    return { message: `Event ${action === 'approve' ? 'approved' : 'rejected'}`, status };
  }

  async getUsers(filters: { role?: UserRole; status?: UserStatus; search?: string }, page: any = 1, limit: any = 20) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;
    const where: any = { deletedAt: null };

    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { login: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, login: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true,
          studentProfile: { select: { fullName: true } },
          organizerProfile: { select: { fullName: true, organizationName: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  async updateUser(id: string, dto: { status?: UserStatus; role?: UserRole }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.role && { role: dto.role }),
      },
    });

    return { message: 'User updated successfully' };
  }

  async getAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    const from = new Date();

    if (period === 'day') from.setDate(now.getDate() - 1);
    else if (period === 'week') from.setDate(now.getDate() - 7);
    else if (period === 'month') from.setMonth(now.getMonth() - 1);
    else from.setFullYear(now.getFullYear() - 1);

    const [eventsTotal, activeUsers, registrations, topEvents] = await Promise.all([
      this.prisma.event.count({ where: { createdAt: { gte: from }, deletedAt: null } }),
      this.prisma.user.count({ where: { status: 'ACTIVE', lastLoginAt: { gte: from } } }),
      this.prisma.registration.count({ where: { registeredAt: { gte: from } } }),
      this.prisma.event.findMany({
        where: { deletedAt: null },
        orderBy: { registrations: { _count: 'desc' } },
        take: 5,
        select: { id: true, title: true, _count: { select: { registrations: true } } },
      }),
    ]);

    return {
      eventsTotal,
      activeUsers,
      registrations,
      topEvents: topEvents.map((e) => ({
        eventId: e.id,
        name: e.title,
        attendees: e._count.registrations,
      })),
    };
  }
}
