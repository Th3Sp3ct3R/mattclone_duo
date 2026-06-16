import OpenAI from 'openai';

import { DEFAULT_MODEL, normalizeMessages } from '../shared/index.js';

export const PROVIDERS = {
  openai: 'openai',
  huggingface: 'huggingface',
  auto: 'auto'
};

export function resolveProvider({ provider, openAiApiKey, huggingFaceApiKey }) {
  if (provider === PROVIDERS.openai) return PROVIDERS.openai;
  if (provider === PROVIDERS.huggingface) return PROVIDERS.huggingface;
  if (openAiApiKey) return PROVIDERS.openai;
  if (huggingFaceApiKey) return PROVIDERS.huggingface;
  throw new Error('No LLM provider is configured');
}

export function createOpenAiClient(apiKey, options = {}) {
  if (!apiKey) throw new Error('Missing OpenAI API key');
  return new OpenAI({ apiKey, ...options });
}

async function createOpenAiChatCompletion({
  apiKey,
  model = DEFAULT_MODEL,
  messages = [],
  temperature = 0.6,
  maxTokens = 512,
  metadata
}) {
  const client = createOpenAiClient(apiKey);
  const safeMessages = normalizeMessages(messages);
  if (!safeMessages.length) throw new Error('Messages are required');

  const response = await client.chat.completions.create({
    model,
    messages: safeMessages,
    temperature,
    max_tokens: maxTokens,
    metadata
  });

  const choice = response.choices?.[0];
  return {
    id: response.id,
    model: response.model,
    content: choice?.message?.content || '',
    usage: response.usage || null
  };
}

async function createHuggingFaceChatCompletion({
  apiKey,
  model,
  messages = [],
  temperature = 0.6,
  maxTokens = 512,
  metadata
}) {
  if (!apiKey) throw new Error('Missing Hugging Face API key');
  if (!model) throw new Error('Missing Hugging Face model');
  const safeMessages = normalizeMessages(messages);
  if (!safeMessages.length) throw new Error('Messages are required');

  const client = createOpenAiClient(apiKey, {
    baseURL: 'https://router.huggingface.co/v1'
  });

  const response = await client.chat.completions.create({
    model,
    messages: safeMessages,
    temperature,
    max_tokens: maxTokens,
    metadata
  });

  const choice = response.choices?.[0];
  return {
    id: response.id,
    model: response.model,
    content: choice?.message?.content || '',
    usage: response.usage || null
  };
}

export async function createChatCompletion({
  provider = PROVIDERS.auto,
  openAiApiKey,
  huggingFaceApiKey,
  huggingFaceModel,
  model = DEFAULT_MODEL,
  messages = [],
  temperature = 0.6,
  maxTokens = 512,
  metadata
}) {
  const resolved = resolveProvider({ provider, openAiApiKey, huggingFaceApiKey });
  if (resolved === PROVIDERS.openai) {
    return createOpenAiChatCompletion({
      apiKey: openAiApiKey,
      model,
      messages,
      temperature,
      maxTokens,
      metadata
    });
  }
  return createHuggingFaceChatCompletion({
    apiKey: huggingFaceApiKey,
    model: huggingFaceModel || model,
    messages,
    temperature,
    maxTokens,
    metadata
  });
}

