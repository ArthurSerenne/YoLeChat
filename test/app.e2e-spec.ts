import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  it('/ (GET) returns HTML landing', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/);
  });

  it('/chat (GET) rejects when unauthenticated', async () => {
    await request(app.getHttpServer())
      .get('/chat')
      .expect(401);
  });

  it('/chat (GET) returns HTML when authenticated', async () => {
    const uniqueUser = `e2e_${Date.now()}`;
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: uniqueUser, password: 'secret123' })
      .expect(201);
    const token = registerRes.body?.accessToken;

    await request(app.getHttpServer())
      .get('/chat')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', /html/);
  });
});
