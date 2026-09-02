#include <pebble.h>

#define MAX_CHATS 12
#define MAX_MESSAGES 12
#define CHAT_ID_LEN 128
#define CHAT_NAME_LEN 64
#define CHAT_PREVIEW_LEN 128
#define MESSAGE_SENDER_LEN 48
#define MESSAGE_TEXT_LEN 256
#define MESSAGE_TIME_LEN 20
#define MESSAGE_ATTACHMENT_LEN 32
#define PERSIST_THEME 100
#define PERSIST_TEXT_SIZE 101
#define PERSIST_THEME_DATA 102

typedef enum {
  VIEW_SETUP,
  VIEW_LOADING,
  VIEW_READY,
  VIEW_EMPTY,
  VIEW_ERROR,
  VIEW_REPLY_SENDING,
  VIEW_REPLY_PENDING,
  VIEW_REPLY_SENT,
  VIEW_REPLY_RETRYABLE
} ViewState;

typedef struct {
  char id[CHAT_ID_LEN];
  char name[CHAT_NAME_LEN];
  char preview[CHAT_PREVIEW_LEN];
  char network[24];
  int unread;
} Chat;

typedef struct {
  char sender[MESSAGE_SENDER_LEN];
  char text[MESSAGE_TEXT_LEN];
  char time[MESSAGE_TIME_LEN];
  char attachment_id[MESSAGE_ATTACHMENT_LEN];
  uint8_t attachment_kind;
} Message;

typedef struct {
  GColor background;
  GColor text;
  GColor muted;
  GColor accent;
  GColor accent_text;
} Theme;

typedef struct {
  uint8_t background;
  uint8_t text;
  uint8_t muted;
  uint8_t accent;
  uint8_t accent_text;
  uint8_t font;
} PersistedTheme;

static Theme s_theme = {
  .background = GColorWhite,
  .text = GColorBlack,
  .muted = GColorDarkGray,
  .accent = GColorDukeBlue,
  .accent_text = GColorWhite
};
static bool s_large_text;
static uint8_t s_font_style;

static Window *s_main_window;
static MenuLayer *s_chat_menu;
static TextLayer *s_status_layer;
static ViewState s_chat_state = VIEW_LOADING;
static Chat s_chats[MAX_CHATS];
static int s_chat_count;

static Window *s_message_window;
static MenuLayer *s_message_menu;
static TextLayer *s_message_status_layer;
static ViewState s_message_state = VIEW_LOADING;
static Message s_messages[MAX_MESSAGES];
static int s_message_count;
static char s_active_chat_id[CHAT_ID_LEN];
static char s_active_chat_name[CHAT_NAME_LEN];
static DictationSession *s_dictation_session;
static char s_reply_text[512];
static char s_reply_request_id[48];
static AppTimer *s_load_watchdog;
static AppTimer *s_message_request_timer;
static int s_message_command_attempts;
static Window *s_media_window;
static BitmapLayer *s_media_layer;
static TextLayer *s_media_status_layer;
static GBitmap *s_media_bitmap;
static uint8_t *s_media_pixels;
static size_t s_media_total;
static size_t s_media_received;
static int16_t s_media_width;
static int16_t s_media_height;
static uint8_t s_media_kind;

static void main_clicks(void *context);
static void message_clicks(void *context);
static void apply_theme_to_layers(void);
static void set_status(TextLayer *layer, ViewState state, bool messages);

static void clear_media(void) {
  if (s_media_bitmap) {
    if (s_media_layer) bitmap_layer_set_bitmap(s_media_layer, NULL);
    gbitmap_destroy(s_media_bitmap);
    s_media_bitmap = NULL;
  }
  if (s_media_pixels) {
    free(s_media_pixels);
    s_media_pixels = NULL;
  }
  s_media_total = 0;
  s_media_received = 0;
}

static void cancel_load_watchdog(void) {
  if (s_load_watchdog) {
    app_timer_cancel(s_load_watchdog);
    s_load_watchdog = NULL;
  }
}

static void load_watchdog(void *context) {
  s_load_watchdog = NULL;
  if (s_message_window && window_stack_get_top_window() == s_message_window && s_message_state == VIEW_LOADING) {
    s_message_state = VIEW_ERROR;
    set_status(s_message_status_layer, s_message_state, true);
    window_set_click_config_provider(s_message_window, message_clicks);
    APP_LOG(APP_LOG_LEVEL_ERROR, "message load watchdog expired");
  }
}

