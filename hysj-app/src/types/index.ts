export interface User {
  id: string;
  username: string;
}

export interface Conversation {
  id: string;
  peerUserId: string;
  peerUsername: string;
  peerDeviceId: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  isOutgoing: boolean;
  senderAlias?: string;
  senderAvatarColor?: string;
  sentAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  deviceId: string;
  username: string;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ConversationList: undefined;
  Chat: { conversation: Conversation };
  NewChat: undefined;
  Settings: undefined;
  Security: undefined;
  CreateGroup: undefined;
};
