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
var KEY_CHAT_PINNED = 35;

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
var SERVICE_IDS = ['apple_messages','beeper','discord','google_chat','google_messages','google_voice','instagram','line','linkedin','messenger','signal','slack','telegram','x','whatsapp','other'];

var queue = [];
var sending = false;
var DEMO_MODE = false;
var DEFAULT_SETTINGS_URL = 'https://geezuschrotch.github.io/beepster/setup/';
var refreshTimer = null;
var lastThemeSignature = '';
var chatLoadGeneration = 0;
var messageLoadGeneration = 0;
var attachmentLoadGeneration = 0;
var hasLoadedChats = false;
var messageTextByID = {};
var quickReplyCounter = 0;
var activeMessageChatID = '';
var messageHistory = [];
var oldestMessageCursor = '';
var hasOlderMessages = false;
var loadingOlderMessages = false;
var mergedChats = {};
var currentInboxChats = [];
var MAX_WATCH_CHATS = 30;
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

function utf8ByteLength(value) {
  var source = String(value || ''), total = 0;
  for (var i = 0; i < source.length; i++) {
    var code = source.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < source.length) { total += 4; i++; }
    else if (code < 0x80) total++;
    else if (code < 0x800) total += 2;
    else total += 3;
  }
  return total;
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

function configuredServices() {
  try {
    var saved = JSON.parse(localStorage.getItem('beepster_services') || 'null');
    if (Array.isArray(saved)) return saved.filter(function(value, index) {
      return SERVICE_IDS.indexOf(value) !== -1 && saved.indexOf(value) === index;
    });
  } catch (error) {}
  return SERVICE_IDS.slice();
}

function configuredPinnedChats() {
  try {
    var saved = JSON.parse(localStorage.getItem('beepster_pinned_chats') || '[]');
    if (Array.isArray(saved)) return saved.map(function(value) {
      return String(value || '').trim();
    }).filter(function(value, index, values) {
      return value && values.indexOf(value) === index;
    }).slice(0, MAX_WATCH_CHATS);
  } catch (error) {}
  return [];
}

function applyPinnedChats(items) {
  var pinned = configuredPinnedChats(), byID = {}, output = [];
  items.forEach(function(chat) { if (chat && chat.id) byID[chat.id] = chat; });
  pinned.forEach(function(chatID) { if (byID[chatID]) output.push(byID[chatID]); });
  items.forEach(function(chat) {
    if (chat && pinned.indexOf(chat.id) === -1) output.push(chat);
  });
  return output;
}

function sendChatList(items) {
  var pinned = configuredPinnedChats();
  items = applyPinnedChats(items).slice(0, MAX_WATCH_CHATS);
  discardQueuedCommands(['chat', 'chats_ready']);
  if (items.length === 0) {
    var empty = {}; empty[KEY_COMMAND] = 'chats_ready'; empty[KEY_TOTAL] = 0; enqueue(empty);
    return;
  }
  for (var i = 0; i < items.length; i++) {
    var chat = items[i], message = {};
    message[KEY_COMMAND] = 'chat';
    message[KEY_INDEX] = i;
    message[KEY_TOTAL] = items.length;
    message[KEY_CHAT_ID] = safeSlice(chat.id, 120);
    message[KEY_CHAT_NAME] = safeSlice(chat.name || 'Unknown contact', 56);
    message[KEY_CHAT_PREVIEW] = safeSlice(chat.preview, 110);
    message[KEY_UNREAD] = Number(chat.unreadCount || 0);
    message[KEY_NETWORK] = safeSlice(chat.network, 20);
    message[KEY_CHAT_PINNED] = pinned.indexOf(chat.id) !== -1 ? 1 : 0;
    enqueue(message);
  }
  var ready = {}; ready[KEY_COMMAND] = 'chats_ready'; ready[KEY_TOTAL] = items.length; enqueue(ready);
}

function setChatPinned(chatID, shouldPin) {
  chatID = String(chatID || '').trim();
  if (!chatID) return;
  var pinned = configuredPinnedChats().filter(function(value) { return value !== chatID; });
  if (shouldPin) pinned.unshift(chatID);
  localStorage.setItem('beepster_pinned_chats', JSON.stringify(pinned.slice(0, MAX_WATCH_CHATS)));
  if (currentInboxChats.length) sendChatList(currentInboxChats);
  else loadChats();
}

