#include <pebble.h>

#define MAX_CHATS 12
#define MAX_MESSAGES 60
#define CHAT_ID_LEN 128
#define CHAT_NAME_LEN 64
#define CHAT_PREVIEW_LEN 128
#define MESSAGE_SENDER_LEN 48
#define MESSAGE_TEXT_LEN 256
#define MESSAGE_TIME_LEN 20
#define MESSAGE_ATTACHMENT_LEN 32
#define MESSAGE_ID_LEN 128
#define DETAIL_TEXT_CAPACITY 32768
#define MAX_QUICK_REPLIES 8
#define QUICK_REPLY_LEN 96
#define MARQUEE_STEP_PIXELS 2
#define MARQUEE_FRAME_MS 80
#define MARQUEE_PAUSE_MS 900
#define REPLY_SUCCESS_MS 900
#define PERSIST_THEME 100
#define PERSIST_TEXT_SIZE 101
#define PERSIST_THEME_DATA 102
#define PERSIST_QUICK_REPLY_COUNT 103
#define PERSIST_QUICK_REPLY_BASE 110

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

typedef enum {
  INLINE_MEDIA_NONE,
  INLINE_MEDIA_LOADING,
  INLINE_MEDIA_READY,
  INLINE_MEDIA_FAILED
} InlineMediaState;

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
  char id[MESSAGE_ID_LEN];
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
  uint8_t size;
} PersistedTheme;

static Theme s_theme = {
  .background = GColorWhite,
  .text = GColorBlack,
  .muted = GColorDarkGray,
  .accent = GColorDukeBlue,
  .accent_text = GColorWhite
};
static bool s_large_text;
static uint8_t s_font_style = 5;
static uint8_t s_theme_size = 22;
static GFont s_custom_theme_font;
static uint8_t s_custom_theme_font_id = 255;
static uint8_t s_custom_theme_font_size;

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
static bool s_has_older_messages;
static bool s_loading_older_messages;
static char s_active_chat_id[CHAT_ID_LEN];
static char s_active_chat_name[CHAT_NAME_LEN];
static DictationSession *s_dictation_session;
static char s_reply_text[512];
static char s_reply_request_id[48];
static ViewState s_reply_state = VIEW_READY;
static AppTimer *s_reply_ack_timer;
static AppTimer *s_reply_return_timer;
static int s_pending_quick_reply_index = -1;
static AppTimer *s_load_watchdog;
static AppTimer *s_message_request_timer;
static int s_message_command_attempts;
static AppTimer *s_content_request_timer;
static int s_expanded_message_index = -1;
static char s_expanded_message_id[MESSAGE_ID_LEN];
static bool s_expanded_message_loaded;
static Window *s_media_window;
static BitmapLayer *s_media_layer;
static TextLayer *s_media_status_layer;
static GBitmap *s_media_bitmap;
static size_t s_media_total;
static size_t s_media_received;
static int16_t s_media_width;
static int16_t s_media_height;
static uint8_t s_media_kind;
static char s_inline_attachment_id[MESSAGE_ATTACHMENT_LEN];
static InlineMediaState s_inline_media_state = INLINE_MEDIA_NONE;
static char s_inline_media_error[48];
static Window *s_detail_window;
static ScrollLayer *s_detail_scroll;
static TextLayer *s_detail_sender_layer;
static TextLayer *s_detail_text_layer;
static TextLayer *s_detail_hint_layer;
static TextLayer *s_detail_top_mask;
static char *s_detail_text;
static size_t s_detail_length;
static size_t s_detail_capacity;
static char s_detail_sender[MESSAGE_SENDER_LEN];
static Window *s_reply_window;
static MenuLayer *s_reply_menu;
static TextLayer *s_reply_status_layer;
static bool s_reply_showing_status;
static char s_quick_replies[MAX_QUICK_REPLIES][QUICK_REPLY_LEN];
static int s_quick_reply_count;
static AppTimer *s_marquee_timer;
static int16_t s_marquee_offset;
static int16_t s_marquee_max;
static bool s_marquee_at_end;

static void main_clicks(void *context);
static void message_clicks(void *context);
static void apply_theme_to_layers(void);
static void set_status(TextLayer *layer, ViewState state, bool messages);
static void reply_show_status(const char *text);
static void retry_reply(ClickRecognizerRef recognizer, void *context);
static void install_message_clicks(void);
static GFont theme_font(void);
static GFont font_for_text(const char *text);

static MenuLayer *active_menu(void) {
  Window *top = window_stack_get_top_window();
  if (top == s_main_window) return s_chat_menu;
  if (top == s_message_window) return s_message_menu;
  if (top == s_reply_window && !s_reply_showing_status) return s_reply_menu;
  return NULL;
}

static void marquee_tick(void *context);

static void marquee_schedule(uint32_t delay_ms) {
  if (s_marquee_timer) app_timer_cancel(s_marquee_timer);
  s_marquee_timer = app_timer_register(delay_ms, marquee_tick, NULL);
}

static void marquee_reset(void) {
  s_marquee_offset = 0;
  s_marquee_max = 0;
  s_marquee_at_end = false;
  MenuLayer *menu = active_menu();
  if (menu) layer_mark_dirty(menu_layer_get_layer(menu));
  marquee_schedule(MARQUEE_PAUSE_MS);
}

static void marquee_tick(void *context) {
  s_marquee_timer = NULL;
  MenuLayer *menu = active_menu();
  if (!menu || s_marquee_max <= 0) return;
  if (s_marquee_at_end) {
    s_marquee_offset = 0;
    s_marquee_at_end = false;
    layer_mark_dirty(menu_layer_get_layer(menu));
    marquee_schedule(MARQUEE_PAUSE_MS);
    return;
  }
  s_marquee_offset += MARQUEE_STEP_PIXELS;
  if (s_marquee_offset >= s_marquee_max) {
    s_marquee_offset = s_marquee_max;
    s_marquee_at_end = true;
    marquee_schedule(MARQUEE_PAUSE_MS);
  } else {
    marquee_schedule(MARQUEE_FRAME_MS);
  }
  layer_mark_dirty(menu_layer_get_layer(menu));
}

static void marquee_selection_changed(MenuLayer *menu_layer, MenuIndex new_index,
                                      MenuIndex old_index, void *context) {
  marquee_reset();
}

static void draw_marquee_text(GContext *ctx, const char *text, GFont font, GRect frame,
                              bool selected) {
  if (!selected) {
    graphics_draw_text(ctx, text, font, frame, GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentLeft, NULL);
    return;
  }
  GSize content = graphics_text_layout_get_content_size(text, font,
    GRect(0, 0, 1000, frame.size.h), GTextOverflowModeFill, GTextAlignmentLeft);
  s_marquee_max = content.w > frame.size.w ? content.w - frame.size.w + 6 : 0;
  if (s_marquee_max > 0) {
    if (!s_marquee_timer) marquee_schedule(MARQUEE_PAUSE_MS);
    graphics_draw_text(ctx, text, font,
      GRect(frame.origin.x - s_marquee_offset, frame.origin.y, content.w + 4, frame.size.h),
      GTextOverflowModeFill, GTextAlignmentLeft, NULL);
  } else {
    s_marquee_offset = 0;
    s_marquee_at_end = false;
    graphics_draw_text(ctx, text, font, frame, GTextOverflowModeTrailingEllipsis,
                       GTextAlignmentLeft, NULL);
  }
}

