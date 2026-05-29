import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, ShieldAlert } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import apiService from '../services/api';
import { checkClientGuardrails, isGuardrailBlock, parseGuardrailError } from '../utils/guardrails';
import logoWhite from '../Owlsure-white.svg';
import logoBlack from '../Owlsure-black.svg';

const CHAT_STORAGE_KEY = 'RAG_APPLICATION_CHAT';

// ─────────────────────────────────────────────────────────────────────────────
// Guardrail banner component — shown inline in the message list
// ─────────────────────────────────────────────────────────────────────────────
const GuardrailBanner = ({ message, onDismiss }) => (
  <div
    role="alert"
    className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 text-sm"
  >
    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="font-semibold text-red-700 dark:text-red-400 mb-0.5">
        Message blocked
      </p>
      <p className="text-red-600 dark:text-red-300 leading-relaxed">
        {message}
      </p>
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-lg leading-none flex-shrink-0"
        aria-label="Dismiss"
      >
        ×
      </button>
    )}
  </div>
);

const ChatPage = () => {
  // -----------------------------
  // RESTORE CHAT FROM SESSION
  // -----------------------------
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (!savedMessages) return [];
      const parsedMessages = JSON.parse(savedMessages);
      if (!Array.isArray(parsedMessages)) return [];
      return parsedMessages;
    } catch (error) {
      console.error('Failed to restore chat messages:', error);
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
      return [];
    }
  });

  const [input, setInput]               = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [guardrailMsg, setGuardrailMsg] = useState(''); // inline guardrail banner

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // -----------------------------
  // AUTO SCROLL
  // -----------------------------
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, guardrailMsg, scrollToBottom]);

  // -----------------------------
  // FOCUS INPUT ON LOAD
  // -----------------------------
  useEffect(() => { inputRef.current?.focus(); }, []);

  // -----------------------------
  // SAVE CHAT TO SESSION STORAGE
  // -----------------------------
  useEffect(() => {
    try {
      const sanitizedMessages = messages.map((msg) => ({ ...msg, isTyping: false }));
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sanitizedMessages));
    } catch (error) {
      console.error('Failed to persist chat messages:', error);
    }
  }, [messages]);

  // -----------------------------
  // CLEAR CHAT ON REFRESH/CLOSE
  // -----------------------------
  useEffect(() => {
    const handleBeforeUnload = () => sessionStorage.removeItem(CHAT_STORAGE_KEY);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // -----------------------------
  // SEND MESSAGE
  // -----------------------------
  const handleSend = async () => {
    try {
      if (!input.trim() || isLoading) return;

      const userMessage = input.trim();

      // ── Layer 0: Client-side guardrail (instant, no network) ───────────
      const clientCheck = checkClientGuardrails(userMessage);
      if (clientCheck.blocked) {
        setGuardrailMsg(clientCheck.message);
        return; // Do NOT add the message to chat history or call the API
      }

      // Clear any previous guardrail banner
      setGuardrailMsg('');

      const userChatMessage = {
        id:        crypto.randomUUID(),
        text:      userMessage,
        isUser:    true,
        timestamp: Date.now(),
      };

      setInput('');
      setMessages((prev) => [...prev, userChatMessage]);
      setIsLoading(true);

      // ── API call (Layers 1+2 enforced server-side) ──────────────────────
      const result = await apiService.sendMessage(userMessage);

      if (result.success) {
        const aiMessage = {
          id:        crypto.randomUUID(),
          text:      result.data?.response || 'No response received.',
          isUser:    false,
          isTyping:  true,
          sources:   result.data?.sources || [],
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMessage]);

      } else {
        // Check if the server-side guardrail blocked this
        if (isGuardrailBlock(result.error)) {
          // Show the banner; do NOT add an AI message bubble
          setGuardrailMsg(
            result.error.replace('CONTENT_BLOCKED: ', '').replace('⚠️ ', '')
          );
        } else {
          // Generic error bubble
          setMessages((prev) => [
            ...prev,
            {
              id:        crypto.randomUUID(),
              text:      result.error || 'Something went wrong while processing your request.',
              isUser:    false,
              isTyping:  false,
              timestamp: Date.now(),
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Unexpected chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id:        crypto.randomUUID(),
          text:      'Unexpected error occurred. Please try again later.',
          isUser:    false,
          isTyping:  false,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // ENTER KEY HANDLER
  // -----------------------------
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // -----------------------------
  // CLEAR CHAT
  // -----------------------------
  const clearChat = () => {
    try {
      setMessages([]);
      setGuardrailMsg('');
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between w-full">

          {/* LEFT */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Chat with AI WorkMate
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Ask questions about your knowledge base
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-6">
            <div>
              <img src={logoBlack} className="h-10 dark:hidden" alt="logo" />
              <img src={logoWhite} className="h-10 hidden dark:block" alt="logo" />
            </div>

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
        {messages.length === 0 && !guardrailMsg ? (
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
                message={msg}
                isUser={msg.isUser}
                isTyping={msg.isTyping}
              />
            ))}

            {/* ── Guardrail banner (shown below the last user message) ── */}
            {guardrailMsg && (
              <GuardrailBanner
                message={guardrailMsg}
                onDismiss={() => setGuardrailMsg('')}
              />
            )}

            {isLoading && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Thinking…</p>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Dismiss banner as soon as the user starts editing
                if (guardrailMsg) setGuardrailMsg('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your question here… (Press Enter to send)"
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