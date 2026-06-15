import React, { useState, useRef, useEffect } from 'react';
import { Message, Role } from './types';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import ConfirmationModal from './components/ConfirmationModal';
import ApiKeyModal from './components/ApiKeyModal';
import PromptModal from './components/PromptModal';
import { sendMessageStream, rewriteHistory, hasConfiguredApiKey } from './services/geminiService';
import { Key, Pencil, Settings2, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryUpdating, setIsHistoryUpdating] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showMobileHeaderTools, setShowMobileHeaderTools] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check state of API Key configuration on load
  useEffect(() => {
    setKeyConfigured(hasConfiguredApiKey());
  }, []);

  const handleKeyUpdate = () => {
    const isConfigured = hasConfiguredApiKey();
    setKeyConfigured(isConfigured);
    if (isConfigured) {
      setError(null);
    }
  };

  const handleSend = async (text: string, isUpdateMode: boolean) => {
    if (!hasConfiguredApiKey()) {
      setError("Please set a Gemini API key to start communicating.");
      setShowApiKeyModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isUpdateMode) {
        // --- History Update Mode ---
        setIsHistoryUpdating(true);
        try {
          const newHistory = await rewriteHistory(messages, text);
          setMessages(newHistory);
        } finally {
          setIsHistoryUpdating(false);
        }
      } else {
        // --- Normal Chat Mode ---
        const newUserMessage: Message = {
          role: Role.User,
          text: text,
          id: crypto.randomUUID(),
        };

        // Add user message immediately
        const updatedHistory = [...messages, newUserMessage];
        setMessages(updatedHistory);

        // Prepare a placeholder for the model response
        const modelMsgId = crypto.randomUUID();
        setMessages((prev: Message[]) => [
          ...prev, 
          { role: Role.Model, text: '', id: modelMsgId }
        ]);

        const stream = await sendMessageStream(messages, text);
        
        let accumulatedText = '';
        
        for await (const chunk of stream) {
          accumulatedText += chunk;
          setMessages((prev: Message[]) => 
            prev.map((msg: Message) => 
              msg.id === modelMsgId 
                ? { ...msg, text: accumulatedText } 
                : msg
            )
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setIsHistoryUpdating(false);
    setShowResetModal(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm z-10 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            disabled={messages.length === 0}
            className={`flex items-center gap-3 transition-colors focus:outline-none ${
              messages.length === 0
                ? 'cursor-default'
                : 'cursor-pointer hover:opacity-80'
            }`}
            id="header_brand_reset_chat"
            title={messages.length === 0 ? "No chat to reset" : "Start a new chat"}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.599 2.682 6.202a6.968 6.968 0 00-1.089 3.442z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">ReChat</h1>
          </button>

          <button 
            onClick={() => setShowResetModal(true)}
            disabled={messages.length === 0}
            className={`ml-[14px] flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 ${
              messages.length === 0 
               ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' 
               : 'bg-white border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-100 hover:bg-red-50 shadow-sm'
            }`}
            id="header_reset_chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm font-semibold hidden sm:inline">New Chat</span>
          </button>
          </div>
        
          <div className="flex items-center gap-2 sm:gap-3">
           <button
             type="button"
             onClick={() => setShowMobileHeaderTools((prev) => !prev)}
             className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:text-gray-800 focus:outline-none md:hidden"
             id="header_mobile_tools_toggle"
             aria-label="Open settings"
             aria-expanded={showMobileHeaderTools}
           >
             <Settings2 className="w-4 h-4" />
           </button>

           <button 
             onClick={() => setShowApiKeyModal(true)}
             className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all duration-205 shadow-sm focus:outline-none ${
               keyConfigured
                 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                 : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 animate-pulse'
             }`}
             id="header_api_key_btn"
             title={keyConfigured ? "Personal key configured" : "Configure API key"}
           >
             <Key className="w-3.5 h-3.5" />
             <span>{keyConfigured ? 'Personal Key' : 'Set API Key'}</span>
           </button>

           <button
             type="button"
             onClick={() => setShowPromptModal(true)}
             className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs sm:text-sm font-semibold text-gray-600 transition-all duration-200 shadow-sm hover:bg-gray-50 hover:text-gray-800 focus:outline-none"
             id="header_edit_prompts_btn"
           >
             <Pencil className="w-3.5 h-3.5" />
             <span>Edit Prompts</span>
           </button>
          </div>
        </div>
      </header>

      {showMobileHeaderTools && (
        <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm md:hidden">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button 
              onClick={() => setShowApiKeyModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 shadow-sm focus:outline-none ${
                keyConfigured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 animate-pulse'
              }`}
              id="mobile_header_api_key_btn"
              title={keyConfigured ? "Personal key configured" : "Configure API key"}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{keyConfigured ? 'Personal Key' : 'Set API Key'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 transition-all duration-200 shadow-sm hover:bg-gray-50 hover:text-gray-800 focus:outline-none"
              id="mobile_header_edit_prompts_btn"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Prompts</span>
            </button>
          </div>
        </div>
      )}

      {!keyConfigured && (
        <div className="bg-amber-500 text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between shadow-md animate-fadeIn z-10 border-b border-amber-600 select-none">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <ShieldAlert className="w-4 h-4 animate-bounce flex-shrink-0" />
            <span className="text-xs sm:text-sm">
              <strong>Personal API Key Required:</strong> To use this self-hosted chat, please enter your Gemini API Key.
            </span>
            <button 
              onClick={() => setShowApiKeyModal(true)}
              className="ml-auto bg-white text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm focus:outline-none flex-shrink-0"
              id="banner_configure_key_btn"
            >
              Set Key
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth">
        <div className="max-w-4xl mx-auto flex flex-col min-h-full">
          
          {messages.length === 0 && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
             <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.599 2.682 6.202a6.968 6.968 0 00-1.089 3.442z" clipRule="evenodd" />
              </svg>
            </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Rewrite Chat History</h2>
              {/* 
              <p className="text-gray-600 max-w-md leading-relaxed">
                Chat normally or use the <span className="font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">Rewrite History</span> mode to rewrite the conversation history. I built this app to conduct <b>context pollution</b> experiments but it can be used to explore many memory concepts within LLMs
                <br/><br/>
                In <span className="font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">Rewrite History</span> mode, try commands like: <br/>
                <span className="text-sm italic text-gray-500">"Remove/replace [concept][word]"</span>
                <span className="text-sm italic text-gray-500"> "Reverse user and AI roles"</span>
                <span className="text-sm italic text-gray-500"> "Expand Coversation"</span>.
              </p>
              */}
              <p className="text-gray-800 max-w-3xl leading-relaxed">
                This is a research tool to explore Mutable Transcripts - the ability to rewrite conversation history in LLMs. You can chat normally or use the <span className="font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">Rewrite History</span> mode to modify the conversation history.
              </p>
            </div>
          )}

          {messages.map((msg, index) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              isUpdating={isHistoryUpdating}
              isThinking={isLoading && index === messages.length - 1 && msg.role === Role.Model && !msg.text}
            />
          ))}

          {/* Error Banner */}
          {error && (
            <div className="mx-auto my-4 w-full max-w-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-fadeIn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <InputArea 
        onSend={handleSend} 
        isLoading={isLoading} 
        hasHistory={messages.length > 0} 
      />

      <ConfirmationModal 
        isOpen={showResetModal}
        onCancel={() => setShowResetModal(false)}
        onConfirm={handleResetChat}
        title="Start New Chat?"
        message="You are about to start a new chat. This will clear the current conversation history and cannot be undone."
      />

      <ApiKeyModal 
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleKeyUpdate}
      />

      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
      />
    </div>
  );
};

export default App;