static void clear_media(void) {
  if (s_media_bitmap) {
    if (s_media_layer) bitmap_layer_set_bitmap(s_media_layer, NULL);
    gbitmap_destroy(s_media_bitmap);
    s_media_bitmap = NULL;
  }
  s_media_total = 0;
  s_media_received = 0;
  s_media_width = 0;
  s_media_height = 0;
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
    case VIEW_REPLY_SENT: return "Reply sent ✓";
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
  if (s_reply_window) window_set_background_color(s_reply_window, s_theme.background);
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
  if (s_reply_menu) {
    menu_layer_set_normal_colors(s_reply_menu, s_theme.background, s_theme.text);
    menu_layer_set_highlight_colors(s_reply_menu, s_theme.accent, s_theme.accent_text);
    layer_mark_dirty(menu_layer_get_layer(s_reply_menu));
  }
  if (s_reply_status_layer) {
    text_layer_set_background_color(s_reply_status_layer, s_theme.background);
    text_layer_set_text_color(s_reply_status_layer, s_theme.text);
    text_layer_set_font(s_reply_status_layer, theme_font());
  }
  if (s_detail_window) window_set_background_color(s_detail_window, s_theme.background);
  if (s_detail_sender_layer) {
    text_layer_set_background_color(s_detail_sender_layer, s_theme.background);
    text_layer_set_text_color(s_detail_sender_layer, s_theme.text);
    text_layer_set_font(s_detail_sender_layer, font_for_text(s_detail_sender));
  }
  if (s_detail_text_layer) {
    text_layer_set_background_color(s_detail_text_layer, s_theme.background);
    text_layer_set_text_color(s_detail_text_layer, s_theme.text);
    text_layer_set_font(s_detail_text_layer, font_for_text(s_detail_text));
  }
  if (s_detail_hint_layer) {
    text_layer_set_background_color(s_detail_hint_layer, s_theme.accent);
    text_layer_set_text_color(s_detail_hint_layer, s_theme.accent_text);
  }
  if (s_detail_top_mask) text_layer_set_background_color(s_detail_top_mask, s_theme.background);
  if (s_status_layer) text_layer_set_font(s_status_layer, theme_font());
  if (s_message_status_layer) text_layer_set_font(s_message_status_layer, theme_font());
  set_status(s_status_layer, s_chat_state, false);
  set_status(s_message_status_layer, s_message_state, true);
}

static void unload_custom_theme_font(void) {
  if (s_custom_theme_font) {
    fonts_unload_custom_font(s_custom_theme_font);
    s_custom_theme_font = NULL;
  }
  s_custom_theme_font_id = 255;
  s_custom_theme_font_size = 0;
}

static uint8_t custom_size_index(void) {
  if (s_theme_size <= 14) return 0;
  if (s_theme_size <= 18) return 1;
  if (s_theme_size <= 22) return 2;
  if (s_theme_size <= 26) return 3;
  return 4;
}

static GFont pome_theme_font(void) {
  static const uint32_t font_resources[5][5] = {
    {RESOURCE_ID_INTER_14, RESOURCE_ID_INTER_18, RESOURCE_ID_INTER_22,
     RESOURCE_ID_INTER_26, RESOURCE_ID_INTER_30},
    {RESOURCE_ID_ROBOTO_14, RESOURCE_ID_ROBOTO_18, RESOURCE_ID_ROBOTO_22,
     RESOURCE_ID_ROBOTO_26, RESOURCE_ID_ROBOTO_30},
    {RESOURCE_ID_OPEN_SANS_14, RESOURCE_ID_OPEN_SANS_18, RESOURCE_ID_OPEN_SANS_22,
     RESOURCE_ID_OPEN_SANS_26, RESOURCE_ID_OPEN_SANS_30},
    {RESOURCE_ID_MONTSERRAT_14, RESOURCE_ID_MONTSERRAT_18, RESOURCE_ID_MONTSERRAT_22,
     RESOURCE_ID_MONTSERRAT_26, RESOURCE_ID_MONTSERRAT_30},
    {RESOURCE_ID_POPPINS_14, RESOURCE_ID_POPPINS_18, RESOURCE_ID_POPPINS_22,
     RESOURCE_ID_POPPINS_26, RESOURCE_ID_POPPINS_30}
  };
  uint8_t family = s_font_style >= 5 && s_font_style <= 9 ? s_font_style - 5 : 0;
  uint8_t size_index = custom_size_index();
  uint8_t actual_size = (uint8_t[]){14, 18, 22, 26, 30}[size_index];
  if (s_custom_theme_font && s_custom_theme_font_id == s_font_style &&
      s_custom_theme_font_size == actual_size) return s_custom_theme_font;
  unload_custom_theme_font();
  s_custom_theme_font = fonts_load_custom_font(resource_get_handle(font_resources[family][size_index]));
  s_custom_theme_font_id = s_font_style;
  s_custom_theme_font_size = actual_size;
  return s_custom_theme_font ? s_custom_theme_font : fonts_get_system_font(FONT_KEY_GOTHIC_24);
}

static GFont gothic_font(bool bold) {
  if (s_theme_size <= 14) return fonts_get_system_font(bold ? FONT_KEY_GOTHIC_14_BOLD : FONT_KEY_GOTHIC_14);
  if (s_theme_size <= 18) return fonts_get_system_font(bold ? FONT_KEY_GOTHIC_18_BOLD : FONT_KEY_GOTHIC_18);
  if (s_theme_size >= 28) return fonts_get_system_font(bold ? FONT_KEY_GOTHIC_28_BOLD : FONT_KEY_GOTHIC_28);
  return fonts_get_system_font(bold ? FONT_KEY_GOTHIC_24_BOLD : FONT_KEY_GOTHIC_24);
}

static GFont theme_font(void) {
  if (s_font_style >= 5 && s_font_style <= 9) return pome_theme_font();
  if (s_font_style == 1) return fonts_get_system_font(FONT_KEY_ROBOTO_CONDENSED_21);
  if (s_font_style == 2) return gothic_font(true);
  return gothic_font(false);
}

static bool has_non_ascii(const char *text) {
  if (!text) return false;
  for (const unsigned char *cursor = (const unsigned char *)text; *cursor; cursor++) {
    if (*cursor >= 0x80) return true;
  }
  return false;
}

static GFont font_for_text(const char *text) {
  return has_non_ascii(text) ? gothic_font(false) : theme_font();
}

