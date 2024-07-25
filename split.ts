import { heapStats } from "bun:jsc";

import {
  type CanvasRenderingContext2D as SkiaContext2D,
  type TextMetrics,
} from "skia-canvas";

// console.log(heapStats().heapSize);

type CanvasRenderingContext2D = SkiaContext2D;

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

export const flattenLines = (lines: string[][]) =>
  lines
    .map((line) => line.join("\n"))
    .join("\n")
    .split("\n");

interface TextWrapConfig {
  text: string;
  maxWidth: number;
  ctx: CanvasRenderingContext2D;
  font: string;
  fontSize: number;
  cache?: Map<string, number>;
  updateCache?: boolean;
}

export const textWrap = (config: TextWrapConfig): string[][] => {
  const { ctx } = config;

  const charCacheLookup = (char: string): number => {
    if (char.length > 2) {
      // cuz fucking two bit fuckers
      throw new Error("only chars, not fucking strings");
    }

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
  const hypenWidth = charCacheLookup("-");

  const final: string[][] = [];
  const paragraphs: string[] = config.text.split("\n");

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph: string = paragraphs[i];
    const words: string[] = paragraph.split(" ");
    const lines: string[] = [];
    let line: string = "";
    let lineLength: number = 0;
    for (let j = 0; j < words.length; j++) {
      const currentWord = words[j];
      const currentChars = [...currentWord];
      const currentLengths = currentChars.map((character) =>
        charCacheLookup(character)
      );
      const currentLength = currentLengths.reduce((a, c) => a + c, 0);

      let newWord = "";
      let newLength = 0;
      let afterWord = "";
      for (let k = 0; k < currentChars.length; k++) {
        const char = currentChars[k];
        const charLength = currentLengths[k];

        if (
          lineLength + newLength + charLength + hypenWidth >=
          config.maxWidth
        ) {
          if (currentLength < config.maxWidth / 3) {
            newWord = "";
            newLength = 0;
            afterWord = currentWord;
            break;
          }
          newWord += "-";
          newLength += hypenWidth;
          afterWord = currentChars.slice(k).join("");
          break;
        }
        newWord += char;
        newLength += charLength;
      }

      line += newWord + " ";
      lineLength += newLength + spaceWidth;

      if (afterWord.length !== 0) {
        words[j] = afterWord;
        j--;
        lines.push(line);
        line = "";
        lineLength = 0;
      }
    }
    lines.push(line);
    final.push(lines);
  }

  ctx.font = oldFont;
  return final;
};

interface DrawLinesConfig {
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

type drawLinesParams = Omit<DrawLinesConfig, "textBaseline"> & {
  textBaseline?: CanvasTextBaseline | "center";
};

export const drawLines = (params: drawLinesParams): void => {
  if (params.lines.flat().length === 0) return;
  const defaultSettings: {
    lineHeight: number;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
  } = {
    lineHeight: 1.5,
    textAlign: "left",
    textBaseline: "top",
  };

  const config: Required<DrawLinesConfig> = {
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

  const flattenedLines: string[] = flattenLines(config.lines);

  // console.log(flattenedLines);

  const multiplier =
    config.fontSize /
    (lineMeasurements.emHeightAscent + lineMeasurements.emHeightDescent);
  const emAscent = lineMeasurements.emHeightAscent * multiplier;
  const emDescent = lineMeasurements.emHeightDescent * multiplier;

  // console.log(multiplier, emAscent, emDescent);

  if (params.textBaseline === "center") {
    const textHeight = getTextHeight({
      lines: flattenedLines.length,
      ctx: config.ctx,
      font: config.font,
      fontSize: config.fontSize,
      lineHeight: config.lineHeight,
    });
    currentY -= textHeight / 2;
    // console.log(textHeight, currentY);
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
interface TextHeightConfig {
  lines: number;
  ctx: CanvasRenderingContext2D;
  font: string;
  fontSize: number;
  lineHeight: number;
}

const emCorrector = (measurements: TextMetrics, fontSize: number) => {
  const actualLineHeight =
    measurements.emHeightAscent + measurements.emHeightDescent;
  const correctionMultiplier = fontSize / actualLineHeight;

  const correctAscent = measurements.emHeightAscent * correctionMultiplier;
  const correctDescent = measurements.emHeightDescent * correctionMultiplier;

  return {
    multiplier: correctionMultiplier,
    ascent: correctAscent,
    descent: correctDescent,
  };
};

export const getTextHeight = (config: TextHeightConfig): number => {
  if (config.lineHeight === 0) return 0;
  const { ctx } = config;

  const oldFont = ctx.font;
  ctx.font = `${config.fontSize}px ${config.font}`;

  const lineMeasurement = ctx.measureText("M");

  const { ascent, descent } = emCorrector(lineMeasurement, config.fontSize);

  ctx.font = oldFont;

  return config.lineHeight * (ascent + descent) * config.lines;
};

interface TruncateTextConfig {
  paragraphs: string[][];
  ctx: CanvasRenderingContext2D;
  font: string;
  fontSize: number;
  lineHeight: number;
  maxHeight: number;
  ellipsis?: string;
}
export const truncateText = (config: TruncateTextConfig): string[][] => {
  const { ctx } = config;

  const oldFont = ctx.font;
  ctx.font = `${config.fontSize}px ${config.font}`;

  // you could just loop until we hit or via a binary method but math is always faster
  const lineMeasurement = ctx.measureText("M");

  ctx.font = oldFont;

  const { ascent, descent } = emCorrector(lineMeasurement, config.fontSize);

  // height = (ascent + descent) * lines - ascent
  // lines = (height + ascent) / (ascent + descent)
  const num = config.maxHeight;
  const dem = config.lineHeight * (ascent + descent);
  const maxLines = Math.floor(num / dem);

  const flatLines = flattenLines(config.paragraphs);

  if (maxLines >= flatLines.length) return config.paragraphs;

  const lineCount = config.paragraphs.map((paragraph) => paragraph.length);

  let parargraphs: string[][] = [];
  let lines = 0;

  for (let i = 0; i < config.paragraphs.length; i++) {
    if (lines === maxLines) break;
    const count = lineCount[i];
    const paragraph = config.paragraphs[i];
    if (lines + count <= maxLines) {
      // add whole paragraph
      parargraphs.push(paragraph);
      lines += count;
      continue;
    }
    // add partial paragraph
    const remainingLines = maxLines - lines;
    const trimmedParagraph = paragraph.slice(0, remainingLines);
    parargraphs.push(trimmedParagraph);
  }

  if (config.ellipsis) {
    const lastParagraph = parargraphs.at(-1)!;
    lastParagraph[lastParagraph.length - 1] =
      lastParagraph[lastParagraph.length - 1].slice(
        0,
        -config.ellipsis.length
      ) + config.ellipsis;
  }

  return parargraphs;
};
