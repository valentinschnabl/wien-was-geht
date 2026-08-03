import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the .env variables available everywhere
    }),
    IngestionModule,
  ],
  controllers: [AppController, EventsController],
  providers: [PrismaService, EventsService],
})
export class AppModule {}
