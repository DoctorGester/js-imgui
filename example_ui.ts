interface Person {
    name: string;
    avatar: string;
}

interface Message {
    text: string;
    sender: Person;
    time: string;
}

interface Conversation {
    has_new_messages: boolean;
    name: string;
    messages: [];
}

interface Channel extends Conversation {
    members: number;
}

interface DM extends Conversation {
    is_you: boolean;
    is_online: boolean;
}

interface State {
    team_name: string;
    user_name: string;
    selected_conversation: string;
    channels: Channel[];
    directMessages: DM[];
}

function default_dm(name: string, is_online = true, has_new_messages = false, is_you = false): DM {
    return { name: name, is_you: is_you, has_new_messages: has_new_messages, is_online: is_online, messages: [] };
}

function message(from: Person, time: string, text: string): Message {
    return {
        sender: from,
        text: text,
        time: time
    }
}

function default_state(): State {
    return {
        team_name: "Wrike",
        user_name: "Kirill Artemov",
        selected_conversation: "general",
        channels: [
            {
                name: "general",
                has_new_messages: false,
                members: 126,
                messages: [
                ]
            },
            {
                name: "beginners",
                members: 30,
                has_new_messages: false,
                messages: [

                ]
            },
            {
                name: "random",
                members: 11,
                has_new_messages: true,
                messages: [

                ]
            }
        ],
        directMessages: [
            default_dm("slackbot"),
            default_dm("Kirill Artemov", true, false, true),
            default_dm("Dmitry Puchkov"),
            default_dm("Vladimir Putin", true, true)
        ]
    }
}

const default_font = "'Lato', sans-serif";
const left_panel_padding_left = 12;
const left_panel_width = 220;
const white = unicolor(255);
const colors = {
    left_panel: {
        bg: color(77, 56, 75),
        text: color(184, 176, 183),
        selected_text: white,
        channel: {
            hover_bg: color(62, 49, 60),
            selected_bg: color(76, 150, 137)
        },
        conversation: {
            status_online: color(56, 151, 141),
            status_offline: color(129, 114, 127),
            status_selected: white
        }
    }
};

function default_text_params() {
    return text_params().font(default_font).size(16);
}

function left_panel_button_flat(id: string, is_selected: boolean, top_left_relative: V2, size: V2) {
    const top_left = v2_add(element_origin(), top_left_relative);
    const bot_right = v2_add(top_left, size);
    const state = button_behavior(id, top_left, bot_right);

    if (!state.clipped) {
        if (state.hovered || is_selected) {
            push_command({
                type: Command_Type.FILL_RECTANGLE,
                top_left: top_left,
                bot_right: bot_right,
                color: is_selected ? colors.left_panel.channel.selected_bg : colors.left_panel.channel.hover_bg
            })
        }
    }

    return state;
}

function team_button(team_name: string, user_name: string, width: number): number {
    const button_height = 60;
    const layout = new Vertical_Layout(left_panel_padding_left, 0);
    const state = left_panel_button_flat("team_button", false, v2(0, 0,), v2(width, button_height));
    const header_font_size = 18;
    const name_font_size = 14;

    layout.advance(9);

    text(team_name, layout.advance(header_font_size), default_text_params()
        .colored(white)
        .bold()
        .size(header_font_size));

    layout.advance(8);

    const status_radius = 8;
    const status_top_left = v2_add(layout.cursor, v2(0, (name_font_size - status_radius * 2) / 2));
    online_status_indicator(true, false, 8, status_top_left);

    text(user_name, v2_add(layout.advance(name_font_size), v2(status_radius * 2, 0)), default_text_params()
        .colored(state.hovered ? colors.left_panel.selected_text : colors.left_panel.text)
        .size(name_font_size));

    return button_height;
}

function online_status_indicator(is_online: boolean, is_selected: boolean, radius: number, top_left_relative: V2) {
    const online_status_top_left = absolute(top_left_relative);

    if (is_online) {
        push_command({
            type: Command_Type.FILL_ELLIPSE,
            top_left: online_status_top_left,
            bot_right: v2_add(online_status_top_left, v2(radius, radius)),
            color: is_selected ? colors.left_panel.conversation.status_selected : colors.left_panel.conversation.status_online
        });
    } else {
        push_command({
            type: Command_Type.DRAW_ELLIPSE,
            top_left: online_status_top_left,
            bot_right: v2_add(online_status_top_left, v2(radius, radius)),
            color: is_selected ? colors.left_panel.conversation.status_selected : colors.left_panel.conversation.status_offline,
            line_width: 2
        });
    }
}

