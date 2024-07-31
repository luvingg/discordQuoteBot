import Color from "colorjs.io";
import {
  Canvas,
  FontLibrary,
  Image,
  type CanvasRenderingContext2D,
} from "skia-canvas";
import {
  drawLines,
  flattenLines,
  generateCharLengths,
  getTextHeight,
  textWrap,
  truncateText,
} from "./split";

export enum Origin {
  LEFT,
  TOP,
  RIGHT,
  BOTTOM,
}

export type PreQuoteData = Omit<QuoteData, "avatar"> & { avatar: string };

export interface QuoteData {
  messageContent: string;
  username: string;
  displayName: string;
  avatar: Buffer;
}

export interface QuoteConfig {
  avatarOrigin: Origin;
  resolution: {
    width: number;
    height: number;
  };
  scale: {
    x: number;
    y: number;
  };
  filters: string[];
  fontFamily: string;
  fontSize: {
    max: number;
    min: number;
    regular: number;
    watermark: number;
  };
  theme: {
    background: Color;
    textContent: Color;
    displayName: Color;
    username: Color;
    watermark: Color;
  };
  padding: {
    x: number;
    y: number;
  };
  watermark: string;
}

export const DEFAULT_CONFIG: QuoteConfig = {
  avatarOrigin: Origin.LEFT,
  filters: [],
  theme: {
    background: new Color("#000"),
    textContent: new Color("#fff"),
    displayName: new Color("#ddd"),
    username: new Color("#777"),
    watermark: new Color("#777"),
  },
  fontFamily: "Noto Sans, GG, Twemoji, FreeSans, Bitstream Vera Sans Mono",
  fontSize: {
    max: 50,
    min: 20,
    regular: 30,
    watermark: 20,
  },
  resolution: {
    width: 1920,
    height: 1080,
  },
  scale: {
    x: 2,
    y: 2,
  },
  padding: {
    x: 30,
    y: 30,
  },
  watermark: "@ArchWiki",
};

export class QuoteGenerator {
  public static fontCache: Map<string, Map<string, number>> = new Map();
  public static avatarCache: Map<string, Buffer> = new Map();
  public canvas = new Canvas(1920, 1080);

  constructor() {
    FontLibrary.use("GG", ["fonts/gg.ttf"]);
    FontLibrary.use("Twemoji", ["fonts/Twemoji.Mozilla.ttf"]);
  }

  public async quote(data: PreQuoteData, config: QuoteConfig): Promise<Buffer> {
    const ctx = this.canvas.getContext("2d");

    //config.fontFamily.split(", ").forEach((font) => {
    //  console.log(font, FontLibrary.has(font));
    //});

    let avatarBuffer: Buffer;

    if (QuoteGenerator.avatarCache.has(data.avatar)) {
      avatarBuffer = QuoteGenerator.avatarCache.get(data.avatar)!;
    } else {
      const req = await fetch(data.avatar);
      const arrayBuffer = await req.arrayBuffer();
      avatarBuffer = Buffer.from(arrayBuffer);
    }

    const quoteData = {
      ...data,
      avatar: avatarBuffer,
    };

    return QuoteGenerator.generate(ctx, quoteData, config);
  }

  public static generate(
    ctx: CanvasRenderingContext2D,
    data: QuoteData,
    config: QuoteConfig
  ): Buffer {
    ctx.canvas.width = config.resolution.width;
    ctx.canvas.height = config.resolution.height;

    ctx.scale(config.scale.x, config.scale.y);

    ctx.filter = config.filters.join(" ");

    QuoteGenerator.drawAvatar(ctx, data, config);
    QuoteGenerator.drawGradient(ctx, data, config);
    QuoteGenerator.drawText(ctx, data, config);
    QuoteGenerator.drawWatermark(ctx, config);

    ctx.filter = "";

    return ctx.canvas.toBufferSync("jpg", {
      matte: "red",
    });
  }

