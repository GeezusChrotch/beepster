#include <pebble.h>

#define MAX_CHATS 12
#define MAX_MESSAGES 12
#define CHAT_ID_LEN 128
#define CHAT_NAME_LEN 64
#define CHAT_PREVIEW_LEN 128
#define MESSAGE_SENDER_LEN 48
#define MESSAGE_TEXT_LEN 256
#define MESSAGE_TIME_LEN 20

typedef enum {
  VIEW_SETUP,
  VIEW_LOADING,
  VIEW_READY,
  VIEW_EMPTY,
  VIEW_ERROR
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
} Message;

typedef struct {
  GColor background;
  GColor text;
  GColor muted;
  GColor accent;
  GColor accent_text;
} Theme;

static Theme s_theme = {
  .background = GColorWhite,
  .text = GColorBlack,
  .muted = GColorDarkGray,
  .accent = GColorDukeBlue,
  .accent_text = GColorWhite
};

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

static void main_clicks(void *context);
static void message_clicks(void *context);
static void apply_theme_to_layers(void);

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

static void request_command(const char *command, const char *chat_id) {
  DictionaryIterator *iterator;
  AppMessageResult result = app_message_outbox_begin(&iterator);
  if (result != APP_MSG_OK || !iterator) return;
  dict_write_cstring(iterator, MESSAGE_KEY_COMMAND, command);
  if (chat_id && chat_id[0]) dict_write_cstring(iterator, MESSAGE_KEY_CHAT_ID, chat_id);
  app_message_outbox_send();
}

static void request_chats(void) {
  s_chat_state = VIEW_LOADING;
  s_chat_count = 0;
  set_status(s_status_layer, s_chat_state, false);
  if (s_chat_menu) menu_layer_reload_data(s_chat_menu);
  if (s_main_window) window_set_click_config_provider(s_main_window, main_clicks);
  request_command("load_chats", NULL);
}

static void request_messages(void) {
  s_message_state = VIEW_LOADING;
  s_message_count = 0;
  set_status(s_message_status_layer, s_message_state, true);
  if (s_message_menu) menu_layer_reload_data(s_message_menu);
  if (s_message_window) window_set_click_config_provider(s_message_window, message_clicks);
  request_command("load_messages", s_active_chat_id);
}

static uint16_t chat_rows(MenuLayer *menu_layer, uint16_t section, void *context) {
  return s_chat_state == VIEW_READY ? (uint16_t)s_chat_count : 0;
}

static int16_t chat_row_height(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  return 66;
}

static void draw_chat(GContext *ctx, const Layer *cell, MenuIndex *index, void *context) {
  if (index->row >= s_chat_count) return;
  Chat *chat = &s_chats[index->row];
  GRect bounds = layer_get_bounds(cell);
  bool selected = menu_layer_is_index_selected(s_chat_menu, index);

  graphics_context_set_text_color(ctx, selected ? s_theme.accent_text : s_theme.text);
  graphics_draw_text(ctx, chat->name,
    fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD),
    GRect(8, 2, bounds.size.w - 16, 30),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  graphics_draw_text(ctx, chat->preview,
    fonts_get_system_font(FONT_KEY_GOTHIC_18),
    GRect(8, 31, bounds.size.w - 16, 25),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  if (chat->unread > 0) {
    char unread[20];
    snprintf(unread, sizeof(unread), "%d new", chat->unread);
    graphics_draw_text(ctx, unread,
      fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
      GRect(8, 49, bounds.size.w - 16, 16),
      GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
  }
}

static void chat_selected(MenuLayer *menu_layer, MenuIndex *index, void *context) {
  if (index->row >= s_chat_count) return;
  copy_text(s_active_chat_id, sizeof(s_active_chat_id), s_chats[index->row].id);
  copy_text(s_active_chat_name, sizeof(s_active_chat_name), s_chats[index->row].name);
  if (!s_message_window) return;
  window_stack_push(s_message_window, true);
  request_messages();
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
  return 84;
}

static void draw_message(GContext *ctx, const Layer *cell, MenuIndex *index, void *context) {
  if (index->row >= s_message_count) return;
  Message *message = &s_messages[index->row];
  GRect bounds = layer_get_bounds(cell);
  bool selected = menu_layer_is_index_selected(s_message_menu, index);
  graphics_context_set_text_color(ctx, selected ? s_theme.accent_text : s_theme.text);

  graphics_draw_text(ctx, message->sender,
    fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
    GRect(8, 1, bounds.size.w - 16, 24),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, message->text,
    fonts_get_system_font(FONT_KEY_GOTHIC_18),
    GRect(8, 23, bounds.size.w - 16, 48),
    GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  graphics_draw_text(ctx, message->time,
    fonts_get_system_font(FONT_KEY_GOTHIC_14),
    GRect(8, 66, bounds.size.w - 16, 16),
    GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
}

static void retry_messages(ClickRecognizerRef recognizer, void *context) {
  request_messages();
}

static void message_clicks(void *context) {
  if (s_message_state != VIEW_READY) {
    window_single_click_subscribe(BUTTON_ID_SELECT, retry_messages);
  }
}

static void apply_state(const char *state, const char *error) {
  ViewState mapped = VIEW_ERROR;
  if (strcmp(state, "setup") == 0) mapped = VIEW_SETUP;
  else if (strcmp(state, "loading") == 0) mapped = VIEW_LOADING;
  else if (strcmp(state, "empty") == 0) mapped = VIEW_EMPTY;
  else if (strcmp(state, "ready") == 0) mapped = VIEW_READY;

  if (s_message_window && window_stack_get_top_window() == s_message_window) {
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
    if (theme) select_theme(theme->value->cstring);
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
    if (slot + 1 > s_message_count) s_message_count = slot + 1;
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
    .draw_row = draw_message
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

static void message_unload(Window *window) {
  menu_layer_destroy(s_message_menu);
  text_layer_destroy(s_message_status_layer);
  s_message_menu = NULL;
  s_message_status_layer = NULL;
}

static void init(void) {
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

  app_message_register_inbox_received(inbox_received);
  app_message_open(2048, 512);
  window_stack_push(s_main_window, true);
  request_chats();
}

static void deinit(void) {
  window_destroy(s_message_window);
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
