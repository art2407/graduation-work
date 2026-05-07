import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ login: dto.login }, { email: dto.email }] },
    });

    if (existing) {
      throw new ConflictException(
        existing.login === dto.login
          ? 'Login already taken'
          : 'Email already registered',
      );
    }

    if (dto.role === UserRole.STUDENT && !dto.studentProfile) {
      throw new BadRequestException('Student profile required');
    }
    if (dto.role === UserRole.ORGANIZER && !dto.organizerProfile) {
      throw new BadRequestException('Organizer profile required');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        email: dto.email,
        passwordHash,
        role: dto.role,
        ...(dto.role === UserRole.STUDENT && dto.studentProfile
          ? {
              studentProfile: {
                create: {
                  fullName: dto.studentProfile.fullName,
                  birthDate: dto.studentProfile.birthDate
                    ? new Date(dto.studentProfile.birthDate)
                    : undefined,
                  phone: dto.studentProfile.phone,
                  instituteId: dto.studentProfile.instituteId,
                  group: dto.studentProfile.group,
                  yearOfStudy: dto.studentProfile.yearOfStudy,
                },
              },
            }
          : {}),
        ...(dto.role === UserRole.ORGANIZER && dto.organizerProfile
          ? {
              organizerProfile: {
                create: {
                  fullName: dto.organizerProfile.fullName,
                  organizationName: dto.organizerProfile.organizationName,
                  organizationInfo: dto.organizerProfile.organizationInfo,
                  contacts: dto.organizerProfile.contacts,
                  position: dto.organizerProfile.position,
                },
              },
            }
          : {}),
      },
    });

    return { userId: user.id, message: 'Registration successful' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ login: dto.login }, { email: dto.login }],
        status: 'ACTIVE',
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.refreshToken)
      .digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(stored.user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: { id: string; login: string; role: string }) {
    const payload = { sub: user.id, login: user.login, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const rawRefresh = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefresh)
      .digest('hex');

    const refreshDays = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d') || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, login: user.login, role: user.role },
    };
  }
}
