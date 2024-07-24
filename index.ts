import {
  ALLOWED_EXTENSIONS,
  Client,
  Events,
  GatewayIntentBits,
  User,
} from "discord.js";
import { QuoteGenerator } from "./quote";

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

const quoteGenerator = new QuoteGenerator({});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged as ${readyClient.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (!message.mentions.has(client.user as User)) return;

  if (!message.reference) {
    message.reply("Please reply to a message");
    return;
  }

  const start = Bun.nanoseconds();

  console.log("Recieved message");

  const reply = await message.fetchReference();
  console.log(
    reply.content,
    reply.author.displayName,
    reply.author.tag,
    reply.author.displayAvatarURL({
      size: 2048,
      extension: ALLOWED_EXTENSIONS[1],
    })
  );

  const quoteBuffer = await quoteGenerator.quote({
    message: reply.content,
    pfp: reply.author.displayAvatarURL({
      size: 2048,
      extension: ALLOWED_EXTENSIONS[1],
    }),
    displayName: reply.author.displayName,
    username: reply.author.tag,
  });

  const quoteTime = Bun.nanoseconds();

  console.log("Done", (quoteTime - start) / 1e6);

  message.reply({
    files: [
      {
        attachment: quoteBuffer,
        name: "newName.png",
      },
    ],
  });
});

client.login(Bun.env.DISCORD_ENV);