static void persist_current_theme(void) {
  PersistedTheme saved = {s_theme.background.argb, s_theme.text.argb, s_theme.muted.argb,
                          s_theme.accent.argb, s_theme.accent_text.argb, s_font_style, s_theme_size};
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
  s_has_older_messages = false;
  s_loading_older_messages = false;
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

static void cancel_reply_ack_timer(void) {
  if (s_reply_ack_timer) {
    app_timer_cancel(s_reply_ack_timer);
    s_reply_ack_timer = NULL;
  }
}

static void cancel_reply_return_timer(void) {
  if (s_reply_return_timer) {
    app_timer_cancel(s_reply_return_timer);
    s_reply_return_timer = NULL;
  }
}

static void reply_return_to_thread(void *context) {
  s_reply_return_timer = NULL;
  if (s_reply_state != VIEW_REPLY_SENT) return;
  if (s_reply_window && window_stack_contains_window(s_reply_window)) {
    window_stack_remove(s_reply_window, false);
  }
  if (s_detail_window && window_stack_contains_window(s_detail_window)) {
    window_stack_remove(s_detail_window, true);
  }
  s_reply_state = VIEW_READY;
  s_reply_text[0] = '\0';
  s_reply_request_id[0] = '\0';
  s_pending_quick_reply_index = -1;
  if (s_message_window && window_stack_get_top_window() == s_message_window) {
    request_messages();
  }
}

static void reply_ack_timeout(void *context) {
  s_reply_ack_timer = NULL;
  if (s_reply_state != VIEW_REPLY_SENDING && s_reply_state != VIEW_REPLY_PENDING) return;
  s_reply_state = VIEW_REPLY_RETRYABLE;
  if (s_reply_window && window_stack_get_top_window() == s_reply_window) {
    reply_show_status("No delivery confirmation\nPress Select to retry safely");
  } else if (s_detail_window && window_stack_get_top_window() == s_detail_window && s_detail_hint_layer) {
    text_layer_set_text(s_detail_hint_layer, "No delivery confirmation\nHold Select to retry safely");
  } else if (s_message_window && window_stack_get_top_window() == s_message_window && s_message_status_layer) {
    text_layer_set_text(s_message_status_layer, "No delivery confirmation\nHold Select to retry safely");
    layer_set_hidden(text_layer_get_layer(s_message_status_layer), false);
  }
}

static void start_reply_ack_timer(void) {
  cancel_reply_ack_timer();
  s_reply_ack_timer = app_timer_register(25000, reply_ack_timeout, NULL);
}

static void reply_status_clicks(void *context) {
  if (s_reply_state == VIEW_REPLY_RETRYABLE) {
    window_single_click_subscribe(BUTTON_ID_SELECT, retry_reply);
  }
}

static void reply_show_status(const char *text) {
  s_reply_showing_status = true;
  if (s_reply_status_layer) {
    text_layer_set_text(s_reply_status_layer, text ? text : "");
    layer_set_hidden(text_layer_get_layer(s_reply_status_layer), false);
  }
  if (s_reply_menu) layer_set_hidden(menu_layer_get_layer(s_reply_menu), true);
  if (s_reply_window) window_set_click_config_provider(s_reply_window, reply_status_clicks);
}

static void reply_show_menu(void) {
  if (s_quick_reply_count == 0) {
    reply_show_status("No quick replies\nAdd them in Settings");
    return;
  }
  s_reply_state = VIEW_READY;
  s_reply_showing_status = false;
  if (s_reply_status_layer) layer_set_hidden(text_layer_get_layer(s_reply_status_layer), true);
  if (s_reply_menu) {
    layer_set_hidden(menu_layer_get_layer(s_reply_menu), false);
    menu_layer_reload_data(s_reply_menu);
    menu_layer_set_click_config_onto_window(s_reply_menu, s_reply_window);
  }
}

static void send_reply_to_phone(void) {
  if (!s_reply_text[0] || !s_active_chat_id[0]) return;
  cancel_reply_ack_timer();
  cancel_reply_return_timer();
  DictionaryIterator *iterator;
  AppMessageResult result = app_message_outbox_begin(&iterator);
  if (result != APP_MSG_OK || !iterator) {
    s_reply_state = VIEW_REPLY_RETRYABLE;
    if (s_reply_window && window_stack_get_top_window() == s_reply_window) {
      reply_show_status(state_text(s_reply_state, true));
    } else if (s_detail_window && window_stack_get_top_window() == s_detail_window && s_detail_hint_layer) {
      text_layer_set_text(s_detail_hint_layer, "Reply failed\nHold Select to retry");
    } else if (s_message_window && window_stack_get_top_window() == s_message_window && s_message_status_layer) {
      text_layer_set_text(s_message_status_layer, "Reply failed\nHold Select to retry");
      layer_set_hidden(text_layer_get_layer(s_message_status_layer), false);
    }
    return;
  }
  dict_write_cstring(iterator, MESSAGE_KEY_COMMAND, "send_reply");
  dict_write_cstring(iterator, MESSAGE_KEY_CHAT_ID, s_active_chat_id);
  dict_write_cstring(iterator, MESSAGE_KEY_REPLY_TEXT, s_reply_text);
  dict_write_cstring(iterator, MESSAGE_KEY_REPLY_REQUEST_ID, s_reply_request_id);
  result = app_message_outbox_send();
  s_reply_state = result == APP_MSG_OK ? VIEW_REPLY_SENDING : VIEW_REPLY_RETRYABLE;
  if (result == APP_MSG_OK) start_reply_ack_timer();
  if (s_reply_window && window_stack_get_top_window() == s_reply_window) {
    reply_show_status(state_text(s_reply_state, true));
  } else if (s_detail_window && window_stack_get_top_window() == s_detail_window && s_detail_hint_layer) {
    text_layer_set_text(s_detail_hint_layer, state_text(s_reply_state, true));
  } else if (s_message_window && window_stack_get_top_window() == s_message_window && s_message_status_layer) {
    text_layer_set_text(s_message_status_layer, state_text(s_reply_state, true));
    layer_set_hidden(text_layer_get_layer(s_message_status_layer), false);
  }
}

static void send_quick_reply_to_phone(int index, bool create_request_id) {
  if (index < 0 || index >= s_quick_reply_count || !s_active_chat_id[0]) return;
  cancel_reply_ack_timer();
  cancel_reply_return_timer();
  s_pending_quick_reply_index = index;
  if (create_request_id || !s_reply_request_id[0]) new_reply_request_id();
  DictionaryIterator *iterator;
  AppMessageResult result = app_message_outbox_begin(&iterator);
  if (result != APP_MSG_OK || !iterator) {
    s_reply_state = VIEW_REPLY_RETRYABLE;
    reply_show_status("Could not send\nPress Select to retry");
    return;
  }
  dict_write_cstring(iterator, MESSAGE_KEY_COMMAND, "send_quick_reply");
  dict_write_cstring(iterator, MESSAGE_KEY_CHAT_ID, s_active_chat_id);
  dict_write_int32(iterator, MESSAGE_KEY_INDEX, index);
  dict_write_cstring(iterator, MESSAGE_KEY_QUICK_REPLY_TEXT, s_quick_replies[index]);
  dict_write_cstring(iterator, MESSAGE_KEY_REPLY_REQUEST_ID, s_reply_request_id);
  result = app_message_outbox_send();
  s_reply_state = result == APP_MSG_OK ? VIEW_REPLY_SENDING : VIEW_REPLY_RETRYABLE;
  if (result == APP_MSG_OK) start_reply_ack_timer();
  reply_show_status(state_text(s_reply_state, true));
}

static void dictation_callback(DictationSession *session, DictationSessionStatus status,
                               char *transcription, void *context) {
  if (status == DictationSessionStatusSuccess && transcription && transcription[0]) {
    copy_text(s_reply_text, sizeof(s_reply_text), transcription);
    s_pending_quick_reply_index = -1;
    new_reply_request_id();
    send_reply_to_phone();
  } else if (status != DictationSessionStatusFailureTranscriptionRejected) {
    s_reply_state = VIEW_REPLY_RETRYABLE;
    if (s_reply_window && window_stack_get_top_window() == s_reply_window) {
      reply_show_status("Voice reply failed\nPress Select to retry");
    } else if (s_detail_window && window_stack_get_top_window() == s_detail_window && s_detail_hint_layer) {
      text_layer_set_text(s_detail_hint_layer, "Voice reply failed\nHold Select to try again");
    } else if (s_message_window && window_stack_get_top_window() == s_message_window && s_message_status_layer) {
      text_layer_set_text(s_message_status_layer, "Voice reply failed\nHold Select to try again");
      layer_set_hidden(text_layer_get_layer(s_message_status_layer), false);
    }
  }
}

static bool request_message_content(const Message *message) {
  if (!message || !message->id[0]) return false;
  DictionaryIterator *iterator;
  AppMessageResult result = app_message_outbox_begin(&iterator);
  if (result != APP_MSG_OK || !iterator) return false;
  dict_write_cstring(iterator, MESSAGE_KEY_COMMAND, "load_message_content");
  dict_write_cstring(iterator, MESSAGE_KEY_MSG_ID, message->id);
  if (message->attachment_id[0]) {
    dict_write_cstring(iterator, MESSAGE_KEY_ATTACHMENT_ID, message->attachment_id);
  }
  return app_message_outbox_send() == APP_MSG_OK;
}

static void request_selected_content(void *context) {
  s_content_request_timer = NULL;
  if (s_expanded_message_index < 0 || s_expanded_message_index >= s_message_count) return;
  if (!request_message_content(&s_messages[s_expanded_message_index])) {
    s_inline_media_state = s_inline_attachment_id[0] ? INLINE_MEDIA_FAILED : INLINE_MEDIA_NONE;
    copy_text(s_inline_media_error, sizeof(s_inline_media_error), "Preview unavailable");
    if (s_message_menu) menu_layer_reload_data(s_message_menu);
  }
}

static void thread_quick_replies(ClickRecognizerRef recognizer, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "thread long-down: quick replies");
  if (!s_reply_window) return;
  marquee_reset();
  reply_show_menu();
  window_stack_push(s_reply_window, true);
}

static void thread_dictate(ClickRecognizerRef recognizer, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "thread long-select: dictate");
  if (s_reply_state == VIEW_REPLY_RETRYABLE && s_reply_request_id[0]) {
    retry_reply(recognizer, context);
    return;
  }
  if (s_dictation_session) {
    s_pending_quick_reply_index = -1;
    dictation_session_start(s_dictation_session);
  } else if (s_message_status_layer) {
    text_layer_set_text(s_message_status_layer, "Voice dictation unavailable");
    layer_set_hidden(text_layer_get_layer(s_message_status_layer), false);
  }
}

static void detail_quick_replies(ClickRecognizerRef recognizer, void *context) {
  thread_quick_replies(recognizer, context);
}

