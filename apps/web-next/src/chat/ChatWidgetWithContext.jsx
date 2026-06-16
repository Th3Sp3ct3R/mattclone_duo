'use client';

import { useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { stripLocalePrefix } from '@julio/shared';
import { ChatWidget } from '@julio/ui';
import { api } from '@julio/api-client';
import { normalizeChatInquiryPayload, isValidEmail, isValidName } from '@julio/chatbot/shared';
import { notifications } from '@/src/notifications/client.js';

import { useAuthUser } from './useAuthUser.js';
import { useChatPageContext } from './ChatContextProvider.jsx';
import { useRecentNotifications } from './useRecentNotifications.js';

function buildQueryParameters(searchParams) {
  if (!searchParams) return null;
  const entries = {};
  for (const [key, value] of searchParams.entries()) {
    if (!key) continue;
    entries[key] = value;
  }
  return Object.keys(entries).length ? entries : null;
}

export function ChatWidgetWithContext(props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthUser();
  const pageData = useChatPageContext();
  const recentEvents = useRecentNotifications();

  const routeContext = useMemo(() => {
    const { pathname: strippedPath, locale } = stripLocalePrefix(pathname || '/');
    return {
      path: strippedPath || '/',
      locale: locale || null,
      query: buildQueryParameters(searchParams)
    };
  }, [pathname, searchParams]);

  const context = useMemo(
    () => ({
      route: routeContext,
      user: user ? { email: user.email || null, role: user.role || null } : null,
      assistant: {
        name: 'Avery',
        role: 'Customer support specialist',
        scope: 'Handle inquiries and answer basic questions only.',
        tone: 'Friendly, concise, and helpful.',
        responseGuidelines:
          'Use short, direct sentences. No markdown, no reasoning, no lists unless asked.'
      },
      responseStyle: 'Plain text only. Keep responses under 3 sentences.',
      pageData,
      recentEvents
    }),
    [routeContext, user, pageData, recentEvents]
  );

  const [inquiryId, setInquiryId] = useState(null);
  const [contactStatus, setContactStatus] = useState('pending');
  const [hasSubmittedInquiry, setHasSubmittedInquiry] = useState(false);

  const contextWithInquiry = useMemo(
    () => ({ ...context, inquiryId, contact: { status: contactStatus } }),
    [context, inquiryId, contactStatus]
  );

  function shouldCreateInquiry({ name, email, message }) {
    if (hasSubmittedInquiry) return false;
    if (!name || !isValidName(name)) return false;
    if (!message || message.length < 2) return false;
    if (!email || !isValidEmail(email)) return false;
    return true;
  }

  async function handleInquiry({ name, email, message }) {
    const payload = normalizeChatInquiryPayload({
      name,
      email,
      message,
      context: contextWithInquiry,
      maximumMessageLength: 1000
    });
    try {
      const result = await api.contact.createInquiry(payload);
      const createdId = result?.inquiry?.id || result?.inquiry?._id || null;
      if (createdId) setInquiryId(createdId);
      setHasSubmittedInquiry(true);
      setContactStatus('submitted');
      return { ok: true, inquiryId: createdId };
    } catch (err) {
      const messageText = err?.message || 'Inquiry could not be saved.';
      notifications.notify({ title: 'Inquiry not saved', message: messageText });
      return { ok: false };
    }
  }

  return (
    <ChatWidget
      {...props}
      context={contextWithInquiry}
      requestOptions={{ temperature: 0.3, maxTokens: 200 }}
      onInquiry={handleInquiry}
      shouldCreateInquiry={shouldCreateInquiry}
      isEmailValid={isValidEmail}
    />
  );
}
