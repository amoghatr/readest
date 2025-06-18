import { useTranslation } from '@/hooks/useTranslation';
import { useBookDataStore } from '@/store/bookDataStore';
import { useChatStore } from '@/store/chatStore';
import clsx from 'clsx';
import React, { useState } from 'react';
import { HiOutlineClock, HiOutlineTrash } from 'react-icons/hi';

interface ChatHistoryProps {
  currentBookKey?: string;
  currentConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ currentBookKey, currentConversationId, onSelectConversation }) => {
  const _ = useTranslation();
  const { conversations, clearConversation, deleteOldConversations } = useChatStore();
  const { getBookData } = useBookDataStore();
  const [isOpen, setIsOpen] = useState(false);

  const sortedConversations = Object.values(conversations)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return _('Today');
    if (diffDays === 1) return _('Yesterday');
    if (diffDays < 7) return `${diffDays} ${_('days ago')}`;

    return date.toLocaleDateString();
  };

  const getBookTitle = (bookKey: string) => {
    const bookData = getBookData(bookKey);
    return bookData?.book?.title || _('Unknown Book');
  };

  const handleClearOld = () => {
    if (confirm(_('Delete conversations older than 30 days?'))) {
      deleteOldConversations(30);
    }
  };

  // Group conversations by book
  const conversationsByBook = sortedConversations.reduce((acc, conv) => {
    const bookKey = conv.bookKey;
    if (!acc[bookKey]) {
      acc[bookKey] = [];
    }
    acc[bookKey]!.push(conv);
    return acc;
  }, {} as Record<string, typeof sortedConversations>);

  // Show only conversations for current book if specified
  const displayConversations = currentBookKey
    ? conversationsByBook[currentBookKey] || []
    : sortedConversations;

  return (
    <>
      <button
        className="btn btn-sm btn-ghost"
        onClick={() => setIsOpen(true)}
        title={_('Conversation History')}
      >
        <HiOutlineClock size={16} />
      </button>

      {isOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <HiOutlineClock size={20} />
              {currentBookKey ? _('Conversations in this book') : _('All Conversation History')}
            </h3>

            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-base-content/70">
                {displayConversations.length} {_('conversations')}
              </p>
              <button
                className="btn btn-sm btn-ghost text-error"
                onClick={handleClearOld}
              >
                {_('Clear old conversations')}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {displayConversations.length === 0 ? (
                <p className="text-center text-base-content/60 py-8">
                  {_('No conversation history yet')}
                </p>
              ) : (
                displayConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={clsx(
                      'card bg-base-100 shadow-sm cursor-pointer transition-all',
                      'hover:shadow-md hover:bg-base-200',
                      conv.id === currentConversationId && 'ring-2 ring-primary'
                    )}
                    onClick={() => {
                      console.log('ChatHistory: Clicking conversation:', conv.id);
                      onSelectConversation?.(conv.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {!currentBookKey && (
                            <h4 className="font-medium text-sm mb-1">
                              {getBookTitle(conv.bookKey)}
                            </h4>
                          )}
                          <p className="text-xs text-base-content/60">
                            {conv.messages.length} {_('messages')} • {formatDate(conv.updatedAt)}
                          </p>
                          {conv.messages.length > 0 && (
                            <p className="text-xs text-base-content/70 mt-2 line-clamp-2">
                              {conv.messages[conv.messages.length - 1]?.content || ''}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(_('Delete this conversation?'))) {
                                clearConversation(conv.id);
                              }
                            }}
                          >
                            <HiOutlineTrash size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setIsOpen(false)}
              >
                {_('Close')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
};

export default ChatHistory;