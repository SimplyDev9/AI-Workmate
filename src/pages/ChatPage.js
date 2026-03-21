import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2 } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import apiService from '../services/api';
import logoWhite from '../Owlsure-white.svg';
import logoBlack from '../Owlsure-black.svg';


const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: userMessage, isUser: true },
    ]);

    setIsLoading(true);

    // Call API
    const result = await apiService.sendMessage(userMessage);
    console.log("API RESULT:", result);

    setIsLoading(false);

    if (result.success) {
      // Add AI response with typing animation
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: result.data.response,
          isUser: false,
          isTyping: true,
        },
      ]);
    } else {
      // Show error
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `Error: ${result.error}. Please check if the backend is running.`,
          isUser: false,
          isTyping: false,
        },
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">

      <div className="flex items-center justify-between w-full">

        {/* LEFT: Title */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Chat with AI WorkMate
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Ask questions about your knowledge base
          </p>
        </div>

        {/* RIGHT: Logo + Clear Chat */}
        <div className="flex items-center gap-6">

          {/* Logo switching */}
          <div>
            <img src={logoBlack} className="h-10 dark:hidden" alt="logo" />
            <img src={logoWhite} className="h-10 hidden dark:block" alt="logo" />
          </div>

          {/* Clear Chat */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Chat</span>
            </button>
          )}

        </div>

      </div>

    </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center">
                <Send className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Start a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Ask me anything about the documents in your knowledge base. I'll
                use AI-powered RAG to find the best answers.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.text}
                isUser={msg.isUser}
                isTyping={msg.isTyping}
              />
            ))}
            {isLoading && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Thinking...
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here... (Press Enter to send)"
              className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
              data-testid="chat-input"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center space-x-2"
            data-testid="send-button"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;