static void detail_dictate(ClickRecognizerRef recognizer, void *context) {
  thread_dictate(recognizer, context);
}

static void detail_clicks(void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "installing detail click handlers");
  // A long-click handler disables ScrollLayer's repeating DOWN handler. Make
  // the single-click behavior explicit so short presses still scroll while a
  // held DOWN reliably opens quick replies.
  window_single_click_subscribe(BUTTON_ID_UP, scroll_layer_scroll_up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, scroll_layer_scroll_down_click_handler);
  window_long_click_subscribe(BUTTON_ID_SELECT, 600, detail_dictate, NULL);
  window_long_click_subscribe(BUTTON_ID_DOWN, 600, detail_quick_replies, NULL);
}

static void detail_offset_changed(ScrollLayer *scroll_layer, void *context) {
  if (!s_detail_top_mask) return;
  GPoint offset = scroll_layer_get_content_offset(scroll_layer);
  layer_set_hidden(text_layer_get_layer(s_detail_top_mask), offset.y == 0);
}

static void layout_detail(void) {
  if (!s_detail_scroll || !s_detail_text_layer || !s_detail_hint_layer || !s_detail_text) return;
  GRect bounds = layer_get_bounds(scroll_layer_get_layer(s_detail_scroll));
  int16_t text_y = s_theme_size + 18;
  GFont detail_font = font_for_text(s_detail_text);
  text_layer_set_font(s_detail_text_layer, detail_font);
  text_layer_set_font(s_detail_sender_layer, font_for_text(s_detail_sender));
  layer_set_frame(text_layer_get_layer(s_detail_sender_layer), GRect(8, 4, bounds.size.w - 16, s_theme_size + 12));
  GSize text_size = graphics_text_layout_get_content_size(s_detail_text, detail_font,
    GRect(0, 0, bounds.size.w - 16, 30000), GTextOverflowModeWordWrap, GTextAlignmentLeft);
  int16_t text_height = text_size.h + 8;
  if (text_height < 34) text_height = 34;
  layer_set_frame(text_layer_get_layer(s_detail_text_layer), GRect(8, text_y, bounds.size.w - 16, text_height));
  scroll_layer_set_content_size(s_detail_scroll, GSize(bounds.size.w, text_y + 32 + text_height));
  scroll_layer_set_content_offset(s_detail_scroll, GPointZero, false);
  text_layer_set_text(s_detail_hint_layer, "Up/Down: scroll\nHold Select=voice Down=quick");
}

static void retry_reply(ClickRecognizerRef recognizer, void *context) {
  if (s_pending_quick_reply_index >= 0) {
    send_quick_reply_to_phone(s_pending_quick_reply_index, false);
  } else {
    send_reply_to_phone();
  }
}

static void delayed_request_messages(void *context) {
  s_message_request_timer = NULL;
  request_messages();
}

static uint16_t chat_rows(MenuLayer *menu_layer, uint16_t section, void *context) {
  return s_chat_state == VIEW_READY ? (uint16_t)s_chat_count : 0;
}

static int16_t chat_row_height(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  if (s_theme_size <= 14) return 58;
  if (s_theme_size <= 18) return 66;
  if (s_theme_size <= 22) return 76;
  if (s_theme_size <= 26) return 88;
  return 98;
}

