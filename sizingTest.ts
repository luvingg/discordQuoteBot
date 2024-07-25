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

  ctx.fillStyle = "lightgrey";
  ctx.fillRect(0, 0, 100, 100);
}
const text =
  "Hello, this is a test of the emergency broadcast system. This is only a test.";

let fontSize = 16;

for (;;) {
  const charLengthCache = generateCharLengths(ctx, "Noto Sans", fontSize);

  const lines = textWrap({
    text,
    maxWidth: 100,
    ctx,
    font: "Noto Sans",
    fontSize: fontSize,
    cache: charLengthCache,
  });

  const textHeight = getTextHeight({
    ctx,
    font: "Noto Sans",
    fontSize,
    lineHeight: 1.25,
    lines: flattenLines(lines).length,
  });

  console.log("height", textHeight);

  if (textHeight <= 100) {
    ctx.textBaseline = "top";
    const trimmed = truncateText({
      paragraphs: lines,
      ctx,
      font: "Noto Sans",
      fontSize,
      lineHeight: 1.25,
      maxHeight: 100,
      ellipsis: "[…]",
    });

    console.log(lines, trimmed);

    drawLines({
      lines: trimmed,
      ctx,
      font: "Noto Sans",
      fontSize,
      fontColor: "red",
      x: 0,
      y: 0,
      lineHeight: 1.25,
    });
    console.log(fontSize);
    break;
  } else {
    fontSize--;
  }
}
canvas.saveAsSync("sizing.jpg");
