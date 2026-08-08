import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port, "0.0.0.0");
  console.log(`Application is running on port ${port}`);
}

void bootstrap();
