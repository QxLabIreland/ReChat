import React, { useEffect, useState } from 'react';
import { RotateCcw, Save, X } from 'lucide-react';
import { getPromptSettings, REWRITE_PROMPT_POSTFIX, REWRITE_PROMPT_PREFIX, restoreDefaultPromptSettings, savePromptSettings, type PromptSettings } from '../services/geminiService';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<PromptSettings>(getPromptSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getPromptSettings());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    savePromptSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleRestoreDefaults = () => {
    setSettings(restoreDefaultPromptSettings());
    setSavedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Edit Prompts</h3>
            <p className="text-xs text-slate-500">Update the prompts used for normal chat and transcript rewrites.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
            aria-label="Close prompt editor"
            id="close_prompt_modal_icon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              System Prompt
            </label>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => setSettings((prev) => ({ ...prev, systemPrompt: e.target.value }))}
              className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              id="system_prompt_input"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rewrite Prompt
            </label>
            <textarea
              value={settings.rewriteTaskPrompt}
              onChange={(e) => setSettings((prev) => ({ ...prev, rewriteTaskPrompt: e.target.value }))}
              className="min-h-[220px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              id="rewrite_task_prompt_input"
            />
            <p className="text-xs text-slate-500">
              The required rewrite{' '}
              <span className="group relative inline-flex cursor-pointer font-semibold text-amber-700 underline decoration-dotted underline-offset-2">
                prompt wrapper
                <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden w-[28rem] rounded-xl border border-slate-200 bg-white p-3 text-left text-[11px] leading-relaxed text-slate-700 shadow-xl group-hover:block">
                  <span className="mb-2 block font-semibold text-slate-800">Applied automatically</span>
                  <code className="block whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                    {REWRITE_PROMPT_PREFIX}
                  </code>
                  <code className="mt-2 block whitespace-pre-wrap rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">
                    {'(Your Rewrite Prompt)'}
                  </code>
                  <code className="mt-2 block whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                    {REWRITE_PROMPT_POSTFIX}
                  </code>
                </span>
              </span>{' '}
              is still applied automatically before and after this task.
            </p>
          </div>

          {savedSuccess ? (
            <div className="text-sm font-medium text-emerald-600">Prompts saved.</div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100 focus:outline-none"
              id="restore_default_prompts"
            >
              <RotateCcw className="w-4 h-4" /> Restore Default Prompts
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 focus:outline-none"
              id="close_prompt_modal"
            >
              Close
            </button>
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 focus:outline-none"
              id="save_prompts"
            >
              <Save className="w-4 h-4" /> Save Prompts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptModal;
