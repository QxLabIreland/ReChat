import React, { useState, useRef, useEffect } from 'react';

interface InputAreaProps {
  onSend: (text: string, isUpdateMode: boolean) => void;
  isLoading: boolean;
  hasHistory: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading, hasHistory }) => {
  const [text, setText] = useState('');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  // Auto-focus input when loading completes so user can type immediately
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Auto-focus input when update mode is activated
  useEffect(() => {
    if (isUpdateMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isUpdateMode]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    
    onSend(text, isUpdateMode);
    setText('');
    
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Reset mode after sending if it was update mode, usually good UX to reset
    if (isUpdateMode) setIsUpdateMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4 sm:p-6 pb-6 sm:pb-8">
      <div className="max-w-4xl mx-auto space-y-3">
        
        {/* Tools / Mode Switcher */}
        <div className="flex items-center space-x-2">
          <label 
            className={`
              flex items-center space-x-2 cursor-pointer select-none transition-colors duration-200 rounded-full pl-1 pr-3 py-1.5 border
              ${isUpdateMode 
                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}
              ${!hasHistory ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input 
              type="checkbox" 
              className="hidden" 
              checked={isUpdateMode} 
              onChange={(e) => setIsUpdateMode(e.target.checked)}
              disabled={!hasHistory}
            />
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isUpdateMode ? 'border-amber-500 bg-amber-500' : 'border-gray-400'}`}>
               {isUpdateMode && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className="text-xs font-bold uppercase tracking-wide">
              Mode: Rewrite History
            </span>
          </label>
          
          {isUpdateMode && (
            <span className="text-xs text-amber-600 animate-fadeIn">
              Your next prompt will modify the conversation.
            </span>
          )}
        </div>

        {/* Input Field */}
        <div className={`relative rounded-2xl border transition-all duration-300 ${isUpdateMode ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-300 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400'}`}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            // placeholder={isUpdateMode ? "E.g., 'Reverse User and AI roles' or 'Make the user sound angry' or 'Expand the conversation'..." : "Type your message..."}
            placeholder={isUpdateMode ? "Type your instruction to modify the transcript" : "Type your message..."}

            className="block w-full resize-none bg-transparent py-4 pl-4 pr-14 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-base sm:leading-6 max-h-[200px]"
            disabled={isLoading}
          />
          
          <button
            onClick={() => handleSubmit()}
            disabled={!text.trim() || isLoading}
            className={`absolute right-2 bottom-2 p-2 rounded-xl transition-all duration-200 
              ${!text.trim() || isLoading 
                ? 'bg-gray-100 text-gray-300' 
                : isUpdateMode 
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
          >
            {isLoading ? (
               <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;