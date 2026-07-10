import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../src/common/enums';
import { BookingsController } from '../src/modules/bookings/bookings.controller';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { bootControllerApp, tokenFor } from './test-utils';

describe('BookingsController (role guards)', () => {
  let app: INestApplication;
  const bookingsService = {
    create: jest.fn().mockResolvedValue({ id: 'b1', status: 'PENDING' }),
    availability: jest.fn().mockResolvedValue([]),
    listMine: jest.fn().mockResolvedValue([]),
    listPendingForManager: jest.fn().mockResolvedValue([]),
    decide: jest.fn().mockResolvedValue({ id: 'b1', status: 'APPROVED' }),
    returnItem: jest.fn().mockResolvedValue({ id: 'b1', status: 'RETURNED' }),
    confirmInspection: jest.fn().mockResolvedValue({ id: 'b1' }),
  };

  beforeAll(async () => {
    app = await bootControllerApp(BookingsController, [
      { provide: BookingsService, useValue: bookingsService },
    ]);
  });
  afterAll(() => app.close());

  it('rejects unauthenticated booking (401)', () =>
    request(app.getHttpServer())
      .post('/bookings')
      .send({ assetId: 'x', startsAt: new Date().toISOString(), endsAt: new Date().toISOString() })
      .expect(401));

  it('lets a student create a booking (201)', () =>
    request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .send({
        assetId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        startsAt: '2026-08-01T10:00:00Z',
        endsAt: '2026-08-01T12:00:00Z',
      })
      .expect(201));

  it('rejects invalid booking payload (400)', () =>
    request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .send({ assetId: 'not-a-uuid', startsAt: 'nope', endsAt: 'nope' })
      .expect(400));

  it('forbids students from viewing the approval queue (403)', () =>
    request(app.getHttpServer())
      .get('/bookings/pending')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .expect(403));

  it('allows staff to view the approval queue (200)', () =>
    request(app.getHttpServer())
      .get('/bookings/pending')
      .set('Authorization', `Bearer ${tokenFor(Role.STAFF)}`)
      .expect(200));

  it('forbids students from deciding bookings (403)', () =>
    request(app.getHttpServer())
      .patch('/bookings/b1/decision')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .send({ decision: 'APPROVED' })
      .expect(403));

  it('allows staff to approve a booking (200)', () =>
    request(app.getHttpServer())
      .patch('/bookings/b1/decision')
      .set('Authorization', `Bearer ${tokenFor(Role.STAFF)}`)
      .send({ decision: 'APPROVED' })
      .expect(200));
});
