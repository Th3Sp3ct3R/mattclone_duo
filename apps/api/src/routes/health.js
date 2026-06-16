import { Router } from 'express';

export function createHealthRouter() {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({ ok: true });
  });

  return router;
}