static void copy_text(char *destination, size_t size, const char *source) {
  if (!destination || size == 0) return;
  snprintf(destination, size, "%s", source ? source : "");
}

static const char *state_text(ViewState state, bool messages) {
  switch (state) {
    case VIEW_SETUP: return "Gateway not configured\nSee README \U0001F603";
    case VIEW_LOADING: return messages ? "Loading messages…" : "Loading chats…";
    case VIEW_EMPTY: return messages ? "No messages yet\nPress Select to retry" : "No recent chats\nPress Select to retry";
    case VIEW_ERROR: return "Could not connect\nPress Select to retry";
    case VIEW_REPLY_SENDING: return "Sending reply…";
    case VIEW_REPLY_PENDING: return "Waiting for delivery…";
    case VIEW_REPLY_SENT: return "Reply sent ✓\nPress Back";
    case VIEW_REPLY_RETRYABLE: return "Reply failed\nPress Select to retry";
    case VIEW_READY: return "";
  }
  return "";
}

static void set_status(TextLayer *layer, ViewState state, bool messages) {
  if (!layer) return;
  text_layer_set_background_color(layer, s_theme.background);
  text_layer_set_text_color(layer, s_theme.text);
  text_layer_set_text(layer, state_text(state, messages));
  layer_set_hidden(text_layer_get_layer(layer), state == VIEW_READY);
}

static void select_theme(const char *name) {
  if (name && strcmp(name, "dark") == 0) {
    s_theme = (Theme) { GColorBlack, GColorWhite, GColorLightGray, GColorVividCerulean, GColorBlack };
  } else if (name && strcmp(name, "ocean") == 0) {
    s_theme = (Theme) { GColorOxfordBlue, GColorWhite, GColorCeleste, GColorVividCerulean, GColorBlack };
  } else if (name && strcmp(name, "contrast") == 0) {
    s_theme = (Theme) { GColorWhite, GColorBlack, GColorBlack, GColorBlack, GColorWhite };
  } else {
    s_theme = (Theme) { GColorWhite, GColorBlack, GColorDarkGray, GColorDukeBlue, GColorWhite };
  }
  if (name && name[0]) persist_write_string(PERSIST_THEME, name);
  apply_theme_to_layers();
}

static void apply_theme_to_layers(void) {
  if (s_main_window) window_set_background_color(s_main_window, s_theme.background);
  if (s_message_window) window_set_background_color(s_message_window, s_theme.background);
  if (s_chat_menu) {
    menu_layer_set_normal_colors(s_chat_menu, s_theme.background, s_theme.text);
    menu_layer_set_highlight_colors(s_chat_menu, s_theme.accent, s_theme.accent_text);
    layer_mark_dirty(menu_layer_get_layer(s_chat_menu));
  }
  if (s_message_menu) {
    menu_layer_set_normal_colors(s_message_menu, s_theme.background, s_theme.text);
    menu_layer_set_highlight_colors(s_message_menu, s_theme.accent, s_theme.accent_text);
    layer_mark_dirty(menu_layer_get_layer(s_message_menu));
  }
  set_status(s_status_layer, s_chat_state, false);
  set_status(s_message_status_layer, s_message_state, true);
}

static GFont title_font(void) {
  if (s_font_style == 1) return fonts_get_system_font(FONT_KEY_ROBOTO_CONDENSED_21);
  if (s_font_style == 2) return fonts_get_system_font(FONT_KEY_BITHAM_30_BLACK);
  return fonts_get_system_font(s_large_text ? FONT_KEY_GOTHIC_28_BOLD : FONT_KEY_GOTHIC_24_BOLD);
}

static GFont body_font(void) {
  if (s_font_style == 1) return fonts_get_system_font(FONT_KEY_ROBOTO_CONDENSED_21);
  return fonts_get_system_font(s_large_text ? FONT_KEY_GOTHIC_24 : FONT_KEY_GOTHIC_18);
}

static void persist_current_theme(void) {
  PersistedTheme saved = {s_theme.background.argb, s_theme.text.argb, s_theme.muted.argb,
                          s_theme.accent.argb, s_theme.accent_text.argb, s_font_style};
  persist_write_data(PERSIST_THEME_DATA, &saved, sizeof(saved));
}

