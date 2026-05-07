import { Module } from '@nestjs/common';
import { UniversityService } from './university.service';
import { UniversityController } from './university.controller';

@Module({
  providers: [UniversityService],
  controllers: [UniversityController],
})
export class UniversityModule {}
