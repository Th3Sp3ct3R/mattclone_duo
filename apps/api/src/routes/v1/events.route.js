import { Router } from 'express';

import {
  listEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  listPublicEvents,
  getPublicEvent
} from '@julio/api/controllers/events';

export function createEventsRouter() {
  const router = Router();

  router.get('/', listEvents);
  router.post('/', createEvent);
  router.get('/public', listPublicEvents);
  router.get('/public/:slug', getPublicEvent);
  router.get('/:id', getEvent);
  router.put('/:id', updateEvent);
  router.delete('/:id', deleteEvent);

  return router;
}
