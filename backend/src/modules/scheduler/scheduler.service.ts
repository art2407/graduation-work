import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  // Запускается каждую минуту
  @Cron(CronExpression.EVERY_MINUTE)
  async updateEventStatuses() {
    const now = new Date();

    // 1. PUBLISHED → COMPLETED: endAt прошло
    const withEndAt = await this.prisma.event.updateMany({
      where: {
        status: EventStatus.PUBLISHED,
        endAt: { lt: now },
      },
      data: { status: EventStatus.COMPLETED },
    });

    // 2. PUBLISHED → COMPLETED: нет endAt, но startAt прошёл более 4 часов назад
    const withoutEndAt = await this.prisma.event.updateMany({
      where: {
        status: EventStatus.PUBLISHED,
        endAt: null,
        startAt: { lt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
      },
      data: { status: EventStatus.COMPLETED },
    });

    const total = withEndAt.count + withoutEndAt.count;
    if (total > 0) {
      this.logger.log(`Завершено мероприятий: ${total}`);
    }
  }
}