static bool request_command(const char *command, const char *chat_id) {
  DictionaryIterator *iterator;
  AppMessageResult result = app_message_outbox_begin(&iterator);
  if (result != APP_MSG_OK || !iterator) {
    APP_LOG(APP_LOG_LEVEL_WARNING, "outbox begin failed=%d", result);
    return false;
  }
  dict_write_cstring(iterator, MESSAGE_KEY_COMMAND, command);
  if (chat_id && chat_id[0]) dict_write_cstring(iterator, MESSAGE_KEY_CHAT_ID, chat_id);
  result = app_message_outbox_send();
  if (result != APP_MSG_OK) APP_LOG(APP_LOG_LEVEL_WARNING, "outbox send failed=%d", result);
  return result == APP_MSG_OK;
}

static void request_chats(void) {
  s_chat_state = VIEW_LOADING;
  s_chat_count = 0;
  set_status(s_status_layer, s_chat_state, false);
  if (s_chat_menu) menu_layer_reload_data(s_chat_menu);
  if (s_main_window) window_set_click_config_provider(s_main_window, main_clicks);
  (void)request_command("load_chats", NULL);
}

static void message_command_retry(void *context) {
  s_message_request_timer = NULL;
  s_message_command_attempts++;
  if (!request_command("load_messages", s_active_chat_id) && s_message_command_attempts < 3) {
    s_message_request_timer = app_timer_register(500, message_command_retry, NULL);
  }
}

static void request_messages(void) {
  s_message_state = VIEW_LOADING;
  s_message_count = 0;
  set_status(s_message_status_layer, s_message_state, true);
  if (s_message_menu) menu_layer_reload_data(s_message_menu);
  if (s_message_window) window_set_click_config_provider(s_message_window, message_clicks);
  s_message_command_attempts = 0;
  message_command_retry(NULL);
  cancel_load_watchdog();
  s_load_watchdog = app_timer_register(15000, load_watchdog, NULL);
}

static void new_reply_request_id(void) {
  static uint16_t counter;
  counter++;
  snprintf(s_reply_request_id, sizeof(s_reply_request_id), "%lu-%u", (unsigned long)time(NULL), counter);
}

static void send_reply_to_phone(void) {
  if (!s_reply_text[0] || !s_active_chat_id[0]) return;
  DictionaryIterator *iterator;
  AppMessageResult result = app_message_outbox_begin(&iterator);
  if (result != APP_MSG_OK || !iterator) {
    s_message_state = VIEW_REPLY_RETRYABLE;
    set_status(s_message_status_layer, s_message_state, true);
    return;
  }
  dict_write_cstring(iterator, MESSAGE_KEY_COMMAND, "send_reply");
  dict_write_cstring(iterator, MESSAGE_KEY_CHAT_ID, s_active_chat_id);
  dict_write_cstring(iterator, MESSAGE_KEY_REPLY_TEXT, s_reply_text);
  dict_write_cstring(iterator, MESSAGE_KEY_REPLY_REQUEST_ID, s_reply_request_id);
  result = app_message_outbox_send();
  s_message_state = result == APP_MSG_OK ? VIEW_REPLY_SENDING : VIEW_REPLY_RETRYABLE;
  set_status(s_message_status_layer, s_message_state, true);
}

static void dictation_callback(DictationSession *session, DictationSessionStatus status,
                               char *transcription, void *context) {
  if (status == DictationSessionStatusSuccess && transcription && transcription[0]) {
    copy_text(s_reply_text, sizeof(s_reply_text), transcription);
    new_reply_request_id();
    send_reply_to_phone();
  } else if (status != DictationSessionStatusFailureTranscriptionRejected) {
    s_message_state = VIEW_ERROR;
    set_status(s_message_status_layer, s_message_state, true);
  }
}

static void dictate_reply(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  if (!s_dictation_session) {
    s_message_state = VIEW_ERROR;
    set_status(s_message_status_layer, s_message_state, true);
    return;
  }
  dictation_session_start(s_dictation_session);
}

static void view_attachment(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  if (index->row >= s_message_count || !s_messages[index->row].attachment_id[0]) return;
  clear_media();
  if (s_media_status_layer) {
    text_layer_set_text(s_media_status_layer, "Loading attachment…");
    layer_set_hidden(text_layer_get_layer(s_media_status_layer), false);
  }
  window_stack_push(s_media_window, true);
  request_command("load_attachment", s_messages[index->row].attachment_id);
}

