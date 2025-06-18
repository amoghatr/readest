import React from 'react';
import { HiChatBubbleLeftRight, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';

import Button from '@/components/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { useChatStore } from '@/store/chatStore';
import { useReaderStore } from '@/store/readerStore';

interface ChatTogglerProps {
  bookKey: string;
}

const ChatToggler: React.FC<ChatTogglerProps> = ({ bookKey }) => {
  const _ = useTranslation();
  const { isChatVisible, toggleChat } = useChatStore();
  const { setHoveredBookKey } = useReaderStore();

  const handleToggleChat = () => {
    toggleChat();
    setHoveredBookKey('');
    // ChatPanel will handle auto-selection of the most recent conversation for this book
  };

  return (
    <Button
      icon={
        isChatVisible ? (
          <HiChatBubbleLeftRight className='text-base-content' />
        ) : (
          <HiOutlineChatBubbleLeftRight className='text-base-content' />
        )
      }
      onClick={handleToggleChat}
      tooltip={_('Chat with Book')}
      tooltipDirection='bottom'
    />
  );
};

export default ChatToggler;