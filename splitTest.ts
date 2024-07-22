import { Canvas } from "skia-canvas";
import {
  textWrap,
  drawLines,
  generateCharLengths,
  truncateText,
  getTextHeight,
  flattenLines,
} from "./split";

const canvas = new Canvas(2000, 2000);
const ctx = canvas.getContext("2d");

{
  ctx.scale(10, 10);

  // setup canvas
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 100, canvas.height);
}
const text =
  "Hello, this is a test of the emergency broadcast system. This is only a test.";

const charLengthCache = generateCharLengths(ctx, "Noto Sans", 16);

const lines = textWrap({
  text,
  maxWidth: 100,
  ctx,
  font: "Noto Sans",
  fontSize: 16,
  cache: charLengthCache,
});

ctx.fillStyle = "lightgrey";
ctx.fillRect(0, 0, 100, 100);

ctx.textBaseline = "top";
const trimmed = truncateText({
  paragraphs: lines,
  ctx,
  font: "Noto Sans",
  fontSize: 16,
  lineHeight: 1.25,
  maxHeight: 100,
  ellipsis: "[…]",
});

console.log(
  getTextHeight({
    ctx,
    font: "Noto Sans",
    fontSize: 16,
    lineHeight: 1.25,
    lines: flattenLines(lines).length,
  })
);

console.log(lines, trimmed);

drawLines({
  lines: trimmed,
  ctx,
  font: "Noto Sans",
  fontSize: 16,
  fontColor: "red",
  x: 0,
  y: 0,
  lineHeight: 1.25,
});

canvas.saveAsSync("split.png");
