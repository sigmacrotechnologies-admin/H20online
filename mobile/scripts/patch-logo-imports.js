const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../src/screens");
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, "utf8");
  if (!c.includes("AppLogo") || c.includes("import AppLogo")) continue;
  c = c.replace(/^import .+;\n/m, (m) => `${m}import AppLogo from "@/src/components/AppLogo";\n`);
  fs.writeFileSync(p, c);
  console.log("import", f);
}
