import { normalizeEmojiForPebble } from './emoji.js';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWatchPreview } from './image-preview.js';
import { htmlToText } from './html-to-text.js';
import { MacContactsResolver, normalizeContactIdentifier } from './contact-resolver.js';

const MAX_MESSAGE_PAGE = 60;
const MAX_PREVIEW_CACHE = 8;
const LOCAL_API_PORTS = Array.from({length: 11}, (_, index) => 23373 + index);

function ensureOK(response, operation) {
  if (!response.ok) {
    throw new Error(`${operation} failed with HTTP ${response.status}`);
  }
  return response;
}

function participantIdentifiers(chat) {
  const participant = chat?.participants?.items?.find((item) => !item.isSelf);
  return [participant?.email, participant?.phoneNumber, chat?.title]
    .map(normalizeContactIdentifier).filter(Boolean);
}

function personIdentifiers(person) {
  return [person?.email, person?.phoneNumber]
    .map(normalizeContactIdentifier).filter(Boolean);
}

function allParticipantIdentifiers(chat) {
  return (chat?.participants?.items || [])
    .filter((item) => !item.isSelf)
    .flatMap(personIdentifiers);
}

function readableDisplayName(value) {
  const name = String(value || '').trim();
  return name && !/^unknown(?: contact)?$/i.test(name) && !normalizeContactIdentifier(name) ? name : '';
}

function appleIdentifierKind(chat) {
  if (!/imessage|apple messages/i.test(String(chat?.network || chat?.accountID || ''))) return '';
  const participant = chat?.participants?.items?.find((item) => !item.isSelf);
  const candidate = String(participant?.email || participant?.phoneNumber || chat?.title || '').trim();
  if (candidate.includes('@')) return 'email';
  return normalizeContactIdentifier(candidate) ? 'phone' : '';
}

function appleContactGroup(chat, localContactKeys) {
  if (chat?.type !== 'single' || !appleIdentifierKind(chat)) return '';
  for (const identifier of participantIdentifiers(chat)) {
    const contactKey = localContactKeys.get(identifier);
    if (contactKey) return contactKey;
  }
  return '';
}

function contactMatchesParticipant(contact, participant) {
  if (contact.id && contact.id === participant?.id) return true;
  const participantKeys = [participant?.email, participant?.phoneNumber]
    .map(normalizeContactIdentifier).filter(Boolean);
  const contactKeys = [contact.email, contact.phoneNumber]
    .map(normalizeContactIdentifier).filter(Boolean);
  return participantKeys.some((key) => contactKeys.includes(key));
}