function serviceID(network) {
  var value = String(network || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (/imessage|apple messages/.test(value)) return 'apple_messages';
  if (/beeper|matrix/.test(value)) return 'beeper';
  if (/discord/.test(value)) return 'discord';
  if (/google chat|hangouts/.test(value)) return 'google_chat';
  if (/google messages|android messages|\brcs\b/.test(value)) return 'google_messages';
  if (/google voice/.test(value)) return 'google_voice';
  if (/instagram/.test(value)) return 'instagram';
  if (/linkedin/.test(value)) return 'linkedin';
  if (/facebook|messenger/.test(value)) return 'messenger';
  if (/signal/.test(value)) return 'signal';
  if (/slack/.test(value)) return 'slack';
  if (/telegram/.test(value)) return 'telegram';
  if (/twitter|^x$|x twitter/.test(value)) return 'x';
  if (/whatsapp/.test(value)) return 'whatsapp';
  if (/^line$|line messenger/.test(value)) return 'line';
  return 'other';
}

function serviceEnabled(network, enabled) {
  return enabled.indexOf(serviceID(network)) !== -1;
}

function configuredAppleAliases() {
  var aliases = {};
  try {
    var saved = JSON.parse(localStorage.getItem('beepster_apple_aliases') || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      Object.keys(saved).slice(0, 100).forEach(function(chatID) {
        var name = String(saved[chatID] || '').trim();
        if (chatID && name) aliases[chatID] = name.slice(0, 56);
      });
    }
  } catch (error) {}
  return aliases;
}

function stableMergedChatID(chatIDs) {
  var source = chatIDs.slice().sort().join('|'), hash = 5381;
  for (var i = 0; i < source.length; i++) {
    hash = ((hash << 5) + hash) ^ source.charCodeAt(i);
  }
  return 'beepster-merged-' + (hash >>> 0).toString(16);
}

function rememberAppleCandidates(items) {
  var aliases = configuredAppleAliases();
  var candidates = items.filter(function(chat) { return serviceID(chat.network) === 'apple_messages'; })
    .slice(0, 50).map(function(chat) {
      return {id:String(chat.id || ''),label:String(chat.name || 'Apple conversation').slice(0,80),alias:aliases[chat.id] || ''};
    }).filter(function(chat) { return chat.id; });
  localStorage.setItem('beepster_apple_candidates', JSON.stringify(candidates));
}

function configuredAppleCandidates() {
  try {
    var candidates = JSON.parse(localStorage.getItem('beepster_apple_candidates') || '[]');
    if (Array.isArray(candidates)) return candidates.slice(0, 50);
  } catch (error) {}
  return [];
}

function applyAppleAliases(items) {
  var aliases = configuredAppleAliases(), groups = {}, output = [];
  mergedChats = {};
  items.forEach(function(chat) {
    var alias = serviceID(chat.network) === 'apple_messages' ? aliases[chat.id] : '';
    if (!alias) { output.push(chat); return; }
    var key = alias.toLowerCase();
    if (!groups[key]) groups[key] = {name:alias,items:[]};
    groups[key].items.push(chat);
  });
  Object.keys(groups).forEach(function(key) {
    var group = groups[key];
    if (group.items.length === 1) {
      group.items[0].name = group.name;
      output.push(group.items[0]);
      return;
    }
    var memberIDs = group.items.map(function(chat) { return chat.id; });
    var virtualID = stableMergedChatID(memberIDs), primary = group.items[0], unread = 0;
    group.items.forEach(function(chat) { unread += Number(chat.unreadCount || 0); });
    mergedChats[virtualID] = {members:memberIDs,primary:primary.id,name:group.name};
    output.push({id:virtualID,name:group.name,network:'iMessage',unreadCount:unread,preview:primary.preview,timestamp:primary.timestamp});
  });
  output.sort(function(a,b) {
    function sourceIndex(item) {
      for (var index = 0; index < items.length; index++) {
        if (items[index].id === item.id || (mergedChats[item.id] && mergedChats[item.id].members.indexOf(items[index].id) !== -1)) return index;
      }
      return items.length;
    }
    var ai = sourceIndex(a), bi = sourceIndex(b);
    return ai - bi;
  });
  return output;
}

function routedChatID(chatID) {
  return mergedChats[chatID] ? mergedChats[chatID].primary : chatID;
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
  var replies = DEMO_MODE ? ['Sounds good!', 'On my way', 'Thank you!', 'Call you soon'] : configuredQuickReplies();
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

function discardQueuedCommands(commands) {
  var keepFirst = sending && queue.length > 0;
  var first = keepFirst ? queue[0] : null;
  var remaining = queue.slice(keepFirst ? 1 : 0).filter(function(item) {
    return commands.indexOf(item.message[KEY_COMMAND]) === -1;
  });
  queue = first ? [first].concat(remaining) : remaining;
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
      lastThemeSignature = '';
      sendState('error', 'Watch transport failed');
      return;
    }
    setTimeout(drain, 500);
  });
}

