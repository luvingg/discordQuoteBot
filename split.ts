import { heapStats } from "bun:jsc";

import { type CanvasRenderingContext2D } from "skia-canvas";

console.log(heapStats().heapSize);

export const generateCharLengths = (
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

interface textWrapConfig {
  text: string;
  maxWidth: number;
  ctx: CanvasRenderingContext2D;
  font: string;
  fontSize: number;
  cache?: Map<string, number>;
  updateCache?: boolean;
}

export const textWrap = (config: textWrapConfig): string[][] => {
  const { ctx } = config;

  const charCacheLookup = (char: string): number => {
    if (config.cache?.has(char)) {
      return config.cache.get(char)!;
    }

    const width = ctx.measureText(char).width;
    if (config.updateCache === undefined || config.updateCache) {
      config.cache?.set(char, width);
    }
    return width;
  };

  const oldFont: string = ctx.font;
  ctx.font = `${config.fontSize}px ${config.font}`;

  const spaceWidth = charCacheLookup(" ");

  const final: string[][] = [];
  const paragraphs: string[] = config.text.split("\n");

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

      if (futureWidth > config.maxWidth) {
        // dc current line
        let check = !(ctx.measureText(line).width > config.maxWidth);
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

interface drawLinesConfig {
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

type drawLinesParams = Omit<drawLinesConfig, "textBaseline"> & {
  textBaseline?: CanvasTextBaseline | "center";
};

export const drawLines = (params: drawLinesParams): void => {
  const defaultSettings: {
    lineHeight: number;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
  } = {
    lineHeight: 1.5,
    textAlign: "left",
    textBaseline: "top",
  };

  const config: Required<drawLinesConfig> = {
    ...defaultSettings,
    ...params,
    textBaseline: params.textBaseline
      ? params.textBaseline !== "center"
        ? params.textBaseline
        : "middle"
      : defaultSettings.textBaseline,
  };

  const oldCtx = {
    font: params.ctx.font,
    fillStyle: params.ctx.fillStyle,
    textAlign: params.ctx.textAlign,
    textBaseline: params.ctx.textBaseline,
  };

  // set new ctx values
  params.ctx.font = `${config.fontSize}px ${config.font}`;
  params.ctx.fillStyle = config.fontColor;
  params.ctx.textAlign = config.textAlign;
  params.ctx.textBaseline = config.textBaseline;

  let currentY: number = config.y;

  const lineMeasurements = params.ctx.measureText("M");

  const flattenedLines: string[] = config.lines
    .map((line) => line.join("\n"))
    .join("\n")
    .split("\n");

  console.log(flattenedLines);

  const multiplier =
    config.fontSize /
    (lineMeasurements.emHeightAscent + lineMeasurements.emHeightDescent);
  const emAscent = lineMeasurements.emHeightAscent * multiplier;
  const emDescent = lineMeasurements.emHeightDescent * multiplier;

  console.log(multiplier);

  if (params.textBaseline === "center") {
    let pre = emDescent;
    let post = (flattenedLines.length - 1) * (emAscent + emDescent);
    const textHeight = (pre + post) * config.lineHeight;
    currentY -= textHeight / 2;
    console.log(textHeight, currentY);
  }

  for (let i = 0; i < flattenedLines.length; i++) {
    if (i !== 0) {
      currentY += emAscent * config.lineHeight;
    }
    params.ctx.fillText(flattenedLines[i], config.x, currentY);
    currentY += emDescent * config.lineHeight;
  }

  // loop through oldCtx and restore
  for (const key in oldCtx) {
    if (key === "canvas") continue;
    // @ts-ignore - Tried using keyof Omit<CanvasContext2d, "canvas"> but it didn't work cuz any can't be assigned to never
    params.ctx[key] = oldCtx[key];
  }
};
