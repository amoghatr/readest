# Book Chat Feature with Google Gemini

This feature allows users to have AI-powered conversations about the books they're reading using Google's Gemini AI.

## Features

- **Context-aware conversations**: The AI knows what book you're reading and what text you've selected
- **Multiple Gemini models**: Choose between Gemini 2.0 Flash, 1.5 Pro, or 1.5 Flash
- **Persistent chat history**: Conversations are saved per book and persist across sessions
- **Conversation management**:
  - View all past conversations across different books
  - Delete individual conversations or old conversations
  - See conversation stats (message count, dates)
  - Automatic localStorage persistence
- **Secure API key storage**: Keys are stored locally in your settings
- **Rich markdown support**: AI responses are rendered with full markdown formatting including:
  - Headers and text formatting (bold, italic)
  - Lists (ordered and unordered)
  - Code blocks with syntax highlighting
  - Links, blockquotes, and tables
  - Dark mode support

## Setup

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/apikey)
   - Click "Create API Key"
   - Copy the generated key

2. **Configure the Chat**:
   - Open any book in the reader
   - Press `c` or click the chat icon to open the chat panel
   - Click the key icon (🔑) in the chat header
   - Paste your API key
   - Select your preferred model
   - Click Save

## Conversation History

The chat feature automatically saves all conversations per book. You can:

1. **View History**: Click the clock icon (🕐) in the chat header
2. **Browse Conversations**: See all your book conversations sorted by recent activity
3. **Resume Conversations**: Click on any conversation to continue where you left off
4. **Manage Storage**:
   - Delete individual conversations
   - Clear conversations older than 30 days
   - All data is stored locally in your browser

### Storage Details

- Conversations are stored in localStorage under `readest-chat-storage`
- Each conversation is linked to a specific book
- Includes full message history with timestamps
- Preserves selected text context for each message
- Automatically persists chat width and pin state

## Usage

### Method 1: Select Text and Chat
1. Select any text in your book
2. Click the chat bubble icon in the annotation popup
3. The chat panel opens with your selected text as context
4. Ask questions about the passage

### Method 2: Direct Chat
1. Press `c` or click the chat icon in the header
2. Type your question about the book
3. The AI will respond based on the book's metadata

### Method 3: Keyboard Shortcut
- Press `c` to toggle the chat panel at any time

## Example Questions

- "What does this passage mean?"
- "Can you explain this concept in simpler terms?"
- "What's the historical context of this event?"
- "How does this relate to the main theme?"
- "Can you summarize this chapter?"

## Technical Details

- Uses Google's `@google/genai` SDK
- Supports conversation history with proper context management
- Graceful error handling for API failures
- Responsive design that works on all screen sizes

## API Response Examples

```typescript
// First message (no history)
{
  model: 'gemini-2.0-flash-001',
  contents: `I'm reading a book and would like to discuss this passage:

"The selected text from the book..."

Book context: Title by Author

User question: What does this mean?`
}

// Subsequent messages (with history)
{
  model: 'gemini-2.0-flash-001',
  contents: [
    { role: 'user', parts: [{ text: 'Previous question' }] },
    { role: 'model', parts: [{ text: 'Previous AI response' }] },
    { role: 'user', parts: [{ text: 'New question' }] }
  ]
}
```

## Troubleshooting

- **"API_KEY_INVALID" error**: Check that your API key is correct
- **"RATE_LIMIT_EXCEEDED" error**: Wait a moment and try again
- **No response**: Ensure you have an active internet connection
- **Chat not working**: Make sure you've saved your API key in settings