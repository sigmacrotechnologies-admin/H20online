#!/usr/bin/env node
/**
 * Generates Expo/Android launcher icons and splash from the H2O phone mark.
 * Dark square background + light cropped "H in phone" symbol only (no wordmark).
 *
 * Run: npm run icons
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "assets/images/h20-logo-light-full.png");
const SRC_FALLBACK = path.join(ROOT, "assets/images/H20-logo.png");
const OUT = path.join(ROOT, "assets/images");

/** App dark theme — matches splash dark + textPrimary */
const DARK_BG = { r: 27, g: 43, b: 52, alpha: 1 }; // #1B2B34
const DARK_BG_HEX = "#1B2B34";

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("Install sharp first: npm install --save-dev sharp");
    process.exit(1);
  }

  const sourcePath = fs.existsSync(SRC) ? SRC : SRC_FALLBACK;
  if (!fs.existsSync(sourcePath)) {
    console.error("Logo not found:", SRC);
    process.exit(1);
  }

  async function extractMark() {
    const meta = await sharp(sourcePath).metadata();
    const phoneWidthRatio = path.basename(sourcePath).includes("light-full") ? 0.22 : 0.33;
    const cropWidth = Math.max(1, Math.min(meta.width, Math.round(meta.width * phoneWidthRatio)));
    const mark = await sharp(sourcePath)
      .extract({
        left: 0,
        top: 0,
        width: cropWidth,
        height: meta.height,
      })
      .png()
      .toBuffer();

    await sharp(mark).toFile(path.join(OUT, "H20-icon-mark.png"));
    const trimmed = await sharp(mark).metadata();
    console.log("  wrote H20-icon-mark.png", trimmed.width, "x", trimmed.height);
    return mark;
  }

  console.log("Generating dark-theme icons from", path.basename(sourcePath), "...");
  const markBuffer = await extractMark();

  async function squareIcon(size, filename, paddingRatio = 0.2) {
    const pad = Math.round(size * paddingRatio);
    const inner = size - pad * 2;

    const logo = await sharp(markBuffer)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 4, background: DARK_BG },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toFile(path.join(OUT, filename));

    console.log("  wrote", filename);
  }

  async function androidForeground(size, filename, paddingRatio = 0.26) {
    const pad = Math.round(size * paddingRatio);
    const inner = size - pad * 2;

    await sharp(markBuffer)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(OUT, filename));

    console.log("  wrote", filename);
  }

  await squareIcon(1024, "icon.png");
  await androidForeground(1024, "android-icon-foreground.png");
  await androidForeground(1024, "android-icon-monochrome.png");

  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: DARK_BG },
  })
    .png()
    .toFile(path.join(OUT, "android-icon-background.png"));
  console.log("  wrote android-icon-background.png");

  await squareIcon(240, "splash-icon.png", 0.16);

  // Favicon for web
  await squareIcon(48, "favicon.png", 0.14);

  console.log("Done. Dark background:", DARK_BG_HEX);
  console.log("Rebuild APK / restart Expo: npx expo start -c  |  npm run build:apk");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
