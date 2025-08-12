import React, { createContext, useContext, useState } from 'react';

const ChatButtonContext = createContext({
  isChatButtonVisible: true,
  hideChatButton: () => {},
  showChatButton: () => {},
});

export const ChatButtonProvider = ({ children }) => {
  const [isChatButtonVisible, setIsChatButtonVisible] = useState(true);

  const hideChatButton = () => setIsChatButtonVisible(false);
  const showChatButton = () => setIsChatButtonVisible(true);

  return (
    <ChatButtonContext.Provider value={{ isChatButtonVisible, hideChatButton, showChatButton }}>
      {children}
    </ChatButtonContext.Provider>
  );
};

export const useChatButton = () => useContext(ChatButtonContext);