function addTheme(message, forceTheme) {
  var theme = DEMO_MODE ? normalizeTheme(BUILT_IN_THEMES[0]) : configuredTheme();
  var themeSignature = JSON.stringify(theme);
  if (forceTheme || themeSignature !== lastThemeSignature) {
    message[KEY_THEME] = theme.id;
    message[KEY_TEXT_SIZE] = theme.textSize || localStorage.getItem('beepster_text_size') || 'normal';
    message[KEY_THEME_BACKGROUND] = pebbleColor(theme.background);
    message[KEY_THEME_TEXT] = pebbleColor(theme.text);
    message[KEY_THEME_MUTED] = pebbleColor(theme.muted);
    message[KEY_THEME_ACCENT] = pebbleColor(theme.accent);
    message[KEY_THEME_ACCENT_TEXT] = pebbleColor(theme.accentText);
    message[KEY_THEME_FONT] = THEME_FONTS[theme.font] || 5;
    message[KEY_THEME_SIZE] = theme.size || 22;
    lastThemeSignature = themeSignature;
  }
}

function sendState(state, error, forceTheme) {
  var message = {};
  message[KEY_COMMAND] = 'state';
  message[KEY_STATE] = state;
  addTheme(message, forceTheme);
  if (error) message[KEY_ERROR] = safeSlice(error, 100);
  enqueue(message);
  if (state === 'error' || state === 'empty') scheduleRefresh();
}

function sendTheme() {
  var message = {};
  message[KEY_COMMAND] = 'theme';
  addTheme(message, true);
  enqueue(message);
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

function sendRequest(path, body, callback) {
  var url = gatewayURL();
  var token = gatewayToken();
  if (!url || !token) {
    console.log('Beepster reply request blocked: gateway configuration missing');
    sendState('reply_failed', 'Gateway not configured');
    return;
  }
  var completed = false;
  var fallbackStarted = false;
  var fallbackTimer = null;
  var deadlineTimer = null;

  function finish(data) {
    if (completed) return;
    completed = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (deadlineTimer) clearTimeout(deadlineTimer);
    callback(data);
  }

  function fail(message) {
    if (completed) return;
    completed = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (deadlineTimer) clearTimeout(deadlineTimer);
    sendState('reply_retryable', message || 'Could not send reply');
  }

  function parseResponse(request, transport) {
    console.log('Beepster reply ' + transport + ' completed HTTP ' + request.status);
    if (request.status < 200 || request.status >= 300) {
      if (transport === 'POST' && request.status >= 500) { startFallback(); return; }
      fail('Send failed with ' + request.status);
      return;
    }
    try { finish(JSON.parse(request.responseText)); }
    catch (error) { fail('Invalid send response'); }
  }

  function startFallback() {
    if (completed || fallbackStarted) return;
    fallbackStarted = true;
    console.log('Beepster reply falling back to compatible GET transport');
    var fallback = new XMLHttpRequest();
    fallback.open('GET', url + path.replace(/\/messages$/, '/reply'), true);
    fallback.setRequestHeader('Authorization', 'Bearer ' + token);
    fallback.setRequestHeader('X-Beepster-Reply-Text', encodeURIComponent(String(body.text || '')));
    fallback.setRequestHeader('X-Beepster-Request-ID', String(body.requestID || ''));
    fallback.timeout = 10000;
    fallback.onload = function() { parseResponse(fallback, 'GET'); };
    fallback.onerror = function() { fail('Gateway unavailable'); };
    fallback.ontimeout = function() { fail('Send timed out'); };
    fallback.send();
  }

  // POST is the canonical Beepster transport and maps directly to Beeper's
  // documented endpoint. Some Pebble iOS runtimes have failed to complete a
  // POST callback, so retry the same idempotent request over the already-used
  // authenticated GET channel if no response arrives promptly.
  console.log('Beepster reply POST started');
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url + path, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.timeout = 12000;
  xhr.onload = function() { parseResponse(xhr, 'POST'); };
  xhr.onerror = startFallback;
  xhr.ontimeout = startFallback;
  xhr.send(JSON.stringify(body));
  fallbackTimer = setTimeout(startFallback, 5000);
  deadlineTimer = setTimeout(function() { fail('No delivery response; retry safely'); }, 18000);
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
    if (attempt >= 9) { sendState('reply_retryable', error || 'Could not confirm delivery'); return; }
    setTimeout(function() { pollReply(chatID, pendingMessageID, attempt + 1); }, 1500);
  });
}