  public static drawAvatar(
    ctx: CanvasRenderingContext2D,
    data: QuoteData,
    config: QuoteConfig
  ): void {
    ctx.save();

    const size = {
      width: config.resolution.width / config.scale.x,
      height: config.resolution.height / config.scale.y,
    };

    const image = new Image();
    image.src = data.avatar;

    // #region clipping mask
    ctx.beginPath();
    if (config.avatarOrigin === Origin.TOP) {
      ctx.rect(0, 0, size.width, size.height / 2);
    } else if (config.avatarOrigin === Origin.BOTTOM) {
      ctx.rect(0, size.height / 2, size.width, size.height);
    } else if (config.avatarOrigin === Origin.LEFT) {
      ctx.rect(0, 0, size.width / 2, size.height);
    } else {
      ctx.rect(size.width / 2, 0, size.width, size.height);
    }
    ctx.clip();
    // #endregion

    // #region find image size & position
    let maxHeight: number = size.height;
    let maxWidth: number = size.width;
    if (
      config.avatarOrigin === Origin.TOP ||
      config.avatarOrigin === Origin.BOTTOM
    ) {
      maxHeight /= 2;
    } else {
      maxWidth /= 2;
    }

    const imageSize = Math.max(maxWidth, maxHeight);

    const imageOffset = {
      x: (maxWidth - imageSize) / 2,
      y: (maxHeight - imageSize) / 2,
    };

    const imagePosition = {
      x: config.avatarOrigin === Origin.RIGHT ? size.width / 2 : 0,
      y: config.avatarOrigin === Origin.BOTTOM ? size.height / 2 : 0,
    };

    imagePosition.x += imageOffset.x;
    imagePosition.y += imageOffset.y;
    // #endregion

    ctx.drawImage(
      image,
      imagePosition.x,
      imagePosition.y,
      imageSize,
      imageSize
    );

    ctx.restore();
  }

  public static drawGradient(
    ctx: CanvasRenderingContext2D,
    data: QuoteData,
    config: QuoteConfig
  ): void {
    ctx.save();

    const size = {
      width: config.resolution.width / config.scale.x,
      height: config.resolution.height / config.scale.y,
    };

    let origin = {
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 0,
    };

    if (config.avatarOrigin === Origin.LEFT) {
      origin.x2 = size.width / 2;
    } else if (config.avatarOrigin === Origin.RIGHT) {
      origin.x1 = size.width;
      origin.x2 = size.width / 2;
    } else if (config.avatarOrigin === Origin.TOP) {
      origin.y2 = size.height / 2;
    } else {
      origin.y1 = size.height;
      origin.y2 = size.height / 2;
    }

    const gradient = ctx.createLinearGradient(
      origin.x1,
      origin.y1,
      origin.x2,
      origin.y2
    );

    const transparent = new Color(config.theme.background);
    transparent.alpha = 0;
    gradient.addColorStop(0, transparent.toString({ format: "hex" }));
    gradient.addColorStop(
      1,
      config.theme.background.toString({ format: "hex" })
    );

    ctx.fillStyle = gradient;

    // console.log(origin);
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.restore();
  }

