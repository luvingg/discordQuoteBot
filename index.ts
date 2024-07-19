import { Canvas, Image } from "skia-canvas";

const canvas = new Canvas(2160, 1080);

const ctx = canvas.getContext("2d");

ctx.fillStyle = "red";
ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

ctx.textWrap = true;

interface TextConfig {
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  text: string;
  x: number;
  y: number;
  maxWidth?: number;
  maxHeight?: number;
  font?: string;
  fontSize?: number;
  color?: string;
}

const renderText = (_config: TextConfig) => {
  const prev = {
    textAlign: ctx.textAlign,
    textBaseline: ctx.textBaseline,
    font: ctx.font,
    fillStyle: ctx.fillStyle,
  };

  const defaultConfig: Required<TextConfig> = {
    ..._config,
    textAlign: "left",
    textBaseline: "top",
    maxWidth: ctx.canvas.width - _config.x,
    maxHeight: ctx.canvas.height - _config.y,
    font: "Noto Sans",
    fontSize: 16,
    color: "black",
  };
  const config = { ...defaultConfig, ..._config };

  ctx.textAlign = config.textAlign;
  ctx.textBaseline = config.textBaseline;
  ctx.font = `${config.fontSize}px ${config.font}`;
  ctx.fillStyle = config.color;

  const metrics = ctx.measureText(config.text, config.maxWidth);
  const linesYs = metrics.lines.map((line) => line.y);
  const overflow = linesYs.filter((y) => y > config.maxHeight - config.y);
  const firstOverflow = overflow.sort((a, b) => a - b)[0];

  const croppedHeight = firstOverflow || config.y + config.maxHeight;

  ctx.save();

  ctx.beginPath();
  ctx.rect(config.x, config.y, config.maxWidth, croppedHeight);
  ctx.clip();

  ctx.fillText(config.text, config.x, config.y, config.maxWidth);

  ctx.restore();
};

renderText({
  text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Sit amet cursus sit amet dictum. Justo donec enim diam vulputate ut pharetra sit amet aliquam. Consectetur libero id faucibus nisl. Suspendisse interdum consectetur libero id faucibus nisl tincidunt. Magna fringilla urna porttitor rhoncus dolor purus non. Diam vel quam elementum pulvinar etiam non quam lacus suspendisse. Consectetur libero id faucibus nisl tincidunt eget nullam non nisi. Blandit volutpat maecenas volutpat blandit aliquam etiam. Id aliquet lectus proin nibh nisl condimentum id venenatis a. Aenean sed adipiscing diam donec adipiscing tristique risus nec feugiat. Lobortis feugiat vivamus at augue eget. Euismod lacinia at quis risus sed vulputate odio. Posuere sollicitudin aliquam ultrices sagittis orci. Vitae aliquet nec ullamcorper sit amet risus. Elementum integer enim neque volutpat ac.

  Duis convallis convallis tellus id. Est sit amet facilisis magna etiam tempor orci eu lobortis. Augue ut lectus arcu bibendum at varius vel pharetra. Senectus et netus et malesuada fames ac turpis egestas integer. Adipiscing enim eu turpis egestas pretium aenean pharetra. Sed euismod nisi porta lorem. Lectus arcu bibendum at varius vel pharetra vel turpis nunc. Facilisis mauris sit amet massa vitae tortor condimentum. Libero nunc consequat interdum varius sit amet mattis. Vestibulum sed arcu non odio euismod lacinia. Nulla facilisi nullam vehicula ipsum a arcu cursus. Nulla pharetra diam sit amet nisl suscipit adipiscing. Augue ut lectus arcu bibendum at varius vel pharetra vel. Posuere morbi leo urna molestie at. Tempus urna et pharetra pharetra massa. Magna sit amet purus gravida quis blandit turpis. Lectus nulla at volutpat diam ut venenatis tellus in.`,
  x: canvas.width / 2,
  y: 100,
  fontSize: 48,
  color: "white",
  maxHeight: canvas.height - 100,
  maxWidth: canvas.width / 2 - 200,
});

const img = new Image();
// img.src =
//   "https://cdn.discordapp.com/avatars/731285784749015111/ac5abc9fe05a9c3c190ce03248af0219?size=1024";

const req = fetch(
  "https://cdn.discordapp.com/avatars/731285784749015111/ac5abc9fe05a9c3c190ce03248af0219?size=1024"
);
const buffer = Buffer.from(await req.then((res) => res.arrayBuffer()));

img.src = buffer;

ctx.drawImage(img, 100, 100, canvas.width / 2 - 200, canvas.height - 200);

canvas.saveAs("output.png");
