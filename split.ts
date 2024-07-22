import { heapStats } from "bun:jsc";

import { Canvas as Canvas, type CanvasRenderingContext2D } from "skia-canvas";

console.log(heapStats().heapSize);

const generateCharLengths = (
  ctx: CanvasRenderingContext2D,
  font: string,
  fontSize: number,
  cache: Map<string, Map<string, number>> | undefined = undefined,
  unicode: boolean = false // default to ascii, unicode is 10 seconds and 126mb instead of pratically instant and not even reported by jsc
): Map<string, number> => {
  const key: string = `${font}-${fontSize}px`;
  if (cache && cache.has(key)) {
    return cache.get(key)!;
  }

  const lengthsMap: Map<string, number> = new Map<string, number>();
  const oldFont: string = ctx.font;
  ctx.font = `${fontSize}px ${font}`;

  // null breaks @napi-rs/canvas ("Convert String to CString failed")
  const maxChar: number = unicode ? 0x10ffff : 0x7f;

  // generate characters and get their width via ctx.measureText
  for (let i = 1; i < maxChar; i++) {
    const char: string = String.fromCodePoint(i);
    const width: number = ctx.measureText(char).width;
    lengthsMap.set(char, width);
  }

  // save to the map to the cache
  cache?.set(key, lengthsMap);

  ctx.font = oldFont;
  return lengthsMap;
};

const canvasSplit = (
  text: string,
  maxWidth: number,
  ctx: CanvasRenderingContext2D,
  font: string,
  fontSize: number,
  charLengthCache: Map<string, number> | undefined = undefined,
  saveNewValues: boolean = true
): string[][] => {
  const charCacheLookup = (char: string): number => {
    if (charLengthCache?.has(char)) {
      return charLengthCache.get(char)!;
    }

    const width = ctx.measureText(char).width;
    if (saveNewValues) {
      charLengthCache?.set(char, width);
    }
    return width;
  };

  const oldFont: string = ctx.font;
  ctx.font = `${fontSize}px ${font}`;

  const spaceWidth = charCacheLookup(" ");

  const final: string[][] = [];
  const paragraphs: string[] = text.split("\n");

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph: string = paragraphs[i];
    const words: string[] = paragraph.split(" ");
    const lines: string[] = [];
    let line: string = "";
    let lineWidth: number = 0;
    for (let j = 0; j < words.length; j++) {
      line += words[j];

      const currentWidth: number = charCacheLookup(words[j]);
      lineWidth += currentWidth;

      const nextWord: string = words[j + 1];
      if (!nextWord) {
        lines.push(line);
        break;
      }

      const nextWidth: number = charCacheLookup(nextWord);
      const addedWidth: number = spaceWidth + nextWidth;

      const futureWidth: number = lineWidth + addedWidth;

      if (futureWidth > maxWidth) {
        // dc current line
        let check = !(ctx.measureText(line).width > maxWidth);
        if (!check) {
          line = line.split(" ").slice(0, -1).join(" ");
        }
        lines.push(line);
        line = check ? "" : words[j] + " ";
        lineWidth = check ? 0 : currentWidth + spaceWidth;
      } else {
        line += " ";
        lineWidth += spaceWidth;
      }
    }
    final.push(lines);
  }

  ctx.font = oldFont;
  return final;
};

interface drawLinesParams {
  lines: string[][];
  ctx: CanvasRenderingContext2D;
  font: string;
  fontSize: number;
  fontColor: string;
  x: number;
  y: number;
  lineHeight?: number;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
}

const drawLines = (params: drawLinesParams): void => {
  const defaultSettings: {
    lineHeight: number;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
  } = {
    lineHeight: 1.5,
    textAlign: "left",
    textBaseline: "alphabetic",
  };

  const settings: Required<drawLinesParams> = { ...defaultSettings, ...params };

  const oldCtx = {
    font: params.ctx.font,
    fillStyle: params.ctx.fillStyle,
    textAlign: params.ctx.textAlign,
    textBaseline: params.ctx.textBaseline,
  };

  // set new ctx values
  params.ctx.font = `${settings.fontSize}px ${settings.font}`;
  params.ctx.fillStyle = settings.fontColor;
  params.ctx.textAlign = settings.textAlign;
  params.ctx.textBaseline = settings.textBaseline;

  let currentY: number = settings.y;

  const lineMeasurements: any = params.ctx.measureText("M");

  const flattenedLines: string[] = settings.lines
    .map((line) => line.join("\n"))
    .join("\n")
    .split("\n");

  console.log(flattenedLines);

  console.log(lineMeasurements.emHeightAscent);
  console.log(lineMeasurements.emHeightDescent);

  for (let i = 0; i < flattenedLines.length; i++) {
    if (i === 0) {
      currentY += lineMeasurements.emHeightAscent + settings.lineHeight * 8 - 6;
      currentY -= lineMeasurements.alphabeticBaseline / 2;
    } else {
      currentY += lineMeasurements.emHeightAscent * settings.lineHeight;
    }
    params.ctx.fillText(flattenedLines[i], 0, currentY);
    // currentY += lineMeasurements.emHeightDescent * settings.lineHeight;
  }

  // loop through oldCtx and restore
  for (const key in oldCtx) {
    if (key === "canvas") continue;
    // @ts-ignore - Tried using keyof Omit<CanvasContext2d, "canvas"> but it didn't work cuz any can't be assigned to never
    params.ctx[key] = oldCtx[key];
  }
};

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

const lines = canvasSplit(text, 100, ctx, "Noto Sans", 16, charLengthCache);

drawLines({
  lines,
  ctx,
  font: "Noto Sans",
  fontSize: 16,
  fontColor: "red",
  x: 0,
  y: 0,
  lineHeight: 1,
});

canvas.saveAsSync("split.png");
