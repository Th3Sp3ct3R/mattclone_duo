const DEFAULT_SUBJECT = 'Chat inquiry';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MINIMUM_NAME_LENGTH = 2;

function normalizeText(value, maximumLength) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!maximumLength || text.length <= maximumLength) return text;
  return `${text.slice(0, maximumLength - 1)}…`;
}

function buildSubjectFromContext(context) {
  const routePath = String(context?.route?.path || '').trim();
  const pageName = String(context?.pageData?.pageName || context?.pageData?.title || '').trim();
  if (pageName) return `Chat inquiry: ${pageName}`;
  if (routePath) return `Chat inquiry: ${routePath}`;
  return DEFAULT_SUBJECT;
}

export function normalizeChatInquiryPayload({
  name,
  email,
  message,
  context,
  maximumMessageLength = 1000
}) {
  const safeName = normalizeText(name, 120);
  const safeEmail = normalizeText(email, 120);
  const safeMessage = normalizeText(message, maximumMessageLength);
  const subject = normalizeText(buildSubjectFromContext(context), 160) || DEFAULT_SUBJECT;

  return {
    name: safeName,
    email: safeEmail,
    message: safeMessage,
    subject
  };
}

export function isValidName(value) {
  const name = String(value || '').trim();
  if (!name) return false;
  return name.length >= MINIMUM_NAME_LENGTH;
}

export function isValidEmail(value) {
  const email = String(value || '').trim();
  if (!email) return false;
  return EMAIL_PATTERN.test(email);
}

export { DEFAULT_SUBJECT, MINIMUM_NAME_LENGTH };
