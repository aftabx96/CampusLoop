import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload, Role } from '../../common/enums';
import { Asset } from '../../entities/asset.entity';
import { CreateAssetDto, UpdateAssetDto } from './dto';

@Injectable()
export class AssetsService {
  constructor(@InjectRepository(Asset) private assets: Repository<Asset>) {}

  /**
   * Catalogue listing with optional PostgreSQL full-text search across
   * name, description and tags (searchVector maintained by DB trigger).
   */
  async findAll(query: {
    q?: string;
    category?: string;
    departmentId?: string;
    availability?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Number(query.limit) || 12);
    const qb = this.assets
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.department', 'd');

    if (query.q) {
      qb.andWhere(
        `(a."searchVector" @@ plainto_tsquery('english', :q) OR a.name ILIKE :like)`,
        { q: query.q, like: `%${query.q}%` },
      );
    }
    if (query.category) qb.andWhere('a.category = :category', { category: query.category });
    if (query.departmentId) qb.andWhere('a.departmentId = :dept', { dept: query.departmentId });
    if (query.availability) qb.andWhere('a.availability = :avail', { avail: query.availability });

    qb.orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async create(dto: CreateAssetDto, user: JwtPayload, photoUrl?: string) {
    const departmentId =
      user.role === Role.ADMIN && dto.departmentId
        ? dto.departmentId
        : user.departmentId;
    if (!departmentId) throw new ForbiddenException('No department context');

    const asset = this.assets.create({
      ...dto,
      tags: dto.tags ? dto.tags.split(',').map((t) => t.trim()) : [],
      departmentId,
      photoUrl,
    });
    return this.assets.save(asset);
  }

  async update(id: string, dto: UpdateAssetDto, user: JwtPayload, photoUrl?: string) {
    const asset = await this.findOne(id);
    this.assertManages(asset, user);
    Object.assign(asset, {
      ...dto,
      tags: dto.tags !== undefined ? dto.tags.split(',').map((t) => t.trim()) : asset.tags,
      photoUrl: photoUrl ?? asset.photoUrl,
    });
    return this.assets.save(asset);
  }

  async transfer(id: string, departmentId: string, user: JwtPayload) {
    if (user.role !== Role.ADMIN)
      throw new ForbiddenException('Only admins can transfer assets');
    const asset = await this.findOne(id);
    asset.departmentId = departmentId;
    asset.department = undefined;
    await this.assets.save(asset);
    return this.findOne(id);
  }

  async remove(id: string, user: JwtPayload) {
    const asset = await this.findOne(id);
    this.assertManages(asset, user);
    await this.assets.delete(id);
    return { success: true };
  }

  private assertManages(asset: Asset, user: JwtPayload) {
    if (user.role === Role.ADMIN) return;
    if (user.role === Role.STAFF && user.departmentId === asset.departmentId) return;
    throw new ForbiddenException('You do not manage this asset');
  }
}
