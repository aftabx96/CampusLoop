import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../src/common/enums';
import { AnalyticsController } from '../src/modules/analytics/analytics.controller';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { LostFoundController } from '../src/modules/lostfound/lostfound.controller';
import { LostFoundService } from '../src/modules/lostfound/lostfound.service';
import { bootControllerApp, tokenFor } from './test-utils';

describe('Admin-only analytics routes', () => {
  let app: INestApplication;
  const analytics = {
    overview: jest.fn().mockResolvedValue({ assets: 1 }),
    utilisation: jest.fn().mockResolvedValue([]),
    demandRanking: jest.fn().mockResolvedValue({}),
    approvalTurnaround: jest.fn().mockResolvedValue([]),
    lendingStats: jest.fn().mockResolvedValue({}),
    getLastAnomalyReport: jest.fn().mockReturnValue({}),
    runAnomalyScanNow: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    app = await bootControllerApp(AnalyticsController, [
      { provide: AnalyticsService, useValue: analytics },
    ]);
  });
  afterAll(() => app.close());

  it.each([Role.STUDENT, Role.STAFF, Role.LOST_FOUND_OFFICER])(
    'forbids %s from analytics (403)',
    (role) =>
      request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${tokenFor(role)}`)
        .expect(403),
  );

  it('allows admin (200)', () =>
    request(app.getHttpServer())
      .get('/analytics/overview')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .expect(200));
});

describe('Users admin routes', () => {
  let app: INestApplication;
  const usersService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'u1' }),
    updateRole: jest.fn().mockResolvedValue({ id: 'u1', role: Role.STAFF }),
  };

  beforeAll(async () => {
    app = await bootControllerApp(UsersController, [
      { provide: UsersService, useValue: usersService },
    ]);
  });
  afterAll(() => app.close());

  it('any authenticated user can read /users/me (200)', () =>
    request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .expect(200));

  it('forbids students from listing users (403)', () =>
    request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .expect(403));

  it('allows admin to change roles (200)', () =>
    request(app.getHttpServer())
      .patch('/users/u1/role')
      .set('Authorization', `Bearer ${tokenFor(Role.ADMIN)}`)
      .send({ role: Role.STAFF })
      .expect(200));
});

describe('Lost & Found officer routes', () => {
  let app: INestApplication;
  const lostFound = {
    reportLost: jest.fn().mockResolvedValue({ id: 'l1' }),
    logFound: jest.fn().mockResolvedValue({ id: 'f1' }),
    listLost: jest.fn().mockResolvedValue([]),
    listFound: jest.fn().mockResolvedValue([]),
    suggestMatches: jest.fn().mockResolvedValue({ aiRanked: false, pairs: [] }),
    confirmMatch: jest.fn().mockResolvedValue({}),
    markReturnedToOwner: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    app = await bootControllerApp(LostFoundController, [
      { provide: LostFoundService, useValue: lostFound },
    ]);
  });
  afterAll(() => app.close());

  it('students may report lost items (201)', () =>
    request(app.getHttpServer())
      .post('/lost-found/lost')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .field('title', 'Blue backpack')
      .field('description', 'Nike backpack with laptop stickers')
      .field('lastSeenLocation', 'Library level 2')
      .expect(201));

  it('forbids students from logging found items (403)', () =>
    request(app.getHttpServer())
      .post('/lost-found/found')
      .set('Authorization', `Bearer ${tokenFor(Role.STUDENT)}`)
      .field('title', 'Umbrella')
      .field('description', 'Black umbrella')
      .field('foundLocation', 'Cafeteria')
      .expect(403));

  it('officer can view AI match suggestions (200)', () =>
    request(app.getHttpServer())
      .get('/lost-found/matches')
      .set('Authorization', `Bearer ${tokenFor(Role.LOST_FOUND_OFFICER)}`)
      .expect(200));
});
