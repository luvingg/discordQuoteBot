import { Canvas } from "skia-canvas";
import { textWrap, drawLines, generateCharLengths } from "./split";

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

drawLines({
  lines,
  ctx,
  font: "Noto Sans",
  fontSize: 16,
  fontColor: "red",
  x: 0,
  y: 100,
  lineHeight: 1.25,
  textBaseline: "center",
});

canvas.saveAsSync("split.png");
