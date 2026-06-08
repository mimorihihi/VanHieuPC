import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const isApply = process.argv.includes("--apply");
const DATABASE_URL = process.env.DATABASE_URL;
const DEMO_NOTE = "Dữ liệu demo phục vụ trình bày website, ảnh sản phẩm sẽ được cập nhật sau trong trang quản trị.";

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in environment.");
  process.exit(1);
}

const pool = mysql.createPool({
  uri: DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

function cleanDescription(value) {
  return String(value ?? "")
    .replace(DEMO_NOTE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  console.log(isApply ? "APPLY MODE - product descriptions will be updated" : "DRY RUN - no data will be changed");

  const [rows] = await pool.query(
    "SELECT id, name, description FROM products WHERE description LIKE ?",
    [`%${DEMO_NOTE}%`]
  );

  console.log(`Matched products: ${rows.length}`);

  if (!isApply) {
    console.table(rows.slice(0, 10).map((row) => ({ id: row.id, name: row.name })));
    console.log("Run with --apply to remove the note from matched descriptions.");
    return;
  }

  for (const row of rows) {
    await pool.execute("UPDATE products SET description = ? WHERE id = ?", [cleanDescription(row.description), row.id]);
  }

  console.log(`Updated products: ${rows.length}`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error.message || error);
    await pool.end();
    process.exit(1);
  });
