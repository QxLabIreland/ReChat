import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Message, Role } from "../types";

export const MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
] as const;

export type GeminiModel = (typeof MODEL_OPTIONS)[number]['value'];
export interface PromptSettings {
  systemPrompt: string;
  rewriteTaskPrompt: string;
}

const MODEL_STORAGE_KEY = 'rechat_selected_model';
const SYSTEM_PROMPT_STORAGE_KEY = 'rechat_system_prompt';
const REWRITE_PROMPT_STORAGE_KEY = 'rechat_rewrite_task_prompt';
const DEFAULT_MODEL: GeminiModel = 'gemini-2.5-flash';
const DEFAULT_SYSTEM_PROMPT = "You are a helpful and concise AI assistant.";
export const REWRITE_PROMPT_PREFIX = `You are a conversation editor.

Here is the current conversation history in JSON format:
{{history}}

User Instruction: "{{instruction}}"`;

const LEGACY_REWRITE_PROMPT_STORAGE_KEY = 'rechat_rewrite_prompt';
export const REWRITE_PROMPT_POSTFIX = `Return the new history as a JSON array.`;

const DEFAULT_REWRITE_TASK_PROMPT = `Task: Rewrite the conversation history above to satisfy the user instruction.
You can modify, delete, or add messages as needed to make the history consistent with the instruction.

CRITICAL: You MUST maintain all Markdown formatting (like lists, bold, italics, code blocks, and headers).
If the original message used a list, the rewritten message MUST also use a list unless the instruction explicitly says otherwise.
Ensure that list items start with a newline and a proper bullet point (e.g., "* Item").

For example, if the instruction is "Make us sound like pirates", rewrite all messages in pirate speak while keeping any list structures.
If the instruction is "Remove the second message", remove it and ensure the flow still makes sense.`;

const normalizeRewriteTaskPrompt = (storedPrompt: string | null): string => {
  if (!storedPrompt?.trim()) {
    return DEFAULT_REWRITE_TASK_PROMPT;
  }

  const trimmedPrompt = storedPrompt.trim();

  if (trimmedPrompt.startsWith(REWRITE_PROMPT_PREFIX)) {
    let remainder = trimmedPrompt.slice(REWRITE_PROMPT_PREFIX.length).trim();
    if (remainder.endsWith(REWRITE_PROMPT_POSTFIX)) {
      remainder = remainder.slice(0, -REWRITE_PROMPT_POSTFIX.length).trim();
    }
    return remainder || DEFAULT_REWRITE_TASK_PROMPT;
  }

  if (trimmedPrompt.endsWith(REWRITE_PROMPT_POSTFIX)) {
    const withoutPostfix = trimmedPrompt.slice(0, -REWRITE_PROMPT_POSTFIX.length).trim();
    return withoutPostfix || DEFAULT_REWRITE_TASK_PROMPT;
  }

  return trimmedPrompt;
};

const getApiKey = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('rechat_custom_api_key');
    if (custom && custom.trim() !== '') {
      return custom.trim();
    }
  }
  return "";
};

export const getSelectedModel = (): GeminiModel => {
  if (typeof window === 'undefined') {
    return DEFAULT_MODEL;
  }

  const storedModel = localStorage.getItem(MODEL_STORAGE_KEY);
  if (storedModel && MODEL_OPTIONS.some((model) => model.value === storedModel)) {
    return storedModel as GeminiModel;
  }

  return DEFAULT_MODEL;
};

export const saveSelectedModel = (model: GeminiModel): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  }
};

export const getPromptSettings = (): PromptSettings => {
  if (typeof window === 'undefined') {
    return {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      rewriteTaskPrompt: DEFAULT_REWRITE_TASK_PROMPT,
    };
  }

  const storedSystemPrompt = localStorage.getItem(SYSTEM_PROMPT_STORAGE_KEY);
  const storedRewritePrompt = localStorage.getItem(REWRITE_PROMPT_STORAGE_KEY);
  const legacyStoredRewritePrompt = localStorage.getItem(LEGACY_REWRITE_PROMPT_STORAGE_KEY);
  const rewriteTaskPrompt = normalizeRewriteTaskPrompt(storedRewritePrompt ?? legacyStoredRewritePrompt);

  return {
    systemPrompt: storedSystemPrompt?.trim() ? storedSystemPrompt : DEFAULT_SYSTEM_PROMPT,
    rewriteTaskPrompt,
  };
};

export const savePromptSettings = (settings: PromptSettings): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SYSTEM_PROMPT_STORAGE_KEY, settings.systemPrompt);
    localStorage.setItem(REWRITE_PROMPT_STORAGE_KEY, settings.rewriteTaskPrompt);
    localStorage.removeItem(LEGACY_REWRITE_PROMPT_STORAGE_KEY);
  }
};

export const restoreDefaultPromptSettings = (): PromptSettings => {
  const defaults = {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    rewriteTaskPrompt: DEFAULT_REWRITE_TASK_PROMPT,
  };

  savePromptSettings(defaults);
  return defaults;
};

/**
 * Checks whether a user-provided api key is configured.
 */
export const hasConfiguredApiKey = (): boolean => {
  return getApiKey().length > 0;
};

/**
 * Checks if custom saved api key is used
 */
export const isUsingCustomApiKey = (): boolean => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('rechat_custom_api_key');
    return !!(custom && custom.trim() !== '');
  }
  return false;
};

