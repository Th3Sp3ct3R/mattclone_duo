import { Router } from 'express';

import {
  listBookingServices,
  createBookingService,
  getBookingService,
  updateBookingService,
  deleteBookingService,
  getBookingAvailability,
  updateBookingAvailability,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getDashboardSummary
} from '@julio/api/controllers/admin';

export function createAdminRouter() {
  const router = Router();

  router.get('/booking-services', listBookingServices);
  router.post('/booking-services', createBookingService);
  router.get('/booking-services/:id', getBookingService);
  router.put('/booking-services/:id', updateBookingService);
  router.delete('/booking-services/:id', deleteBookingService);

  router.get('/booking-availability', getBookingAvailability);
  router.put('/booking-availability', updateBookingAvailability);

  router.get('/bookings', listBookings);
  router.get('/bookings/:id', getBooking);
  router.put('/bookings/:id', updateBooking);
  router.delete('/bookings/:id', deleteBooking);

  router.post('/dashboard/graphql', getDashboardSummary);

  return router;
}
