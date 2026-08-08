import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    IngestionModule,
  ],
  controllers: [AppController, EventsController],
  providers: [PrismaService, EventsService],
})
export class AppModule {}