static void retry_reply(ClickRecognizerRef recognizer, void *context) {
  new_reply_request_id();
  send_reply_to_phone();
}

static void delayed_request_messages(void *context) {
  s_message_request_timer = NULL;
  request_messages();
}

static uint16_t chat_rows(MenuLayer *menu_layer, uint16_t section, void *context) {
  return s_chat_state == VIEW_READY ? (uint16_t)s_chat_count : 0;
}

static int16_t chat_row_height(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  return s_large_text ? 78 : 66;
}

static void draw_chat(GContext *ctx, const Layer *cell, MenuIndex *index, void *context) {
  if (index->row >= s_chat_count) return;
  Chat *chat = &s_chats[index->row];
  GRect bounds = layer_get_bounds(cell);
  bool selected = menu_layer_is_index_selected(s_chat_menu, index);
  int name_height = s_large_text ? 35 : 30;
  int preview_y = s_large_text ? 35 : 31;
  int preview_height = s_large_text ? 33 : 25;
  int unread_y = s_large_text ? 62 : 49;

  graphics_context_set_text_color(ctx, selected ? s_theme.accent_text : s_theme.text);
  graphics_draw_text(ctx, chat->name,
    title_font(),
    GRect(8, 2, bounds.size.w - 16, name_height),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  graphics_draw_text(ctx, chat->preview,
    body_font(),
    GRect(8, preview_y, bounds.size.w - 16, preview_height),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  if (chat->unread > 0) {
    char unread[20];
    snprintf(unread, sizeof(unread), "%d new", chat->unread);
    graphics_draw_text(ctx, unread,
      fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
      GRect(8, unread_y, bounds.size.w - 16, 16),
      GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
  }
}

static void chat_selected(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  if (index->row >= s_chat_count) return;
  copy_text(s_active_chat_id, sizeof(s_active_chat_id), s_chats[index->row].id);
  copy_text(s_active_chat_name, sizeof(s_active_chat_name), s_chats[index->row].name);
  if (!s_message_window) return;
  window_stack_push(s_message_window, true);
  if (s_message_request_timer) app_timer_cancel(s_message_request_timer);
  s_message_request_timer = app_timer_register(300, delayed_request_messages, NULL);
}

static void retry_chats(ClickRecognizerRef recognizer, void *context) {
  request_chats();
}

static void main_clicks(void *context) {
  if (s_chat_state != VIEW_READY) {
    window_single_click_subscribe(BUTTON_ID_SELECT, retry_chats);
  }
}

static uint16_t message_rows(MenuLayer *menu_layer, uint16_t section, void *context) {
  return s_message_state == VIEW_READY ? (uint16_t)s_message_count : 0;
}

static int16_t message_row_height(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  return s_large_text ? 104 : 84;
}

static void draw_message(GContext *ctx, const Layer *cell, MenuIndex *index, void *context) {
  if (index->row >= s_message_count) return;
  Message *message = &s_messages[index->row];
  GRect bounds = layer_get_bounds(cell);
  bool selected = menu_layer_is_index_selected(s_message_menu, index);
  int sender_height = s_large_text ? 31 : 24;
  int text_y = s_large_text ? 30 : 23;
  int text_height = s_large_text ? 61 : 48;
  int time_y = s_large_text ? 87 : 66;
  graphics_context_set_text_color(ctx, selected ? s_theme.accent_text : s_theme.text);

  graphics_draw_text(ctx, message->sender,
    title_font(),
    GRect(8, 1, bounds.size.w - 16, sender_height),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, message->text,
    body_font(),
    GRect(8, text_y, bounds.size.w - 16, text_height),
    GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, message->time,
    fonts_get_system_font(FONT_KEY_GOTHIC_14),
    GRect(8, time_y, bounds.size.w - 16, 16),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
  if (message->attachment_kind) {
    const char *label = message->attachment_kind == 2 ? "GIF • hold Select" :
      (message->attachment_kind == 3 ? "Video • hold Select" : "Photo • hold Select");
    graphics_draw_text(ctx, label,
      fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
      GRect(8, time_y, bounds.size.w - 70, 16),
      GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  }
}

static void retry_messages(ClickRecognizerRef recognizer, void *context) {
  request_messages();
}

static void message_clicks(void *context) {
  if ((s_message_state == VIEW_REPLY_RETRYABLE || s_message_state == VIEW_ERROR) && s_reply_text[0]) {
    window_single_click_subscribe(BUTTON_ID_SELECT, retry_reply);
  } else if (s_message_state != VIEW_READY) {
    window_single_click_subscribe(BUTTON_ID_SELECT, retry_messages);
  }
}

static void apply_state(const char *state, const char *error) {
  if (strncmp(state, "media_", 6) == 0) {
    if (s_media_status_layer) {
      text_layer_set_text(s_media_status_layer, strcmp(state, "media_loading") == 0 ?
        "Loading attachment…" : (error && error[0] ? error : "Attachment unavailable\nPress Back"));
      layer_set_hidden(text_layer_get_layer(s_media_status_layer), false);
    }
    return;
  }
  ViewState mapped = VIEW_ERROR;
  if (strcmp(state, "setup") == 0) mapped = VIEW_SETUP;
  else if (strcmp(state, "loading") == 0) mapped = VIEW_LOADING;
  else if (strcmp(state, "empty") == 0) mapped = VIEW_EMPTY;
  else if (strcmp(state, "ready") == 0) mapped = VIEW_READY;
  else if (strcmp(state, "reply_sending") == 0) mapped = VIEW_REPLY_SENDING;
  else if (strcmp(state, "reply_pending") == 0) mapped = VIEW_REPLY_PENDING;
  else if (strcmp(state, "reply_sent") == 0) mapped = VIEW_REPLY_SENT;
  else if (strcmp(state, "reply_retryable") == 0) mapped = VIEW_REPLY_RETRYABLE;
  else if (strcmp(state, "reply_failed") == 0) mapped = VIEW_REPLY_RETRYABLE;

  if (s_message_window && window_stack_get_top_window() == s_message_window) {
    if (mapped != VIEW_LOADING) cancel_load_watchdog();
    APP_LOG(APP_LOG_LEVEL_INFO, "message state=%s count=%d error=%s", state, s_message_count, error ? error : "");
    s_message_state = mapped;
    set_status(s_message_status_layer, mapped, true);
    if (s_message_menu) menu_layer_reload_data(s_message_menu);
    if (mapped == VIEW_READY) {
      menu_layer_set_click_config_onto_window(s_message_menu, s_message_window);
    } else {
      window_set_click_config_provider(s_message_window, message_clicks);
    }
  } else {
    s_chat_state = mapped;
    set_status(s_status_layer, mapped, false);
    if (s_chat_menu) menu_layer_reload_data(s_chat_menu);
    if (mapped == VIEW_READY) {
      menu_layer_set_click_config_onto_window(s_chat_menu, s_main_window);
    } else {
      window_set_click_config_provider(s_main_window, main_clicks);
    }
  }
  (void)error;
}

static void inbox_received(DictionaryIterator *iterator, void *context) {
  Tuple *command = dict_find(iterator, MESSAGE_KEY_COMMAND);
  if (!command) return;

  if (strcmp(command->value->cstring, "state") == 0) {
    Tuple *state = dict_find(iterator, MESSAGE_KEY_STATE);
    Tuple *error = dict_find(iterator, MESSAGE_KEY_ERROR);
    Tuple *theme = dict_find(iterator, MESSAGE_KEY_THEME);
    Tuple *text_size = dict_find(iterator, MESSAGE_KEY_TEXT_SIZE);
    Tuple *theme_background = dict_find(iterator, MESSAGE_KEY_THEME_BACKGROUND);
    Tuple *theme_text = dict_find(iterator, MESSAGE_KEY_THEME_TEXT);
    Tuple *theme_muted = dict_find(iterator, MESSAGE_KEY_THEME_MUTED);
    Tuple *theme_accent = dict_find(iterator, MESSAGE_KEY_THEME_ACCENT);
    Tuple *theme_accent_text = dict_find(iterator, MESSAGE_KEY_THEME_ACCENT_TEXT);
    Tuple *theme_font = dict_find(iterator, MESSAGE_KEY_THEME_FONT);
    if (theme) select_theme(theme->value->cstring);
    if (theme_background) s_theme.background.argb = theme_background->value->uint8;
    if (theme_text) s_theme.text.argb = theme_text->value->uint8;
    if (theme_muted) s_theme.muted.argb = theme_muted->value->uint8;
    if (theme_accent) s_theme.accent.argb = theme_accent->value->uint8;
    if (theme_accent_text) s_theme.accent_text.argb = theme_accent_text->value->uint8;
    if (theme_font) s_font_style = theme_font->value->uint8;
    if (text_size) {
      s_large_text = strcmp(text_size->value->cstring, "large") == 0;
      persist_write_bool(PERSIST_TEXT_SIZE, s_large_text);
      if (s_chat_menu) menu_layer_reload_data(s_chat_menu);
      if (s_message_menu) menu_layer_reload_data(s_message_menu);
    }
    if (theme_background || theme_text || theme_accent) {
      persist_current_theme();
      apply_theme_to_layers();
    }
    apply_state(state ? state->value->cstring : "error", error ? error->value->cstring : "");
    return;
  }

  if (strcmp(command->value->cstring, "chat") == 0) {
    Tuple *index = dict_find(iterator, MESSAGE_KEY_INDEX);
    if (!index || index->value->int32 < 0 || index->value->int32 >= MAX_CHATS) return;
    int slot = index->value->int32;
    Tuple *id = dict_find(iterator, MESSAGE_KEY_CHAT_ID);
    Tuple *name = dict_find(iterator, MESSAGE_KEY_CHAT_NAME);
    Tuple *preview = dict_find(iterator, MESSAGE_KEY_CHAT_PREVIEW);
    Tuple *network = dict_find(iterator, MESSAGE_KEY_NETWORK);
    Tuple *unread = dict_find(iterator, MESSAGE_KEY_UNREAD);
    copy_text(s_chats[slot].id, sizeof(s_chats[slot].id), id ? id->value->cstring : "");
    copy_text(s_chats[slot].name, sizeof(s_chats[slot].name), name ? name->value->cstring : "Unknown contact");
    copy_text(s_chats[slot].preview, sizeof(s_chats[slot].preview), preview ? preview->value->cstring : "");
    copy_text(s_chats[slot].network, sizeof(s_chats[slot].network), network ? network->value->cstring : "");
    s_chats[slot].unread = unread ? unread->value->int32 : 0;
    if (slot + 1 > s_chat_count) s_chat_count = slot + 1;
    return;
  }

  if (strcmp(command->value->cstring, "message") == 0) {
    Tuple *index = dict_find(iterator, MESSAGE_KEY_INDEX);
    if (!index || index->value->int32 < 0 || index->value->int32 >= MAX_MESSAGES) return;
    int slot = index->value->int32;
    Tuple *sender = dict_find(iterator, MESSAGE_KEY_MSG_SENDER);
    Tuple *text = dict_find(iterator, MESSAGE_KEY_MSG_TEXT);
    Tuple *time = dict_find(iterator, MESSAGE_KEY_MSG_TIME);
    copy_text(s_messages[slot].sender, sizeof(s_messages[slot].sender), sender ? sender->value->cstring : "Unknown");
    copy_text(s_messages[slot].text, sizeof(s_messages[slot].text), text ? text->value->cstring : "");
    copy_text(s_messages[slot].time, sizeof(s_messages[slot].time), time ? time->value->cstring : "");
    Tuple *attachment_id = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_ID);
    Tuple *attachment_kind = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_KIND);
    copy_text(s_messages[slot].attachment_id, sizeof(s_messages[slot].attachment_id), attachment_id ? attachment_id->value->cstring : "");
    s_messages[slot].attachment_kind = attachment_kind ? attachment_kind->value->uint8 : 0;
    if (slot + 1 > s_message_count) s_message_count = slot + 1;
    APP_LOG(APP_LOG_LEVEL_INFO, "message received slot=%d count=%d", slot, s_message_count);
    return;
  }

  if (strcmp(command->value->cstring, "media_start") == 0) {
    Tuple *width = dict_find(iterator, MESSAGE_KEY_MEDIA_WIDTH);
    Tuple *height = dict_find(iterator, MESSAGE_KEY_MEDIA_HEIGHT);
    Tuple *total = dict_find(iterator, MESSAGE_KEY_MEDIA_TOTAL);
    Tuple *kind = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_KIND);
    clear_media();
    s_media_width = width ? width->value->int32 : 0;
    s_media_height = height ? height->value->int32 : 0;
    s_media_total = total ? total->value->uint32 : 0;
    s_media_kind = kind ? kind->value->uint8 : 1;
    if (s_media_width < 1 || s_media_height < 1 || s_media_total != (size_t)s_media_width * s_media_height || s_media_total > 32400) {
      if (s_media_status_layer) text_layer_set_text(s_media_status_layer, "Invalid attachment\nPress Back");
      s_media_total = 0;
      return;
    }
    s_media_pixels = malloc(s_media_total);
    if (!s_media_pixels) {
      if (s_media_status_layer) text_layer_set_text(s_media_status_layer, "Not enough memory\nPress Back");
      s_media_total = 0;
    }
    return;
  }

  if (strcmp(command->value->cstring, "media_chunk") == 0) {
    Tuple *offset = dict_find(iterator, MESSAGE_KEY_MEDIA_OFFSET);
    Tuple *bytes = dict_find(iterator, MESSAGE_KEY_MEDIA_BYTES);
    size_t start = offset ? offset->value->uint32 : s_media_total;
    if (s_media_pixels && bytes && start + bytes->length <= s_media_total) {
      memcpy(s_media_pixels + start, bytes->value->data, bytes->length);
      s_media_received += bytes->length;
    }
    return;
  }

  if (strcmp(command->value->cstring, "media_end") == 0) {
    if (!s_media_pixels || s_media_received != s_media_total) {
      if (s_media_status_layer) text_layer_set_text(s_media_status_layer, "Transfer incomplete\nPress Back to retry");
      return;
    }
    s_media_bitmap = gbitmap_create_blank(GSize(s_media_width, s_media_height), GBitmapFormat8Bit);
    if (!s_media_bitmap) {
      if (s_media_status_layer) text_layer_set_text(s_media_status_layer, "Could not open image\nPress Back");
      return;
    }
    uint8_t *bitmap_data = gbitmap_get_data(s_media_bitmap);
    uint16_t stride = gbitmap_get_bytes_per_row(s_media_bitmap);
    for (int y = 0; y < s_media_height; y++) {
      memcpy(bitmap_data + y * stride, s_media_pixels + y * s_media_width, s_media_width);
    }
    bitmap_layer_set_bitmap(s_media_layer, s_media_bitmap);
    bitmap_layer_set_alignment(s_media_layer, GAlignCenter);
    if (s_media_status_layer) layer_set_hidden(text_layer_get_layer(s_media_status_layer), true);
    free(s_media_pixels);
    s_media_pixels = NULL;
  }
}

static void main_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);
  window_set_background_color(window, s_theme.background);

  s_chat_menu = menu_layer_create(bounds);
  menu_layer_set_normal_colors(s_chat_menu, s_theme.background, s_theme.text);
  menu_layer_set_highlight_colors(s_chat_menu, s_theme.accent, s_theme.accent_text);
  menu_layer_set_callbacks(s_chat_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = chat_rows,
    .get_cell_height = chat_row_height,
    .draw_row = draw_chat,
    .select_click = chat_selected
  });
  menu_layer_set_click_config_onto_window(s_chat_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_chat_menu));

  s_status_layer = text_layer_create(GRect(14, 58, bounds.size.w - 28, 110));
  text_layer_set_background_color(s_status_layer, s_theme.background);
  text_layer_set_text_color(s_status_layer, s_theme.text);
  text_layer_set_font(s_status_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(s_status_layer, GTextAlignmentCenter);
  text_layer_set_overflow_mode(s_status_layer, GTextOverflowModeWordWrap);
  layer_add_child(root, text_layer_get_layer(s_status_layer));
  set_status(s_status_layer, s_chat_state, false);
  window_set_click_config_provider(window, main_clicks);
}

