'use client';

import { useEffect } from 'react';

import { useSetChatPageContext } from './ChatContextProvider.jsx';

export function ChatPageContext({ context }) {
  const setPageContext = useSetChatPageContext();

  useEffect(() => {
    setPageContext(context || null);
    return () => setPageContext(null);
  }, [context, setPageContext]);

  return null;
}
