const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const outDir = path.join(__dirname, "review-pages");
fs.mkdirSync(outDir, { recursive: true });

const sources = [
  path.join(root, "AI", "Крем Спрей 20 в 1"),
  path.join(root, "AI", "Термозащита"),
  path.join(root, "AI", "Ламилярная вода"),
  path.join(root, "generated_images"),
];
const extensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const files = sources
  .flatMap((dir) =>
    fs
      .readdirSync(dir)
      .map((name) => path.join(dir, name))
      .filter((file) => fs.statSync(file).isFile()),
  )
  .filter((file) => extensions.has(path.extname(file).toLowerCase()))
  .sort((a, b) =>
    path.relative(root, a).localeCompare(path.relative(root, b), "ru", {
      numeric: true,
    }),
  );

const columns = 3;
const rows = 4;
const perPage = columns * rows;
const tileWidth = 520;
const imageHeight = 570;
const labelHeight = 72;
const gap = 20;

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(text, max = 48) {
  const lines = [];
  let remaining = text;
  while (remaining.length > max && lines.length < 2) {
    let split = remaining.lastIndexOf(" ", max);
    if (split < 10) split = max;
    lines.push(remaining.slice(0, split));
    remaining = remaining.slice(split).trim();
  }
  lines.push(remaining);
  return lines.slice(0, 3);
}

async function makePage(pageFiles, pageIndex) {
  const width = columns * tileWidth + (columns + 1) * gap;
  const height = rows * (imageHeight + labelHeight) + (rows + 1) * gap;
  const composites = [];

  for (let index = 0; index < pageFiles.length; index += 1) {
    const file = pageFiles[index];
    const col = index % columns;
    const row = Math.floor(index / columns);
    const left = gap + col * (tileWidth + gap);
    const top = gap + row * (imageHeight + labelHeight + gap);
    const image = await sharp(file)
      .rotate()
      .resize(tileWidth, imageHeight, {
        fit: "contain",
        background: "#f5f2ed",
      })
      .png()
      .toBuffer();
    composites.push({ input: image, left, top });

    const relative = `${pageIndex * perPage + index + 1}. ${path.relative(root, file)}`;
    const lines = wrap(relative);
    const tspans = lines
      .map(
        (line, i) =>
          `<tspan x="${tileWidth / 2}" dy="${i ? 20 : 0}">${escapeXml(line)}</tspan>`,
      )
      .join("");
    const label = Buffer.from(
      `<svg width="${tileWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#fff"/>
        <text x="${tileWidth / 2}" y="22" text-anchor="middle"
          font-family="Arial, sans-serif" font-size="15" fill="#202020">${tspans}</text>
      </svg>`,
    );
    composites.push({ input: label, left, top: top + imageHeight });
  }

  const pageName = `review-${String(pageIndex + 1).padStart(2, "0")}.jpg`;
  await sharp({
    create: { width, height, channels: 3, background: "#d6d2cb" },
  })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toFile(path.join(outDir, pageName));
}

(async () => {
  for (let start = 0; start < files.length; start += perPage) {
    await makePage(files.slice(start, start + perPage), start / perPage);
  }
  fs.writeFileSync(
    path.join(outDir, "manifest.txt"),
    files.map((file, index) => `${index + 1}\t${path.relative(root, file)}`).join("\n") + "\n",
  );
  console.log(`${files.length} images, ${Math.ceil(files.length / perPage)} pages`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
