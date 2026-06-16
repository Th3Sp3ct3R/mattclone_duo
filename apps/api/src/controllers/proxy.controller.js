export function proxyNotImplemented(req, res) {
  return res
    .status(501)
    .json({ code: 'NOT_IMPLEMENTED', message: 'Proxy route not configured' });
}
