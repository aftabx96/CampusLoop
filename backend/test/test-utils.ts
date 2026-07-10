import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import { JwtPayload, Role } from '../src/common/enums';

process.env.JWT_ACCESS_SECRET = 'test-secret';

const jwt = new JwtService({});

export function tokenFor(role: Role, overrides: Partial<JwtPayload> = {}) {
  const payload: JwtPayload = {
    sub: overrides.sub ?? '00000000-0000-0000-0000-000000000001',
    email: `${role.toLowerCase()}@test.edu`,
    role,
    departmentId: overrides.departmentId ?? '00000000-0000-0000-0000-0000000000aa',
    faculty: 'Engineering',
    ...overrides,
  };
  return jwt.sign(payload, { secret: 'test-secret', expiresIn: '10m' });
}

/**
 * Boots a minimal Nest app with one controller and mocked service providers,
 * but the REAL JwtAuthGuard + RolesGuard chain, so role protection is
 * exercised end-to-end over HTTP with Supertest.
 */
export async function bootControllerApp(
  controller: Type<unknown>,
  providers: Array<{ provide: Type<unknown>; useValue: unknown }>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [PassportModule],
    controllers: [controller],
    providers: [JwtStrategy, ...providers],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}