  public static drawText(
    ctx: CanvasRenderingContext2D,
    data: QuoteData,
    config: QuoteConfig
  ): void {
    const size = {
      width: config.resolution.width / config.scale.x,
      height: config.resolution.height / config.scale.y,
    };
    let maxHeight = size.height;
    let maxWidth = size.width;
    if (
      config.avatarOrigin === Origin.TOP ||
      config.avatarOrigin === Origin.BOTTOM
    ) {
      maxHeight /= 2;
    } else {
      maxWidth /= 2;
    }
    maxHeight -= config.padding.y * 2;
    maxWidth -= config.padding.x * 2;

    const displayNameText = [data.displayName];
    const displayNameHeight = getTextHeight({
      lines: displayNameText.length,
      font: config.fontFamily,
      fontSize: config.fontSize.regular,
      lineHeight: 1.5,
      ctx,
    });

    const usernameText = [data.username];
    const usernameHeight = getTextHeight({
      lines: usernameText.length,
      font: config.fontFamily,
      fontSize: config.fontSize.regular,
      lineHeight: 1.5,
      ctx,
    });

    const regularTextHeight = displayNameHeight + usernameHeight;

    const remainingSpace = maxHeight - regularTextHeight;

    let fontSize: number = config.fontSize.max;
    let lines: string[][] = [[data.messageContent]];
    let height: number = fontSize * 1.5;
    while (fontSize) {
      let fontCache: Map<string, number>;
      let font = `${fontSize}px ${config.fontFamily}`;
      if (QuoteGenerator.fontCache.has(font)) {
        fontCache = QuoteGenerator.fontCache.get(font)!;
      } else {
        fontCache = generateCharLengths(
          ctx,
          config.fontFamily,
          fontSize,
          QuoteGenerator.fontCache
        );
      }

      lines = textWrap({
        text: data.messageContent,
        ctx,
        font: config.fontFamily,
        fontSize: fontSize,
        maxWidth,
        cache: fontCache,
      });
      height = getTextHeight({
        lines: flattenLines(lines).length,
        ctx,
        font: config.fontFamily,
        fontSize: fontSize,
        lineHeight: 1.5,
      });

      if (height <= remainingSpace) break;
      if (fontSize === config.fontSize.min) break;
      fontSize--;
    }

    console.log(fontSize, "px");

    if (fontSize === config.fontSize.min) {
      lines = truncateText({
        paragraphs: lines,
        ctx,
        font: config.fontFamily,
        fontSize,
        lineHeight: 1.5,
        maxHeight: remainingSpace,
        ellipsis: "[…]",
      });
      height = getTextHeight({
        lines: flattenLines(lines).length,
        ctx,
        font: config.fontFamily,
        fontSize: fontSize,
        lineHeight: 1.5,
      });
    }

    const totalHeight = height + displayNameHeight + usernameHeight;

    let x = size.width / 2;

    if (config.avatarOrigin === Origin.LEFT) {
      x += size.width / 4;
    } else if (config.avatarOrigin === Origin.RIGHT) {
      x -= size.width / 4;
    }

    let y = 0;
    let sectionHeight = size.height;

    if (config.avatarOrigin === Origin.TOP) {
      y = sectionHeight;
      sectionHeight /= 2;
    } else if (config.avatarOrigin === Origin.BOTTOM) {
      sectionHeight /= 2;
    }

    drawLines({
      lines,
      ctx,
      font: config.fontFamily,
      fontSize: fontSize,
      lineHeight: 1.5,
      fontColor: config.theme.textContent.toString({ format: "hex" }),
      x,
      y: (y + sectionHeight - totalHeight) / 2,
      textAlign: "center",
    });

    drawLines({
      lines: [[...displayNameText]],
      x,
      y: (y + sectionHeight - totalHeight) / 2 + height,
      font: config.fontFamily,
      fontSize: config.fontSize.regular,
      fontColor: config.theme.displayName.toString({ format: "hex" }),
      ctx,
      // textBaseline: "center",
      textAlign: "center",
    });
    drawLines({
      lines: [[...usernameText]],
      x,
      y: (y + sectionHeight - totalHeight) / 2 + height + displayNameHeight,
      font: config.fontFamily,
      fontSize: config.fontSize.regular,
      fontColor: config.theme.username.toString({ format: "hex" }),
      ctx,
      // textBaseline: "center",
      textAlign: "center",
    });
  }

  public static drawWatermark(
    ctx: CanvasRenderingContext2D,
    config: QuoteConfig
  ): void {
    const size = {
      width: config.resolution.width / config.scale.x,
      height: config.resolution.height / config.scale.y,
    };

    ctx.save();

    ctx.font = `${config.fontSize.watermark}px ${config.fontFamily}`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "right";
    ctx.fillStyle = config.theme.watermark;

    let x = size.width;
    let y = size.height;

    console.log("ORIGIN", config.avatarOrigin);

    if (config.avatarOrigin === Origin.RIGHT) {
      ctx.textAlign = "left";
      x = 0;
    }
    if (config.avatarOrigin === Origin.BOTTOM) {
      ctx.textBaseline = "top";
      y = 0;
    }

    ctx.fillText(config.watermark, x, y);

    ctx.restore();
  }
}
