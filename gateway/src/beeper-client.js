import { normalizeEmojiForPebble } from './emoji.js';

function ensureOK(response, operation) {
  if (!response.ok) {
    throw new Error(`${operation} failed with HTTP ${response.status}`);
  }
  return response;
}

export function resolveChatName(chat, contacts = []) {
  if (chat?.type === 'single') {
    const participant = chat?.participants?.items?.find((item) => !item.isSelf);
    if (participant?.fullName?.trim()) return participant.fullName.trim();
    const contact = contacts.find((item) => item.id === participant?.id ||
      (participant?.phoneNumber && item.phoneNumber === participant.phoneNumber) ||
      (participant?.email && item.email === participant.email));
    if (contact?.fullName?.trim()) return contact.fullName.trim();
    if (participant?.username?.trim()) return participant.username.trim();
    if (participant?.phoneNumber?.trim()) return participant.phoneNumber.trim();
    if (participant?.email?.trim()) return participant.email.trim();
  }
  if (chat?.title?.trim()) return chat.title.trim();
  return 'Unknown contact';
}

function normalizePreview(preview) {
  if (!preview) return '';
  if (typeof preview === 'string') return preview;
  return preview.text || '';
}

function normalizeTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export class BeeperClient {
  constructor({ baseURL, accessToken, fetchImpl = globalThis.fetch }) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.accessToken = accessToken;
    this.fetch = fetchImpl;
  }

  async request(path, options = {}) {
    const response = await this.fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    ensureOK(response, options.method || 'GET');
    if (response.status === 204) return null;
    return response.json();
  }

  async listChats(limit) {
    const result = await this.request(`/v1/chats/search?limit=${limit}&type=any&inbox=primary`);
    const contactsByAccount = new Map();
    const unresolvedAccounts = [...new Set((result.items || [])
      .filter((chat) => resolveChatName(chat) === 'Unknown contact' || resolveChatName(chat) === chat.title)
      .map((chat) => chat.accountID).filter(Boolean))].slice(0, 6);
    await Promise.all(unresolvedAccounts.map(async (accountID) => {
      try {
        const contacts = await this.request(`/v1/accounts/${encodeURIComponent(accountID)}/contacts/list?limit=200`);
        contactsByAccount.set(accountID, contacts.items || []);
      } catch {
        contactsByAccount.set(accountID, []);
      }
    }));
    return (result.items || []).map((chat) => ({
      id: chat.id,
      name: normalizeEmojiForPebble(resolveChatName(chat, contactsByAccount.get(chat.accountID) || [])),
      network: chat.network || '',
      unreadCount: chat.unreadCount || 0,
      preview: normalizeEmojiForPebble(normalizePreview(chat.preview)),
      timestamp: normalizeTime(chat.lastActivity || chat.lastActivityAt || chat.preview?.timestamp)
    }));
  }

  async listMessages(chatID, limit) {
    const result = await this.request(`/v1/chats/${encodeURIComponent(chatID)}/messages?limit=${limit}`);
    return (result.items || []).slice().reverse().map((message) => ({
      id: message.id,
      sender: message.isSender ? 'Me' : normalizeEmojiForPebble(message.senderName || 'Unknown'),
      text: normalizeEmojiForPebble(message.text || ''),
      time: normalizeTime(message.timestamp)
    }));
  }

  async sendReply(chatID, text) {
    const result = await this.request(`/v1/chats/${encodeURIComponent(chatID)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    return {
      state: 'accepted',
      pendingMessageID: result.pendingMessageID || null
    };
  }
}
