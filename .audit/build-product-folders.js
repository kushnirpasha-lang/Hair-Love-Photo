const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const curated = path.join(root, "curated_upload");
const output = path.join(root, "Фото по продуктам");

const folderNames = {
  "cream-spray": "Крем-спрей",
  thermo: "Термозащита",
  lamellar: "Ламеллярная вода",
  "multi-product": "Несколько продуктов",
};

function copyDirectoryFiles(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });
  if (!fs.existsSync(sourceDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(sourceDir)) {
    const source = path.join(sourceDir, entry);
    if (!fs.statSync(source).isFile()) continue;
    fs.copyFileSync(source, path.join(destinationDir, entry));
    count += 1;
  }
  return count;
}

fs.mkdirSync(output, { recursive: true });
const counts = {};

for (const [product, destinationName] of Object.entries(folderNames)) {
  counts[destinationName] = copyDirectoryFiles(
    path.join(curated, "approved", product),
    path.join(output, destinationName),
  );
}

const misplacedGroupName = "060-E04-woman-choosing-thermo-from-line.png";
const misplacedGroupSource = path.join(output, "Термозащита", misplacedGroupName);
if (fs.existsSync(misplacedGroupSource)) {
  fs.renameSync(
    misplacedGroupSource,
    path.join(output, "Несколько продуктов", misplacedGroupName),
  );
  counts["Термозащита"] -= 1;
  counts["Несколько продуктов"] += 1;
}

const failuresDir = path.join(output, "Факапы");
fs.mkdirSync(failuresDir, { recursive: true });
let failureCount = 0;

for (const status of ["review", "reject"]) {
  const statusDir = path.join(curated, status);
  for (const product of Object.keys(folderNames)) {
    const productDir = path.join(statusDir, product);
    if (!fs.existsSync(productDir)) continue;
    for (const entry of fs.readdirSync(productDir)) {
      const source = path.join(productDir, entry);
      if (!fs.statSync(source).isFile()) continue;
      const destination = path.join(
        failuresDir,
        `${status.toUpperCase()}-${folderNames[product]}-${entry}`,
      );
      fs.copyFileSync(source, destination);
      failureCount += 1;
    }
  }
}

counts["Факапы"] = failureCount;
console.log(JSON.stringify(counts, null, 2));