static void draw_chat(GContext *ctx, const Layer *cell, MenuIndex *index, void *context) {
  if (index->row >= s_chat_count) return;
  Chat *chat = &s_chats[index->row];
  GRect bounds = layer_get_bounds(cell);
  bool selected = menu_layer_is_index_selected(s_chat_menu, index);
  int name_height = s_theme_size + 8;
  int preview_y = name_height;
  int preview_height = s_theme_size + 7;
  int unread_y = bounds.size.h - 18;

  graphics_context_set_text_color(ctx, selected ? s_theme.accent_text : s_theme.text);
  draw_marquee_text(ctx, chat->name, font_for_text(chat->name),
    GRect(8, 2, bounds.size.w - 16, name_height), selected);

  graphics_draw_text(ctx, chat->preview,
    font_for_text(chat->preview),
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

static void message_selection_changed(MenuLayer *menu_layer, MenuIndex new_index,
                                      MenuIndex old_index, void *context) {
  marquee_reset();
  if (new_index.section == 0 && new_index.row < s_message_count) {
    Message *message = &s_messages[new_index.row];
    if (strcmp(s_expanded_message_id, message->id) != 0) {
      if (s_content_request_timer) {
        app_timer_cancel(s_content_request_timer);
        s_content_request_timer = NULL;
      }
      if (s_detail_text) {
        free(s_detail_text);
        s_detail_text = NULL;
      }
      s_detail_length = 0;
      s_expanded_message_index = new_index.row;
      copy_text(s_expanded_message_id, sizeof(s_expanded_message_id), message->id);
      s_expanded_message_loaded = false;
      clear_media();
      copy_text(s_inline_attachment_id, sizeof(s_inline_attachment_id), message->attachment_id);
      s_inline_media_state = message->attachment_id[0] ? INLINE_MEDIA_LOADING : INLINE_MEDIA_NONE;
      s_inline_media_error[0] = '\0';
      menu_layer_reload_data(s_message_menu);
      s_content_request_timer = app_timer_register(250, request_selected_content, NULL);
    }
  }
  if (new_index.section != 0 || new_index.row > 1 || !s_has_older_messages ||
      s_loading_older_messages || !s_active_chat_id[0]) return;
  s_loading_older_messages = true;
  if (!request_command("load_older_messages", s_active_chat_id)) {
    s_loading_older_messages = false;
  }
}

static int16_t message_row_height(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  if (index->row >= s_message_count) return 80;
  Message *message = &s_messages[index->row];
  bool expanded = index->row == s_expanded_message_index &&
    strcmp(message->id, s_expanded_message_id) == 0;
  const char *text = expanded && s_expanded_message_loaded && s_detail_text ?
    s_detail_text : message->text;
  int16_t width = layer_get_bounds(menu_layer_get_layer(menu_layer)).size.w - 16;
  GSize text_size = graphics_text_layout_get_content_size(text && text[0] ? text : "[No text]",
    font_for_text(text), GRect(0, 0, width, 30000), GTextOverflowModeWordWrap, GTextAlignmentLeft);
  int32_t height = 6 + s_theme_size + 9 + (text_size.h > 24 ? text_size.h : 24) + 8 + 22;
  if (message->attachment_kind) {
    if (expanded && s_inline_media_state == INLINE_MEDIA_READY && s_media_bitmap) {
      height += s_media_height + 8;
    } else {
      height += 24;
    }
  }
  if (expanded) height += 19;
  return (int16_t)(height < 32000 ? height : 32000);
}

static void draw_message(GContext *ctx, const Layer *cell, MenuIndex *index, void *context) {
  if (index->row >= s_message_count) return;
  Message *message = &s_messages[index->row];
  GRect bounds = layer_get_bounds(cell);
  bool selected = menu_layer_is_index_selected(s_message_menu, index);
  bool expanded = index->row == s_expanded_message_index &&
    strcmp(message->id, s_expanded_message_id) == 0;
  const char *body = expanded && s_expanded_message_loaded && s_detail_text ?
    s_detail_text : message->text;
  int sender_height = s_theme_size + 9;
  int text_y = sender_height + 1;
  int time_y = bounds.size.h - 19;
  GSize body_size = graphics_text_layout_get_content_size(body && body[0] ? body : "[No text]",
    font_for_text(body), GRect(0, 0, bounds.size.w - 16, 30000),
    GTextOverflowModeWordWrap, GTextAlignmentLeft);
  int text_height = body_size.h > 24 ? body_size.h : 24;
  int content_y = text_y + text_height + 5;
  graphics_context_set_text_color(ctx, selected ? s_theme.accent_text : s_theme.text);

  draw_marquee_text(ctx, message->sender, font_for_text(message->sender),
    GRect(8, 1, bounds.size.w - 16, sender_height), selected);
  graphics_draw_text(ctx, body && body[0] ? body : "[No text]",
    font_for_text(body),
    GRect(8, text_y, bounds.size.w - 16, text_height),
    GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  if (message->attachment_kind) {
    if (expanded && s_inline_media_state == INLINE_MEDIA_READY && s_media_bitmap) {
      int image_x = (bounds.size.w - s_media_width) / 2;
      graphics_draw_bitmap_in_rect(ctx, s_media_bitmap,
        GRect(image_x, content_y, s_media_width, s_media_height));
      content_y += s_media_height + 8;
    } else {
      const char *label = expanded && s_inline_media_state == INLINE_MEDIA_LOADING ? "Loading photo…" :
        (expanded && s_inline_media_state == INLINE_MEDIA_FAILED ?
          (s_inline_media_error[0] ? s_inline_media_error : "Photo unavailable") :
          (message->attachment_kind == 2 ? "GIF preview" :
          (message->attachment_kind == 3 ? "Video preview" : "Photo")));
      graphics_draw_text(ctx, label, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
        GRect(8, content_y, bounds.size.w - 16, 18),
        GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
      content_y += 24;
    }
  }
  if (expanded) {
    graphics_draw_text(ctx, "Hold Select: voice  •  Down: quick",
      fonts_get_system_font(FONT_KEY_GOTHIC_14),
      GRect(8, content_y, bounds.size.w - 16, 16),
      GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  }
  graphics_context_set_fill_color(ctx, selected ? s_theme.accent : s_theme.background);
  graphics_fill_rect(ctx, GRect(0, time_y - 3, bounds.size.w, 22), 0, GCornerNone);
  graphics_draw_text(ctx, message->time,
    fonts_get_system_font(FONT_KEY_GOTHIC_14),
    GRect(8, time_y, bounds.size.w - 16, 16),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
}

static void retry_messages(ClickRecognizerRef recognizer, void *context) {
  request_messages();
}

static void message_long_select(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  thread_dictate(NULL, NULL);
}

static void message_long_down(ClickRecognizerRef recognizer, void *context) {
  thread_quick_replies(recognizer, context);
}

static int32_t message_row_top(int row) {
  int32_t top = 0;
  for (int index = 0; index < row && index < s_message_count; index++) {
    MenuIndex item = {.section = 0, .row = index};
    top += message_row_height(s_message_menu, &item, NULL);
  }
  return top;
}

static void message_move_selection(int delta) {
  if (!s_message_menu || s_message_count < 1) return;
  MenuIndex selected = menu_layer_get_selected_index(s_message_menu);
  int row = selected.row;
  if (row < 0) row = 0;
  if (row >= s_message_count) row = s_message_count - 1;
  MenuIndex current = {.section = 0, .row = row};
  int32_t top = message_row_top(row);
  int32_t height = message_row_height(s_message_menu, &current, NULL);
  ScrollLayer *scroll = menu_layer_get_scroll_layer(s_message_menu);
  GPoint content_offset = scroll_layer_get_content_offset(scroll);
  int32_t viewport_top = -content_offset.y;
  int32_t viewport_height = layer_get_bounds(menu_layer_get_layer(s_message_menu)).size.h;
  int32_t step = viewport_height > 54 ? viewport_height - 54 : viewport_height;

  if (delta > 0 && viewport_top + viewport_height < top + height) {
    int32_t next = viewport_top + step;
    int32_t last = top + height - viewport_height;
    if (next > last) next = last;
    scroll_layer_set_content_offset(scroll, GPoint(0, -next), true);
    return;
  }
  if (delta < 0 && viewport_top > top) {
    int32_t next = viewport_top - step;
    if (next < top) next = top;
    scroll_layer_set_content_offset(scroll, GPoint(0, -next), true);
    return;
  }

  int next_row = row + delta;
  if (next_row < 0 || next_row >= s_message_count) return;
  MenuIndex target = {.section = 0, .row = next_row};
  menu_layer_set_selected_index(s_message_menu, target, MenuRowAlignTop, true);
}

static void message_up(ClickRecognizerRef recognizer, void *context) {
  message_move_selection(-1);
}

static void message_down(ClickRecognizerRef recognizer, void *context) {
  message_move_selection(1);
}

static void install_message_clicks(void) {
  if (!s_message_menu || !s_message_window) return;
  window_set_click_config_provider(s_message_window, message_clicks);
}

static void message_clicks(void *context) {
  if (s_message_state == VIEW_READY) {
    window_single_click_subscribe(BUTTON_ID_UP, message_up);
    window_single_click_subscribe(BUTTON_ID_DOWN, message_down);
    window_long_click_subscribe(BUTTON_ID_SELECT, 600, thread_dictate, NULL);
    window_long_click_subscribe(BUTTON_ID_DOWN, 600, message_long_down, NULL);
  } else {
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
  if (strncmp(state, "reply_", 6) == 0) {
    ViewState reply_state = strcmp(state, "reply_sending") == 0 ? VIEW_REPLY_SENDING :
      (strcmp(state, "reply_pending") == 0 ? VIEW_REPLY_PENDING :
      (strcmp(state, "reply_sent") == 0 ? VIEW_REPLY_SENT : VIEW_REPLY_RETRYABLE));
    if (reply_state == VIEW_REPLY_SENT || reply_state == VIEW_REPLY_RETRYABLE) {
      cancel_reply_ack_timer();
    } else {
      start_reply_ack_timer();
    }
    cancel_reply_return_timer();
    s_reply_state = reply_state;
    if (reply_state == VIEW_REPLY_SENT) {
      s_reply_return_timer = app_timer_register(REPLY_SUCCESS_MS, reply_return_to_thread, NULL);
    }
    if (s_reply_window && window_stack_get_top_window() == s_reply_window) {
      reply_show_status(error && error[0] ? error : state_text(reply_state, true));
      return;
    }
    if (s_detail_window && window_stack_get_top_window() == s_detail_window && s_detail_hint_layer) {
      const char *feedback = error && error[0] ? error : state_text(reply_state, true);
      if (reply_state == VIEW_REPLY_RETRYABLE && !(error && error[0])) {
        feedback = "Reply failed\nHold Select to retry";
      }
      text_layer_set_text(s_detail_hint_layer, feedback);
      return;
    }
    if (s_message_window && window_stack_get_top_window() == s_message_window && s_message_status_layer) {
      const char *feedback = error && error[0] ? error : state_text(reply_state, true);
      if (reply_state == VIEW_REPLY_RETRYABLE && !(error && error[0])) {
        feedback = "Reply failed\nHold Select to retry";
      }
      text_layer_set_text(s_message_status_layer, feedback);
      layer_set_hidden(text_layer_get_layer(s_message_status_layer), false);
      return;
    }
    return;
  }
  ViewState mapped = VIEW_ERROR;
  if (strcmp(state, "setup") == 0) mapped = VIEW_SETUP;
  else if (strcmp(state, "loading") == 0) mapped = VIEW_LOADING;
  else if (strcmp(state, "empty") == 0) mapped = VIEW_EMPTY;
  else if (strcmp(state, "ready") == 0) mapped = VIEW_READY;

  if (s_message_window && window_stack_get_top_window() == s_message_window) {
    if (mapped != VIEW_LOADING) cancel_load_watchdog();
    APP_LOG(APP_LOG_LEVEL_INFO, "message state=%s count=%d error=%s", state, s_message_count, error ? error : "");
    s_message_state = mapped;
    set_status(s_message_status_layer, mapped, true);
    if (s_message_menu) menu_layer_reload_data(s_message_menu);
    if (mapped == VIEW_READY) {
      install_message_clicks();
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

  if (strcmp(command->value->cstring, "messages_start") == 0) {
    if (s_content_request_timer) {
      app_timer_cancel(s_content_request_timer);
      s_content_request_timer = NULL;
    }
    if (s_detail_text) {
      free(s_detail_text);
      s_detail_text = NULL;
    }
    s_detail_length = 0;
    s_detail_capacity = 0;
    s_expanded_message_index = -1;
    s_expanded_message_id[0] = '\0';
    s_expanded_message_loaded = false;
    s_inline_attachment_id[0] = '\0';
    s_inline_media_state = INLINE_MEDIA_NONE;
    clear_media();
    s_message_count = 0;
    memset(s_messages, 0, sizeof(s_messages));
    return;
  }

  if (strcmp(command->value->cstring, "messages_prepend_start") == 0) {
    Tuple *total = dict_find(iterator, MESSAGE_KEY_TOTAL);
    int added = total ? total->value->int32 : 0;
    if (added < 0) added = 0;
    if (added > MAX_MESSAGES - s_message_count) added = MAX_MESSAGES - s_message_count;
    if (added > 0) {
      memmove(s_messages + added, s_messages, (size_t)s_message_count * sizeof(Message));
      memset(s_messages, 0, (size_t)added * sizeof(Message));
      s_message_count += added;
      if (s_expanded_message_index >= 0) s_expanded_message_index += added;
    }
    return;
  }

  if (strcmp(command->value->cstring, "messages_ready") == 0) {
    Tuple *total = dict_find(iterator, MESSAGE_KEY_TOTAL);
    Tuple *selected = dict_find(iterator, MESSAGE_KEY_INDEX);
    Tuple *has_more = dict_find(iterator, MESSAGE_KEY_HAS_MORE);
    Tuple *mode = dict_find(iterator, MESSAGE_KEY_STATE);
    int count = total ? total->value->int32 : s_message_count;
    if (count < 0) count = 0;
    if (count > MAX_MESSAGES) count = MAX_MESSAGES;
    s_message_count = count;
    s_has_older_messages = has_more && has_more->value->int32 != 0;
    s_loading_older_messages = false;
    s_message_state = count > 0 ? VIEW_READY : VIEW_EMPTY;
    set_status(s_message_status_layer, s_message_state, true);
    if (s_message_menu) {
      menu_layer_reload_data(s_message_menu);
      if (count > 0) {
        int row = selected ? selected->value->int32 : count - 1;
        if (row < 0) row = 0;
        if (row >= count) row = count - 1;
        MenuIndex target = { .section = 0, .row = row };
        MenuRowAlign align = mode && strcmp(mode->value->cstring, "older") == 0 ?
          MenuRowAlignTop : MenuRowAlignBottom;
        menu_layer_set_selected_index(s_message_menu, target, align, false);
        install_message_clicks();
      }
    }
    cancel_load_watchdog();
    return;
  }

  if (strcmp(command->value->cstring, "message_history_failed") == 0) {
    s_loading_older_messages = false;
    if (s_message_menu && s_message_count > 1) {
      MenuIndex retry_position = { .section = 0, .row = 1 };
      menu_layer_set_selected_index(s_message_menu, retry_position, MenuRowAlignTop, true);
    }
    vibes_short_pulse();
    return;
  }

  if (strcmp(command->value->cstring, "quick_reply") == 0) {
    Tuple *index = dict_find(iterator, MESSAGE_KEY_INDEX);
    Tuple *text = dict_find(iterator, MESSAGE_KEY_QUICK_REPLY_TEXT);
    if (!index || index->value->int32 < 0 || index->value->int32 >= MAX_QUICK_REPLIES || !text) return;
    int slot = index->value->int32;
    copy_text(s_quick_replies[slot], sizeof(s_quick_replies[slot]), text->value->cstring);
    persist_write_string(PERSIST_QUICK_REPLY_BASE + slot, s_quick_replies[slot]);
    if (slot + 1 > s_quick_reply_count) s_quick_reply_count = slot + 1;
    if (s_reply_menu) menu_layer_reload_data(s_reply_menu);
    return;
  }

  if (strcmp(command->value->cstring, "quick_replies_ready") == 0) {
    Tuple *total = dict_find(iterator, MESSAGE_KEY_TOTAL);
    int count = total ? total->value->int32 : 0;
    if (count < 0) count = 0;
    if (count > MAX_QUICK_REPLIES) count = MAX_QUICK_REPLIES;
    s_quick_reply_count = count;
    persist_write_int(PERSIST_QUICK_REPLY_COUNT, count);
    for (int i = count; i < MAX_QUICK_REPLIES; i++) {
      s_quick_replies[i][0] = '\0';
      if (persist_exists(PERSIST_QUICK_REPLY_BASE + i)) persist_delete(PERSIST_QUICK_REPLY_BASE + i);
    }
    if (s_reply_menu) menu_layer_reload_data(s_reply_menu);
    return;
  }

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
    Tuple *theme_size = dict_find(iterator, MESSAGE_KEY_THEME_SIZE);
    if (theme) select_theme(theme->value->cstring);
    if (theme_background) s_theme.background.argb = theme_background->value->uint8;
    if (theme_text) s_theme.text.argb = theme_text->value->uint8;
    if (theme_muted) s_theme.muted.argb = theme_muted->value->uint8;
    if (theme_accent) s_theme.accent.argb = theme_accent->value->uint8;
    if (theme_accent_text) s_theme.accent_text.argb = theme_accent_text->value->uint8;
    if (theme_font) s_font_style = theme_font->value->uint8;
    if (theme_size) {
      int requested_size = theme_size->value->int32;
      s_theme_size = requested_size <= 14 ? 14 : (requested_size <= 18 ? 18 :
        (requested_size <= 22 ? 22 : (requested_size <= 26 ? 26 : 30)));
    }
    if (text_size) {
      s_large_text = strcmp(text_size->value->cstring, "large") == 0;
      if (!theme_size) s_theme_size = s_large_text ? 26 : 22;
      persist_write_bool(PERSIST_TEXT_SIZE, s_large_text);
      if (s_chat_menu) menu_layer_reload_data(s_chat_menu);
      if (s_message_menu) menu_layer_reload_data(s_message_menu);
    }
    s_large_text = s_theme_size >= 26;
    if (theme_background || theme_text || theme_accent || theme_font || theme_size) {
      persist_current_theme();
      apply_theme_to_layers();
      if (s_chat_menu) menu_layer_reload_data(s_chat_menu);
      if (s_message_menu) menu_layer_reload_data(s_message_menu);
      if (s_reply_menu) menu_layer_reload_data(s_reply_menu);
      if (s_detail_text && s_detail_scroll) layout_detail();
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
    Tuple *message_id = dict_find(iterator, MESSAGE_KEY_MSG_ID);
    copy_text(s_messages[slot].sender, sizeof(s_messages[slot].sender), sender ? sender->value->cstring : "Unknown");
    copy_text(s_messages[slot].text, sizeof(s_messages[slot].text), text ? text->value->cstring : "");
    copy_text(s_messages[slot].time, sizeof(s_messages[slot].time), time ? time->value->cstring : "");
    copy_text(s_messages[slot].id, sizeof(s_messages[slot].id), message_id ? message_id->value->cstring : "");
    Tuple *attachment_id = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_ID);
    Tuple *attachment_kind = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_KIND);
    copy_text(s_messages[slot].attachment_id, sizeof(s_messages[slot].attachment_id), attachment_id ? attachment_id->value->cstring : "");
    s_messages[slot].attachment_kind = attachment_kind ? attachment_kind->value->uint8 : 0;
    if (slot + 1 > s_message_count) s_message_count = slot + 1;
    APP_LOG(APP_LOG_LEVEL_INFO, "message received slot=%d count=%d", slot, s_message_count);
    return;
  }

  if (strcmp(command->value->cstring, "message_detail_start") == 0) {
    Tuple *message_id = dict_find(iterator, MESSAGE_KEY_MSG_ID);
    Tuple *total = dict_find(iterator, MESSAGE_KEY_TOTAL);
    if (!message_id || strcmp(message_id->value->cstring, s_expanded_message_id) != 0) return;
    size_t requested = total && total->value->int32 > 0 ? (size_t)total->value->int32 : 1;
    if (requested >= DETAIL_TEXT_CAPACITY) requested = DETAIL_TEXT_CAPACITY - 1;
    if (s_detail_text) free(s_detail_text);
    s_detail_text = malloc(requested + 1);
    s_detail_capacity = s_detail_text ? requested + 1 : 0;
    s_detail_length = 0;
    s_expanded_message_loaded = false;
    if (s_detail_text) s_detail_text[0] = '\0';
    return;
  }

  if (strcmp(command->value->cstring, "message_detail_chunk") == 0) {
    Tuple *message_id = dict_find(iterator, MESSAGE_KEY_MSG_ID);
    Tuple *text = dict_find(iterator, MESSAGE_KEY_DETAIL_TEXT);
    if (message_id && strcmp(message_id->value->cstring, s_expanded_message_id) == 0 && s_detail_text && text) {
      size_t length = strlen(text->value->cstring);
      size_t available = s_detail_capacity > s_detail_length ?
        s_detail_capacity - 1 - s_detail_length : 0;
      size_t copy_length = length < available ? length : available;
      memcpy(s_detail_text + s_detail_length, text->value->cstring, copy_length);
      s_detail_length += copy_length;
      s_detail_text[s_detail_length] = '\0';
    }
    return;
  }

  if (strcmp(command->value->cstring, "message_detail_end") == 0) {
    Tuple *message_id = dict_find(iterator, MESSAGE_KEY_MSG_ID);
    if (!message_id || strcmp(message_id->value->cstring, s_expanded_message_id) != 0) return;
    s_expanded_message_loaded = s_detail_text != NULL;
    if (s_message_menu) {
      menu_layer_reload_data(s_message_menu);
      if (s_expanded_message_index >= 0 && s_expanded_message_index < s_message_count) {
        MenuIndex selected = {.section = 0, .row = s_expanded_message_index};
        menu_layer_set_selected_index(s_message_menu, selected, MenuRowAlignTop, false);
      }
      install_message_clicks();
    }
    return;
  }

  if (strcmp(command->value->cstring, "media_start") == 0) {
    Tuple *attachment_id = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_ID);
    Tuple *width = dict_find(iterator, MESSAGE_KEY_MEDIA_WIDTH);
    Tuple *height = dict_find(iterator, MESSAGE_KEY_MEDIA_HEIGHT);
    Tuple *total = dict_find(iterator, MESSAGE_KEY_MEDIA_TOTAL);
    Tuple *kind = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_KIND);
    if (!attachment_id || strcmp(attachment_id->value->cstring, s_inline_attachment_id) != 0) return;
    clear_media();
    s_media_width = width ? width->value->int32 : 0;
    s_media_height = height ? height->value->int32 : 0;
    s_media_total = total ? total->value->uint32 : 0;
    s_media_kind = kind ? kind->value->uint8 : 1;
    if (s_media_width < 1 || s_media_height < 1 || s_media_total != (size_t)s_media_width * s_media_height || s_media_total > 32400) {
      s_inline_media_state = INLINE_MEDIA_FAILED;
      copy_text(s_inline_media_error, sizeof(s_inline_media_error), "Invalid photo");
      s_media_total = 0;
      return;
    }
    s_media_bitmap = gbitmap_create_blank(GSize(s_media_width, s_media_height), GBitmapFormat8Bit);
    if (!s_media_bitmap) {
      s_inline_media_state = INLINE_MEDIA_FAILED;
      copy_text(s_inline_media_error, sizeof(s_inline_media_error), "Not enough memory");
      s_media_total = 0;
    }
    return;
  }

  if (strcmp(command->value->cstring, "media_chunk") == 0) {
    Tuple *attachment_id = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_ID);
    Tuple *offset = dict_find(iterator, MESSAGE_KEY_MEDIA_OFFSET);
    Tuple *bytes = dict_find(iterator, MESSAGE_KEY_MEDIA_BYTES);
    size_t start = offset ? offset->value->uint32 : s_media_total;
    if (attachment_id && strcmp(attachment_id->value->cstring, s_inline_attachment_id) == 0 &&
        s_media_bitmap && bytes && start + bytes->length <= s_media_total) {
      uint8_t *bitmap_data = gbitmap_get_data(s_media_bitmap);
      uint16_t stride = gbitmap_get_bytes_per_row(s_media_bitmap);
      size_t copied = 0;
      while (copied < bytes->length) {
        size_t packed_offset = start + copied;
        size_t row = packed_offset / s_media_width;
        size_t column = packed_offset % s_media_width;
        size_t row_remaining = (size_t)s_media_width - column;
        size_t chunk_remaining = bytes->length - copied;
        size_t count = row_remaining < chunk_remaining ? row_remaining : chunk_remaining;
        memcpy(bitmap_data + row * stride + column, bytes->value->data + copied, count);
        copied += count;
      }
      s_media_received += bytes->length;
    }
    return;
  }

  if (strcmp(command->value->cstring, "media_end") == 0) {
    Tuple *attachment_id = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_ID);
    if (!attachment_id || strcmp(attachment_id->value->cstring, s_inline_attachment_id) != 0) return;
    if (!s_media_bitmap || s_media_received != s_media_total) {
      s_inline_media_state = INLINE_MEDIA_FAILED;
      copy_text(s_inline_media_error, sizeof(s_inline_media_error), "Photo incomplete");
      if (s_message_menu) menu_layer_reload_data(s_message_menu);
      return;
    }
    s_inline_media_state = INLINE_MEDIA_READY;
    if (s_message_menu) {
      menu_layer_reload_data(s_message_menu);
      if (s_expanded_message_index >= 0 && s_expanded_message_index < s_message_count) {
        MenuIndex selected = {.section = 0, .row = s_expanded_message_index};
        menu_layer_set_selected_index(s_message_menu, selected, MenuRowAlignTop, false);
      }
      install_message_clicks();
    }
    return;
  }

  if (strcmp(command->value->cstring, "media_failed") == 0) {
    Tuple *attachment_id = dict_find(iterator, MESSAGE_KEY_ATTACHMENT_ID);
    Tuple *error = dict_find(iterator, MESSAGE_KEY_ERROR);
    if (!attachment_id || strcmp(attachment_id->value->cstring, s_inline_attachment_id) != 0) return;
    clear_media();
    s_inline_media_state = INLINE_MEDIA_FAILED;
    copy_text(s_inline_media_error, sizeof(s_inline_media_error),
      error ? error->value->cstring : "Photo unavailable");
    if (s_message_menu) menu_layer_reload_data(s_message_menu);
    install_message_clicks();
    return;
  }
}

static uint16_t reply_rows(MenuLayer *menu_layer, uint16_t section, void *context) {
  return s_reply_showing_status ? 0 : (uint16_t)s_quick_reply_count;
}

static int16_t reply_row_height(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  if (s_theme_size <= 14) return 50;
  if (s_theme_size <= 18) return 58;
  if (s_theme_size <= 22) return 66;
  if (s_theme_size <= 26) return 74;
  return 82;
}

static void draw_reply(GContext *ctx, const Layer *cell, MenuIndex *index, void *context) {
  int quick_index = index->row;
  if (quick_index >= 0 && quick_index < s_quick_reply_count) {
    bool selected = menu_layer_is_index_selected(s_reply_menu, index);
    graphics_context_set_text_color(ctx, selected ? s_theme.accent_text : s_theme.text);
    GRect bounds = layer_get_bounds(cell);
    draw_marquee_text(ctx, s_quick_replies[quick_index], font_for_text(s_quick_replies[quick_index]),
      GRect(8, 3, bounds.size.w - 16, bounds.size.h - 6), selected);
  }
}

static void reply_selected(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  send_quick_reply_to_phone(index->row, true);
}

static void reply_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);
  window_set_background_color(window, s_theme.background);

  s_reply_menu = menu_layer_create(bounds);
  menu_layer_set_normal_colors(s_reply_menu, s_theme.background, s_theme.text);
  menu_layer_set_highlight_colors(s_reply_menu, s_theme.accent, s_theme.accent_text);
  menu_layer_set_callbacks(s_reply_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = reply_rows,
    .get_cell_height = reply_row_height,
    .draw_row = draw_reply,
    .select_click = reply_selected,
    .selection_changed = marquee_selection_changed
  });
  menu_layer_set_click_config_onto_window(s_reply_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_reply_menu));

  s_reply_status_layer = text_layer_create(GRect(14, 58, bounds.size.w - 28, 110));
  text_layer_set_background_color(s_reply_status_layer, s_theme.background);
  text_layer_set_text_color(s_reply_status_layer, s_theme.text);
  text_layer_set_font(s_reply_status_layer, theme_font());
  text_layer_set_text_alignment(s_reply_status_layer, GTextAlignmentCenter);
  text_layer_set_overflow_mode(s_reply_status_layer, GTextOverflowModeWordWrap);
  layer_set_hidden(text_layer_get_layer(s_reply_status_layer), true);
  layer_add_child(root, text_layer_get_layer(s_reply_status_layer));
  reply_show_menu();
}

