const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const outDir = __dirname;
const groups = [
  ["cream-ai", path.join(root, "AI", "Крем Спрей 20 в 1")],
  ["thermo-ai", path.join(root, "AI", "Термозащита")],
  ["lamellar-ai", path.join(root, "AI", "Ламилярная вода")],
  ["generated", path.join(root, "generated_images")],
  ["ai-root", path.join(root, "AI")],
];

const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".heic"]);
const tileWidth = 300;
const imageHeight = 330;
const labelHeight = 58;
const gap = 18;
const columns = 4;

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapLabel(label, max = 34) {
  if (label.length <= max) return [label];
  const midpoint = Math.floor(label.length / 2);
  let split = label.lastIndexOf(" ", midpoint);
  if (split < 12) split = label.indexOf(" ", midpoint);
  if (split < 0) split = max;
  return [label.slice(0, split), label.slice(split).trim()];
}

async function makeSheet(name, dir, recursive = false) {
  if (!fs.existsSync(dir)) return;
  const entries = recursive
    ? fs.readdirSync(dir, { recursive: true })
    : fs.readdirSync(dir);
  const files = entries
    .map((entry) => path.join(dir, entry))
    .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
    .filter((file) => allowed.has(path.extname(file).toLowerCase()))
    .filter((file) => recursive || path.dirname(file) === dir)
    .sort((a, b) => a.localeCompare(b, "ru", { numeric: true }));

  if (!files.length) return;

  const rows = Math.ceil(files.length / columns);
  const width = columns * tileWidth + (columns + 1) * gap;
  const height = rows * (imageHeight + labelHeight) + (rows + 1) * gap;
  const composites = [];

  for (let index = 0; index < files.length; index += 1) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const left = gap + col * (tileWidth + gap);
    const top = gap + row * (imageHeight + labelHeight + gap);
    const image = await sharp(files[index])
      .rotate()
      .resize(tileWidth, imageHeight, {
        fit: "contain",
        background: "#f7f4ef",
      })
      .png()
      .toBuffer();
    composites.push({ input: image, left, top });

    const relative = path.relative(root, files[index]);
    const lines = wrapLabel(relative);
    const tspans = lines
      .map(
        (line, lineIndex) =>
          `<tspan x="${tileWidth / 2}" dy="${lineIndex ? 19 : 0}">${escapeXml(line)}</tspan>`,
      )
      .join("");
    const label = Buffer.from(
      `<svg width="${tileWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="${tileWidth / 2}" y="19" text-anchor="middle"
          font-family="Arial, sans-serif" font-size="13" fill="#262626">${tspans}</text>
      </svg>`,
    );
    composites.push({ input: label, left, top: top + imageHeight });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#dedbd5",
    },
  })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(path.join(outDir, `${name}-contact-sheet.jpg`));
}

(async () => {
  for (const [name, dir] of groups) {
    await makeSheet(name, dir, false);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
