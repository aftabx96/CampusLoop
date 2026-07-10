import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Asset } from './asset.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  faculty: string;

  @Column({ nullable: true })
  building: string;

  @OneToMany(() => User, (u) => u.department)
  users: User[];

  @OneToMany(() => Asset, (a) => a.department)
  assets: Asset[];
}
