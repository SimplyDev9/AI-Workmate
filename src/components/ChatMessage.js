import React, { useState, useEffect } from 'react';
import { User, BrainCircuit } from 'lucide-react';

const ChatMessage = ({ message, isUser, isTyping }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // ✅ Convert message exactly
    let safeMessage;

    if (message === null) {
      safeMessage = "null";
    } else if (message === undefined) {
      safeMessage = "undefined";
    } else {
      safeMessage = String(message);
    }

    // ✅ No animation for user
    if (isUser || !isTyping) {
      setDisplayedText(safeMessage);
      return;
    }

    let index = 0;

    const interval = setInterval(() => {
      index++;

      setDisplayedText(safeMessage.slice(0, index));

      if (index >= safeMessage.length) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);

  }, [message]);

  return (
    <div
      className={`flex items-start space-x-3 ${
        isUser ? 'flex-row-reverse space-x-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600'
            : 'bg-gradient-to-br from-cyan-400 to-cyan-500'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <BrainCircuit className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-200 dark:border-gray-700'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {displayedText}
          {/* ✅ Cursor only while typing */}
          {!isUser &&
            displayedText.length < String(message || "").length && (
              <span className="inline-block w-1 h-4 ml-1 bg-cyan-500 animate-pulse" />
            )}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;