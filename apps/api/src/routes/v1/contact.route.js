import { Router } from 'express';

import {
  listInquiries,
  createInquiry,
  getInquiry,
  updateInquiry
} from '@julio/api/controllers/contact';

export function createContactRouter() {
  const router = Router();

  router.get('/', listInquiries);
  router.post('/', createInquiry);
  router.get('/:id', getInquiry);
  router.put('/:id', updateInquiry);

  return router;
}
