import { Router } from 'express';

import {
  listUsers,
  createUser,
  getMe,
  updateMe,
  getUser,
  updateUser,
  deleteUser
} from '@julio/api/controllers/users';

export function createUsersRouter() {
  const router = Router();

  router.get('/', listUsers);
  router.post('/', createUser);
  router.get('/me', getMe);
  router.put('/me', updateMe);
  router.get('/:id', getUser);
  router.put('/:id', updateUser);
  router.delete('/:id', deleteUser);

  return router;
}
