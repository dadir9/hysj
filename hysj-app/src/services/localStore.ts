import { secureSetItem, secureGetItem, secureRemoveItem } from './secureStorage';
import { Conversation, Message } from '../types';

const CONV_KEY = 'conversations';

export const getConversations = async (): Promise<Conversation[]> => {
  const raw = await secureGetItem(CONV_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const upsertConversation = async (conv: Conversation): Promise<void> => {
  const convs = await getConversations();
  const idx = convs.findIndex(c => c.id === conv.id);
  if (idx >= 0) convs[idx] = conv;
  else convs.unshift(conv);
  await secureSetItem(CONV_KEY, JSON.stringify(convs));
};

export const getMessages = async (convId: string): Promise<Message[]> => {
  const raw = await secureGetItem(`messages:${convId}`);
  return raw ? JSON.parse(raw) : [];
};

export const appendMessage = async (convId: string, msg: Message): Promise<void> => {
  const msgs = await getMessages(convId);
  msgs.push(msg);
  await secureSetItem(`messages:${convId}`, JSON.stringify(msgs));
};

export const deleteConversation = async (convId: string): Promise<void> => {
  const convs = await getConversations();
  const filtered = convs.filter(c => c.id !== convId);
  await secureSetItem(CONV_KEY, JSON.stringify(filtered));
  await secureRemoveItem(`messages:${convId}`);
};

export const markRead = async (convId: string): Promise<void> => {
  const convs = await getConversations();
  const conv = convs.find(c => c.id === convId);
  if (conv) {
    conv.unreadCount = 0;
    await secureSetItem(CONV_KEY, JSON.stringify(convs));
  }
};
