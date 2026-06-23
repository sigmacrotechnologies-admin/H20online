#!/usr/bin/env node
/**
 * Generates Expo/Android launcher icons and splash from assets/images/H20-logo.png
 * Run: npm run icons
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "assets/images/H20-logo.png");
const OUT = path.join(ROOT, "assets/images");
const BG = { r: 232, g: 246, b: 248, alpha: 1 }; // #E8F6F8 — matches app teal theme

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("Install sharp first: npm install --save-dev sharp");
    process.exit(1);
  }

  if (!fs.existsSync(SRC)) {
    console.error("Logo not found:", SRC);
    process.exit(1);
  }

  async function icon(size, filename, paddingRatio = 0.18) {
    const pad = Math.round(size * paddingRatio);
    const inner = size - pad * 2;
    const logo = await sharp(SRC)
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 4, background: BG },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toFile(path.join(OUT, filename));

    console.log("  wrote", filename);
  }

  console.log("Generating app icons from H20-logo.png ...");
  await icon(1024, "icon.png");
  await icon(1024, "android-icon-foreground.png", 0.22);
  await icon(1024, "android-icon-monochrome.png", 0.22);
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: BG },
  })
    .png()
    .toFile(path.join(OUT, "android-icon-background.png"));
  console.log("  wrote android-icon-background.png");
  await icon(240, "splash-icon.png", 0.12);
  console.log("Done. Rebuild APK: npm run build:apk");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
