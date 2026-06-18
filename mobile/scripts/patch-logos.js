const fs = require("fs");
const path = require("path");

const screensDir = path.join(__dirname, "../src/screens");
const files = fs.readdirSync(screensDir).filter((f) => f.endsWith(".js"));

const logoBlock = /<View style={styles\.logoGlass}>[\s\S]*?h20-logo-light-full\.png"[\s\S]*?<\/View>/g;
const cartLogoBlock = /<View style={styles\.logoGlass}>\s*<Image source={require\("\.\.\/\.\.\/assets\/images\/h20-logo-light-full\.png"\)} style={styles\.headerLogoLight} resizeMode="contain" \/>\s*<\/View>/g;

const supplierOnboardingBlock = /<View style={styles\.logoGlass}>[\s\S]*?h20-logo-light-full\.png"[\s\S]*?resizeMode="contain"\s*\/>\s*<\/View>/g;

for (const file of files) {
  const filePath = path.join(screensDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("h20-logo-light-full.png")) continue;

  if (!content.includes("AppLogo")) {
    const firstImport = content.match(/^import .+;\n/m);
    if (firstImport) {
      content = content.replace(firstImport[0], firstImport[0] + 'import AppLogo from "@/src/components/AppLogo";\n');
    }
  }

  content = content.replace(logoBlock, '<AppLogo size="header" />');
  content = content.replace(cartLogoBlock, '<AppLogo size="header" />');
  content = content.replace(supplierOnboardingBlock, '<AppLogo size="hero" />');

  fs.writeFileSync(filePath, content);
  console.log("updated", file);
}
