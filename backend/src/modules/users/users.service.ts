import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { UpdateStudentDto, UpdateOrganizerDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        login: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        studentProfile: {
          include: { institute: true },
        },
        organizerProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, role: UserRole, dto: UpdateStudentDto | UpdateOrganizerDto) {
    if (role === UserRole.STUDENT) {
      const data = dto as UpdateStudentDto;
      await this.prisma.studentProfile.update({
        where: { userId },
        data: {
          ...(data.fullName && { fullName: data.fullName }),
          ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
          ...(data.instituteId !== undefined && { instituteId: data.instituteId }),
          ...(data.group !== undefined && { group: data.group }),
          ...(data.yearOfStudy !== undefined && { yearOfStudy: data.yearOfStudy }),
        },
      });
    } else if (role === UserRole.ORGANIZER) {
      const data = dto as UpdateOrganizerDto;
      await this.prisma.organizerProfile.update({
        where: { userId },
        data: {
          ...(data.fullName && { fullName: data.fullName }),
          ...(data.organizationInfo !== undefined && { organizationInfo: data.organizationInfo }),
          ...(data.contacts !== undefined && { contacts: data.contacts }),
          ...(data.position !== undefined && { position: data.position }),
        },
      });
    }

    return this.getMe(userId);
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, status: 'ACTIVE' },
      select: {
        id: true,
        role: true,
        studentProfile: {
          select: { fullName: true, avatarUrl: true, institute: { select: { name: true } } },
        },
        organizerProfile: {
          select: { fullName: true, organizationName: true, logoUrl: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getEventsHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.registration.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { registeredAt: 'desc' },
        include: {
          event: {
            select: {
              id: true, title: true, startAt: true, status: true,
              organizer: { select: { organizationName: true } },
            },
          },
        },
      }),
      this.prisma.registration.count({ where: { userId } }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
