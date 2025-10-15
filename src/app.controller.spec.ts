import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('GET / renders HTML landing', () => {
    const res: any = {
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    appController.getLanding(res);
    expect(res.type).toHaveBeenCalledWith('html');
    const html = res.send.mock.calls[0][0];
    expect(typeof html).toBe('string');
    expect(html).toContain('Prêt à tchater ?');
  });
});
