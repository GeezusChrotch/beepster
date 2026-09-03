'use strict';

var KEY_COMMAND = 0;
var KEY_STATE = 1;
var KEY_ERROR = 2;
var KEY_INDEX = 3;
var KEY_TOTAL = 4;
var KEY_CHAT_ID = 5;
var KEY_CHAT_NAME = 6;
var KEY_CHAT_PREVIEW = 7;
var KEY_UNREAD = 8;
var KEY_NETWORK = 9;
var KEY_MSG_SENDER = 10;
var KEY_MSG_TEXT = 11;
var KEY_MSG_TIME = 12;
var KEY_THEME = 13;
var KEY_TEXT_SIZE = 14;
var KEY_REPLY_TEXT = 15;
var KEY_REPLY_REQUEST_ID = 16;
var KEY_THEME_BACKGROUND = 17;
var KEY_THEME_TEXT = 18;
var KEY_THEME_MUTED = 19;
var KEY_THEME_ACCENT = 20;
var KEY_THEME_ACCENT_TEXT = 21;
var KEY_THEME_FONT = 22;
var KEY_ATTACHMENT_ID = 23;
var KEY_ATTACHMENT_KIND = 24;
var KEY_MEDIA_WIDTH = 25;
var KEY_MEDIA_HEIGHT = 26;
var KEY_MEDIA_OFFSET = 27;
var KEY_MEDIA_BYTES = 28;
var KEY_MEDIA_TOTAL = 29;
var KEY_MSG_ID = 30;
var KEY_DETAIL_TEXT = 31;
var KEY_QUICK_REPLY_TEXT = 32;
var KEY_HAS_MORE = 33;
var KEY_THEME_SIZE = 34;

var BUILT_IN_THEMES = [
  {id:'classic',name:'Classic',background:'#FFFFFF',text:'#000000',muted:'#555555',accent:'#0055AA',accentText:'#FFFFFF',font:'inter',size:22,builtIn:true},
  {id:'dark',name:'Midnight',background:'#000000',text:'#FFFFFF',muted:'#AAAAAA',accent:'#00AAFF',accentText:'#000000',font:'roboto',size:22,builtIn:true},
  {id:'ocean',name:'Ocean',background:'#001133',text:'#FFFFFF',muted:'#AAFFFF',accent:'#00AAFF',accentText:'#000000',font:'roboto',size:22,builtIn:true},
  {id:'contrast',name:'High Contrast',background:'#FFFFFF',text:'#000000',muted:'#000000',accent:'#000000',accentText:'#FFFFFF',font:'open-sans',size:26,builtIn:true},
  {id:'plum',name:'Plum',background:'#330033',text:'#FFFFFF',muted:'#FFAAFF',accent:'#AA00AA',accentText:'#FFFFFF',font:'poppins',size:30,builtIn:true},
  {id:'forest',name:'Forest',background:'#003300',text:'#FFFFFF',muted:'#AAFFAA',accent:'#00AA55',accentText:'#000000',font:'open-sans',size:26,builtIn:true}
];
var THEME_FONTS = {inter:5,roboto:6,'open-sans':7,montserrat:8,poppins:9};
var THEME_SIZES = [14,18,22,26,30];

var queue = [];
var sending = false;
var DEFAULT_SETTINGS_URL = '';
var refreshTimer = null;
var messageTextByID = {};
var quickReplyCounter = 0;
var activeMessageChatID = '';
var messageHistory = [];
var oldestMessageCursor = '';
var hasOlderMessages = false;
var loadingOlderMessages = false;
var MAX_WATCH_MESSAGES = 60;
var DEFAULT_QUICK_REPLIES = ['Yes', 'No', 'On my way', 'Thanks! 👍'];

function gatewayURL() {
  return (localStorage.getItem('beepster_gateway_url') || '').replace(/\/$/, '');
}

function gatewayToken() {
  return localStorage.getItem('beepster_gateway_token') || '';
}

function safeSlice(value, maxCodeUnits) {
  var text = String(value || '');
  if (text.length <= maxCodeUnits) return text;
  var end = maxCodeUnits;
  var previous = text.charCodeAt(end - 1);
  if (previous >= 0xD800 && previous <= 0xDBFF) end--;
  return text.substring(0, end);
}

