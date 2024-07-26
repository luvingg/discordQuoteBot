import {
  ActionRowBuilder,
  ALLOWED_EXTENSIONS,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ComponentType,
  Emoji,
  Events,
  GatewayIntentBits,
  User,
} from "discord.js";
import removeMarkdown from "markdown-to-text";
import {
  DEFAULT_CONFIG,
  Origin,
  QuoteGenerator,
  type QuoteConfig,
} from "./quote";
import Color from "colorjs.io";
import { stripper } from "./markdownStripper";

declare module "bun" {
  interface Env {
    DISCORD_TOKEN: string;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const quoteGenerator = new QuoteGenerator();

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged as ${readyClient.user.tag}`);
});

const ASPECT_RATIOS = {
  desktop: {
    avatarOrigin: [Origin.LEFT, Origin.RIGHT],
    resolution: {
      width: 1920,
      height: 1080,
    },
    emoji: "🖥️",
  },
  mobile: {
    avatarOrigin: [Origin.TOP, Origin.BOTTOM],
    resolution: {
      width: 1080,
      height: 1920,
    },
    emoji: "📱",
  },
};

const getAspectRatio = (index: number) => {
  const entries = Object.entries(ASPECT_RATIOS);
  const aspectRatio = entries[index];
  return {
    name: aspectRatio[0],
    aspectRatio: aspectRatio[1],
  };
};

const getAspectEmoji = (index: number) => {
  const constrained = index % Object.keys(ASPECT_RATIOS).length;
  return getAspectRatio(constrained).aspectRatio.emoji;
};

const THEMES: Record<
  "dark" | "light",
  QuoteConfig["theme"] & { emoji: string }
> = {
  dark: {
    background: new Color("#000"),
    textContent: new Color("#fff"),
    displayName: new Color("#ddd"),
    username: new Color("#777"),
    watermark: new Color("#444"),
    emoji: "🌑",
  },
  light: {
    background: new Color("#fff"),
    textContent: new Color("#000"),
    displayName: new Color("#444"),
    username: new Color("#777"),
    watermark: new Color("#ccc"),
    emoji: "☀️",
  },
};

const getTheme = (index: number) => {
  const entries = Object.entries(THEMES);
  const theme = entries[index];
  return {
    name: theme[0],
    theme: theme[1],
  };
};

const getThemeEmoji = (index: number) => {
  return "☀️";
  // const constrained = index % Object.keys(THEMES).length;
  // return getTheme(constrained).theme.emoji;
};

client.on("messageCreate", async (message) => {
  // #region pre
  if (!message.mentions.has(client.user as User) || message.mentions.everyone) {
    return;
  }

  if (!message.reference) {
    message.reply("Please reply to a message");
    return;
  }

  console.log("Recieved message");

  const start = Bun.nanoseconds();

  const reply = await message.fetchReference();
  if (reply.author.id === client.user?.id) return;
  console.log(
    reply.content,
    reply.author.displayName,
    reply.author.tag,
    reply.author.displayAvatarURL({
      size: 2048,
      extension: ALLOWED_EXTENSIONS[1],
    })
  );

  const replyMessagePromise = message.reply({
    content: "Loading...",
  });

  // #endregion
  let selectedAspectRatio: number = 0;
  let mirrored: boolean = false;
  let color: boolean = true;
  let theme: number = 0;

  const generateQuote = () => {
    const aspectRatio = getAspectRatio(selectedAspectRatio).aspectRatio;

    return quoteGenerator.quote(
      {
        messageContent: stripper(
          reply.content
            .replaceAll(/^-# /gm, "")
            .replaceAll(/\|\|/gm, "")
            .replaceAll(/\`\`\`/gm, "")
        ),
        avatar: reply.author.displayAvatarURL({
          size: 2048,
          extension: ALLOWED_EXTENSIONS[2],
        }),
        displayName: `- ${reply.author.displayName}`,
        username: `@${reply.author.tag}`,
      },
      {
        ...DEFAULT_CONFIG,
        resolution: aspectRatio.resolution,
        avatarOrigin: aspectRatio.avatarOrigin[!mirrored ? 0 : 1],
        filters: color ? [] : ["grayscale(100%)"],
        theme: getTheme(theme).theme,
        watermark: client.user!.tag,
      }
    );
  };

  const quoteBuffer = await generateQuote();

  const quoteTime = Bun.nanoseconds();

  console.log("Done", (quoteTime - start) / 1e6, "ms");

  const aspectButton = new ButtonBuilder()
    .setCustomId("portrait")
    .setLabel("Aspect Ratio")
    .setEmoji({ name: getAspectEmoji(selectedAspectRatio + 1) })
    .setStyle(ButtonStyle.Secondary);

  const mirrorButton = new ButtonBuilder()
    .setCustomId("mirror")
    .setLabel("Mirror")
    .setEmoji({ name: "🔄" })
    .setStyle(ButtonStyle.Secondary);

  const colorButton = new ButtonBuilder()
    .setCustomId("color")
    .setLabel("Color")
    .setEmoji({ name: color ? "⬛" : "🟩" })
    .setStyle(ButtonStyle.Secondary);

  const themeButton = new ButtonBuilder()
    .setCustomId("theme")
    .setLabel("Theme")
    .setEmoji({ name: getThemeEmoji(selectedAspectRatio + 1) })
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(aspectButton)
    .addComponents(mirrorButton)
    .addComponents(colorButton)
    .addComponents(themeButton);

  const replyMessage = await replyMessagePromise;

  replyMessage.edit({
    content: "",
    files: [
      {
        attachment: quoteBuffer,
        name: "newName.jpg",
      },
    ],
    components: [row],
  });

  const collector = replyMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 3_600_000,
  });

  collector.on("collect", async (i) => {
    if (i.user.id !== message.author.id) {
      console.log(i.user.id, message.author.id);
      return i.reply({
        content: `This quote is only editable by its creator, ${message.author.displayName}.`,
        ephemeral: true,
      });
    }

    console.log(i.customId);

    if (i.customId === "portrait") {
      selectedAspectRatio =
        (selectedAspectRatio + 1) % Object.entries(ASPECT_RATIOS).length;
      aspectButton.setEmoji({
        name: getAspectEmoji(selectedAspectRatio + 1),
      });
    } else if (i.customId === "mirror") {
      mirrored = !mirrored;
    } else if (i.customId === "color") {
      color = !color;
      colorButton.setEmoji({ name: color ? "⬛" : "🟩" });
    } else if (i.customId === "theme") {
      theme = theme + 1;
      console.log("theme!", theme);
      theme = theme % Object.entries(THEMES).length;
      themeButton.setEmoji({
        name: getThemeEmoji(theme + 1),
      });
    }

    i.update({
      components: [row],
    });

    const start = Bun.nanoseconds();
    const quoteBuffer = await generateQuote();

    const quoteTime = Bun.nanoseconds();

    console.log("Done", (quoteTime - start) / 1e6, "ms");

    replyMessage.edit({
      files: [
        {
          attachment: quoteBuffer,
          name: "newName.jpg",
        },
      ],
    });
  });
});

client.login(Bun.env.DISCORD_ENV);
