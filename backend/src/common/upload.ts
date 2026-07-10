import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const imageUploadOptions = {
  storage: diskStorage({
    destination: process.env.UPLOAD_DIR || './uploads',
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/image\/(png|jpe?g|webp)/.test(file.mimetype)) {
      return cb(new BadRequestException('Only PNG/JPEG/WebP images allowed'), false);
    }
    cb(null, true);
  },
};
