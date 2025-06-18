import { TextSelection } from '@/utils/sel';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  selectedText?: string;
  cfi?: string;
}

export interface ChatConversation {
  id: string; // Unique conversation ID
  bookKey: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  title?: string; // Optional title for the conversation
}

interface ChatState {
  chatWidth: string;
  isChatVisible: boolean;
  isChatPinned: boolean;
  currentSelection: TextSelection | null;
  conversations: { [conversationId: string]: ChatConversation };
  activeConversationId: string | null;

  toggleChat: () => void;
  toggleChatPin: () => void;
  setChatWidth: (width: string) => void;
  setChatVisible: (visible: boolean) => void;
  setChatPin: (pinned: boolean) => void;
  setCurrentSelection: (selection: TextSelection | null) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  createConversation: (bookKey: string, initialMessage?: ChatMessage) => string; // Returns conversation ID
  getConversation: (conversationId: string) => ChatConversation | undefined;
  getConversationsForBook: (bookKey: string) => ChatConversation[];
  setActiveConversation: (conversationId: string | null) => void;
  clearConversation: (conversationId: string) => void;
  getAllConversations: () => ChatConversation[];
  deleteOldConversations: (daysToKeep: number) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chatWidth: '35%',
      isChatVisible: false,
      isChatPinned: false,
      currentSelection: null,
      conversations: {},
      activeConversationId: null,

      toggleChat: () => set((state) => ({ isChatVisible: !state.isChatVisible })),
      toggleChatPin: () => set((state) => ({ isChatPinned: !state.isChatPinned })),
      setChatWidth: (width: string) => set({ chatWidth: width }),
      setChatVisible: (visible: boolean) => set({ isChatVisible: visible }),
      setChatPin: (pinned: boolean) => set({ isChatPinned: pinned }),
      setCurrentSelection: (selection: TextSelection | null) => set({ currentSelection: selection }),
      setActiveConversation: (conversationId: string | null) => set({ activeConversationId: conversationId }),

      createConversation: (bookKey: string, initialMessage?: ChatMessage) => {
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conversation: ChatConversation = {
          id: conversationId,
          bookKey,
          messages: initialMessage ? [initialMessage] : [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: conversation,
          },
          activeConversationId: conversationId,
        }));

        return conversationId;
      },

      addMessage: (conversationId: string, message: ChatMessage) => set((state) => {
        const conversation = state.conversations[conversationId];
        if (!conversation) return state;

        return {
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...conversation,
              messages: [...conversation.messages, message],
              updatedAt: Date.now(),
            },
          },
        };
      }),

      getConversation: (conversationId: string) => get().conversations[conversationId],

      getConversationsForBook: (bookKey: string) => {
        return Object.values(get().conversations)
          .filter(conv => conv.bookKey === bookKey)
          .sort((a, b) => b.updatedAt - a.updatedAt);
      },

      clearConversation: (conversationId: string) => set((state) => {
        const { [conversationId]: _, ...remainingConversations } = state.conversations;
        return {
          conversations: remainingConversations,
          activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId
        };
      }),

      getAllConversations: () => Object.values(get().conversations),

      deleteOldConversations: (daysToKeep: number) => set((state) => {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        const filteredConversations: { [key: string]: ChatConversation } = {};

        Object.entries(state.conversations).forEach(([key, conv]) => {
          if (conv.updatedAt > cutoffTime) {
            filteredConversations[key] = conv;
          }
        });

        return { conversations: filteredConversations };
      }),
    }),
    {
      name: 'readest-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        chatWidth: state.chatWidth,
        isChatPinned: state.isChatPinned,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);