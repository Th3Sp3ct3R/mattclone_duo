import { Router } from 'express';
import multer from 'multer';

import { createPresign, uploadImage } from '@julio/api/controllers/assets';

const upload = multer({ storage: multer.memoryStorage() });

export function createAssetsRouter() {
  const router = Router();

  router.post('/presign', createPresign);
  router.post('/image', upload.single('file'), uploadImage);

  return router;
}
