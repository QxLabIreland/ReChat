import React, { useMemo } from 'react';
import { Message, Role } from '../types';
import { parse } from 'marked';
import createDOMPurify from 'dompurify';

const DOMPurify = createDOMPurify(window);

interface ChatMessageProps {
  message: Message;
  isUpdating?: boolean;
  isThinking?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUpdating, isThinking }) => {
  const isUser = message.role === Role.User;

  const htmlContent = useMemo(() => {
    if (!message.text || isUpdating || isThinking) return '';
    try {
      // Pre-process to ensure lists have a newline before them if they follow text
      // This helps marked recognize lists correctly
      const processedText = message.text.replace(/([^\n])\n(\s*[*+-]|\s*\d+\.)/g, '$1\n\n$2');
      
      // Parse markdown with line breaks enabled
      const rawHtml = parse(processedText, { breaks: true }) as string;
      return DOMPurify.sanitize(rawHtml);
    } catch (e) {
      console.error("Markdown parsing error", e);
      return message.text;
    }
  }, [message.text, isUpdating, isThinking]);

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-base leading-relaxed overflow-hidden ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
        }`}
      >
        {isUpdating || isThinking ? (
          <div className="flex items-center gap-2.5 py-0.5">
             <svg className={`animate-spin h-4 w-4 ${isUser ? 'text-blue-200' : 'text-gray-400'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span className={`text-base font-medium ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
               {isUpdating ? 'updating...' : 'Thinking...'}
             </span>
          </div>
        ) : (
           <div 
             className={`prose prose-base max-w-none break-words 
               ${isUser 
                 ? 'prose-invert text-white prose-p:text-white prose-headings:text-white prose-a:text-white hover:prose-a:text-blue-200 prose-code:text-blue-100 prose-code:bg-blue-700/50 prose-pre:bg-blue-800 prose-pre:text-blue-50' 
                 : 'prose-stone prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100'
               }
               [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
             `}
             dangerouslySetInnerHTML={{ __html: htmlContent }} 
           />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;