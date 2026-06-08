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
const isDryRun = process.argv.includes("--dry-run") || !isApply;
const force = process.argv.includes("--force");
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

const countQueries = [
  ["products", "SELECT COUNT(*) AS total FROM products"],
  ["product_images", "SELECT COUNT(*) AS total FROM product_images"],
  ["product_variants", "SELECT COUNT(*) AS total FROM product_variants"],
  ["cart_items", "SELECT COUNT(*) AS total FROM cart_items"],
  ["wishlists", "SELECT COUNT(*) AS total FROM wishlists"],
  ["order_items", "SELECT COUNT(*) AS total FROM order_items"],
];

async function countRows() {
  const result = {};

  for (const [name, sql] of countQueries) {
    try {
      const [rows] = await pool.query(sql);
      result[name] = Number(rows[0]?.total ?? 0);
    } catch (error) {
      result[name] = "table not found";
    }
  }

  return result;
}

async function tableExists(tableName) {
  const [rows] = await pool.query("SHOW TABLES LIKE ?", [tableName]);
  return rows.length > 0;
}

async function deleteIfExists(tableName) {
  if (!(await tableExists(tableName))) return;
  await pool.execute(`DELETE FROM ${tableName}`);
}

async function main() {
  console.log(isDryRun ? "DRY RUN - no data will be changed" : "APPLY MODE - catalog data will be reset");

  const before = await countRows();
  console.log("\nCurrent related rows:");
  console.table(before);

  const orderItemsCount = Number(before.order_items ?? 0);
  if (orderItemsCount > 0 && !force) {
    console.log("\nAbort condition:");
    console.log(`order_items has ${orderItemsCount} rows. Deleting products may break historical orders.`);
    console.log("If you still want to reset products, rerun with --apply --force after confirming orders can be affected.");
    return;
  }

  console.log("\nReset plan:");
  console.log("1. Delete product_images");
  console.log("2. Delete product_variants");
  console.log("3. Delete cart_items and wishlists that point to old products");
  console.log("4. Delete order_items and orders test data");
  console.log("5. Delete products");
  console.log("6. Keep users, coupons, banners, categories, brands");

  if (!isApply) {
    console.log("\nDry-run complete. No data was changed.");
    return;
  }

  await pool.query("START TRANSACTION");

  try {
    await deleteIfExists("product_images");
    await deleteIfExists("product_variants");
    await deleteIfExists("cart_items");
    await deleteIfExists("wishlists");
    await deleteIfExists("order_items");
    await deleteIfExists("orders");
    await deleteIfExists("products");

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }

  const after = await countRows();
  console.log("\nRows after reset:");
  console.table(after);
  console.log("\nCatalog reset complete. You can now run: node scripts/seed-vhpc-demo-catalog.mjs --apply");
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
