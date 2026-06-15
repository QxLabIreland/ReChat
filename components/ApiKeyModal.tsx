import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, ExternalLink, ShieldCheck, HelpCircle, Save, Trash2, CheckCircle2, ShieldAlert, Check, Loader2, X, ChevronDown } from 'lucide-react';
import { getSelectedModel, MODEL_OPTIONS, saveSelectedModel, testApiKeyConnection, type GeminiModel } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>(getSelectedModel());
  
  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Load key from localStorage when modal is opened
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('rechat_custom_api_key') || '';
      setApiKey(stored);
      setHasStoredKey(stored.trim().length > 0);
      setSelectedModel(getSelectedModel());
      setSavedSuccess(false);
      setIsTesting(false);
      setTestResult(null);
      setTestError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;

    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const ok = await testApiKeyConnection(trimmed, selectedModel);
      if (ok) {
        setTestResult('success');
      }
    } catch (err: any) {
      setTestResult('fail');
      setTestError(err.message || 'Verification request failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem('rechat_custom_api_key', trimmed);
      saveSelectedModel(selectedModel);
      setHasStoredKey(true);
      setSavedSuccess(true);
      onSave();
      
      // Auto close after showing success briefly
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('rechat_custom_api_key');
    setApiKey('');
    setHasStoredKey(false);
    setSavedSuccess(false);
    setTestResult(null);
    setTestError(null);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 transform transition-all scale-100 animate-fadeIn border border-slate-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Gemini API Key</h3>
              <p className="text-xs text-slate-500">Configure your personal Google AI key</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
            aria-label="Close API key dialog"
            id="close_api_key_modal_icon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            This app runs entirely in the browser. Enter your personal <strong>Gemini API key</strong> below. Your key stays in this browser's local storage and is used directly for Gemini requests.
          </p>

          {/* Quick Help Link */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm text-slate-600 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <span className="p-0.5 mt-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="font-semibold block text-slate-800">No API Key yet?</span>
                Generate a free Gemini API key in seconds inside Google AI Studio.
              </div>
            </div>
            <a 
              href="https://aistudio.google.com/" 
              target="_blank" 
              referrerPolicy="no-referrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 mt-1 hover:underline transition-colors focus:outline-none"
            >
              Get free key from Google AI Studio <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Key status indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Status:</span>
            {hasStoredKey ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5" /> Active (Custom Key Saved)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                No Personal Key Configured
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enter API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className={`w-full pl-3 pr-10 py-2.5 text-sm rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 transition-all font-mono ${
                    hasStoredKey
                      ? 'border border-slate-200 focus:ring-blue-100 focus:border-blue-500'
                      : 'border border-amber-400 focus:ring-amber-200 focus:border-amber-500 amber-outline-pulse'
                  }`}
                  disabled={savedSuccess}
                  id="api_key_input"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Model
              </label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
                  className="w-full appearance-none pl-3 pr-12 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  disabled={savedSuccess}
                  id="model_select"
                >
                  {MODEL_OPTIONS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                This model will be used for both chat replies and transcript rewrites.
              </p>
            </div>

            {/* Connection Test Controls and Results */}
            <div className="flex flex-col gap-2 pt-1 select-none">
              <button
                type="button"
                onClick={handleTest}
                disabled={!apiKey.trim() || isTesting || savedSuccess}
                className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all focus:outline-none ${
                  !apiKey.trim() || isTesting || savedSuccess
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
                id="test_key_connection_btn"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" /> Verifying Connection...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Check Key Connection
                  </>
                )}
              </button>

              {testResult === 'success' && (
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-850 text-xs rounded-xl font-medium animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-emerald-900">Success! API Key is fully functional.</span>
                    Connected to the Gemini API services.
                  </div>
                </div>
              )}

              {testResult === 'fail' && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl font-medium animate-fadeIn leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-rose-650 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-950">Connection Failed:</span>
                    <span className="text-[11px] font-normal leading-relaxed text-rose-900">{testError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error alerts or helpful cues */}
            {savedSuccess ? (
              <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm py-1 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                Key saved successfully! Closing...
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {hasStoredKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3.5 py-2.5 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-100 transition-all flex items-center justify-center gap-1.5 focus:outline-none"
                >
                  <Trash2 className="w-4 h-4" /> Wipe Key
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all text-center focus:outline-none"
                id="close_api_key_modal"
              >
                {hasStoredKey ? 'Close' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={!apiKey.trim() || savedSuccess}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all focus:outline-none ${
                  !apiKey.trim() || savedSuccess
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10'
                }`}
                id="save_api_key"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