static void reply_unload(Window *window) {
  menu_layer_destroy(s_reply_menu);
  text_layer_destroy(s_reply_status_layer);
  s_reply_menu = NULL;
  s_reply_status_layer = NULL;
  s_reply_showing_status = false;
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
    .select_click = chat_selected,
    .selection_changed = marquee_selection_changed
  });
  menu_layer_set_click_config_onto_window(s_chat_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_chat_menu));

  s_status_layer = text_layer_create(GRect(14, 58, bounds.size.w - 28, 110));
  text_layer_set_background_color(s_status_layer, s_theme.background);
  text_layer_set_text_color(s_status_layer, s_theme.text);
  text_layer_set_font(s_status_layer, theme_font());
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
    .select_click = NULL,
    .select_long_click = message_long_select,
    .selection_changed = message_selection_changed
  });
  install_message_clicks();
  layer_add_child(root, menu_layer_get_layer(s_message_menu));

  s_message_status_layer = text_layer_create(GRect(14, 58, bounds.size.w - 28, 110));
  text_layer_set_background_color(s_message_status_layer, s_theme.background);
  text_layer_set_text_color(s_message_status_layer, s_theme.text);
  text_layer_set_font(s_message_status_layer, theme_font());
  text_layer_set_text_alignment(s_message_status_layer, GTextAlignmentCenter);
  text_layer_set_overflow_mode(s_message_status_layer, GTextOverflowModeWordWrap);
  layer_add_child(root, text_layer_get_layer(s_message_status_layer));
  set_status(s_message_status_layer, s_message_state, true);
  window_set_click_config_provider(window, message_clicks);
}