function utf8Chunks(value, maxChunkBytes, maxTotalBytes) {
  var source = String(value || ''), chunks = [], start = 0, position = 0, chunkBytes = 0, totalBytes = 0;
  while (position < source.length) {
    var code = source.charCodeAt(position), units = 1, bytes;
    if (code >= 0xD800 && code <= 0xDBFF && position + 1 < source.length) { units = 2; bytes = 4; }
    else if (code < 0x80) bytes = 1;
    else if (code < 0x800) bytes = 2;
    else bytes = 3;
    if (totalBytes + bytes > maxTotalBytes) break;
    if (chunkBytes + bytes > maxChunkBytes && position > start) {
      chunks.push(source.substring(start, position));
      start = position;
      chunkBytes = 0;
    }
    position += units;
    chunkBytes += bytes;
    totalBytes += bytes;
  }
  if (position > start) chunks.push(source.substring(start, position));
  if (position < source.length) chunks.push('\n[Message exceeds the watch display limit]');
  return chunks;
}

function selectedTheme() {
  return configuredTheme().id;
}

function normalizeTheme(value) {
  var theme = value && typeof value === 'object' ? value : {};
  function color(key, fallback) { return /^#[0-9a-f]{6}$/i.test(theme[key] || '') ? theme[key].toUpperCase() : fallback; }
  var legacyFonts = {gothic:'inter',bold:'montserrat',bitham:'poppins','gothic-bold':'montserrat','roboto-condensed':'roboto'};
  var font = legacyFonts[theme.font] || theme.font;
  if (!Object.prototype.hasOwnProperty.call(THEME_FONTS, font)) font = 'inter';
  var requestedSize = Number(theme.size || (theme.textSize === 'large' ? 26 : 22));
  var size = THEME_SIZES[0];
  for (var i=1;i<THEME_SIZES.length;i++) if (Math.abs(THEME_SIZES[i]-requestedSize)<Math.abs(size-requestedSize)) size=THEME_SIZES[i];
  return {id:String(theme.id || ('custom-' + Date.now())).slice(0,40),name:String(theme.name || 'Custom').slice(0,32),background:color('background','#FFFFFF'),text:color('text','#000000'),muted:color('muted','#555555'),accent:color('accent','#0055AA'),accentText:color('accentText','#FFFFFF'),font:font,size:size,textSize:size>=26?'large':'normal',builtIn:Boolean(theme.builtIn)};
}

function configuredTheme() {
  try { var saved = JSON.parse(localStorage.getItem('beepster_theme_json') || 'null'); if (saved) return normalizeTheme(saved); } catch (error) {}
  var legacy = localStorage.getItem('beepster_theme') || 'classic';
  for (var i=0;i<BUILT_IN_THEMES.length;i++) if (BUILT_IN_THEMES[i].id===legacy) return normalizeTheme(BUILT_IN_THEMES[i]);
  return normalizeTheme(BUILT_IN_THEMES[0]);
}

function configuredThemes() {
  var themes = BUILT_IN_THEMES.map(normalizeTheme);
  try { var saved = JSON.parse(localStorage.getItem('beepster_themes') || '[]'); for(var i=0;i<saved.length&&i<20;i++) themes.push(normalizeTheme(saved[i])); } catch (error) {}
  return themes;
}

function configuredQuickReplies() {
  try {
    var saved = JSON.parse(localStorage.getItem('beepster_quick_replies') || 'null');
    if (saved && Array.isArray(saved)) return saved.map(function(value) { return String(value || '').trim(); }).filter(Boolean).slice(0, 8);
  } catch (error) {}
  return DEFAULT_QUICK_REPLIES.slice();
}

function watchQuickReply(value) {
  var text = String(value || '')
    .replace(/[\uFE0F\u200D]/g, '')
    .replace(/\uD83C[\uDFFB-\uDFFF]/g, '')
    .replace(/\uD83E\uDD14/g, '[thinking]')
    .replace(/\uD83D\uDD25/g, '[fire]')
    .replace(/\uD83D\uDE80/g, '[rocket]')
    .replace(/\uD83D\uDC4F/g, '[applause]');
  var chunks = utf8Chunks(text, 80, 80);
  return chunks.length ? chunks[0] : '';
}

function sendQuickReplies() {
  var replies = configuredQuickReplies();
  for (var i = 0; i < replies.length; i++) {
    var message = {};
    message[KEY_COMMAND] = 'quick_reply';
    message[KEY_INDEX] = i;
    message[KEY_TOTAL] = replies.length;
    message[KEY_QUICK_REPLY_TEXT] = watchQuickReply(replies[i]);
    enqueue(message);
  }
  var complete = {};
  complete[KEY_COMMAND] = 'quick_replies_ready';
  complete[KEY_TOTAL] = replies.length;
  enqueue(complete);
}

function pebbleColor(hex) {
  var value = parseInt(String(hex).slice(1),16);
  var r = Math.round(((value>>16)&255)/85), g = Math.round(((value>>8)&255)/85), b = Math.round((value&255)/85);
  return 0xC0 | (r<<4) | (g<<2) | b;
}

function enqueue(message) {
  queue.push({ message: message, retries: 0 });
  drain();
}

function drain() {
  if (sending || queue.length === 0) return;
  sending = true;
  Pebble.sendAppMessage(queue[0].message, function() {
    queue.shift();
    sending = false;
    drain();
  }, function(error) {
    queue[0].retries++;
    sending = false;
    console.log('Beepster AppMessage failure retry=' + queue[0].retries + ' code=' + JSON.stringify(error || {}));
    if (queue[0].retries >= 3) {
      queue = [];
      sendState('error', 'Watch transport failed');
      return;
    }
    setTimeout(drain, 500);
  });
}

function sendState(state, error) {
  var theme = configuredTheme();
  var message = {};
  message[KEY_COMMAND] = 'state';
  message[KEY_STATE] = state;
  message[KEY_THEME] = theme.id;
  message[KEY_TEXT_SIZE] = theme.textSize || localStorage.getItem('beepster_text_size') || 'normal';
  message[KEY_THEME_BACKGROUND] = pebbleColor(theme.background);
  message[KEY_THEME_TEXT] = pebbleColor(theme.text);
  message[KEY_THEME_MUTED] = pebbleColor(theme.muted);
  message[KEY_THEME_ACCENT] = pebbleColor(theme.accent);
  message[KEY_THEME_ACCENT_TEXT] = pebbleColor(theme.accentText);
  message[KEY_THEME_FONT] = THEME_FONTS[theme.font] || 5;
  message[KEY_THEME_SIZE] = theme.size || 22;
  if (error) message[KEY_ERROR] = safeSlice(error, 100);
  enqueue(message);
  if (state === 'error' || state === 'empty') scheduleRefresh();
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  var seconds = Number(localStorage.getItem('beepster_refresh') || '180');
  if (seconds > 0) refreshTimer = setTimeout(loadChats, Math.max(60, seconds) * 1000);
}

function request(path, callback, failure) {
  var url = gatewayURL();
  var token = gatewayToken();
  function fail(message) {
    if (failure) failure(message);
    else sendState('error', message);
  }
  if (!url || !token) {
    if (failure) failure('Gateway not configured');
    else sendState('setup');
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + path, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.timeout = 12000;
  xhr.onload = function() {
    if (xhr.status < 200 || xhr.status >= 300) {
      fail('Gateway returned ' + xhr.status);
      return;
    }
    try {
      callback(JSON.parse(xhr.responseText));
    } catch (error) {
      fail('Invalid gateway response');
    }
  };
  xhr.onerror = function() { fail('Gateway unavailable'); };
  xhr.ontimeout = function() { fail('Gateway timed out'); };
  xhr.send();
}

function post(path, body, callback) {
  var url = gatewayURL();
  var token = gatewayToken();
  if (!url || !token) { sendState('setup'); return; }
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url + path, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.timeout = 12000;
  xhr.onload = function() {
    if (xhr.status < 200 || xhr.status >= 300) { sendState('reply_failed', 'Send failed with ' + xhr.status); return; }
    try { callback(JSON.parse(xhr.responseText)); } catch (error) { sendState('reply_failed', 'Invalid send response'); }
  };
  xhr.onerror = function() { sendState('reply_failed', 'Gateway unavailable'); };
  xhr.ontimeout = function() { sendState('reply_failed', 'Send timed out'); };
  xhr.send(JSON.stringify(body));
}

function pollReply(chatID, pendingMessageID, attempt) {
  request('/v1/chats/' + encodeURIComponent(chatID) + '/messages/' + encodeURIComponent(pendingMessageID), function(data) {
    var status = data.status || 'PENDING';
    if (status === 'SUCCESS') { sendState('reply_sent'); return; }
    if (status === 'FAIL_RETRIABLE') { sendState('reply_retryable', data.reason || 'Send can be retried'); return; }
    if (status === 'FAIL_PERMANENT') { sendState('reply_failed', data.reason || 'Reply failed'); return; }
    if (attempt >= 9) { sendState('reply_pending', 'Still pending in Beeper'); return; }
    setTimeout(function() { pollReply(chatID, pendingMessageID, attempt + 1); }, 1500);
  }, function(error) {
    sendState('reply_retryable', error || 'Could not confirm delivery');
  });
}

function sendReply(chatID, text, requestID) {
  if (!chatID || !text || !requestID) { sendState('reply_failed', 'Reply data missing'); return; }
  sendState('reply_sending');
  post('/v1/chats/' + encodeURIComponent(chatID) + '/messages', {text:text,requestID:requestID}, function(data) {
    if (!data.pendingMessageID) { sendState('reply_failed', 'Beeper did not return a message ID'); return; }
    sendState('reply_pending');
    pollReply(chatID, data.pendingMessageID, 0);
  });
}

function sendQuickReply(chatID, index, requestID) {
  var replies = configuredQuickReplies();
  if (index < 0 || index >= replies.length) { sendState('reply_failed', 'Quick reply unavailable'); return; }
  if (!requestID) {
    quickReplyCounter++;
    requestID = 'quick-' + Date.now() + '-' + quickReplyCounter;
  }
  sendReply(chatID, replies[index], requestID);
}

function loadChats() {
  sendState('loading');
  request('/v1/chats?limit=12', function(data) {
    var items = data.items || [];
    if (items.length === 0) {
      sendState('empty');
      return;
    }
    for (var i = 0; i < items.length && i < 12; i++) {
      var chat = items[i];
      var message = {};
      message[KEY_COMMAND] = 'chat';
      message[KEY_INDEX] = i;
      message[KEY_TOTAL] = Math.min(items.length, 12);
      message[KEY_CHAT_ID] = safeSlice(chat.id, 120);
      message[KEY_CHAT_NAME] = safeSlice(chat.name || 'Unknown contact', 56);
      message[KEY_CHAT_PREVIEW] = safeSlice(chat.preview, 110);
      message[KEY_UNREAD] = Number(chat.unreadCount || 0);
      message[KEY_NETWORK] = safeSlice(chat.network, 20);
      enqueue(message);
    }
    sendState('ready');
    scheduleRefresh();
  });
}

function queueMessage(item, index, total) {
  var messageID = String(item.id || ('message-' + index));
  messageTextByID[messageID] = String(item.text || '');
  var message = {};
  message[KEY_COMMAND] = 'message';
  message[KEY_INDEX] = index;
  message[KEY_TOTAL] = total;
  message[KEY_MSG_SENDER] = safeSlice(item.sender || 'Unknown', 44);
  message[KEY_MSG_TEXT] = safeSlice(item.text, 240);
  message[KEY_MSG_TIME] = safeSlice(item.time, 18);
  message[KEY_MSG_ID] = safeSlice(messageID, 120);
  if (item.attachment) {
    message[KEY_ATTACHMENT_ID] = safeSlice(item.attachment.id, 30);
    message[KEY_ATTACHMENT_KIND] = item.attachment.kind === 'gif' ? 2 : (item.attachment.kind === 'video' ? 3 : 1);
  }
  enqueue(message);
}

function finishMessageBatch(mode, selectedIndex) {
  var ready = {};
  ready[KEY_COMMAND] = 'messages_ready';
  ready[KEY_STATE] = mode;
  ready[KEY_TOTAL] = messageHistory.length;
  ready[KEY_INDEX] = Math.max(0, selectedIndex);
  ready[KEY_HAS_MORE] = hasOlderMessages ? 1 : 0;
  enqueue(ready);
}

function loadMessages(chatID) {
  console.log('Beepster loading messages chatIDLength=' + String(chatID || '').length);
  activeMessageChatID = chatID;
  messageHistory = [];
  oldestMessageCursor = '';
  hasOlderMessages = false;
  loadingOlderMessages = false;
  messageTextByID = {};
  sendState('loading');
  request('/v1/chats/' + encodeURIComponent(chatID) + '/messages?limit=12', function(data) {
    var items = (data.items || []).slice(0, MAX_WATCH_MESSAGES);
    if (items.length === 0) { sendState('empty'); return; }
    messageHistory = items;
    oldestMessageCursor = data.nextCursor || '';
    hasOlderMessages = Boolean(data.hasMore && oldestMessageCursor && messageHistory.length < MAX_WATCH_MESSAGES);
    var start = {}; start[KEY_COMMAND] = 'messages_start'; start[KEY_TOTAL] = items.length; enqueue(start);
    for (var i = 0; i < items.length; i++) queueMessage(items[i], i, items.length);
    finishMessageBatch('initial', items.length - 1);
    console.log('Beepster queued newest messages count=' + items.length);
  });
}

function loadOlderMessages(chatID) {
  if (loadingOlderMessages || !hasOlderMessages || chatID !== activeMessageChatID) return;
  var remaining = MAX_WATCH_MESSAGES - messageHistory.length;
  if (remaining <= 0) { hasOlderMessages = false; finishMessageBatch('older', 0); return; }
  loadingOlderMessages = true;
  var limit = Math.min(12, remaining);
  var path = '/v1/chats/' + encodeURIComponent(chatID) + '/messages?limit=' + limit + '&cursor=' + encodeURIComponent(oldestMessageCursor) + '&direction=before';
  request(path, function(data) {
    var seen = {};
    for (var i = 0; i < messageHistory.length; i++) seen[String(messageHistory[i].id || '')] = true;
    var page = (data.items || []).filter(function(item) { return !seen[String(item.id || '')]; }).slice(-remaining);
    oldestMessageCursor = data.nextCursor || '';
    messageHistory = page.concat(messageHistory);
    hasOlderMessages = Boolean(data.hasMore && oldestMessageCursor && messageHistory.length < MAX_WATCH_MESSAGES);
    loadingOlderMessages = false;
    if (page.length) {
      var start = {}; start[KEY_COMMAND] = 'messages_prepend_start'; start[KEY_TOTAL] = page.length; enqueue(start);
      for (var j = 0; j < page.length; j++) queueMessage(page[j], j, page.length);
    }
    finishMessageBatch('older', page.length);
    console.log('Beepster prepended older messages count=' + page.length + ' total=' + messageHistory.length);
  }, function(error) {
    loadingOlderMessages = false;
    var failed = {}; failed[KEY_COMMAND] = 'message_history_failed'; failed[KEY_ERROR] = safeSlice(error, 100); enqueue(failed);
  });
}

function sendMessageDetail(messageID) {
  var text = Object.prototype.hasOwnProperty.call(messageTextByID, messageID) ? messageTextByID[messageID] : '';
  var start = {}; start[KEY_COMMAND] = 'message_detail_start'; enqueue(start);
  var chunks = utf8Chunks(text || '[This message contains no text]', 500, 30000);
  for (var i = 0; i < chunks.length; i++) {
    var chunk = {}; chunk[KEY_COMMAND] = 'message_detail_chunk'; chunk[KEY_DETAIL_TEXT] = chunks[i]; enqueue(chunk);
  }
  var end = {}; end[KEY_COMMAND] = 'message_detail_end'; enqueue(end);
}

function loadAttachment(attachmentID) {
  var url = gatewayURL(), token = gatewayToken();
  if (!url || !token || !attachmentID) { sendState('media_failed', 'Attachment unavailable'); return; }
  sendState('media_loading');
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '/v1/attachments/' + encodeURIComponent(attachmentID) + '/preview', true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.responseType = 'arraybuffer';
  xhr.timeout = 30000;
  xhr.onload = function() {
    if (xhr.status < 200 || xhr.status >= 300 || !xhr.response) { sendState('media_failed', 'Preview failed with ' + xhr.status); return; }
    var width = Number(xhr.getResponseHeader('X-Beepster-Width'));
    var height = Number(xhr.getResponseHeader('X-Beepster-Height'));
    var kindName = xhr.getResponseHeader('X-Beepster-Kind') || 'image';
    var kind = kindName === 'gif' ? 2 : (kindName === 'video' ? 3 : 1);
    var bytes = new Uint8Array(xhr.response);
    if (!width || !height || bytes.length !== width * height || bytes.length > 32400) { sendState('media_failed', 'Invalid watch preview'); return; }
    var start = {}; start[KEY_COMMAND] = 'media_start'; start[KEY_MEDIA_WIDTH] = width; start[KEY_MEDIA_HEIGHT] = height; start[KEY_MEDIA_TOTAL] = bytes.length; start[KEY_ATTACHMENT_KIND] = kind; enqueue(start);
    for (var offset = 0; offset < bytes.length; offset += 512) {
      var chunk = {}; chunk[KEY_COMMAND] = 'media_chunk'; chunk[KEY_MEDIA_OFFSET] = offset; chunk[KEY_MEDIA_BYTES] = Array.prototype.slice.call(bytes.subarray(offset, Math.min(offset + 512, bytes.length))); enqueue(chunk);
    }
    var end = {}; end[KEY_COMMAND] = 'media_end'; enqueue(end);
  };
  xhr.onerror = function() { sendState('media_failed', 'Preview unavailable'); };
  xhr.ontimeout = function() { sendState('media_failed', 'Preview timed out'); };
  xhr.send();
}

Pebble.addEventListener('ready', function() {
  sendQuickReplies();
  loadChats();
});

Pebble.addEventListener('showConfiguration', function() {
  var settingsURL = localStorage.getItem('beepster_settings_url') || DEFAULT_SETTINGS_URL || gatewayURL() + '/configure';
  if (!settingsURL || settingsURL === '/configure') {
    sendState('setup', 'Install a personally configured Beepster build');
    return;
  }
  var current = {
    gatewayURL: gatewayURL(),
    gatewayToken: gatewayToken(),
    theme: configuredTheme(),
    themes: configuredThemes(),
    quickReplies: configuredQuickReplies(),
    textSize: configuredTheme().textSize,
    refresh: Number(localStorage.getItem('beepster_refresh') || '180')
  };
  Pebble.openURL(settingsURL + '#' + encodeURIComponent(JSON.stringify(current)));
});

Pebble.addEventListener('webviewclosed', function(event) {
  if (!event.response) return;
  try {
    var settings = JSON.parse(decodeURIComponent(event.response));
    if (settings.gatewayURL) localStorage.setItem('beepster_gateway_url', settings.gatewayURL);
    if (settings.gatewayToken) localStorage.setItem('beepster_gateway_token', settings.gatewayToken);
    if (settings.theme) { localStorage.setItem('beepster_theme_json', JSON.stringify(normalizeTheme(settings.theme))); localStorage.setItem('beepster_theme', normalizeTheme(settings.theme).id); }
    if (settings.themes) localStorage.setItem('beepster_themes', JSON.stringify(settings.themes.slice(0,20)));
    if (settings.quickReplies && Array.isArray(settings.quickReplies)) localStorage.setItem('beepster_quick_replies', JSON.stringify(settings.quickReplies.slice(0,8)));
    if (settings.textSize) localStorage.setItem('beepster_text_size', settings.textSize);
    if (typeof settings.refresh === 'number') localStorage.setItem('beepster_refresh', String(settings.refresh));
    sendQuickReplies();
    loadChats();
  } catch (error) {
    sendState('error', 'Settings were not saved');
  }
});

Pebble.addEventListener('appmessage', function(event) {
  var payload = event.payload || {};
  var command = payload[KEY_COMMAND] || payload.COMMAND || payload.command;
  console.log('Beepster watch command=' + String(command || 'missing'));
  if (command === 'load_chats') loadChats();
  if (command === 'load_messages') loadMessages(payload[KEY_CHAT_ID] || payload.CHAT_ID || payload.chat_id || '');
  if (command === 'load_older_messages') loadOlderMessages(payload[KEY_CHAT_ID] || payload.CHAT_ID || payload.chat_id || '');
  if (command === 'send_reply') sendReply(payload[KEY_CHAT_ID] || payload.CHAT_ID || '', payload[KEY_REPLY_TEXT] || payload.REPLY_TEXT || '', payload[KEY_REPLY_REQUEST_ID] || payload.REPLY_REQUEST_ID || '');
  if (command === 'load_attachment') loadAttachment(payload[KEY_ATTACHMENT_ID] || payload.ATTACHMENT_ID || payload[KEY_CHAT_ID] || payload.CHAT_ID || '');
  if (command === 'load_message_detail') sendMessageDetail(payload[KEY_MSG_ID] || payload.MSG_ID || '');
  if (command === 'send_quick_reply') sendQuickReply(payload[KEY_CHAT_ID] || payload.CHAT_ID || '', Number(payload[KEY_INDEX] != null ? payload[KEY_INDEX] : payload.INDEX), payload[KEY_REPLY_REQUEST_ID] || payload.REPLY_REQUEST_ID || '');
});
