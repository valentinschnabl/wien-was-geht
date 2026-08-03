import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the .env variables available everywhere
    }),
    IngestionModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
