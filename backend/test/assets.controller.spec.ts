import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../src/common/enums';
import { AssetsController } from '../src/modules/assets/assets.controller';
import { AssetsService } from '../src/modules/assets/assets.service';
import { bootControllerApp, tokenFor } from './test-utils';

describe('AssetsController (role guards)', () => {
  let app: INestApplication;
  const assetsService = {
    findAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pages: 0 }),
    findOne: jest.fn().mockResolvedValue({ id: 'a1', name: 'Test Asset' }),
    create: jest.fn().mockResolvedValue({ id: 'a1' }),
    update: jest.fn().mockResolvedValue({ id: 'a1' }),
    transfer: jest.fn().mockResolvedValue({ id: 'a1' }),
    remove: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeAll(async () => {
    app = await bootControllerApp(AssetsController, [
      { provide: AssetsService, useValue: assetsService },
    ]);
  });
  afterAll(() => app.close());

  it('rejects unauthenticated catalogue access (401)', () =>
    request(app.getHttpServer()).get('/assets').expect(401));

  it('allows any authenticated role to browse the catalogue', () =>
    request(app.getHttpServer())
      .get('/assets')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .expect(200));

  it('forbids students from creating assets (403)', () =>
    request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .field('name', 'X')
      .field('category', 'AV_GEAR')
      .field('kind', 'PHYSICAL_ITEM')
      .expect(403));

  it('allows staff to create assets (201)', () =>
    request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${tokenFor(Role.STAFF)}`)
      .field('name', 'Camera')
      .field('category', 'AV_GEAR')
      .field('kind', 'PHYSICAL_ITEM')
      .expect(201));

  it('forbids staff from transferring assets — admin only (403)', () =>
    request(app.getHttpServer())
      .patch('/assets/a1/transfer')
      .set('Authorization', `Bearer ${tokenFor(Role.STAFF)}`)
      .send({ departmentId: 'd2' })
      .expect(403));

  it('allows admin to transfer assets (200)', () =>
    request(app.getHttpServer())
      .patch('/assets/a1/transfer')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .send({ departmentId: 'd2' })
      .expect(200));

  it('validates create payload (400 on missing enum)', () =>
    request(app.getHttpServer())
      .post('/assets')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .field('name', 'No category')
      .expect(400));
});
