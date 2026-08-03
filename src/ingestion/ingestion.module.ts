import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenwebNinjaService } from './openweb-ninja/openweb-ninja.service';
import { StadtWienService } from './stadt-wien/stadt-wien.service';

@Module({
  imports: [
    HttpModule, // Required because the service uses HttpService
  ],
  providers: [OpenwebNinjaService, StadtWienService],
  exports: [OpenwebNinjaService, StadtWienService], // This allows other modules to use it
})
export class IngestionModule {}
