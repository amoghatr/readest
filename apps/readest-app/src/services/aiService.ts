import { GoogleGenAI } from '@google/genai';

export interface ChatRequest {
  message: string;
  context?: string;
  bookTitle?: string;
  bookAuthor?: string;
  selectedText?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  content: string;
  error?: string;
}

export interface AIService {
  chat(request: ChatRequest): Promise<ChatResponse>;
  isConfigured(): boolean;
}

export interface AIConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

class GeminiAIService implements AIService {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | null = null;
  private modelName: string = 'gemini-2.0-flash-001';

  configure(apiKey: string, modelName?: string) {
    if (!apiKey) {
      throw new Error('API key is required for Gemini AI');
    }

    this.apiKey = apiKey;
    this.modelName = modelName || 'gemini-2.0-flash-001';
    this.ai = new GoogleGenAI({ apiKey });
  }

  isConfigured(): boolean {
    return this.ai !== null && this.apiKey !== null;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.isConfigured() || !this.ai) {
      return {
        content: 'Please configure your Gemini API key in settings to use the chat feature.',
        error: 'API_NOT_CONFIGURED',
      };
    }

    try {
      // Create system prompt to constrain responses to book-related topics
      const systemPrompt = `You are a helpful book discussion assistant. You should only respond to questions and discussions about books, literature, reading, and related topics.

IMPORTANT GUIDELINES:
- Focus exclusively on book-related topics: plot, characters, themes, literary analysis, writing style, historical context, genre discussions, etc.
- If asked about topics unrelated to books or literature, politely redirect the conversation back to the book
- Provide thoughtful, insightful analysis about the text when discussing specific passages
- You can discuss broader literary concepts, but always in relation to books and reading
- If someone asks about completely unrelated topics (technology, politics, personal advice unrelated to reading, etc.), respond with something like: "I'm here to help discuss books and literature. Let's focus on the book you're reading. What would you like to explore about it?"

${request.bookTitle && request.bookAuthor ? `The current book being discussed is "${request.bookTitle}" by ${request.bookAuthor}.` : 'You are helping discuss a book the user is currently reading.'}`;

      // Build the content with context
      let prompt = '';

      if (request.selectedText) {
        prompt += `I'm reading a book and would like to discuss this passage:\n\n"${request.selectedText}"\n\n`;
      }

      if (request.bookTitle || request.bookAuthor) {
        prompt += `Book context: ${request.bookTitle || 'Unknown Title'}`;
        if (request.bookAuthor) {
          prompt += ` by ${request.bookAuthor}`;
        }
        prompt += '\n\n';
      }

      // For conversation history, build a full conversation
      if (request.conversationHistory && request.conversationHistory.length > 0) {
        // Build the conversation history as contents array
        const contents: any[] = [];

        // Add system prompt as the first message
        contents.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'I understand. I\'m here to help you discuss this book and literature-related topics. I\'ll keep our conversation focused on the book you\'re reading and literary analysis.' }]
        });

        // Only add book context if this is a follow-up and we have selected text (indicating a new context)
        // For ongoing conversations without new selected text, don't re-add the book context
        if (request.selectedText && prompt) {
          contents.push({
            role: 'user',
            parts: [{ text: `Context for this conversation:\n${prompt}` }]
          });
          contents.push({
            role: 'model',
            parts: [{ text: 'I understand the context. I\'m ready to help you discuss this book.' }]
          });
        }

        // Add all previous conversation history
        request.conversationHistory.forEach(msg => {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        });

        // Add the current message (no special formatting needed since we're not including selected text for follow-ups)
        contents.push({
          role: 'user',
          parts: [{ text: request.message }]
        });

        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: contents,
        });

        // Extract text from response
        let textContent = '';
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate && candidate.content && candidate.content.parts) {
            textContent = candidate.content.parts
              .map((part: any) => part.text || '')
              .join('');
          }
        }

        return {
          content: textContent || 'No response generated',
        };
      } else {
        // For the first message, include system prompt and context
        const contents: any[] = [];

        // Add system prompt
        contents.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'I understand. I\'m here to help you discuss this book and literature-related topics. I\'ll keep our conversation focused on the book you\'re reading and literary analysis.' }]
        });

        // Add the user's message with context
        let fullPrompt = prompt;
        if (fullPrompt) {
          fullPrompt += `User question: ${request.message}`;
        } else {
          fullPrompt = request.message;
        }

        contents.push({
          role: 'user',
          parts: [{ text: fullPrompt }]
        });

        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: contents,
        });

        // Extract text from response
        let textContent = '';
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (candidate && candidate.content && candidate.content.parts) {
            textContent = candidate.content.parts
              .map((part: any) => part.text || '')
              .join('');
          }
        }

        if (!textContent) {
          // Fallback to a simpler text accessor if available
          textContent = (response as any).text || 'No response generated';
        }

        return {
          content: textContent,
        };
      }
    } catch (error) {
      console.error('Gemini API error:', error);

      let errorMessage = 'Failed to generate response';
      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          errorMessage = 'Invalid API key. Please check your Gemini API key in settings.';
        } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        content: errorMessage,
        error: 'API_ERROR',
      };
    }
  }
}

// Export a singleton instance
export const aiService = new GeminiAIService();

// Helper function to initialize the AI service with settings
export function initializeAIService(settings: { geminiApiKey?: string; geminiModel?: string }) {
  if (settings.geminiApiKey) {
    try {
      aiService.configure(settings.geminiApiKey, settings.geminiModel);
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
    }
  }
}