function channel_button(conversation: Conversation, is_selected: boolean, top_left_relative: V2, width: number): boolean {
    const height = 26;
    const font_size = 16;
    const state = left_panel_button_flat(conversation.name, is_selected, top_left_relative, v2(width, height));

    if (!state.clipped) {
        const text_top_left = v2_add(top_left_relative, v2(left_panel_padding_left, (height - font_size) / 2));
        const params = default_text_params()
            .size(16)
            .colored((is_selected || conversation.has_new_messages) ? colors.left_panel.selected_text : colors.left_panel.text);

        if (conversation.has_new_messages) {
            params.bold();
        }

        text("#  " + conversation.name, text_top_left, params);
    }

    return state.clicked;
}

function direct_messages_button(person: DM, is_selected: boolean, top_left_relative: V2, width: number): boolean {
    const height = 26;
    const font_size = 16;
    const state = left_panel_button_flat(person.name, is_selected, top_left_relative, v2(width, height));
    const online_status_radius = 8;
    const online_status_diameter = online_status_radius * 2;

    if (!state.clipped) {
        const online_status_top_left = v2_add(top_left_relative, v2(left_panel_padding_left, (height - online_status_diameter) / 2));

        online_status_indicator(person.is_online, is_selected, online_status_radius, online_status_top_left);

        const text_top_left = v2_add(top_left_relative, v2(left_panel_padding_left + online_status_diameter, (height - font_size) / 2));
        const params = default_text_params()
            .size(16)
            .colored((is_selected || person.has_new_messages) ? colors.left_panel.selected_text : colors.left_panel.text);

        if (person.has_new_messages) {
            params.bold();
        }

        if (!person.is_online) {
            params.italic();
        }

        text(person.name, text_top_left, params);
    }

    return state.clicked;
}

function channels_list(state: State, start_y: number): number {
    const channels = new Row_Layout(0, start_y, 26);

    text(`Channels (${state.channels.length})`, v2_add(channels.advance(), v2(left_panel_padding_left, 0)), default_text_params()
        .colored(colors.left_panel.text));

    for (let channel of state.channels) {
        if (channel_button(channel, channel.name == state.selected_conversation, channels.advance(), left_panel_width)) {
            state.selected_conversation = channel.name;
            channel.has_new_messages = false;
        }
    }

    return channels.total_height;
}

function direct_messages_list(state: State, start_y: number): number {
    const convos = new Row_Layout(0, start_y, 26);

    text(`Direct Messages (${state.channels.length})`, v2_add(convos.advance(), v2(left_panel_padding_left, 0)), default_text_params()
        .colored(colors.left_panel.text));

    for (let conversation of state.directMessages) {
        if (direct_messages_button(conversation, conversation.name == state.selected_conversation, convos.advance(), left_panel_width)) {
            state.selected_conversation = conversation.name;
            conversation.has_new_messages = false;
        }
    }

    return convos.total_height;
}

function apps_list(start_y: number) {
    const apps = new Row_Layout(0, start_y, 26);

    text(`Apps`, v2_add(apps.advance(), v2(left_panel_padding_left, 0)), default_text_params()
        .colored(colors.left_panel.text));
}

function example_ui() {
    const canvas = document.getElementById("canvas");

    if (!canvas) {
        return;
    }

    const state = default_state();
    const spacing_between_blocks = 18;

    imgui(canvas as HTMLCanvasElement, (w: number, h: number) => {
        container_with_background("left_panel", 0, 0, left_panel_width, h, colors.left_panel.bg, () => {
            const blocks = new Vertical_Layout(0, 0);

            blocks.advance(team_button(state.team_name, state.user_name, left_panel_width));
            blocks.advance(spacing_between_blocks);
            blocks.advance(channels_list(state, blocks.cursor.y));
            blocks.advance(spacing_between_blocks);
            blocks.advance(direct_messages_list(state, blocks.cursor.y));
            blocks.advance(spacing_between_blocks);
            apps_list(blocks.cursor.y);
        });
    });
}

function example_ui_2() {
    const canvas = document.getElementById("canvas");

    if (!canvas) {
        return;
    }

    let state = [ "first", "second", "third" ];

    imgui(canvas as HTMLCanvasElement, () => {
        container("test", 100, 300, 200, 200, () => {
            const layout = new Row_Layout(0, 0, 40);

            for (let i = 0; i < state.length; i++) {
                if (button(state[i], 16, layout.advance(), v2(75, 32))) {
                    console.log("Clicked " + i)
                }
            }

            container_scrollbar(layout.cursor.y);
        });

        if (button("Add a thingy", 16, v2(10, 10), v2(125, 32))) {
            state = state.concat(new Array(50000).fill("asda"));
        }

        if (button("More things", 16, v2(10, 50), v2(125, 32))) {
            state = state.concat(new Array(500).fill("asda"));
        }
    });
}