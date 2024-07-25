import { Canvas, Image } from "skia-canvas";
import {
  drawLines,
  flattenLines,
  generateCharLengths,
  getTextHeight,
  textWrap,
} from "./split";

const start = Bun.nanoseconds();

const canvas = new Canvas(2160, 1080);

const ctx = canvas.getContext("2d");

const scaleX = 2;
const scaleY = 2;
ctx.scale(scaleX, scaleY);
const width = canvas.width / scaleX;
const height = canvas.height / scaleY;

ctx.fillStyle = "black";
ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

const img = new Image();
const req = fetch(
  // "https://cdn.discordapp.com/avatars/731285784749015111/a127d1a4ab8a3e3684d53620db39cc1d?size=1024"
  // "https://cdn.discordapp.com/avatars/1247246635340140576/d1dbd3102836acc3faed75d93daa0d60.webp?size=2048"
  "https://cdn.discordapp.com/avatars/1247246635340140576/d1dbd3102836acc3faed75d93daa0d60.png?size=2048"
);

const text = (await Bun.file("text.txt").text()).trim();
const font = "Noto Sans";
const fontSize = 20;
const fontColor = "white";

ctx.fillStyle = "#777";
ctx.font = `16px ${font}`;

ctx.textAlign = "right";
ctx.textBaseline = "bottom";

ctx.fillText("@Kurokawa#6528", width - 5, height - 5);

const cache20 = generateCharLengths(ctx, font, fontSize);

const lines = textWrap({
  text,
  ctx,
  font,
  fontSize,
  maxWidth: 540 - 100,
  cache: cache20,
});

const lineHeight = getTextHeight({
  lines: flattenLines(lines).length,
  font,
  fontSize,
  lineHeight: 1.5,
  ctx,
});

const displayText = ["- Ash"];
const displayHeight = getTextHeight({
  lines: displayText.length,
  font,
  fontSize,
  lineHeight: 1.5,
  ctx,
});

const authorText = ["@ArchWiki"];
const authorHeight = getTextHeight({
  lines: authorText.length,
  font,
  fontSize,
  lineHeight: 1.5,
  ctx,
});

const totalHeight = lineHeight + displayHeight + authorHeight;

console.log(lineHeight, displayHeight, authorHeight, totalHeight);
console.log((height - totalHeight) / 2 + lineHeight / 2);

drawLines({
  lines,
  x: 540 + (540 - 100) / 2 + 50,
  y: (height - totalHeight) / 2,
  font,
  fontSize,
  fontColor,
  ctx,
  // textBaseline: "center",
  textAlign: "center",
});
drawLines({
  lines: [[...displayText]],
  x: 540 + (540 - 100) / 2 + 50,
  y: (height - totalHeight) / 2 + lineHeight,
  font,
  fontSize,
  fontColor: "#ddd",
  ctx,
  // textBaseline: "center",
  textAlign: "center",
});
drawLines({
  lines: [[...authorText]],
  x: 540 + (540 - 100) / 2 + 50,
  y: (height - totalHeight) / 2 + lineHeight + displayHeight,
  font,
  fontSize,
  fontColor: "#777",
  ctx,
  // textBaseline: "center",
  textAlign: "center",
});

const buffer = Buffer.from(await req.then((res) => res.arrayBuffer()));

img.src = buffer;

ctx.drawImage(img, 0, 0, 540, 540);

const gradient = ctx.createLinearGradient(0, 0, width / 2, 0);
gradient.addColorStop(0, "rgba(0,0,0,0)");
gradient.addColorStop(1, "rgba(0,0,0,1)");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width / 2, height);

ctx.beginPath();
ctx.strokeStyle = "white";
ctx.moveTo(0, 240);
ctx.lineTo(width, 240);
// ctx.stroke();

console.log((Bun.nanoseconds() - start) / 1e6, "ms");

const save = Bun.nanoseconds();
canvas.saveAsSync("output.jpg");
console.log("save:", (Bun.nanoseconds() - save) / 1e6, "ms");