static void main_unload(Window *window) {
  menu_layer_destroy(s_chat_menu);
  text_layer_destroy(s_status_layer);
  s_chat_menu = NULL;
  s_status_layer = NULL;
}

static void message_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);
  window_set_background_color(window, s_theme.background);

  s_message_menu = menu_layer_create(bounds);
  menu_layer_set_normal_colors(s_message_menu, s_theme.background, s_theme.text);
  menu_layer_set_highlight_colors(s_message_menu, s_theme.accent, s_theme.accent_text);
  menu_layer_set_callbacks(s_message_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = message_rows,
    .get_cell_height = message_row_height,
    .draw_row = draw_message,
    .select_click = dictate_reply,
    .select_long_click = view_attachment
  });
  menu_layer_set_click_config_onto_window(s_message_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_message_menu));

  s_message_status_layer = text_layer_create(GRect(14, 58, bounds.size.w - 28, 110));
  text_layer_set_background_color(s_message_status_layer, s_theme.background);
  text_layer_set_text_color(s_message_status_layer, s_theme.text);
  text_layer_set_font(s_message_status_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(s_message_status_layer, GTextAlignmentCenter);
  text_layer_set_overflow_mode(s_message_status_layer, GTextOverflowModeWordWrap);
  layer_add_child(root, text_layer_get_layer(s_message_status_layer));
  set_status(s_message_status_layer, s_message_state, true);
  window_set_click_config_provider(window, message_clicks);
}

