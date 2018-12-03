const enum Command_Type {
    DRAW_TEXT = 0,
    FILL_RECTANGLE = 1,
    FILL_GRADIENT = 2,
    DRAW_RECTANGLE = 3,
    DRAW_ELLIPSE = 4,
    FILL_ELLIPSE = 5,
    DRAW_IMAGE = 6
}

interface Color {
    r: number;
    g: number;
    b: number;
}

interface V2 {
    x: number;
    y: number;
}

interface Button_State {
    hovered: boolean;
    pressed: boolean;
    clicked: boolean;
    clipped: boolean;
}

interface Draw_Text_Command {
    type: Command_Type.DRAW_TEXT;
    color: Color;
    text: string;
    is_bold: boolean;
    is_italic: boolean;
    font_family: string;
    font_size: number;
    top_left: V2;
}

interface Fill_Rectangle_Command {
    type: Command_Type.FILL_RECTANGLE;
    color: Color;
    top_left: V2;
    bot_right: V2;
}

interface Fill_Ellipse_Command {
    type: Command_Type.FILL_ELLIPSE;
    color: Color;
    top_left: V2;
    bot_right: V2;
}

interface Fill_Gradient_Command {
    type: Command_Type.FILL_GRADIENT;
    color_start: Color;
    color_end: Color;
    top_left: V2;
    bot_right: V2;
    gradient_top_left: V2;
    gradient_bot_right: V2;
}

interface Draw_Rectangle_Command {
    type: Command_Type.DRAW_RECTANGLE;
    color: Color;
    line_width: number;
    top_left: V2;
    bot_right: V2;
}

interface Draw_Ellipse_Command {
    type: Command_Type.DRAW_ELLIPSE;
    color: Color;
    line_width: number;
    top_left: V2;
    bot_right: V2;
}

type Draw_Command =
    Fill_Rectangle_Command |
    Fill_Gradient_Command |
    Fill_Ellipse_Command |
    Draw_Text_Command |
    Draw_Rectangle_Command |
    Draw_Ellipse_Command;

type Item_Id = string;
type UI_Code = (w: number, h: number) => void;

class Container {
    id: Item_Id;
    top_left: V2;
    bot_right: V2;
    scroll_position: V2;
    scroll_drag_offset: V2;
}

class Command_List {
    top_left: V2;
    bot_right: V2;
    start_index: number;
    end_index: number;
}

class Draw_Context {
    render_context: CanvasRenderingContext2D;
    command_lists: Command_List[] = [];
    num_lists = 0;
    commands: Draw_Command[] = [];
    num_commands: 0;
    container_stack: Container[] = [];
    mouse = v2(0, 0);
    mouse_down = false;
    wheel = v2(0, 0);
    hovered_item: Item_Id | null | undefined;
    pressed_item: Item_Id | null | undefined;
    ui_code: UI_Code;
    retained_containers: { [id: string]: Container } = {};
    screen_size: V2;
    queue_next_frame = false;
}

function v2(x: number, y: number) {
    return {x: x, y: y};
}

function v2_add(a: V2, b: V2): V2 {
    return { x: a.x + b.x, y: a.y + b.y };
}

function v2_sub(a: V2, b: V2): V2 {
    return { x: a.x - b.x, y: a.y - b.y };
}

function color(r: number, g: number, b: number): Color {
    return {r: r, g: g, b: b};
}

function unicolor(c: number): Color {
    return {r: c, g: c, b: c};
}

function rectangle_contains(top_left: V2, bottom_right: V2, point: V2) {
    return (point.x > top_left.x && point.y > top_left.y && point.x < bottom_right.x && point.y < bottom_right.y);
}

// TODO doesn't support bold/italic
function measure_text_width(text: string, font_family: string, font_size: number) {
    context.render_context.font = `${font_size}px ${font_family}`;
    return context.render_context.measureText(text).width; // TODO cache word sizes
}

function finish_current_command_list() {
    context.command_lists[context.num_lists - 1].end_index = context.num_commands;
}

