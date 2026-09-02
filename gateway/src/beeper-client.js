import { normalizeEmojiForPebble } from './emoji.js';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWatchPreview } from './image-preview.js';
import { htmlToText } from './html-to-text.js';

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
  if (typeof preview === 'string') return htmlToText(preview);
  return htmlToText(preview.text || '');
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
  constructor({ baseURL, accessToken, fetchImpl = globalThis.fetch, previewCreator = createWatchPreview }) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.accessToken = accessToken;
    this.fetch = fetchImpl;
    this.previewCreator = previewCreator;
    this.attachments = new Map();
  }

  async response(path, options = {}) {
    const response = await this.fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    ensureOK(response, options.method || 'GET');
    return response;
  }

  async request(path, options = {}) {
    const response = await this.response(path, options);
    if (response.status === 204) return null;
    return response.json();
  }

  rememberAttachment(messageID, attachment, index) {
    const sourceURL = attachment.type === 'video' ? (attachment.posterImg || attachment.srcURL) : (attachment.srcURL || attachment.posterImg);
    if (!sourceURL || !/^(file|mxc|localmxc):\/\//.test(sourceURL)) return null;
    const kind = attachment.isGif || attachment.mimeType === 'image/gif' ? 'gif' :
      (attachment.type === 'video' ? 'video' : 'image');
    const id = createHash('sha256').update(`${messageID}:${attachment.id || index}:${sourceURL}`).digest('hex').slice(0, 24);
    this.attachments.set(id, { sourceURL, kind });
    if (this.attachments.size > 300) this.attachments.delete(this.attachments.keys().next().value);
    return { id, kind };
  }

  async listChats(limit, cursor = '') {
    const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}&direction=before` : '';
    const result = await this.request(`/v1/chats/search?limit=${limit}&type=any&inbox=primary${cursorQuery}`);
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
    const items = (result.items || []).map((chat) => ({
      id: chat.id,
      name: normalizeEmojiForPebble(resolveChatName(chat, contactsByAccount.get(chat.accountID) || [])),
      network: chat.network || '',
      unreadCount: chat.unreadCount || 0,
      preview: normalizeEmojiForPebble(normalizePreview(chat.preview)),
      timestamp: normalizeTime(chat.lastActivity || chat.lastActivityAt || chat.preview?.timestamp)
    }));
    return { items, hasMore: Boolean(result.hasMore), nextCursor: result.oldestCursor || null };
  }

  async listMessages(chatID, limit) {
    const result = await this.request(`/v1/chats/${encodeURIComponent(chatID)}/messages?limit=${limit}`);
    return (result.items || []).slice(0, limit).reverse().map((message) => {
      const attachment = (message.attachments || []).map((item, index) =>
        this.rememberAttachment(message.id, item, index)).find(Boolean) || null;
      return {
        id: message.id,
        sender: message.isSender ? 'Me' : normalizeEmojiForPebble(message.senderName || 'Unknown'),
        text: normalizeEmojiForPebble(htmlToText(message.text || '')),
        time: normalizeTime(message.timestamp),
        attachment
      };
    });
  }

  async getAttachmentPreview(attachmentID) {
    const attachment = this.attachments.get(attachmentID);
    if (!attachment) return null;
    const directory = await mkdtemp(join(tmpdir(), 'beepster-preview-'));
    const inputPath = join(directory, 'source');
    const outputPath = join(directory, 'preview.bmp');
    try {
      if (attachment.sourceURL.startsWith('file://')) {
        const preview = await this.previewCreator(fileURLToPath(attachment.sourceURL), outputPath);
        return { ...preview, kind: attachment.kind };
      }
      const response = await this.response(`/v1/assets/serve?url=${encodeURIComponent(attachment.sourceURL)}`, {
        headers: { Accept: '*/*' }
      });
      await writeFile(inputPath, Buffer.from(await response.arrayBuffer()));
      const preview = await this.previewCreator(inputPath, outputPath);
      return { ...preview, kind: attachment.kind };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
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

  async getMessageStatus(chatID, messageID) {
    const message = await this.request(`/v1/chats/${encodeURIComponent(chatID)}/messages/${encodeURIComponent(messageID)}`);
    return {
      id: message.id || messageID,
      status: message.sendStatus?.status || 'PENDING',
      reason: message.sendStatus?.message || message.sendStatus?.reason || ''
    };
  }
}
