import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, Message } from '../types';

const CONV_KEY = 'conversations';

export const getConversations = async (): Promise<Conversation[]> => {
  const raw = await AsyncStorage.getItem(CONV_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const upsertConversation = async (conv: Conversation): Promise<void> => {
  const convs = await getConversations();
  const idx = convs.findIndex(c => c.id === conv.id);
  if (idx >= 0) convs[idx] = conv;
  else convs.unshift(conv);
  await AsyncStorage.setItem(CONV_KEY, JSON.stringify(convs));
};

export const getMessages = async (convId: string): Promise<Message[]> => {
  const raw = await AsyncStorage.getItem(`messages:${convId}`);
  return raw ? JSON.parse(raw) : [];
};

export const appendMessage = async (convId: string, msg: Message): Promise<void> => {
  const msgs = await getMessages(convId);
  msgs.push(msg);
  await AsyncStorage.setItem(`messages:${convId}`, JSON.stringify(msgs));
};

export const markRead = async (convId: string): Promise<void> => {
  const convs = await getConversations();
  const conv = convs.find(c => c.id === convId);
  if (conv) {
    conv.unreadCount = 0;
    await AsyncStorage.setItem(CONV_KEY, JSON.stringify(convs));
  }
};
