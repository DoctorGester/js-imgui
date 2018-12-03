class Text_Params {
    font_size = 16;
    font_family = "Colibri";
    is_bold = false;
    is_italic = false;
    color: Color = black;

    colored(color: Color) {
        this.color = color;
        return this;
    }

    size(size: number) {
        this.font_size = size;
        return this;
    }

    font(family: string) {
        this.font_family = family;
        return this;
    }

    bold() {
        this.is_bold = true;
        return this;
    }

    italic() {
        this.is_italic = true;
        return this;
    }
}

function text_params() {
    return new Text_Params();
}

const black = color(0, 0, 0);

function button(text: string, font_size: number, top_left_relative: V2, button_size: V2) {
    const id = text; // TODO
    const top_left = v2_add(element_origin(), top_left_relative);
    const bot_right = v2_add(top_left, button_size);
    const state = button_behavior(id, top_left, bot_right);

    if (!state.clipped) {
        const font_family = "Segoe UI";
        const text_width = measure_text_width(text, font_family, font_size);

        push_command({
            type: Command_Type.FILL_GRADIENT,
            color_start: state.pressed ? unicolor(221) : unicolor(247),
            color_end: state.pressed ? unicolor(247) : unicolor(221),
            gradient_top_left: v2(0.5, 0),
            gradient_bot_right: v2(0.5, 1),
            top_left: top_left,
            bot_right: bot_right
        });

        push_command({
            type: Command_Type.DRAW_RECTANGLE,
            color: state.hovered && !state.pressed ? unicolor(124) : unicolor(165),
            line_width: 1,
            top_left: top_left,
            bot_right: bot_right
        });

        push_command({
            type: Command_Type.DRAW_TEXT,
            font_size: font_size,
            font_family: font_family,
            is_bold: false,
            is_italic: false,
            text: text,
            top_left: v2_add(top_left, v2((button_size.x - text_width) / 2, (button_size.y - font_size) / 2)),
            color: color(0, 0, 0)
        });
    }

    return state.clicked;
}

function text(text: string, top_left_relative: V2, text_params?: Text_Params) {
    if (!text_params) {
        text_params = new Text_Params();
    }

    const top_left = v2_add(element_origin(), top_left_relative);

    push_command({
        type: Command_Type.DRAW_TEXT,
        text: text,
        top_left: top_left,
        color: text_params.color,
        is_bold: text_params.is_bold,
        is_italic: text_params.is_italic,
        font_size: text_params.font_size,
        font_family: text_params.font_family
    });
}

function container(id: string, x: number, y: number, w: number, h: number, code: () => void) {
    push_container(id, v2(x, y), v2(x + w, y + h));
    code();
    pop_container();
}

function container_with_background(id: string, x: number, y: number, w: number, h: number, color: Color, code: () => void) {
    push_command({
        type: Command_Type.FILL_RECTANGLE,
        color: color,
        top_left:  v2(x, y),
        bot_right: v2(x + w, y + h)
    });

    container(id, x, y, w, h, code);
}

class Vertical_Layout {
    cursor: V2;
    total_height = 0;

    constructor(x: number, y: number) {
        this.cursor = v2(x, y);
    }

    advance(by_y: number): V2 {
        const cursor = this.cursor;
        this.cursor = v2(this.cursor.x, this.cursor.y + by_y);
        this.total_height += by_y;
        return cursor;
    }
}

class Row_Layout extends Vertical_Layout{
    row_height: number;

    constructor(x: number, y: number, row_height: number) {
        super(x, y);
        this.row_height = row_height;
    }

    advance(): V2 {
        return super.advance(this.row_height);
    }
}

function absolute(v: V2) {
    return v2_add(element_origin(), v);
}