function start_command_list() {
    const container = current_container();

    if (context.num_lists > 0) {
        finish_current_command_list();
    }

    context.command_lists[context.num_lists++] = {
        top_left: container.top_left,
        bot_right: container.bot_right,
        start_index: context.num_commands,
        end_index: -1
    };
}

function push_command(cmd: Draw_Command) {
    context.commands[context.num_commands++] = cmd;
}

function push_container(id: Item_Id, top_left: V2, bot_right: V2) {
    const origin = current_container().top_left;
    const old_container = context.retained_containers[id];

    if (old_container) {
        old_container.top_left = v2_add(origin, top_left);
        old_container.bot_right = v2_add(origin, bot_right);

        context.container_stack.push(old_container);
    } else {
        const new_container: Container = {
            id: id,
            top_left: top_left,
            bot_right: bot_right,
            scroll_position: v2(0, 0),
            scroll_drag_offset: v2(0, 0)
        };

        context.retained_containers[id] = new_container;
        context.container_stack.push(new_container);
    }

    start_command_list();
}

function current_container() {
    return context.container_stack[context.container_stack.length - 1];
}

function element_origin() {
    const container = current_container();
    return v2_sub(container.top_left, container.scroll_position);
}

function pop_container() {
    context.container_stack.pop();

    if (context.container_stack.length > 0) {
        start_command_list();
    } else {
        finish_current_command_list();
    }
}

function start_frame() {
    context.num_commands = 0;
    context.num_lists = 0;
    context.hovered_item = null;
    context.queue_next_frame = false;

    root_container.bot_right = context.screen_size;
    context.container_stack.push(root_container);
    start_command_list();
}

function finish_frame() {
    pop_container();



    if (!context.mouse_down) {
        context.pressed_item = null;
    } else {
        if (context.pressed_item === null) {
            context.pressed_item = undefined; // TODO dirty
        }
    }

    context.wheel = v2(0, 0);
}

function button_behavior(id: Item_Id, top_left: V2, bot_right: V2): Button_State {
    const container = current_container();

    if (top_left.x > container.bot_right.x ||
        top_left.y > container.bot_right.y ||
        bot_right.x < container.top_left.x ||
        bot_right.y < container.top_left.y) {
        return button_not_on_screen;
    }

    if (rectangle_contains(top_left, bot_right, context.mouse)) {
        context.hovered_item = id;

        if (context.mouse_down && context.hovered_item == id) {
            context.pressed_item = id;
        }
    }

    const clicked = !context.mouse_down && context.hovered_item == id && context.pressed_item == id;

    return {
        clicked: clicked,
        hovered: context.hovered_item == id,
        pressed: context.pressed_item == id,
        clipped: false
    };
}

