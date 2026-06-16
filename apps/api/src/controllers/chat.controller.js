import { createChatCompletion } from '@julio/chatbot/server';
import { normalizeMessages, DEFAULT_MODEL } from '@julio/chatbot/shared';
import { env } from '@julio/api/config/env';
import { logger } from '@julio/api/logger';

function sanitizeNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export async function createChat(req, res) {
  try {
    const messages = normalizeMessages(req.body?.messages);
    const model = req.body?.model || DEFAULT_MODEL;
    const provider = req.body?.provider || 'auto';
    const temperature = sanitizeNumber(req.body?.temperature, 0.6);
    const maxTokens = sanitizeNumber(req.body?.maxTokens, 512);

    if (!messages.length) {
      return res
        .status(400)
        .json({ code: 'BAD_REQUEST', message: 'Messages are required' });
    }

    const result = await createChatCompletion({
      provider,
      openAiApiKey: env.openAiApiKey,
      huggingFaceApiKey: env.huggingFaceApiKey,
      huggingFaceModel: env.huggingFaceChatModel,
      model,
      messages,
      temperature,
      maxTokens,
      metadata: { source: 'api' }
    });

    return res.json({ ok: true, message: result.content, usage: result.usage });
  } catch (err) {
    logger.error('Chat API failed', err);
    return res.status(500).json({ code: 'CHAT_ERROR', message: err?.message || 'Chat failed' });
  }
}
