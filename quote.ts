import { Canvas, Image } from "skia-canvas";

import {
  drawLines,
  flattenLines,
  generateCharLengths,
  getTextHeight,
  textWrap,
  truncateText,
} from "./split";

interface QuoteConfig {
  font: string;
  fontSize: number;
  fontColor: string;
  paddingX: number;
  paddingY: number;
}

const defaultConfig: QuoteConfig = {
  font: "Noto Sans",
  fontSize: 20,
  fontColor: "white",
  paddingX: 50,
  paddingY: 25,
};

interface QuoteParams {
  message: string;
  username: string;
  displayName: string;
  pfp: string;
}

export class QuoteGenerator {
  public static fontCache: Map<string, Map<string, number>> = new Map();
  public static pfpCache: Map<string, Buffer> = new Map();

  public quoteConfig: QuoteConfig;

  constructor(quoteConfig: Partial<QuoteConfig> = {}) {
    this.quoteConfig = {
      ...defaultConfig,
      ...quoteConfig,
    };
  }

  public async quote(params: QuoteParams) {
    // const canvas = new Canvas(1920 / 2, 1080 / 2);
    const canvas = new Canvas(1920, 1080);

    const ctx = canvas.getContext("2d");

    const scale = {
      x: 2,
      y: 2,
    };

    ctx.scale(scale.x, scale.y);

    const size = {
      width: canvas.width / scale.x,
      height: canvas.height / scale.y,
    };

    const avatarReq = fetch(params.pfp);
    await avatarReq;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (
      !QuoteGenerator.fontCache.has(
        `${this.quoteConfig.fontSize}px ${this.quoteConfig.font}`
      )
    ) {
      const cache = generateCharLengths(
        ctx,
        this.quoteConfig.font,
        this.quoteConfig.fontSize,
        QuoteGenerator.fontCache
      );
    }
    const cache = QuoteGenerator.fontCache.get(
      `${this.quoteConfig.fontSize}px ${this.quoteConfig.font}`
    )!;

    const displayNameText = [`- ${params.displayName}`];
    const displayNameHeight = getTextHeight({
      lines: displayNameText.length,
      font: this.quoteConfig.font,
      fontSize: this.quoteConfig.fontSize,
      lineHeight: 1.5,
      ctx,
    });

    const usernameText = [params.username];
    const usernameHeight = getTextHeight({
      lines: usernameText.length,
      font: this.quoteConfig.font,
      fontSize: this.quoteConfig.fontSize,
      lineHeight: 1.5,
      ctx,
    });

    const quoteSpace =
      size.height -
      this.quoteConfig.paddingY * 2 -
      displayNameHeight -
      usernameHeight;

    const lines = textWrap({
      text: params.message,
      ctx,
      font: this.quoteConfig.font,
      fontSize: this.quoteConfig.fontSize,
      maxWidth: 540 - 100,
      cache,
    });

    const truncatedLines = truncateText({
      paragraphs: lines,
      ctx,
      font: this.quoteConfig.font,
      fontSize: this.quoteConfig.fontSize,
      lineHeight: 1.5,
      maxHeight: quoteSpace,
      ellipsis: "[…]",
    });

    const lineHeight = getTextHeight({
      lines: flattenLines(truncatedLines).length,
      font: this.quoteConfig.font,
      fontSize: this.quoteConfig.fontSize,
      lineHeight: 1.5,
      ctx,
    });

    const totalHeight = lineHeight + displayNameHeight + usernameHeight;

    const x =
      size.width / 2 +
      (size.width / 2 - this.quoteConfig.paddingX * 2) / 2 +
      this.quoteConfig.paddingX;

    drawLines({
      lines,
      x,
      y: (size.height - totalHeight) / 2,
      font: this.quoteConfig.font,
      fontSize: this.quoteConfig.fontSize,
      fontColor: this.quoteConfig.fontColor,
      ctx,
      // textBaseline: "center",
      textAlign: "center",
    });
    drawLines({
      lines: [[...displayNameText]],
      x,
      y: (size.height - totalHeight) / 2 + lineHeight,
      font: this.quoteConfig.font,
      fontSize: this.quoteConfig.fontSize,
      fontColor: "#ddd",
      ctx,
      // textBaseline: "center",
      textAlign: "center",
    });
    drawLines({
      lines: [[...usernameText]],
      x,
      y: (size.height - totalHeight) / 2 + lineHeight + displayNameHeight,
      font: this.quoteConfig.font,
      fontSize: this.quoteConfig.fontSize,
      fontColor: "#777",
      ctx,
      // textBaseline: "center",
      textAlign: "center",
    });

    ctx.fillStyle = "#777";
    ctx.font = `16px ${this.quoteConfig.font}`;

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";

    ctx.fillText("@Kurokawa#6528", size.width - 5, size.height - 5);

    const buffer = Buffer.from(
      await avatarReq.then((res) => res.arrayBuffer())
    );

    const img = new Image();

    img.src = buffer;

    const avatarSize = Math.max(size.width / 2, size.height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, size.width / 2, size.height);
    ctx.clip();

    ctx.drawImage(
      img,
      (size.width / 2 - avatarSize) / 2,
      0,
      avatarSize,
      avatarSize
    );

    ctx.restore();

    const gradient = ctx.createLinearGradient(0, 0, size.width / 2, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width / 2, size.height);

    const exportBuffer = await canvas.toBuffer("jpg", {
      quality: 1.0,
    });

    return exportBuffer;
  }
}
