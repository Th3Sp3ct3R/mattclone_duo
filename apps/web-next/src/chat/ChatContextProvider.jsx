'use client';

import { createContext, useContext, useMemo, useState } from 'react';

const ChatPageContext = createContext(null);

export function ChatContextProvider({ children }) {
  const [pageData, setPageData] = useState(null);

  const value = useMemo(
    () => ({
      pageData,
      setPageData
    }),
    [pageData]
  );

  return <ChatPageContext.Provider value={value}>{children}</ChatPageContext.Provider>;
}

export function useChatPageContext() {
  const context = useContext(ChatPageContext);
  return context?.pageData || null;
}

export function useSetChatPageContext() {
  const context = useContext(ChatPageContext);
  if (!context) {
    throw new Error('useSetChatPageContext must be used within ChatContextProvider');
  }
  return context.setPageData;
}
