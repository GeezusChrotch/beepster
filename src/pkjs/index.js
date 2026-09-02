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

var queue = [];
var sending = false;
var DEFAULT_SETTINGS_URL = '';
var refreshTimer = null;

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

function selectedTheme() {
  var theme = localStorage.getItem('beepster_theme') || 'classic';
  if (theme !== 'classic' && theme !== 'dark' && theme !== 'ocean' && theme !== 'contrast') {
    return 'classic';
  }
  return theme;
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
  var message = {};
  message[KEY_COMMAND] = 'state';
  message[KEY_STATE] = state;
  message[KEY_THEME] = selectedTheme();
  message[KEY_TEXT_SIZE] = localStorage.getItem('beepster_text_size') || 'normal';
  if (error) message[KEY_ERROR] = safeSlice(error, 100);
  enqueue(message);
  if (state === 'error' || state === 'empty') scheduleRefresh();
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  var seconds = Number(localStorage.getItem('beepster_refresh') || '180');
  if (seconds > 0) refreshTimer = setTimeout(loadChats, Math.max(60, seconds) * 1000);
}

function request(path, callback) {
  var url = gatewayURL();
  var token = gatewayToken();
  if (!url || !token) {
    sendState('setup');
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url + path, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.timeout = 12000;
  xhr.onload = function() {
    if (xhr.status < 200 || xhr.status >= 300) {
      sendState('error', 'Gateway returned ' + xhr.status);
      return;
    }
    try {
      callback(JSON.parse(xhr.responseText));
    } catch (error) {
      sendState('error', 'Invalid gateway response');
    }
  };
  xhr.onerror = function() { sendState('error', 'Gateway unavailable'); };
  xhr.ontimeout = function() { sendState('error', 'Gateway timed out'); };
  xhr.send();
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

function loadMessages(chatID) {
  console.log('Beepster loading messages chatIDLength=' + String(chatID || '').length);
  sendState('loading');
  request('/v1/chats/' + encodeURIComponent(chatID) + '/messages?limit=12', function(data) {
    var items = data.items || [];
    if (items.length === 0) {
      sendState('empty');
      return;
    }
    for (var i = 0; i < items.length && i < 12; i++) {
      var item = items[i];
      var message = {};
      message[KEY_COMMAND] = 'message';
      message[KEY_INDEX] = i;
      message[KEY_TOTAL] = Math.min(items.length, 12);
      message[KEY_MSG_SENDER] = safeSlice(item.sender || 'Unknown', 44);
      message[KEY_MSG_TEXT] = safeSlice(item.text, 160);
      message[KEY_MSG_TIME] = safeSlice(item.time, 18);
      enqueue(message);
    }
    console.log('Beepster queued messages count=' + Math.min(items.length, 12));
    sendState('ready');
  });
}

Pebble.addEventListener('ready', function() {
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
    theme: selectedTheme(),
    textSize: localStorage.getItem('beepster_text_size') || 'normal',
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
    if (settings.theme) localStorage.setItem('beepster_theme', settings.theme);
    if (settings.textSize) localStorage.setItem('beepster_text_size', settings.textSize);
    if (typeof settings.refresh === 'number') localStorage.setItem('beepster_refresh', String(settings.refresh));
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
});
