const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../src/screens");
const files = fs.readdirSync(dir).filter((f) => f.endsWith("Screen.js"));
let count = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  let c = fs.readFileSync(fp, "utf8");
  const orig = c;

  c = c.replace(/borderTopLeftRadius: 28/g, "borderTopLeftRadius: 32");
  c = c.replace(/borderTopRightRadius: 28/g, "borderTopRightRadius: 32");
  c = c.replace(/marginTop: -16,\n(\s+)backgroundColor: theme\.screenBackground/g, 'marginTop: -30,\n$1backgroundColor: "#F8FCFD"');
  c = c.replace(/marginTop: -24,\n(\s+)backgroundColor: theme\.screenBackground/g, 'marginTop: -30,\n$1backgroundColor: "#F8FCFD"');
  c = c.replace(/marginTop: -20,\n(\s+)backgroundColor: theme\.screenBackground/g, 'marginTop: -30,\n$1backgroundColor: "#F8FCFD"');
  c = c.replace(/marginTop: -18,\n(\s+)backgroundColor: theme\.screenBackground/g, 'marginTop: -30,\n$1backgroundColor: "#F8FCFD"');
  c = c.replace(/marginTop: -14,\n(\s+)backgroundColor: theme\.screenBackground/g, 'marginTop: -30,\n$1backgroundColor: "#F8FCFD"');
  c = c.replace(/backgroundColor: theme\.screenBackground,\n(\s+)borderTopLeftRadius: 32/g, 'backgroundColor: "#F8FCFD",\n$1borderTopLeftRadius: 32');
  c = c.replace(/marginTop: -14,\n(\s+)backgroundColor: theme\.screenBackground/g, 'marginTop: -30,\n$1backgroundColor: "#F8FCFD"');
  c = c.replace(/marginTop: -16,\n(\s+)backgroundColor: theme\.screenBackground/g, 'marginTop: -30,\n$1backgroundColor: "#F8FCFD"');
  c = c.replace(/marginTop: -22,\n(\s+)backgroundColor: theme\.screenBackground/g, 'marginTop: -30,\n$1backgroundColor: "#F8FCFD"');
  c = c.replace(/backgroundColor: theme\.screenBackground, borderTopLeftRadius: 32/g, 'backgroundColor: "#F8FCFD", borderTopLeftRadius: 32');
  c = c.replace(/marginTop: -14, backgroundColor: theme\.screenBackground/g, 'marginTop: -30, backgroundColor: "#F8FCFD"');
  c = c.replace(/marginTop: -16, backgroundColor: theme\.screenBackground/g, 'marginTop: -30, backgroundColor: "#F8FCFD"');
  c = c.replace(/marginTop: -22, backgroundColor: theme\.screenBackground/g, 'marginTop: -30, backgroundColor: "#F8FCFD"');
  c = c.replace(/backgroundColor: "rgba\(255,255,255,0\.78\)"/g, 'backgroundColor: "#FFFFFF"');
  c = c.replace(/backgroundColor: "rgba\(255,255,255,0\.75\)"/g, 'backgroundColor: "#FFFFFF"');
  c = c.replace(/backgroundColor: theme\.cardBackground(?!Solid)/g, 'backgroundColor: "#FFFFFF"');
  c = c.replace(/flex: 1,\n(\s+)marginTop: -16/g, "flex: 1,\n$1marginTop: -30");
  c = c.replace(/borderRadius: 20,\n(\s+)paddingVertical: 16,\n(\s+)borderRadius: 30/g, "borderRadius: 16,\n$1paddingVertical: 16,\n$2borderRadius: 16");

  if (c !== orig) {
    fs.writeFileSync(fp, c);
    count += 1;
    console.log("updated", file);
  }
}

console.log("total", count);