function container_scrollbar(content_height: number) {
    const container = current_container();
    const container_origin = container.top_left;
    const container_size = v2_sub(container.bot_right, container.top_left);
    const container_height_actual = container_size.y;
    const scrollbar_height_relative = container_height_actual / content_height;

    if (scrollbar_height_relative >= 1) {
        return;
    }

    const scrollbar_height = Math.max(scrollbar_height_relative * container_height_actual, 20);
    const container_height = container_height_actual - scrollbar_height;

    const scrollbar_offset_relative = container.scroll_position.y / content_height;
    const scrollbar_size = v2(16, scrollbar_height);
    const scrollbar_position = v2_add(container_origin, v2(container_size.x - scrollbar_size.x, scrollbar_offset_relative * container_height));
    const scrollbar_bot_right = v2_add(scrollbar_position, scrollbar_size);

    const id = "frame_scrollbar_" + container.id;
    const was_pressed = context.pressed_item == id;
    const scrollbar = button_behavior(id, scrollbar_position, scrollbar_bot_right);
    const became_pressed = scrollbar.pressed && ! was_pressed;

    if (became_pressed) {
        container.scroll_drag_offset.y = context.mouse.y - scrollbar_position.y
    }

    function clamp(x: number, min: number, max: number) {
        return Math.min(max, Math.max(x, min));
    }

    function clamp_scroll_space(scroll_position_content_space: number) {
        return clamp(scroll_position_content_space, 0, content_height - container_height_actual);
    }

    let scrollbar_color;

    if (scrollbar.pressed) {
        const scroll_position_screen_space = context.mouse.y - container_origin.y - container.scroll_drag_offset.y;
        const scroll_position_content_space = scroll_position_screen_space / container_height * content_height;

        container.scroll_position.y = clamp_scroll_space(scroll_position_content_space);
        context.queue_next_frame = true;

        scrollbar_color = unicolor(120);
    } else if (scrollbar.hovered) {
        scrollbar_color = unicolor(168);
    } else {
        scrollbar_color = unicolor(193);
    }

    // TODO pull this out into components.ts
    push_command({
        type: Command_Type.FILL_RECTANGLE,
        color: unicolor(241),
        top_left: v2(container_origin.x + container_size.x - scrollbar_size.x, container_origin.y),
        bot_right: container.bot_right
    });

    push_command({
        type: Command_Type.FILL_RECTANGLE,
        color: scrollbar_color,
        top_left: v2(scrollbar_position.x + 2, scrollbar_position.y),
        bot_right: v2(scrollbar_bot_right.x - 1, scrollbar_bot_right.y)
    });

    const mouse_scroll = -context.wheel.y;

    if (mouse_scroll != 0 && rectangle_contains(container.top_left, container.bot_right, context.mouse)) {
        container.scroll_position.y = clamp_scroll_space(container.scroll_position.y - mouse_scroll);
        context.queue_next_frame = true;
    }
}

const context = new Draw_Context();
const root_container: Container = {
    id: "",
    top_left: v2(0, 0),
    bot_right: v2(0, 0),
    scroll_position: v2(0, 0),
    scroll_drag_offset: v2(0, 0)
};

const button_not_on_screen: Button_State = {
    pressed: false,
    hovered: false,
    clicked: false,
    clipped: true
};

