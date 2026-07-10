import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { bootControllerApp } from './test-utils';

describe('AuthController', () => {
  let app: INestApplication;
  const authService = {
    register: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: {} }),
    login: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: {} }),
    refresh: jest.fn().mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2', user: {} }),
    logout: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeAll(async () => {
    app = await bootControllerApp(AuthController, [
      { provide: AuthService, useValue: authService },
    ]);
  });
  afterAll(() => app.close());

  it('registers with a valid payload (201)', () =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'new@szabist.pk', password: 'Password123!', fullName: 'New Student' })
      .expect(201));

  it('rejects weak passwords (400)', () =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'new@szabist.pk', password: 'short', fullName: 'New Student' })
      .expect(400));

  it('rejects invalid email (400)', () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'whatever' })
      .expect(400));

  it('logs in with valid shape (201)', () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'aftab@szabist.edu.pk', password: 'Password123!' })
      .expect(201));

  it('refresh requires a token string (400)', () =>
    request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400));
});
