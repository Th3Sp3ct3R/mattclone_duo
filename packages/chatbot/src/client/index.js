export async function postChatMessage(payload) {
  const res = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || 'Chat request failed';
    const err = new Error(message);
    err.data = data;
    throw err;
  }
  return data;
}