function color_to_string(color: Color) {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function dispatch_command(render_context: CanvasRenderingContext2D, cmd: Draw_Command) {
    // TODO style batching

    function ellipse_path(cmd: Draw_Ellipse_Command | Fill_Ellipse_Command) {
        const top_left = cmd.top_left;
        const bot_right = cmd.bot_right;
        const size = v2_sub(bot_right, top_left);
        const center = v2_add(top_left, size);

        render_context.beginPath();
        render_context.ellipse(center.x, center.y, size.x / 2, size.y / 2, 0, 0, 2 * Math.PI);
    }

    switch (cmd.type) {
        case Command_Type.DRAW_TEXT: {
            const top_left = cmd.top_left;

            render_context.font = `${cmd.is_bold ? "bold" : ""} ${cmd.is_italic ? "italic" : ""} ${cmd.font_size}px ${cmd.font_family}`;
            render_context.fillStyle = color_to_string(cmd.color);
            render_context.fillText(cmd.text, top_left.x, top_left.y + cmd.font_size / 2);

            break;
        }

        case Command_Type.FILL_RECTANGLE: {
            const top_left = cmd.top_left;
            const bot_right = cmd.bot_right;

            render_context.fillStyle = color_to_string(cmd.color);
            render_context.fillRect(top_left.x, top_left.y, bot_right.x - top_left.x, bot_right.y - top_left.y);

            break;
        }

        case Command_Type.FILL_ELLIPSE: {
            ellipse_path(cmd);

            render_context.fillStyle = color_to_string(cmd.color);
            render_context.fill();

            break;
        }

        case Command_Type.DRAW_ELLIPSE: {
            ellipse_path(cmd);

            render_context.strokeStyle = color_to_string(cmd.color);
            render_context.lineWidth = cmd.line_width;
            render_context.stroke();

            break;
        }

        case Command_Type.FILL_GRADIENT: {
            const top_left = cmd.top_left;
            const bot_right = cmd.bot_right;
            const size = v2_sub(bot_right, top_left);
            const gradient = render_context.createLinearGradient(
                top_left.x + size.x * cmd.gradient_top_left.x,
                top_left.y + size.y * cmd.gradient_top_left.y,
                top_left.x + size.x * cmd.gradient_bot_right.x,
                top_left.y + size.y * cmd.gradient_bot_right.y
            );

            gradient.addColorStop(0, color_to_string(cmd.color_start));
            gradient.addColorStop(1, color_to_string(cmd.color_end));

            render_context.fillStyle = gradient;
            render_context.fillRect(top_left.x, top_left.y, bot_right.x - top_left.x, bot_right.y - top_left.y);

            break;
        }

        case Command_Type.DRAW_RECTANGLE: {
            const half_line = v2(cmd.line_width / 2, cmd.line_width / 2);
            const top_left = v2_add(cmd.top_left, half_line);
            const bot_right = v2_sub(cmd.bot_right, half_line);

            render_context.strokeStyle = color_to_string(cmd.color);
            render_context.lineWidth = cmd.line_width;
            render_context.strokeRect(top_left.x, top_left.y, bot_right.x - top_left.x, bot_right.y - top_left.y);

            break;
        }

    }
}

function do_ui_frame(render_context: CanvasRenderingContext2D) {
    context.render_context = render_context;

    start_frame();

    context.ui_code(context.screen_size.x, context.screen_size.y);

    finish_frame();

    if (context.hovered_item) {
        document.body.style.cursor = "pointer";
    } else {
        document.body.style.cursor = null;
    }
}

function draw_ui(render_context: CanvasRenderingContext2D) {
    window.requestAnimationFrame(() => {
        render_context.textBaseline = "middle";
        render_context.fillStyle = "white";
        render_context.fillRect(0, 0, context.screen_size.x, context.screen_size.y);

        // TODO the whole agenda with one contiguous command array brings issues with many small frames
        // TODO in one big frame because big command list is split into multiple small ones
        for (let index = 0; index < context.num_lists; index++) {
            const list = context.command_lists[index];

            render_context.save();

            const clip_path = new Path2D();
            clip_path.rect(list.top_left.x, list.top_left.y, list.bot_right.x - list.top_left.x, list.bot_right.y - list.top_left.y);
            render_context.clip(clip_path);

            for (let command_index = list.start_index; command_index < list.end_index; command_index++) {
                dispatch_command(render_context, context.commands[command_index]);
            }

            render_context.restore();
        }
    });
}

function imgui(canvas: HTMLCanvasElement, ui_code: UI_Code) {
    const render_context = canvas.getContext("2d", { alpha: false });

    if (render_context == null) {
        throw "Render context not available";
    }

    context.ui_code = ui_code;

    function resize_canvas_and_do_frame() {
        context.screen_size = v2(window.innerWidth, window.innerHeight);

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (render_context) {
            do_ui_frame(render_context);
            draw_ui(render_context);

        }
    }

    window.addEventListener("resize", resize_canvas_and_do_frame, false);

    canvas.addEventListener("mousedown", (event) => {
        if (event.button == 0) {
            context.mouse_down = true;

            do_ui_frame(render_context);
            draw_ui(render_context);
        }
    });

    canvas.addEventListener("mouseup", (event) => {
        if (event.button == 0) {
            context.mouse_down = false;

            do_ui_frame(render_context);
            do_ui_frame(render_context);
            draw_ui(render_context);
        }
    });

    canvas.addEventListener("mousemove", (event) => {
        context.mouse = v2(event.clientX, event.clientY);

        do_ui_frame(render_context);

        if (context.queue_next_frame) {
            do_ui_frame(render_context);
        }

        draw_ui(render_context);
    });

    canvas.addEventListener("wheel", (event) => {
        context.wheel = v2(event.deltaX, event.deltaY);

        do_ui_frame(render_context);

        if (context.queue_next_frame) {
            do_ui_frame(render_context);
        }

        draw_ui(render_context);
    });

    canvas.addEventListener("mouseenter", () => {
        if (context.mouse_down) {
            context.mouse_down = false;

            do_ui_frame(render_context)
            draw_ui(render_context);
        }
    });

    resize_canvas_and_do_frame();
}