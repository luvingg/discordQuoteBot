import { heapSize } from "bun:jsc";

import {
  DEFAULT_CONFIG,
  Origin,
  QuoteGenerator,
  type PreQuoteData,
  type QuoteConfig,
} from "./quote";
import Color from "colorjs.io";

Bun.sleepSync(2000);

const quoteGenerator = new QuoteGenerator();
const pfp =
  "https://cdn.discordapp.com/avatars/1247246635340140576/d1dbd3102836acc3faed75d93daa0d60.jpg?size=2048";
const message = "Lorem ipsum odor amet, consectetuer ".repeat(30);
// const message = "Monkey";
const time = new Date().toLocaleTimeString();

const start = Bun.nanoseconds();

const data: PreQuoteData = {
  messageContent: message,
  avatar: pfp,
  displayName: "Ash",
  username: "@ArchWiki",
};

const buffer = quoteGenerator.quote(data, DEFAULT_CONFIG);
const bufferBuffer = (await buffer).buffer;

const end = Bun.nanoseconds();
console.log("Total:", (end - start) / 1e6, "ms");

const buffer2 = quoteGenerator.quote(data, {
  ...DEFAULT_CONFIG,
  avatarOrigin: Origin.TOP,
  resolution: {
    width: 1080,
    height: 1920,
  },
});
const bufferBuffer2 = (await buffer2).buffer;

const end2 = Bun.nanoseconds();
console.log("Total:", (end2 - end) / 1e6, "ms");

Bun.write("quote.jpg", bufferBuffer);

Bun.write("quote2.jpg", bufferBuffer2);
