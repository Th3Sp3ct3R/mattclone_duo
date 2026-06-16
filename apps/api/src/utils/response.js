export function sendError(res, err, fallbackMessage) {
  if (err?.status && err?.payload) {
    return res.status(err.status).json(err.payload);
  }
  return res.status(500).json({ code: 'INTERNAL', message: fallbackMessage || 'Internal error' });
}