function sendReply(chatID, text, requestID) {
  if (!chatID || !text) { sendState('reply_failed', 'Reply data missing'); return; }
  chatID = routedChatID(chatID);
  if (!requestID) {
    quickReplyCounter++;
    requestID = 'reply-' + Date.now() + '-' + quickReplyCounter;
  }
  sendState('reply_sending');
  sendRequest('/v1/chats/' + encodeURIComponent(chatID) + '/messages', {text:text,requestID:requestID}, function(data) {
    if (!data.pendingMessageID) { sendState('reply_failed', 'Beeper did not return a message ID'); return; }
    sendState('reply_pending');
    pollReply(chatID, data.pendingMessageID, 0);
  });
}

function sendQuickReply(chatID, index, requestID, watchText) {
  var replies = configuredQuickReplies();
  var text = index >= 0 && index < replies.length ? replies[index] : String(watchText || '').trim();
  console.log('Beepster quick reply index=' + index + ' configured=' + replies.length + ' fallback=' + Boolean(watchText));
  if (!text) { sendState('reply_failed', 'Quick reply unavailable'); return; }
  if (!requestID) {
    quickReplyCounter++;
    requestID = 'quick-' + Date.now() + '-' + quickReplyCounter;
  }
  sendReply(chatID, text, requestID);
}

function loadChats() {
  if (DEMO_MODE) { loadDemoChats(); return; }
  var generation = ++chatLoadGeneration;
  var enabledServices = configuredServices();
  // Keep enough recent Apple destinations on the phone for the Settings linker,
  // even though only thirty conversations are transferred to the watch.
  var requestLimit = 50;
  if (!hasLoadedChats) sendState('loading');
  request('/v1/chats?limit=' + requestLimit, function(data) {
    if (generation !== chatLoadGeneration) { scheduleRefresh(); return; }
    rememberAppleCandidates(data.items || []);
    var items = (data.items || []).filter(function(chat) {
      return serviceEnabled(chat.network, enabledServices);
    });
    currentInboxChats = applyAppleAliases(items);
    sendChatList(currentInboxChats);
    hasLoadedChats = true;
    scheduleRefresh();
  }, function(error) {
    if (generation !== chatLoadGeneration) { scheduleRefresh(); return; }
    if (!hasLoadedChats) sendState('error', error);
    else console.log('Beepster background chat refresh failed: ' + error);
    scheduleRefresh();
  });
}

