import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

const host = process.env.DB_HOST || 'localhost';
/** Neon (and most managed Postgres hosts) require SSL; local Docker/Postgres does not. */
const needsSsl = process.env.PGSSLMODE === 'require' || /neon\.tech$/.test(host);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'campusloop',
  password: process.env.DB_PASSWORD || 'campusloop_secret',
  database: process.env.DB_NAME || 'campusloop',
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
});
