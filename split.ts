import { heapStats } from "bun:jsc";

import { Canvas, type SKRSContext2D } from "@napi-rs/canvas";

type CanvasContext2d = SKRSContext2D | CanvasRenderingContext2D;

console.log(heapStats().heapSize);

const generateCharLengths = (
  ctx: CanvasContext2d,
  font: string,
  fontSize: number,
  cache: Map<string, Map<string, number>> | undefined,
  unicode: boolean = false // default to ascii, unicode is 10 seconds and 126mb instead of pratically instant and not even reported by jsc
): Map<string, number> => {
  const key = `${font}-${fontSize}px`;
  if (cache && cache.has(key)) {
    return cache.get(key)!;
  }

  const lengthsMap = new Map<string, number>();
  const oldFont = ctx.font;
  ctx.font = `${fontSize}px ${font}`;

  // null breaks @napi-rs/canvas ("Convert String to CString failed")
  const maxChar = unicode ? 0x10ffff : 0x7f;

  // generate characters and get their width via ctx.measureText
  for (let i = 1; i < maxChar; i++) {
    const char = String.fromCodePoint(i);
    const width = ctx.measureText(char).width;
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
  ctx: CanvasContext2d,
  font: string,
  fontSize: number,
  charLengthCache: Map<string, number>,
  saveNewValues = true
) => {
  const oldFont = ctx.font;
  ctx.font = `${fontSize}px ${font}`;

  const spaceWidth = charLengthCache.has(" ")
    ? charLengthCache.get(" ")!
    : ctx.measureText(" ").width;

  const paragraphs = text.split("\n");
  const paragraphsWords = paragraphs.map((p) => p.split(" "));
  const wordLengths = paragraphsWords.map((paragraph) =>
    paragraph.map((word) => ({
      word,
      width: word.split("").reduce((acc: number, char: string) => {
        if (charLengthCache.has(char)) {
          return charLengthCache.get(char)! + acc;
        }
        const width = ctx.measureText(char).width;
        if (saveNewValues) {
          charLengthCache.set(char, width);
        }
        return width + acc;
      }, 0),
    }))
  );

  const paragraphLines = wordLengths.map((paragraph) => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentLineWidth = -spaceWidth; // to account for the first space
    for (let i = 0; i < paragraph.length; i++) {
      const currentWord = paragraph[i];
      currentLine.push(currentWord.word);
      currentLineWidth += spaceWidth + currentWord.width;

      const nextWord = paragraph[i + 1];
      if (!nextWord) {
        lines.push(currentLine);
        break;
      }
      if (currentLineWidth + spaceWidth + nextWord.width > maxWidth) {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = -spaceWidth; // to account for the first space
      }
    }
    return lines;
  });
  return paragraphLines;
};

const canvas = new Canvas(200, 200);
const ctx = canvas.getContext("2d");

const charLengthCache = generateCharLengths(ctx, "Noto Sans", 16);

const paragraphs = canvasSplit(
  `The quick brown fox jumps over the lazy dog.

The dog then ate the fox.`,
  100,
  ctx,
  "Noto Sans",
  16,
  charLengthCache
);

console.table(paragraphs);
console.log(
  paragraphs
    .map((line) => line.map((word) => word.join(" ")).join("\n"))
    .join("\n")
);

ctx.fillStyle = "white";
ctx.fillRect(0, 0, 100, canvas.height);
ctx.fillStyle = "black";
ctx.font = "16px Noto Sans";
ctx.textAlign = "left";
ctx.textBaseline = "top";
let lines = 0;
for (let i = 0; i < paragraphs.length; i++) {
  const paragraph = paragraphs[i];
  for (let j = 0; j < paragraph.length; j++) {
    const line = paragraph[j];
    ctx.fillText(line.join(" "), 0, 16 * lines);
    lines++;
  }
}
const buffer = canvas.toBuffer("image/png");
Bun.write("split.png", buffer.buffer);