static void detail_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);
  window_set_background_color(window, s_theme.background);
  s_detail_text = malloc(DETAIL_TEXT_CAPACITY);
  s_detail_length = 0;
  if (s_detail_text) s_detail_text[0] = '\0';

  GRect scroll_bounds = GRect(0, 0, bounds.size.w, bounds.size.h - 44);
  s_detail_scroll = scroll_layer_create(scroll_bounds);
  scroll_layer_set_content_size(s_detail_scroll, scroll_bounds.size);
  scroll_layer_set_shadow_hidden(s_detail_scroll, true);
  scroll_layer_set_callbacks(s_detail_scroll, (ScrollLayerCallbacks) {
    .click_config_provider = detail_clicks,
    .content_offset_changed_handler = detail_offset_changed
  });
  layer_add_child(root, scroll_layer_get_layer(s_detail_scroll));

  s_detail_sender_layer = text_layer_create(GRect(8, 4, bounds.size.w - 16, s_theme_size + 12));
  text_layer_set_background_color(s_detail_sender_layer, s_theme.background);
  text_layer_set_text_color(s_detail_sender_layer, s_theme.text);
  text_layer_set_font(s_detail_sender_layer, font_for_text(s_detail_sender));
  text_layer_set_overflow_mode(s_detail_sender_layer, GTextOverflowModeTrailingEllipsis);
  text_layer_set_text(s_detail_sender_layer, s_detail_sender);
  scroll_layer_add_child(s_detail_scroll, text_layer_get_layer(s_detail_sender_layer));

  s_detail_text_layer = text_layer_create(GRect(8, s_theme_size + 18, bounds.size.w - 16, 120));
  text_layer_set_background_color(s_detail_text_layer, s_theme.background);
  text_layer_set_text_color(s_detail_text_layer, s_theme.text);
  text_layer_set_font(s_detail_text_layer, font_for_text(s_detail_text));
  text_layer_set_overflow_mode(s_detail_text_layer, GTextOverflowModeWordWrap);
  text_layer_set_text(s_detail_text_layer, s_detail_text ? "Loading full message…" : "Not enough memory to open message");
  scroll_layer_add_child(s_detail_scroll, text_layer_get_layer(s_detail_text_layer));

  s_detail_top_mask = text_layer_create(GRect(0, 0, bounds.size.w, 12));
  text_layer_set_background_color(s_detail_top_mask, s_theme.background);
  text_layer_set_text(s_detail_top_mask, "");
  layer_set_hidden(text_layer_get_layer(s_detail_top_mask), true);
  layer_add_child(root, text_layer_get_layer(s_detail_top_mask));

  s_detail_hint_layer = text_layer_create(GRect(0, bounds.size.h - 44, bounds.size.w, 44));
  text_layer_set_background_color(s_detail_hint_layer, s_theme.accent);
  text_layer_set_text_color(s_detail_hint_layer, s_theme.accent_text);
  text_layer_set_font(s_detail_hint_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD));
  text_layer_set_text_alignment(s_detail_hint_layer, GTextAlignmentCenter);
  text_layer_set_text(s_detail_hint_layer, "Up/Down: scroll\nHold Select=voice Down=quick");
  layer_add_child(root, text_layer_get_layer(s_detail_hint_layer));
  scroll_layer_set_click_config_onto_window(s_detail_scroll, window);
}

