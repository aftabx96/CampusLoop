import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/enums';
import { Department } from '../../entities/department.entity';
import { User } from '../../entities/user.entity';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Department) private departments: Repository<Department>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
  // Allow only SZABIST email addresses
  const email = dto.email.toLowerCase();

  if (
    !email.endsWith('@szabist.pk') &&
    !email.endsWith('@szabist.edu.pk')
  ) {
    throw new BadRequestException(
      'Only SZABIST email addresses are allowed.',
    );
  }

  const existing = await this.users.findOne({
    where: { email: dto.email },
  });

  if (existing) {
    throw new ConflictException('Email already registered');
  }

  const department = dto.departmentId
    ? await this.departments.findOne({
        where: { id: dto.departmentId },
      })
    : null;

  const user = this.users.create({
    email: dto.email,
    passwordHash: await bcrypt.hash(dto.password, 10),
    fullName: dto.fullName,
    role: dto.role,
    department,
    departmentId: department?.id ?? null,
    studentNumber: dto.studentNumber,
  });

  await this.users.save(user);

  return this.issueTokens(user);
}

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.department', 'd')
      .where('u.email = :email', { email: dto.email })
      .getOne();
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.refreshTokenHash')
      .leftJoinAndSelect('u.department', 'd')
      .where('u.id = :id', { id: payload.sub })
      .getOne();
    if (
      !user ||
      !user.refreshTokenHash ||
      !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Refresh token revoked');
    }
    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.users.update(userId, { refreshTokenHash: null });
    return { success: true };
  }

  /** University SSO simulation: JWT carries role + department + faculty claims. */
  private async issueTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId ?? null,
      faculty: user.department?.faculty ?? null,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access',
      expiresIn: process.env.JWT_ACCESS_TTL || '900s',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh',
      expiresIn: process.env.JWT_REFRESH_TTL || '7d',
    });
    await this.users.update(user.id, {
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId,
        faculty: user.department?.faculty ?? null,
        department: user.department?.name ?? null,
        reputationScore: user.reputationScore,
        studentNumber: user.studentNumber,
      },
    };
  }
}