export function resolveChatName(chat, contacts = [], localNames = new Map()) {
  if (chat?.type === 'single') {
    const participant = chat?.participants?.items?.find((item) => !item.isSelf);
    if (participant?.fullName?.trim()) return participant.fullName.trim();
    const contact = contacts.find((item) => contactMatchesParticipant(item, participant));
    if (contact?.fullName?.trim()) return contact.fullName.trim();
    for (const identifier of participantIdentifiers(chat)) {
      const localName = localNames.get(identifier);
      if (localName?.trim()) return localName.trim();
    }
    if (chat?.title?.trim()) return chat.title.trim();
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
  constructor({ baseURL, accessToken, fetchImpl = globalThis.fetch, previewCreator = createWatchPreview,
    contactResolver = new MacContactsResolver() }) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.accessToken = accessToken;
    this.fetch = fetchImpl;
    this.previewCreator = previewCreator;
    this.contactResolver = contactResolver;
    this.attachments = new Map();
    this.previewCache = new Map();
    this.previewPromises = new Map();
    this.chatContexts = new Map();
    this.accountContacts = new Map();
    this.localContactNames = new Map();
    this.autoDiscoverLocalAPI = /^http:\/\/(127\.0\.0\.1|localhost):23373$/.test(this.baseURL);
  }

  async discoverLocalAPI() {
    const candidates = await Promise.all(LOCAL_API_PORTS.map(async (port) => {
      const baseURL = `http://127.0.0.1:${port}`;
      try {
        const response = await this.fetch(`${baseURL}/v1/info`, {
          signal: AbortSignal.timeout(750)
        });
        if (!response.ok) return null;
        const info = await response.json();
        return info?.app?.name === 'Beeper' && info?.server?.status === 'running' ? baseURL : null;
      } catch {
        return null;
      }
    }));
    const discovered = candidates.find(Boolean);
    if (!discovered) throw new Error('Beeper Desktop API is not running');
    this.baseURL = discovered;
    return discovered;
  }

  async response(path, options = {}) {
    const requestOptions = {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    let response;
    try {
      response = await this.fetch(`${this.baseURL}${path}`, requestOptions);
    } catch (error) {
      if (!this.autoDiscoverLocalAPI) throw error;
      const previousBaseURL = this.baseURL;
      const discoveredBaseURL = await this.discoverLocalAPI();
      if (discoveredBaseURL === previousBaseURL) throw error;
      response = await this.fetch(`${this.baseURL}${path}`, requestOptions);
    }
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
        this.accountContacts.set(accountID, contacts.items || []);
      } catch {
        contactsByAccount.set(accountID, []);
      }
    }));
    const localIdentifiers = (result.items || []).flatMap((chat) => {
      const contacts = contactsByAccount.get(chat.accountID) || [];
      const current = resolveChatName(chat, contacts);
      const appleDirect = chat?.type === 'single' && Boolean(appleIdentifierKind(chat));
      if (appleDirect || normalizeContactIdentifier(current)) return participantIdentifiers(chat);
      if (/imessage|apple messages/i.test(String(chat?.network || chat?.accountID || ''))) {
        return allParticipantIdentifiers(chat);
      }
      return [];
    });
    let localNames;
    let localContactKeys;
    if (typeof this.contactResolver.lookupDetails === 'function') {
      const details = await this.contactResolver.lookupDetails(localIdentifiers);
      localNames = details.names;
      localContactKeys = details.contactKeys;
    } else {
      localNames = await this.contactResolver.lookup(localIdentifiers);
      localContactKeys = new Map();
    }
    for (const [identifier, name] of localNames) this.localContactNames.set(identifier, name);
    const items = (result.items || []).map((chat) => {
      const contacts = contactsByAccount.get(chat.accountID) || this.accountContacts.get(chat.accountID) || [];
      const name = normalizeEmojiForPebble(resolveChatName(chat, contacts, localNames));
      this.chatContexts.delete(chat.id);
      this.chatContexts.set(chat.id, {
        accountID: chat.accountID || '',
        type: chat.type || '',
        name,
        participants: chat?.participants?.items || []
      });
      while (this.chatContexts.size > 100) this.chatContexts.delete(this.chatContexts.keys().next().value);
      return {
        id: chat.id,
        name,
        network: chat.network || '',
        unreadCount: chat.unreadCount || 0,
        preview: normalizeEmojiForPebble(normalizePreview(chat.preview)),
        timestamp: normalizeTime(chat.lastActivity || chat.lastActivityAt || chat.preview?.timestamp),
        identifierKind: appleIdentifierKind(chat),
        contactGroup: appleContactGroup(chat, localContactKeys)
      };
    });
    const appleNameCounts = new Map();
    for (const item of items) {
      if (!item.identifierKind) continue;
      const key = item.name.toLocaleLowerCase();
      appleNameCounts.set(key, (appleNameCounts.get(key) || 0) + 1);
    }
    return {
      items: items.map((item) => {
        const { identifierKind, ...watchItem } = item;
        if (identifierKind && appleNameCounts.get(item.name.toLocaleLowerCase()) > 1) {
          watchItem.name = `${item.name} (${identifierKind})`;
        }
        return watchItem;
      }),
      hasMore: Boolean(result.hasMore),
      nextCursor: result.oldestCursor || null
    };
  }

  resolveMessageSender(chatID, message) {
    if (message.isSender) return 'Me';
    const supplied = readableDisplayName(message.senderName);
    if (supplied) return supplied;
    const context = this.chatContexts.get(chatID);
    if (!context) return String(message.senderName || 'Unknown').trim() || 'Unknown';
    if (context.type === 'single') {
      const directName = readableDisplayName(context.name);
      if (directName) return directName;
    }
    const participant = context.participants.find((item) =>
      !item.isSelf && message.senderID && item.id === message.senderID);
    const contacts = this.accountContacts.get(context.accountID) || [];
    const contact = contacts.find((item) => item.id && item.id === message.senderID) ||
      (participant ? contacts.find((item) => contactMatchesParticipant(item, participant)) : null);
    for (const candidate of [participant?.fullName, contact?.fullName]) {
      const name = readableDisplayName(candidate);
      if (name) return name;
    }
    for (const identifier of personIdentifiers(participant)) {
      const name = readableDisplayName(this.localContactNames.get(identifier));
      if (name) return name;
    }
    for (const candidate of [participant?.username, contact?.username]) {
      const name = readableDisplayName(candidate);
      if (name) return name;
    }
    return String(message.senderName || 'Unknown').trim() || 'Unknown';
  }

  async listMessages(chatID, limit, cursor = '') {
    // The current Desktop API returns newest-first pages and advances toward older history with
    // `after`; cursors remain opaque and are never inspected here.
    const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}&direction=after` : '';
    const result = await this.request(`/v1/chats/${encodeURIComponent(chatID)}/messages?limit=${limit}${cursorQuery}`);
    const items = (result.items || []).slice(0, MAX_MESSAGE_PAGE).reverse().map((message) => {
      const attachment = (message.attachments || []).map((item, index) =>
        this.rememberAttachment(message.id, item, index)).find(Boolean) || null;
      return {
        id: message.id,
        sender: normalizeEmojiForPebble(this.resolveMessageSender(chatID, message)),
        text: normalizeEmojiForPebble(htmlToText(message.text || '')),
        time: normalizeTime(message.timestamp),
        timestamp: message.timestamp || '',
        attachment
      };
    });
    return { items, hasMore: Boolean(result.hasMore), nextCursor: result.oldestCursor || null };
  }

  async getAttachmentPreview(attachmentID) {
    const attachment = this.attachments.get(attachmentID);
    if (!attachment) return null;
    const cached = this.previewCache.get(attachmentID);
    if (cached) {
      this.previewCache.delete(attachmentID);
      this.previewCache.set(attachmentID, cached);
      return cached;
    }
    if (this.previewPromises.has(attachmentID)) return this.previewPromises.get(attachmentID);
    const promise = this.createAttachmentPreview(attachment);
    this.previewPromises.set(attachmentID, promise);
    try {
      const preview = await promise;
      this.previewCache.set(attachmentID, preview);
      if (this.previewCache.size > MAX_PREVIEW_CACHE) this.previewCache.delete(this.previewCache.keys().next().value);
      return preview;
    } finally {
      this.previewPromises.delete(attachmentID);
    }
  }

  async createAttachmentPreview(attachment) {
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
      // sendStatus is optional. A successful lookup by pending ID means that
      // Beeper resolved it to a real message even when the bridge omits status.
      status: message.sendStatus?.status || 'SUCCESS',
      reason: message.sendStatus?.message || message.sendStatus?.reason || ''
    };
  }

  async findSentReply(chatID, text, sentAfter) {
    const result = await this.request(`/v1/chats/${encodeURIComponent(chatID)}/messages?limit=20`);
    const normalizedText = htmlToText(text).trim();
    const match = (result.items || []).find((message) => {
      const timestamp = new Date(message.timestamp || 0).getTime();
      return message.isSender === true && timestamp >= sentAfter &&
        htmlToText(message.text || '').trim() === normalizedText;
    });
    return match ? {id:match.id || '',status:'SUCCESS',reason:''} : null;
  }
}