static void detail_unload(Window *window) {
  text_layer_destroy(s_detail_sender_layer);
  text_layer_destroy(s_detail_text_layer);
  text_layer_destroy(s_detail_hint_layer);
  text_layer_destroy(s_detail_top_mask);
  scroll_layer_destroy(s_detail_scroll);
  if (s_detail_text) free(s_detail_text);
  s_detail_sender_layer = NULL;
  s_detail_text_layer = NULL;
  s_detail_hint_layer = NULL;
  s_detail_top_mask = NULL;
  s_detail_scroll = NULL;
  s_detail_text = NULL;
  s_detail_length = 0;
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
  if (s_content_request_timer) {
    app_timer_cancel(s_content_request_timer);
    s_content_request_timer = NULL;
  }
  if (s_detail_text) {
    free(s_detail_text);
    s_detail_text = NULL;
  }
  s_detail_length = 0;
  s_detail_capacity = 0;
  s_expanded_message_loaded = false;
  clear_media();
  menu_layer_destroy(s_message_menu);
  text_layer_destroy(s_message_status_layer);
  s_message_menu = NULL;
  s_message_status_layer = NULL;
}

static void init(void) {
  char saved_theme[20] = "classic";
  if (persist_exists(PERSIST_THEME)) persist_read_string(PERSIST_THEME, saved_theme, sizeof(saved_theme));
  s_large_text = persist_exists(PERSIST_TEXT_SIZE) && persist_read_bool(PERSIST_TEXT_SIZE);
  s_theme_size = s_large_text ? 26 : 22;
  s_quick_reply_count = persist_exists(PERSIST_QUICK_REPLY_COUNT) ? persist_read_int(PERSIST_QUICK_REPLY_COUNT) : 0;
  if (s_quick_reply_count < 0) s_quick_reply_count = 0;
  if (s_quick_reply_count > MAX_QUICK_REPLIES) s_quick_reply_count = MAX_QUICK_REPLIES;
  for (int i = 0; i < s_quick_reply_count; i++) {
    if (persist_exists(PERSIST_QUICK_REPLY_BASE + i)) {
      persist_read_string(PERSIST_QUICK_REPLY_BASE + i, s_quick_replies[i], sizeof(s_quick_replies[i]));
    }
  }
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
    s_theme_size = saved.size;
    s_large_text = s_theme_size >= 26;
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
  s_detail_window = window_create();
  window_set_window_handlers(s_detail_window, (WindowHandlers) {
    .load = detail_load,
    .unload = detail_unload
  });
  s_reply_window = window_create();
  window_set_window_handlers(s_reply_window, (WindowHandlers) {
    .load = reply_load,
    .unload = reply_unload
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
  cancel_reply_ack_timer();
  cancel_reply_return_timer();
  if (s_marquee_timer) app_timer_cancel(s_marquee_timer);
  if (s_message_request_timer) app_timer_cancel(s_message_request_timer);
  if (s_content_request_timer) app_timer_cancel(s_content_request_timer);
  if (s_dictation_session) dictation_session_destroy(s_dictation_session);
  unload_custom_theme_font();
  clear_media();
  window_destroy(s_media_window);
  window_destroy(s_reply_window);
  window_destroy(s_detail_window);
  window_destroy(s_message_window);
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
