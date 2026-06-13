const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(__dirname, "review-pages", "manifest.txt");
const exportRoot = path.join(root, "curated_upload");

const reviewReasons = new Map([
  [5, "Near-duplicate shoulder composition; select against image 3."],
  [8, "Near-duplicate botanical composition; select against image 7."],
  [10, "Second dark-background variation; select against image 4."],
  [12, "Near-duplicate eucalyptus/linen composition."],
  [14, "Near-duplicate leaf-shadow composition; select against image 6."],
  [26, "Busy ice-and-herb styling; weaker fit with the premium core set."],
  [44, "Spray-action image needs a final nozzle/mist realism check."],
  [68, "Mirror creates additional bottle reflections; confirm before publishing."],
]);

const rejectReasons = new Map([
  [11, "Exact duplicate of image 3."],
  [22, "Exact duplicate of image 16."],
]);

function productFolder(relative) {
  const lower = relative.toLowerCase();
  const productHits = [
    lower.includes("cream") || lower.includes("крем"),
    lower.includes("thermo") || lower.includes("термо"),
    lower.includes("lamellar") || lower.includes("ламил"),
  ].filter(Boolean).length;

  if (
    lower.includes("complete-line") ||
    lower.includes("core-duo") ||
    lower.includes("/f0") ||
    productHits > 1
  ) {
    return "multi-product";
  }
  if (lower.includes("thermo") || lower.includes("термо")) return "thermo";
  if (lower.includes("lamellar") || lower.includes("ламил")) return "lamellar";
  return "cream-spray";
}

function ensureCleanStructure() {
  for (const status of ["approved", "review", "reject"]) {
    for (const product of [
      "cream-spray",
      "thermo",
      "lamellar",
      "multi-product",
    ]) {
      fs.mkdirSync(path.join(exportRoot, status, product), { recursive: true });
    }
  }
}

const manifest = fs
  .readFileSync(manifestPath, "utf8")
  .trim()
  .split("\n")
  .map((line) => {
    const tab = line.indexOf("\t");
    return {
      index: Number(line.slice(0, tab)),
      relative: line.slice(tab + 1),
    };
  });

ensureCleanStructure();

const rows = [];
for (const item of manifest) {
  let status = "approved";
  let reason = "Passed visual review: product identity, composition, and anatomy appear usable.";
  if (reviewReasons.has(item.index)) {
    status = "review";
    reason = reviewReasons.get(item.index);
  } else if (rejectReasons.has(item.index)) {
    status = "reject";
    reason = rejectReasons.get(item.index);
  }

  const product = productFolder(item.relative);
  const source = path.join(root, item.relative);
  const destinationName = `${String(item.index).padStart(3, "0")}-${path.basename(source)}`;
  const destination = path.join(exportRoot, status, product, destinationName);
  fs.copyFileSync(source, destination);
  rows.push({
    index: item.index,
    status,
    product,
    source: item.relative,
    destination: path.relative(root, destination),
    reason,
  });
}

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const csv = [
  ["index", "status", "product", "source", "destination", "reason"],
  ...rows.map((row) => [
    row.index,
    row.status,
    row.product,
    row.source,
    row.destination,
    row.reason,
  ]),
]
  .map((row) => row.map(escapeCsv).join(","))
  .join("\n");

fs.writeFileSync(path.join(exportRoot, "PHOTO_REVIEW.csv"), `${csv}\n`);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify(counts));