static void media_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);
  window_set_background_color(window, GColorBlack);
  s_media_layer = bitmap_layer_create(bounds);
  bitmap_layer_set_background_color(s_media_layer, GColorBlack);
  bitmap_layer_set_alignment(s_media_layer, GAlignCenter);
  layer_add_child(root, bitmap_layer_get_layer(s_media_layer));
  s_media_status_layer = text_layer_create(GRect(14, 74, bounds.size.w - 28, 90));
  text_layer_set_background_color(s_media_status_layer, GColorBlack);
  text_layer_set_text_color(s_media_status_layer, GColorWhite);
  text_layer_set_font(s_media_status_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(s_media_status_layer, GTextAlignmentCenter);
  text_layer_set_overflow_mode(s_media_status_layer, GTextOverflowModeWordWrap);
  text_layer_set_text(s_media_status_layer, s_media_kind == 2 ? "Loading GIF preview…" : "Loading attachment…");
  layer_add_child(root, text_layer_get_layer(s_media_status_layer));
}

static void media_unload(Window *window) {
  clear_media();
  bitmap_layer_destroy(s_media_layer);
  text_layer_destroy(s_media_status_layer);
  s_media_layer = NULL;
  s_media_status_layer = NULL;
}

static void message_unload(Window *window) {
  menu_layer_destroy(s_message_menu);
  text_layer_destroy(s_message_status_layer);
  s_message_menu = NULL;
  s_message_status_layer = NULL;
}

