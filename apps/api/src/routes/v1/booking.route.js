import { Router } from 'express';

import {
  listServices,
  getAvailability,
  createBooking
} from '@julio/api/controllers/booking';

export function createBookingRouter() {
  const router = Router();

  router.get('/services', listServices);
  router.get('/availability', getAvailability);
  router.post('/', createBooking);

  return router;
}
