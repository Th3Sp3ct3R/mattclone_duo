'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { postChatMessage } from '@julio/chatbot/client';
import { buildChatContextMessage } from '@julio/chatbot/shared';
import { Icon } from '@julio/icons';
import { Button } from '../../primitives/Button/Button.jsx';
import { Input } from '../../primitives/Input/Input.jsx';
import { Card } from '../../primitives/Card/Card.jsx';
import { Spinner } from '../../primitives/Spinner/Spinner.jsx';

const DEFAULT_PROMPTS = [
  'Help me book an appointment.',
  'What are your services?',
  'Can you explain pricing?'
];

const EMAIL_STORAGE_KEY = 'julio.chat.email';
const AUTO_OPEN_KEY = 'julio.chat.auto_opened';
const MINIMUM_INTAKE_LENGTH = 10;
const INITIAL_PROMPT = 'Hi! Tell us a bit about your project so we can help.';
const NAME_PROMPT = 'Thanks! What is your name?';
const EMAIL_PROMPT = 'Great. What is the best email to reach you?';
const THANK_YOU_MESSAGE = "Thanks! We'll be in touch shortly.";

export function ChatWidget({
  title = 'Chat with us',
  prompts = DEFAULT_PROMPTS,
  context,
  requestOptions,
  onInquiry,
  shouldCreateInquiry,
  isEmailValid
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [intakeMessage, setIntakeMessage] = useState('');
  const [contactName, setContactName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [chatClosed, setChatClosed] = useState(false);
  const [email, setEmail] = useState('');
  const [autoOpening, setAutoOpening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY) || '';
    if (storedEmail) setEmail(storedEmail);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(AUTO_OPEN_KEY)) return;
    setOpen(true);
    window.localStorage.setItem(AUTO_OPEN_KEY, '1');
  }, []);

  useEffect(() => {
    if (!open) return;
    setAutoOpening(true);
    const timer = setTimeout(() => setAutoOpening(false), 600);
    return () => clearTimeout(timer);
  }, [open]);

  const thread = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        isUser: message.role === 'user'
      })),
    [messages]
  );

  function scrollToBottom() {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }

  useEffect(() => {
    if (!open) return;
    if (messages.length > 0) return;
    setMessages([{ role: 'assistant', content: INITIAL_PROMPT }]);
  }, [open, messages.length]);

  function buildAiMessages(nextMessages, emailValue) {
    if (!emailValue) return nextMessages;
    return nextMessages.filter(
      (message) => !(message.role === 'user' && message.content === emailValue)
    );
  }

  async function sendMessage(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed || loading) return;
    setError('');

    if (!intakeMessage) {
      if (trimmed.length < MINIMUM_INTAKE_LENGTH) {
        setError('Please share a few details about your project.');
        return;
      }
      const nextMessages = [
        ...messages,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: NAME_PROMPT }
      ];
      setIntakeMessage(trimmed);
      setMessages(nextMessages);
      setInput('');
      setTimeout(scrollToBottom, 0);
      return;
    }

    if (!nameSubmitted) {
      if (trimmed.length < 2) {
        setError('Please enter your name to continue.');
        return;
      }
      setContactName(trimmed);
      setNameSubmitted(true);
      const nextMessages = [
        ...messages,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: EMAIL_PROMPT }
      ];
      setMessages(nextMessages);
      setInput('');
      setTimeout(scrollToBottom, 0);
      return;
    }

    if (!emailSubmitted) {
      const normalizedEmail = trimmed.toLowerCase();
      if (typeof isEmailValid === 'function' ? !isEmailValid(normalizedEmail) : !normalizedEmail) {
        setError('Please enter a valid email to continue.');
        return;
      }
      setEmail(normalizedEmail);
      setEmailSubmitted(true);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail);
      }
      const nextMessages = [...messages, { role: 'user', content: normalizedEmail }];
      setMessages(nextMessages);
      setInput('');
      setLoading(true);
      try {
        let inquiryResult = { ok: false };
        if (
          typeof onInquiry === 'function' &&
          shouldCreateInquiry?.({ name: contactName, email: normalizedEmail, message: intakeMessage })
        ) {
          inquiryResult = (await onInquiry({
            name: contactName,
            email: normalizedEmail,
            message: intakeMessage
          })) || { ok: false };
        }
        const nextMessagesWithThanks = inquiryResult.ok
          ? [...nextMessages, { role: 'assistant', content: THANK_YOU_MESSAGE }]
          : nextMessages;
        setMessages(nextMessagesWithThanks);
        if (inquiryResult.ok) {
          setChatClosed(true);
          setTimeout(scrollToBottom, 0);
          return;
        }
        const contextMessage = buildChatContextMessage(context);
        const aiMessages = buildAiMessages(
          [{ role: 'user', content: intakeMessage }],
          normalizedEmail
        );
        const requestMessages = contextMessage ? [contextMessage, ...aiMessages] : aiMessages;
        const response = await postChatMessage({
          messages: requestMessages,
          ...requestOptions
        });
        const reply = response?.message || '';
        setMessages([...nextMessagesWithThanks, { role: 'assistant', content: reply }]);
        setTimeout(scrollToBottom, 0);
      } catch (err) {
        setError(err?.message || 'Chat failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');

    try {
      const contextMessage = buildChatContextMessage(context);
      const aiMessages = buildAiMessages(nextMessages, email);
      const requestMessages = contextMessage ? [contextMessage, ...aiMessages] : aiMessages;
      const response = await postChatMessage({
        messages: requestMessages,
        ...requestOptions
      });
      const reply = response?.message || '';
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
      setTimeout(scrollToBottom, 0);
    } catch (err) {
      setError(err?.message || 'Chat failed');
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className={`c-ChatWidget ${open ? 'is-open' : ''}`}>
      <Button className="c-ChatWidget__toggle" onClick={() => setOpen((prev) => !prev)}>
        <Icon name={open ? 'close' : 'chat'} size={18} />
        <span className="c-ChatWidget__toggleLabel">
          {open ? 'Close chat' : 'Open chat'}
        </span>
      </Button>

      {open ? (
        <Card className={`c-ChatWidget__panel ${autoOpening ? 'is-opening' : ''}`}>
          <div className="c-ChatWidget__header">
            <strong>{title}</strong>
            <span className="c-ChatWidget__status layout-inline-gap-8 layout-inline-center">
              {loading ? <Spinner size="sm" label="Assistant typing" /> : null}
              <span>{loading ? 'Typing…' : 'Online'}</span>
            </span>
          </div>

          {error ? <div className="c-ChatWidget__error">{error}</div> : null}

          <div className="c-ChatWidget__messages" ref={listRef}>
            {thread.length <= 1 && emailSubmitted ? (
              <div className="c-ChatWidget__empty">
                <div className="Kicker">Try a prompt</div>
                <div className="c-ChatWidget__prompts">
                  {prompts.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="secondary"
                      onClick={() => sendMessage(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {thread.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`c-ChatWidget__bubble ${message.isUser ? 'is-user' : 'is-bot'}`}
              >
                {message.content}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="c-ChatWidget__form">
            <Input
              value={input}
              placeholder="Type a message..."
              disabled={chatClosed}
              onChange={(event) => {
                setInput(event.target.value);
                if (error) setError('');
              }}
            />
            <Button
              type="submit"
              className="c-ChatWidget__sendButton"
              disabled={chatClosed || loading || !input.trim()}
              aria-label="Send message"
            >
              <Icon name="send" size={18} />
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

