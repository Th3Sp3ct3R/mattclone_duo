export const DEFAULT_MODEL = 'gpt-4o-mini';

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'assistant') return 'assistant';
  if (value === 'system') return 'system';
  return 'user';
}

export function normalizeMessage(message) {
  if (!message || typeof message !== 'object') return null;
  const content = String(message.content || '').trim();
  if (!content) return null;
  return { role: normalizeRole(message.role), content };
}

export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map(normalizeMessage).filter(Boolean);
}

export { buildChatContextMessage, DEFAULT_CONTEXT_LIMITS, DEFAULT_REDACTED_KEYS } from './context.js';
export {
  normalizeChatInquiryPayload,
  isValidEmail,
  isValidName,
  DEFAULT_SUBJECT,
  MINIMUM_NAME_LENGTH
} from './inquiry.js';


