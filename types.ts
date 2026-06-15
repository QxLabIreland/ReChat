export enum Role {
  User = 'user',
  Model = 'model'
}

export interface Message {
  role: Role;
  text: string;
  id: string; // Unique ID for React keys
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