function loadDemoChats() {
  var items = [
    {id:'demo-avery',name:'Avery',preview:'The release guide looks great!',unreadCount:2,network:'Signal'},
    {id:'demo-family',name:'Family group',preview:'Dinner at seven?',unreadCount:1,network:'WhatsApp'},
    {id:'demo-design',name:'Design team',preview:'New icon approved',unreadCount:0,network:'Slack'}
  ];
  sendState('loading');
  currentInboxChats = items;
  sendChatList(currentInboxChats);
  hasLoadedChats = true;
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
  if (DEMO_MODE) { loadDemoMessages(chatID); return; }
  console.log('Beepster loading messages chatIDLength=' + String(chatID || '').length);
  var generation = ++messageLoadGeneration;
  chatLoadGeneration++;
  discardQueuedCommands(['chat', 'chats_ready', 'messages_start', 'messages_prepend_start', 'message', 'messages_ready', 'message_history_failed', 'message_detail_start', 'message_detail_chunk', 'message_detail_end', 'media_start', 'media_chunk', 'media_end', 'media_failed']);
  activeMessageChatID = chatID;
  messageHistory = [];
  oldestMessageCursor = '';
  hasOlderMessages = false;
  loadingOlderMessages = false;
  messageTextByID = {};
  sendState('loading');
  if (mergedChats[chatID]) {
    loadMergedMessages(chatID, mergedChats[chatID], generation);
    return;
  }
  request('/v1/chats/' + encodeURIComponent(chatID) + '/messages?limit=12', function(data) {
    if (generation !== messageLoadGeneration || chatID !== activeMessageChatID) return;
    var items = (data.items || []).slice(0, MAX_WATCH_MESSAGES);
    if (items.length === 0) { sendState('empty'); return; }
    messageHistory = items;
    oldestMessageCursor = data.nextCursor || '';
    hasOlderMessages = Boolean(data.hasMore && oldestMessageCursor && messageHistory.length < MAX_WATCH_MESSAGES);
    var start = {}; start[KEY_COMMAND] = 'messages_start'; start[KEY_TOTAL] = items.length; enqueue(start);
    for (var i = 0; i < items.length; i++) queueMessage(items[i], i, items.length);
    finishMessageBatch('initial', items.length - 1);
    console.log('Beepster queued newest messages count=' + items.length);
  }, function(error) {
    if (generation === messageLoadGeneration && chatID === activeMessageChatID) sendState('error', error);
  });
}

function loadMergedMessages(chatID, merged, generation) {
  var remaining = merged.members.length, combined = [], failed = false;
  function complete() {
    remaining--;
    if (remaining > 0 || generation !== messageLoadGeneration || chatID !== activeMessageChatID) return;
    if (failed && combined.length === 0) { sendState('error', 'Merged Apple history unavailable'); return; }
    combined.sort(function(a,b) {
      var aTime = Date.parse(a.timestamp || '') || 0;
      var bTime = Date.parse(b.timestamp || '') || 0;
      return aTime - bTime;
    });
    var items = combined.slice(-MAX_WATCH_MESSAGES);
    if (!items.length) { sendState('empty'); return; }
    messageHistory = items;
    hasOlderMessages = false;
    var start = {}; start[KEY_COMMAND] = 'messages_start'; start[KEY_TOTAL] = items.length; enqueue(start);
    for (var i = 0; i < items.length; i++) queueMessage(items[i], i, items.length);
    finishMessageBatch('initial', items.length - 1);
    console.log('Beepster queued merged Apple messages count=' + items.length + ' sources=' + merged.members.length);
  }
  merged.members.forEach(function(memberID, memberIndex) {
    request('/v1/chats/' + encodeURIComponent(memberID) + '/messages?limit=60', function(data) {
      (data.items || []).forEach(function(item) {
        var copy = Object.assign({}, item);
        copy.id = 'm' + memberIndex + '-' + String(item.id || 'message');
        combined.push(copy);
      });
      complete();
    }, function() { failed = true; complete(); });
  });
}

function loadDemoMessages(chatID) {
  activeMessageChatID = chatID;
  messageTextByID = {};
  messageHistory = [
    {id:'demo-message-1',sender:'Avery',text:'Morning! The new Beepster icon looks great on the watch.',time:'9:38 AM'},
    {id:'demo-message-2',sender:'Me',text:'Thanks! Complete messages stay in the thread now, with simple two-line scrolling.',time:'9:40 AM'},
    {id:'demo-message-3',sender:'Avery',text:'Perfect. Voice dictation and quick replies make this genuinely useful from the wrist.',time:'9:41 AM'}
  ];
  var start = {}; start[KEY_COMMAND] = 'messages_start'; start[KEY_TOTAL] = messageHistory.length; enqueue(start);
  for (var i = 0; i < messageHistory.length; i++) queueMessage(messageHistory[i], i, messageHistory.length);
  hasOlderMessages = false;
  finishMessageBatch('initial', messageHistory.length - 1);
}

