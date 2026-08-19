import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should return health check status ok', () => {
    const health = appController.getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('wienwasgeht-api');
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
