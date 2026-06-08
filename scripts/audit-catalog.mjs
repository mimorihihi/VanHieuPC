import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^"|"$/g, "");

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const DATABASE_URL = process.env.DATABASE_URL;

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

async function main() {
  const [categories] = await pool.query(
    `SELECT c.id, c.name, c.slug, c.is_active, c.sort_order, COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id, c.name, c.slug, c.is_active, c.sort_order
     ORDER BY c.sort_order ASC, c.name ASC`
  );

  const [brands] = await pool.query(
    `SELECT b.id, b.name, b.slug, b.is_active, COUNT(p.id) AS product_count
     FROM brands b
     LEFT JOIN products p ON p.brand_id = b.id
     GROUP BY b.id, b.name, b.slug, b.is_active
     ORDER BY product_count DESC, b.name ASC
     LIMIT 50`
  );

  const [demoProducts] = await pool.query(
    `SELECT slug, name
     FROM products
     WHERE slug LIKE 'vhpc-%' OR slug LIKE 'nguyen-cong-%'
     ORDER BY created_at DESC
     LIMIT 20`
  );

  console.log("\n=== Categories ===");
  console.table(categories);

  console.log("\n=== Top Brands ===");
  console.table(brands);

  console.log("\n=== Existing demo-like products ===");
  console.table(demoProducts);

  const targetSlugs = ["pc-gaming", "pc-do-hoa-lam-viec", "laptops", "monitors"];
  const existingSlugs = new Set(categories.map((category) => category.slug));
  const missingSlugs = targetSlugs.filter((slug) => !existingSlugs.has(slug));

  console.log("\nTarget category slugs:", targetSlugs.join(", "));
  console.log("Missing target slugs:", missingSlugs.length ? missingSlugs.join(", ") : "none");
  console.log("\nAudit only. No data was changed.");
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
