import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private departments: Repository<Department>,
  ) {}

  findAll() {
    return this.departments.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const dept = await this.departments.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  create(data: Partial<Department>) {
    return this.departments.save(this.departments.create(data));
  }
}