const getAIClient = (): GoogleGenAI => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing Gemini API key. Open the API Key dialog and enter your personal key to continue.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Tests an API key by making a minimal request to generate content.
 */
export const testApiKeyConnection = async (key: string, model: GeminiModel = getSelectedModel()): Promise<boolean> => {
  try {
    const tempAi = new GoogleGenAI({ apiKey: key });
    await tempAi.models.generateContent({
      model,
      contents: "Hello",
    });
    return true;
  } catch (e) {
    console.error("Test API key connection failed:", e);
    throw formatGenAIError(e);
  }
};

/**
 * Helper to parse GenAI errors and return friendly messages for common configuration issues.
 */
const formatGenAIError = (err: any): Error => {
  try {
    let messageText = '';
    
    if (err instanceof Error) {
      messageText = err.message || '';
    } else if (typeof err === 'string') {
      messageText = err;
    } else {
      messageText = JSON.stringify(err);
    }

    // Check if it's a JSON string thrown by the @google/genai SDK
    if (messageText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(messageText);
        
        // Referrer restriction match
        if (parsed.error?.details?.some((d: any) => d.reason === 'API_KEY_HTTP_REFERRER_BLOCKED')) {
          const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'this domain';
          return new Error(
            `API Key Restriction: The URL '${currentOrigin}' is not allowed by your Google Cloud referrer restrictions.`
          );
        }

        if (parsed.error?.message) {
          messageText = parsed.error.message;
        }
      } catch (parseErr) {
        // Fallback to original text
      }
    }

    // Capture standard Google 403 Permisson Denied or caller permission errors
    const lowerMsg = messageText.toLowerCase();
    if (
      lowerMsg.includes('caller does not have permission') || 
      lowerMsg.includes('permission_denied') ||
      lowerMsg.includes('permission denied') ||
      lowerMsg.includes('key_invalid') ||
      lowerMsg.includes('invalid api key')
    ) {
      return new Error(
        "API Key Error ('The caller does not have permission'). This usually means one of three things: " +
        "1) The API Key was generated in Google Cloud Console but 'Generative Language API' is not enabled in that project. " +
        "2) The API Key has 'HTTP Referrer Restrictions' enabled in Google Cloud that block this sandbox URL. " +
        "3) Type or copy-paste error in the key. " +
        "👉 Fix: Head to aistudio.google.com, click 'Get API key', and create a fresh unrestricted key with default settings."
      );
    }

    if (messageText) {
      return new Error(messageText);
    }
  } catch (errorParsingError) {
    // If anything fails in parsing, return original
  }
  return err instanceof Error ? err : new Error(String(err));
};

/**
 * Sends a new message to the chat model and gets a streaming response.
 */
export const sendMessageStream = async (
  history: Message[],
  newMessage: string
): Promise<AsyncGenerator<string, void, unknown>> => {
  
  try {
    const ai = getAIClient();
    const model = getSelectedModel();
    const { systemPrompt } = getPromptSettings();
    // Convert internal message format to Gemini API format
    // Note: We filter out any potential system messages if we had them, strictly keeping user/model turns
    const chatHistory = history.map(msg => ({
      role: msg.role === Role.User ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const chat = ai.chats.create({
      model,
      history: chatHistory,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    const result = await chat.sendMessageStream({ message: newMessage });

    // Return a generator that yields text chunks
    async function* streamGenerator() {
      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          yield text;
        }
      }
    }

    return streamGenerator();
  } catch (e) {
    throw formatGenAIError(e);
  }
};

/**
 * Rewrites the entire chat history based on a user instruction.
 */
export const rewriteHistory = async (
  history: Message[],
  instruction: string
): Promise<Message[]> => {
  
  // Define the schema for the output to ensure we get a valid list of messages back
  const historySchema: Schema = {
    type: Type.ARRAY,
    description: "The rewritten conversation history.",
    items: {
      type: Type.OBJECT,
      properties: {
        role: {
          type: Type.STRING,
          enum: ["user", "model"],
          description: "The role of the message sender.",
        },
        text: {
          type: Type.STRING,
          description: "The content of the message.",
        },
      },
      required: ["role", "text"],
    },
  };

  try {
    const ai = getAIClient();
    const model = getSelectedModel();
    const { rewriteTaskPrompt } = getPromptSettings();
    const prompt = `${REWRITE_PROMPT_PREFIX
      .replace('{{history}}', JSON.stringify(history.map((m) => ({ role: m.role, text: m.text }))))
      .replace('{{instruction}}', instruction)}

${rewriteTaskPrompt}

${REWRITE_PROMPT_POSTFIX}`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: historySchema,
        systemInstruction: "You are a precise JSON generator. You output valid JSON matching the schema. You MUST preserve Markdown formatting (like lists, bold, italics) from the original messages. Ensure lists are properly formatted with newlines and bullet points.",
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No content returned from model during history update.");
    }

    try {
      const parsed = JSON.parse(jsonText);
      // Map back to our internal Message type with new IDs
      return parsed.map((item: { role: string; text: string }) => ({
        role: item.role === 'user' ? Role.User : Role.Model,
        text: item.text,
        id: crypto.randomUUID(),
      }));
    } catch (e) {
      console.error("Failed to parse history update response:", e);
      throw new Error("Failed to parse the rewritten history.");
    }
  } catch (e) {
    throw formatGenAIError(e);
  }
};
