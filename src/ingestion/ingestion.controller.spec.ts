import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

describe('IngestionController', () => {
  let controller: IngestionController;
  let service: IngestionService;

  const mockIngestionService = {
    run: jest.fn().mockResolvedValue({
      fetched: 100,
      persisted: 90,
      pruned: 5,
    }),
  };

  beforeEach(async () => {
    delete process.env.INGESTION_ADMIN_SECRET;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        {
          provide: IngestionService,
          useValue: mockIngestionService,
        },
      ],
    }).compile();

    controller = module.get<IngestionController>(IngestionController);
    service = module.get<IngestionService>(IngestionService);
  });

  afterEach(() => {
    delete process.env.INGESTION_ADMIN_SECRET;
  });

  it('should allow ingestion run when no secret is configured', async () => {
    const res = await controller.run();
    expect(res).toEqual({ fetched: 100, persisted: 90, pruned: 5 });
    expect(service.run).toHaveBeenCalled();
  });

  it('should allow ingestion run when valid x-admin-key is provided', async () => {
    process.env.INGESTION_ADMIN_SECRET = 'super-secret-key';
    const res = await controller.run('super-secret-key');
    expect(res).toEqual({ fetched: 100, persisted: 90, pruned: 5 });
  });

  it('should throw UnauthorizedException when invalid x-admin-key is provided', async () => {
    process.env.INGESTION_ADMIN_SECRET = 'super-secret-key';
    await expect(controller.run('wrong-key')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when x-admin-key header is omitted', async () => {
    process.env.INGESTION_ADMIN_SECRET = 'super-secret-key';
    await expect(controller.run(undefined)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
