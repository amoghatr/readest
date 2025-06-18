import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';
import { HiMiniPaperAirplane } from 'react-icons/hi2';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useEnv } from '@/context/EnvContext';
import { useDrag } from '@/hooks/useDrag';
import { useTranslation } from '@/hooks/useTranslation';
import { aiService, initializeAIService } from '@/services/aiService';
import { useBookDataStore } from '@/store/bookDataStore';
import { ChatMessage, useChatStore } from '@/store/chatStore';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useThemeStore } from '@/store/themeStore';
import { getBookDirFromLanguage } from '@/utils/book';
import { uniqueId } from '@/utils/misc';
import ChatHistory from './ChatHistory';
import ChatSettings from './ChatSettings';

const MIN_CHAT_WIDTH = 0.25;
const MAX_CHAT_WIDTH = 0.45;

const ChatPanel: React.FC = () => {
  const _ = useTranslation();
  const { updateAppTheme } = useThemeStore();
  const { appService } = useEnv();
  const { sideBarBookKey } = useSidebarStore();
  const { getBookData } = useBookDataStore();
  const { getViewSettings } = useReaderStore();
  const { isAppBoard } = useEnv() as any;
  const { isPinned } = useThemeStore() as any;
  const { settings } = useSettingsStore();

  const {
    chatWidth,
    isChatVisible,
    isChatPinned,
    currentSelection,
    conversations,
    activeConversationId,
    setChatWidth,
    setChatPin,
    setChatVisible,
    setCurrentSelection,
    addMessage,
    clearConversation,
    createConversation,
    getConversation,
    getConversationsForBook,
    setActiveConversation,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewConversationPrompt, setShowNewConversationPrompt] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previousSelectionRef = useRef<string | null>(null);

  const activeConversation = activeConversationId ? getConversation(activeConversationId) : undefined;
  const bookConversations = sideBarBookKey ? getConversationsForBook(sideBarBookKey) : [];

  useEffect(() => {
    if (isChatVisible) {
      updateAppTheme('base-200');
    } else {
      updateAppTheme('base-100');
    }
  }, [isChatVisible, updateAppTheme]);

  useEffect(() => {
    if (isChatVisible && currentSelection && sideBarBookKey) {
      const currentText = currentSelection.text;
      const previousText = previousSelectionRef.current;

      // Only react if the text has actually changed
      if (currentText !== previousText) {
        previousSelectionRef.current = currentText;

        // Check if we have an active conversation
        if (activeConversation && activeConversation.bookKey === sideBarBookKey) {
          // Show prompt to user if they want to continue or start new
          setShowNewConversationPrompt(true);
        } else {
          // No active conversation for this book, create a new one
          if (currentSelection && currentSelection.text) {
            const contextMessage: ChatMessage = {
              id: uniqueId(),
              role: 'assistant',
              content: `I'll help you discuss this passage from the book. You've selected:\n\n"${currentSelection.text}"\n\nWhat would you like to know or discuss about this text?`,
              timestamp: Date.now(),
              selectedText: currentSelection.text,
            };
            createConversation(sideBarBookKey, contextMessage);
          } else {
            // No text selected, create a general conversation starter
            const contextMessage: ChatMessage = {
              id: uniqueId(),
              role: 'assistant',
              content: `Hello! I'm here to help you discuss this book. You can select any text passage to discuss it specifically, or ask me general questions about the book, its themes, characters, or any other literary topics.`,
              timestamp: Date.now(),
            };
            createConversation(sideBarBookKey, contextMessage);
          }
        }
      }
    }
  }, [currentSelection?.text, isChatVisible, sideBarBookKey, activeConversation, createConversation]);

  // Auto-select most recent conversation for current book when opening chat
  useEffect(() => {
    if (isChatVisible && sideBarBookKey && !activeConversationId) {
      const bookConvs = getConversationsForBook(sideBarBookKey);
      console.log('Auto-selecting conversation for book:', sideBarBookKey, 'conversations:', bookConvs.length);
      if (bookConvs.length > 0 && bookConvs[0]) {
        console.log('Auto-selecting conversation:', bookConvs[0].id);
        setActiveConversation(bookConvs[0].id);
      } else if (!currentSelection) {
        // No existing conversations and no text selected - create a general conversation
        const contextMessage: ChatMessage = {
          id: uniqueId(),
          role: 'assistant',
          content: `Hello! I'm here to help you discuss this book. You can select any text passage to discuss it specifically, or ask me general questions about the book, its themes, characters, or any other literary topics.`,
          timestamp: Date.now(),
        };
        createConversation(sideBarBookKey, contextMessage);
      }
    }
  }, [isChatVisible, sideBarBookKey, activeConversationId, currentSelection, getConversationsForBook, setActiveConversation, createConversation]);

  // Only auto-scroll when new messages are added, not when switching conversations
  useEffect(() => {
    const currentMessageCount = activeConversation?.messages.length || 0;

    // Only scroll if the message count increased (new message added)
    if (currentMessageCount > previousMessageCount && previousMessageCount > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    setPreviousMessageCount(currentMessageCount);
  }, [activeConversation?.messages.length, previousMessageCount]);

  // Initialize AI service with settings
  useEffect(() => {
    if (settings?.geminiApiKey) {
      initializeAIService({
        geminiApiKey: settings.geminiApiKey,
        geminiModel: settings.geminiModel,
      });
    }
  }, [settings]);

  const handleChatResize = (newWidth: string) => {
    setChatWidth(newWidth);
  };

  const onDragMove = (data: { clientX: number }) => {
    const widthFraction = 1 - data.clientX / window.innerWidth;
    const newWidth = Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, widthFraction));
    handleChatResize(`${Math.round(newWidth * 10000) / 100}%`);
  };

  const { handleDragStart } = useDrag(onDragMove);

  const handleClickOverlay = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setChatVisible(false);
  };

  const handleStartNewConversation = () => {
    if (!sideBarBookKey) return;

    let contextMessage: ChatMessage;

    if (currentSelection && currentSelection.text) {
      contextMessage = {
        id: uniqueId(),
        role: 'assistant',
        content: `I'll help you discuss this passage from the book. You've selected:\n\n"${currentSelection.text}"\n\nWhat would you like to know or discuss about this text?`,
        timestamp: Date.now(),
        selectedText: currentSelection.text,
      };
    } else {
      contextMessage = {
        id: uniqueId(),
        role: 'assistant',
        content: `Hello! I'm here to help you discuss this book. You can select any text passage to discuss it specifically, or ask me general questions about the book, its themes, characters, or any other literary topics.`,
        timestamp: Date.now(),
      };
    }

    createConversation(sideBarBookKey, contextMessage);
    setShowNewConversationPrompt(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeConversationId || isLoading) return;

    // Check if this is the first message in the conversation
    const isFirstMessage = activeConversation?.messages.length === 0;

    const userMessage: ChatMessage = {
      id: uniqueId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
      selectedText: isFirstMessage ? currentSelection?.text : undefined,
    };

    addMessage(activeConversationId, userMessage);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!sideBarBookKey) return;
      const bookData = getBookData(sideBarBookKey);
      const book = bookData?.book;

      // Prepare conversation history
      const conversationHistory = activeConversation?.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })) || [];

      // Only include selected text context for the first message
      const response = await aiService.chat({
        message: inputValue.trim(),
        selectedText: isFirstMessage ? currentSelection?.text : undefined,
        bookTitle: book?.title,
        bookAuthor: book?.author,
        conversationHistory,
      });

      const aiMessage: ChatMessage = {
        id: uniqueId(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };

      addMessage(activeConversationId, aiMessage);

      // Clear the current selection after the first message so follow-ups are free-form
      if (isFirstMessage) {
        setCurrentSelection(null);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: uniqueId(),
        role: 'assistant',
        content: _('Sorry, I encountered an error. Please try again.'),
        timestamp: Date.now(),
      };
      addMessage(activeConversationId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (activeConversationId && window.confirm(_('Are you sure you want to clear this conversation?'))) {
      clearConversation(activeConversationId);
      // Select next conversation if available
      const remainingConvs = bookConversations.filter(c => c.id !== activeConversationId);
      if (remainingConvs.length > 0 && remainingConvs[0]) {
        setActiveConversation(remainingConvs[0].id);
      }
    }
  };

  if (!sideBarBookKey || !isChatVisible) return null;

  const bookData = getBookData(sideBarBookKey);
  const viewSettings = getViewSettings(sideBarBookKey);
  if (!bookData || !bookData.bookDoc) {
    return null;
  }

  const { bookDoc } = bookData;
  const languageDir = getBookDirFromLanguage(bookDoc.metadata.language);

  return (
    <>
      {!isChatPinned && (
        <div className='overlay fixed inset-0 z-10 bg-black/20' onClick={handleClickOverlay} />
      )}
      <div
        className={clsx(
          'chat-panel-container bg-base-200 right-0 z-20 flex min-w-80 select-none flex-col',
          'font-sans text-base font-normal sm:text-sm',
          appService?.isIOSApp ? 'h-[100vh]' : 'h-full',
          appService?.hasSafeAreaInset && 'pt-[env(safe-area-inset-top)]',
          appService?.hasRoundedWindow && 'rounded-window-top-right rounded-window-bottom-right',
          !isChatPinned && 'shadow-2xl',
        )}
        dir={viewSettings?.rtl && languageDir === 'rtl' ? 'rtl' : 'ltr'}
        style={{
          width: chatWidth,
          maxWidth: `${MAX_CHAT_WIDTH * 100}%`,
          position: isChatPinned ? 'relative' : 'absolute',
        }}
      >
        <div
          className='drag-bar absolute left-0 top-0 h-full w-0.5 cursor-col-resize'
          onMouseDown={handleDragStart}
        />

        {/* Header */}
        <div className='chat-header flex h-12 items-center justify-between border-b border-base-200 px-4'>
          <h3 className='text-lg font-semibold'>{_('Chat')}</h3>
          <div className='flex items-center gap-2'>
            <button
              className='btn btn-ghost btn-sm btn-circle'
              onClick={handleStartNewConversation}
              title={_('New conversation')}
            >
              <HiOutlinePlus className='w-4 h-4' />
            </button>
            <ChatHistory
              currentBookKey={sideBarBookKey}
              currentConversationId={activeConversationId}
              onSelectConversation={(conversationId) => {
                console.log('Selecting conversation:', conversationId);
                setActiveConversation(conversationId);
                setShowNewConversationPrompt(false); // Hide prompt when switching conversations
              }}
            />
            <button
              className='btn btn-ghost btn-sm btn-circle'
              onClick={handleClearChat}
              title={_('Clear conversation')}
              disabled={!activeConversationId}
            >
              <HiOutlineTrash className='w-4 h-4' />
            </button>
            <ChatSettings />
            <button
              className='btn btn-ghost btn-sm btn-circle chat-pin-btn'
              onClick={() => setChatPin(!isChatPinned)}
              title={isChatPinned ? _('Unpin') : _('Pin')}
            >
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                <path d={isChatPinned
                  ? 'M10 2a2 2 0 00-2 2v1H5a2 2 0 00-2 2v2.5a1 1 0 001 1h12a1 1 0 001-1V7a2 2 0 00-2-2h-3V4a2 2 0 00-2-2zM8 7h4v2H8V7zm-2 4.5V14a2 2 0 002 2v2a1 1 0 102 0v-2a2 2 0 002-2v-2.5H6z'
                  : 'M10 2a2 2 0 00-2 2v1H5a2 2 0 00-2 2v2.5a1 1 0 001 1h12a1 1 0 001-1V7a2 2 0 00-2-2h-3V4a2 2 0 00-2-2z'
                } />
              </svg>
            </button>
            <button
              className='btn btn-ghost btn-sm btn-circle'
              onClick={() => setChatVisible(false)}
            >
              <HiOutlineX className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Conversation selector if multiple conversations */}
        {bookConversations.length > 1 && (
          <div className='px-4 py-2 border-b border-base-300/50'>
            <select
              className='select select-sm select-bordered w-full'
              value={activeConversationId || ''}
              onChange={(e) => setActiveConversation(e.target.value)}
            >
              {bookConversations.map((conv) => (
                <option key={conv.id} value={conv.id}>
                  {conv.title || `${_('Conversation')} ${new Date(conv.createdAt).toLocaleString()}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Messages */}
        <div className='flex-grow overflow-y-auto px-4 py-4'>
          {!settings?.geminiApiKey ? (
            <div className='text-center text-base-content/60 py-8'>
              <p className='mb-2'>{_('To use the chat feature, please configure your Gemini API key.')}</p>
              <p className='text-sm'>{_('Click the key icon above to add your API key.')}</p>
            </div>
          ) : null}

          {/* New conversation prompt */}
          {showNewConversationPrompt && currentSelection && (
            <div className='mb-4 p-4 bg-warning/20 rounded-lg border border-warning/50'>
              <p className='text-sm font-medium mb-3'>{_('You have selected new text:')}</p>
              <p className='text-sm italic mb-3'>"{currentSelection.text.slice(0, 100)}{currentSelection.text.length > 100 ? '...' : ''}"</p>
              <p className='text-sm mb-3'>{_('Would you like to:')}</p>
              <div className='flex gap-2 flex-wrap'>
                <button
                  className='btn btn-sm btn-primary'
                  onClick={() => {
                    setShowNewConversationPrompt(false);
                    // Just continue with existing conversation
                  }}
                >
                  {_('Continue current conversation')}
                </button>
                <button
                  className='btn btn-sm btn-secondary'
                  onClick={handleStartNewConversation}
                >
                  {_('Start new conversation')}
                </button>
              </div>
            </div>
          )}

          {/* Conversation Info */}
          {activeConversation && activeConversation.messages.length > 0 && (
            <div className='mb-4 p-3 bg-base-200/50 rounded-lg text-xs text-base-content/70'>
              <div className='flex justify-between items-center'>
                <span>{_('Started')}: {new Date(activeConversation.createdAt).toLocaleDateString()}</span>
                <span>{activeConversation.messages.length} {_('messages')}</span>
              </div>
            </div>
          )}

          {activeConversation?.messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'mb-4',
                message.role === 'user' ? 'text-right' : 'text-left'
              )}
            >
              {message.selectedText && message.role === 'user' && (
                <div className={clsx(
                  'text-xs text-base-content/60 mb-1',
                  message.role === 'user' ? 'text-right' : 'text-left'
                )}>
                  <span className="italic">Selected: "{message.selectedText.slice(0, 50)}{message.selectedText.length > 50 ? '...' : ''}"</span>
                </div>
              )}
              <div
                className={clsx(
                  'inline-block max-w-[80%] rounded-lg p-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-content'
                    : 'border border-base-300 bg-base-100/50'
                )}
              >
                {message.role === 'user' ? (
                  <p className="text-sm">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Customize markdown components for better styling
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        code: ({ children, ...props }) => {
                          const inline = !('className' in props && typeof props.className === 'string' && props.className.includes('language-'));
                          return inline ? (
                            <code className="px-1 py-0.5 rounded bg-base-300 text-sm font-mono">{children}</code>
                          ) : (
                            <pre className="mb-2 overflow-x-auto bg-base-300 rounded-lg">
                              <code className="block p-3 text-sm font-mono">{children}</code>
                            </pre>
                          );
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary pl-4 italic mb-2 opacity-80">{children}</blockquote>
                        ),
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>,
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="link link-primary hover:link-hover">
                            {children}
                          </a>
                        ),
                        hr: () => <hr className="my-4 border-base-300" />,
                        table: ({ children }) => (
                          <div className="overflow-x-auto mb-4">
                            <table className="table table-sm">{children}</table>
                          </div>
                        ),
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {(!activeConversation || activeConversation.messages.length === 0) && !showNewConversationPrompt && (
            <div className='text-center text-base-content/60 py-8'>
              <p className='mb-2'>{_('Start a conversation about this book!')}</p>
              <p className='text-sm'>{_('Select any text passage to discuss it, or ask general questions about the book.')}</p>
            </div>
          )}

          {isLoading && (
            <div className="text-left mb-4">
              <div className="inline-block">
                <div className="flex items-center gap-2">
                  <span className="loading loading-dots loading-sm"></span>
                  <span className="text-sm opacity-70">{_('Thinking...')}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className='flex-shrink-0 border-t border-base-300/50 p-4'>
          <div className='flex gap-2'>
            <textarea
              ref={inputRef}
              className='textarea textarea-bordered flex-1 resize-none'
              placeholder={
                !settings?.geminiApiKey
                  ? _('Please configure your API key first...')
                  : !activeConversationId
                  ? _('Select a conversation or text to start...')
                  : _('Ask a question about this book...')
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={!settings?.geminiApiKey || !activeConversationId}
            />
            <button
              className='btn btn-primary btn-circle'
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || !settings?.geminiApiKey || !activeConversationId}
              title={_('Send')}
            >
              <HiMiniPaperAirplane className='w-5 h-5' />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;