function loadOlderMessages(chatID) {
  if (DEMO_MODE) { finishMessageBatch('older', 0); return; }
  if (loadingOlderMessages || !hasOlderMessages || chatID !== activeMessageChatID) return;
  var remaining = MAX_WATCH_MESSAGES - messageHistory.length;
  if (remaining <= 0) { hasOlderMessages = false; finishMessageBatch('older', 0); return; }
  loadingOlderMessages = true;
  var generation = messageLoadGeneration;
  var limit = Math.min(12, remaining);
  var path = '/v1/chats/' + encodeURIComponent(chatID) + '/messages?limit=' + limit + '&cursor=' + encodeURIComponent(oldestMessageCursor) + '&direction=before';
  request(path, function(data) {
    if (generation !== messageLoadGeneration || chatID !== activeMessageChatID) return;
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
    if (generation !== messageLoadGeneration || chatID !== activeMessageChatID) return;
    loadingOlderMessages = false;
    var failed = {}; failed[KEY_COMMAND] = 'message_history_failed'; failed[KEY_ERROR] = safeSlice(error, 100); enqueue(failed);
  });
}

function sendMessageDetail(messageID) {
  discardQueuedCommands(['message_detail_start', 'message_detail_chunk', 'message_detail_end']);
  var text = Object.prototype.hasOwnProperty.call(messageTextByID, messageID) ? messageTextByID[messageID] : '';
  var chunks = utf8Chunks(text || '[This message contains no text]', 500, 30000);
  var completeText = chunks.join('');
  var start = {}; start[KEY_COMMAND] = 'message_detail_start'; start[KEY_MSG_ID] = messageID; start[KEY_TOTAL] = utf8ByteLength(completeText); enqueue(start);
  for (var i = 0; i < chunks.length; i++) {
    var chunk = {}; chunk[KEY_COMMAND] = 'message_detail_chunk'; chunk[KEY_MSG_ID] = messageID; chunk[KEY_DETAIL_TEXT] = chunks[i]; enqueue(chunk);
  }
  var end = {}; end[KEY_COMMAND] = 'message_detail_end'; end[KEY_MSG_ID] = messageID; enqueue(end);
}

function base64Bytes(value) {
  var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var clean = String(value || '').replace(/[^A-Za-z0-9+/=]/g, '');
  var output = [];
  for (var offset = 0; offset < clean.length; offset += 4) {
    var a = alphabet.indexOf(clean.charAt(offset));
    var b = alphabet.indexOf(clean.charAt(offset + 1));
    var c = alphabet.indexOf(clean.charAt(offset + 2));
    var d = alphabet.indexOf(clean.charAt(offset + 3));
    if (a < 0 || b < 0) break;
    output.push((a << 2) | (b >> 4));
    if (c >= 0) output.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) output.push(((c & 3) << 6) | d);
  }
  return output;
}