static void init(void) {
  char saved_theme[20] = "classic";
  if (persist_exists(PERSIST_THEME)) persist_read_string(PERSIST_THEME, saved_theme, sizeof(saved_theme));
  s_large_text = persist_exists(PERSIST_TEXT_SIZE) && persist_read_bool(PERSIST_TEXT_SIZE);
  select_theme(saved_theme);
  if (persist_get_size(PERSIST_THEME_DATA) == sizeof(PersistedTheme)) {
    PersistedTheme saved;
    persist_read_data(PERSIST_THEME_DATA, &saved, sizeof(saved));
    s_theme.background.argb = saved.background;
    s_theme.text.argb = saved.text;
    s_theme.muted.argb = saved.muted;
    s_theme.accent.argb = saved.accent;
    s_theme.accent_text.argb = saved.accent_text;
    s_font_style = saved.font;
  }
  s_main_window = window_create();
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_load,
    .unload = main_unload
  });
  s_message_window = window_create();
  window_set_window_handlers(s_message_window, (WindowHandlers) {
    .load = message_load,
    .unload = message_unload
  });
  s_media_window = window_create();
  window_set_window_handlers(s_media_window, (WindowHandlers) {
    .load = media_load,
    .unload = media_unload
  });

  app_message_register_inbox_received(inbox_received);
  app_message_open(2048, 1024);
  s_dictation_session = dictation_session_create(sizeof(s_reply_text), dictation_callback, NULL);
  if (s_dictation_session) {
    dictation_session_enable_confirmation(s_dictation_session, true);
    dictation_session_enable_error_dialogs(s_dictation_session, true);
  }
  window_stack_push(s_main_window, true);
  request_chats();
}

static void deinit(void) {
  cancel_load_watchdog();
  if (s_message_request_timer) app_timer_cancel(s_message_request_timer);
  if (s_dictation_session) dictation_session_destroy(s_dictation_session);
  clear_media();
  window_destroy(s_media_window);
  window_destroy(s_message_window);
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