function loadAttachment(attachmentID) {
  var generation = ++attachmentLoadGeneration;
  discardQueuedCommands(['media_start', 'media_chunk', 'media_end', 'media_failed']);
  var url = gatewayURL(), token = gatewayToken();
  function fail(message) {
    if (generation !== attachmentLoadGeneration) return;
    var failed = {}; failed[KEY_COMMAND] = 'media_failed'; failed[KEY_ATTACHMENT_ID] = attachmentID; failed[KEY_ERROR] = message; enqueue(failed);
  }
  if (!url || !token || !attachmentID) { fail('Attachment unavailable'); return; }
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + '/v1/attachments/' + encodeURIComponent(attachmentID) + '/preview?format=json', true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.timeout = 30000;
  xhr.onload = function() {
    if (generation !== attachmentLoadGeneration) return;
    if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) { fail('Preview failed with ' + xhr.status); return; }
    var preview;
    try { preview = JSON.parse(xhr.responseText); }
    catch (error) { fail('Invalid preview response'); return; }
    var width = Number(preview.width);
    var height = Number(preview.height);
    var kind = preview.kind === 'gif' ? 2 : (preview.kind === 'video' ? 3 : 1);
    var bytes = base64Bytes(preview.pixels);
    console.log('Beepster preview dimensions=' + width + 'x' + height + ' bytes=' + bytes.length + ' kind=' + kind);
    if (!width || !height || bytes.length !== width * height || bytes.length > 32400) { fail('Invalid watch preview'); return; }
    var start = {}; start[KEY_COMMAND] = 'media_start'; start[KEY_ATTACHMENT_ID] = attachmentID; start[KEY_MEDIA_WIDTH] = width; start[KEY_MEDIA_HEIGHT] = height; start[KEY_MEDIA_TOTAL] = bytes.length; start[KEY_ATTACHMENT_KIND] = kind; enqueue(start);
    for (var offset = 0; offset < bytes.length; offset += 512) {
      var chunkBytes = [];
      var chunkEnd = Math.min(offset + 512, bytes.length);
      for (var byteIndex = offset; byteIndex < chunkEnd; byteIndex++) chunkBytes.push(bytes[byteIndex]);
      var chunk = {}; chunk[KEY_COMMAND] = 'media_chunk'; chunk[KEY_ATTACHMENT_ID] = attachmentID; chunk[KEY_MEDIA_OFFSET] = offset; chunk[KEY_MEDIA_BYTES] = chunkBytes; enqueue(chunk);
    }
    var end = {}; end[KEY_COMMAND] = 'media_end'; end[KEY_ATTACHMENT_ID] = attachmentID; enqueue(end);
  };
  xhr.onerror = function() { fail('Preview unavailable'); };
  xhr.ontimeout = function() { fail('Preview timed out'); };
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
    services: configuredServices(),
    appleAliases: configuredAppleAliases(),
    appleCandidates: configuredAppleCandidates(),
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
    if (Array.isArray(settings.services)) localStorage.setItem('beepster_services', JSON.stringify(settings.services.filter(function(value) { return SERVICE_IDS.indexOf(value) !== -1; })));
    if (settings.appleAliases && typeof settings.appleAliases === 'object') localStorage.setItem('beepster_apple_aliases', JSON.stringify(settings.appleAliases));
    if (settings.textSize) localStorage.setItem('beepster_text_size', settings.textSize);
    if (typeof settings.refresh === 'number') localStorage.setItem('beepster_refresh', String(settings.refresh));
    lastThemeSignature = '';
    sendQuickReplies();
    sendTheme();
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
  if (command === 'set_chat_pinned') setChatPinned(
    payload[KEY_CHAT_ID] || payload.CHAT_ID || payload.chat_id || '',
    Number((payload[KEY_CHAT_PINNED] != null ? payload[KEY_CHAT_PINNED] : payload.CHAT_PINNED) || 0) !== 0
  );
  if (command === 'load_messages') loadMessages(payload[KEY_CHAT_ID] || payload.CHAT_ID || payload.chat_id || '');
  if (command === 'load_older_messages') loadOlderMessages(payload[KEY_CHAT_ID] || payload.CHAT_ID || payload.chat_id || '');
  if (command === 'send_reply') sendReply(payload[KEY_CHAT_ID] || payload.CHAT_ID || '', payload[KEY_REPLY_TEXT] || payload.REPLY_TEXT || '', payload[KEY_REPLY_REQUEST_ID] || payload.REPLY_REQUEST_ID || '');
  if (command === 'load_attachment') loadAttachment(payload[KEY_ATTACHMENT_ID] || payload.ATTACHMENT_ID || payload[KEY_CHAT_ID] || payload.CHAT_ID || '');
  if (command === 'load_message_detail') sendMessageDetail(payload[KEY_MSG_ID] || payload.MSG_ID || '');
  if (command === 'load_message_content') {
    sendMessageDetail(payload[KEY_MSG_ID] || payload.MSG_ID || '');
    var attachmentID = payload[KEY_ATTACHMENT_ID] || payload.ATTACHMENT_ID || '';
    if (attachmentID) loadAttachment(attachmentID);
  }
  if (command === 'send_quick_reply') sendQuickReply(payload[KEY_CHAT_ID] || payload.CHAT_ID || '', Number(payload[KEY_INDEX] != null ? payload[KEY_INDEX] : payload.INDEX), payload[KEY_REPLY_REQUEST_ID] || payload.REPLY_REQUEST_ID || '', payload[KEY_QUICK_REPLY_TEXT] || payload.QUICK_REPLY_TEXT || '');
});
