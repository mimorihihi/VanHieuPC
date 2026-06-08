import crypto from "node:crypto";
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
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL in environment.");
  process.exit(1);
}

const pool = mysql.createPool({ uri: DATABASE_URL, waitForConnections: true, connectionLimit: 5, queueLimit: 0 });

const CATEGORIES = [
  { name: "PC Gaming", slug: "pc-gaming", sort_order: 1, aliases: ["custom-build", "custome-build"] },
  { name: "PC Đồ hoạ - Làm việc", slug: "pc-do-hoa-lam-viec", sort_order: 2, aliases: ["desktops", "desktop-pcs"] },
  { name: "Laptop", slug: "laptops", sort_order: 3, aliases: [] },
  { name: "Monitor", slug: "monitors", sort_order: 4, aliases: [] },
  { name: "RAM", slug: "ram", sort_order: 5, aliases: ["memory"] },
  { name: "VGA", slug: "vga", sort_order: 6, aliases: ["gpu", "graphics-card", "card-man-hinh"] },
];

const BRANDS = ["VHPC", "ASUS", "MSI", "Gigabyte", "Acer", "Lenovo", "Dell", "LG", "Samsung", "ViewSonic", "AOC", "HKC", "Corsair", "Kingston", "G.Skill", "PNY", "Zotac", "Galax", "PowerColor", "Sapphire"];

function slugify(value) {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s-]/g, " ").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 130);
}

function makeDescription(name, short, specs) {
  return [name, "", short, "", "Thông số nổi bật:", ...Object.entries(specs).map(([k, v]) => `- ${k}: ${v}`)].join("\n");
}

const cpus = ["Intel Core i5-14400F", "Intel Core i5-14500", "Intel Core i7-14700F", "Intel Core i7-14700K", "Intel Core i9-14900K", "AMD Ryzen 5 7500F", "AMD Ryzen 7 7700", "AMD Ryzen 7 7800X3D", "AMD Ryzen 9 7900X", "AMD Ryzen 9 7950X"];
const gpus = ["RTX 3050 6GB", "RTX 4060 8GB", "RTX 4060 Ti 8GB", "RTX 4070 Super 12GB", "RTX 4070 Ti Super 16GB", "RTX 4080 Super 16GB", "RTX 4090 24GB"];
const rams = ["16GB DDR5 5600MHz", "32GB DDR5 6000MHz", "64GB DDR5 6000MHz"];
const ssds = ["500GB NVMe Gen4", "1TB NVMe Gen4", "2TB NVMe Gen4"];

function buildPcProducts(categorySlug, count, typeName, startPrice) {
  const names = ["G5", "G7", "Apex", "Phantom", "Vector", "Nova", "Creator", "Studio", "Render", "ProArt"];
  return Array.from({ length: count }, (_, i) => {
    const brand = i % 4 === 0 || categorySlug === "pc-gaming" ? "VHPC" : ["ASUS", "MSI", "Gigabyte"][i % 3];
    const cpu = cpus[i % cpus.length];
    const gpu = gpus[(i + (categorySlug === "pc-gaming" ? 1 : 2)) % gpus.length];
    const specs = {
      CPU: cpu,
      GPU: gpu,
      RAM: rams[i % rams.length],
      SSD: ssds[i % ssds.length],
      Mainboard: i % 2 === 0 ? "B760/B650 WiFi" : "Z790/X670 WiFi",
      PSU: i % 3 === 0 ? "850W 80 Plus Gold" : "750W 80 Plus Bronze",
      Case: i % 2 === 0 ? "Mid Tower Airflow RGB" : "Premium Tempered Glass",
    };
    const name = `${typeName} ${brand} ${names[i % names.length]} ${cpu} ${gpu}`;
    const short = `${typeName} cấu hình ${cpu}, ${gpu}, ${specs.RAM}, ${specs.SSD}; phù hợp ${categorySlug === "pc-gaming" ? "gaming, streaming và nâng cấp lâu dài" : "thiết kế, dựng phim, render và làm việc chuyên nghiệp"}.`;
    return { categorySlug, brand, name, slug: `vhpc-${slugify(name)}`, short_description: short, description: makeDescription(name, short, specs), price: startPrice + i * 1350000, sale_price: i % 4 === 0 ? startPrice + i * 1280000 : null, stock: 3 + (i % 8), specs, is_featured: i < 8 };
  });
}

function buildLaptopProducts() {
  const models = ["ASUS TUF Gaming F15", "ASUS ROG Strix G16", "MSI Cyborg 15", "MSI Katana 15", "Lenovo LOQ 15", "Lenovo Legion 5", "Acer Nitro V 15", "Acer Predator Helios Neo", "Dell G15", "Gigabyte G5"];
  return Array.from({ length: 25 }, (_, i) => {
    const model = models[i % models.length];
    const brand = model.split(" ")[0];
    const cpu = ["Intel Core i5-13420H", "Intel Core i7-13620H", "Intel Core i7-14650HX", "AMD Ryzen 7 7840HS", "AMD Ryzen 7 8845HS"][i % 5];
    const gpu = ["RTX 3050 6GB", "RTX 4050 6GB", "RTX 4060 8GB", "RTX 4070 8GB"][i % 4];
    const specs = { CPU: cpu, GPU: gpu, RAM: i % 3 === 0 ? "32GB DDR5" : "16GB DDR5", SSD: i % 2 === 0 ? "512GB NVMe" : "1TB NVMe", Display: i % 2 === 0 ? "15.6 inch FHD 144Hz" : "16 inch WUXGA 165Hz" };
    const name = `Laptop ${model} ${cpu} ${gpu}`;
    const short = `${model} hiệu năng cao với ${cpu}, ${gpu}, phù hợp học tập, gaming và làm việc di động.`;
    return { categorySlug: "laptops", brand, name, slug: `vhpc-${slugify(name)}`, short_description: short, description: makeDescription(name, short, specs), price: 17990000 + i * 1150000, sale_price: i % 5 === 0 ? 16990000 + i * 1080000 : null, stock: 4 + (i % 9), specs, is_featured: i < 8 };
  });
}

function buildMonitorProducts() {
  const models = ["LG UltraGear", "Samsung Odyssey G5", "MSI MAG", "AOC 24G4", "ViewSonic VX", "HKC MG", "ASUS TUF Gaming", "Gigabyte GS"];
  return Array.from({ length: 20 }, (_, i) => {
    const model = models[i % models.length];
    const brand = model.split(" ")[0];
    const specs = { Size: ["24 inch", "27 inch", "32 inch", "34 inch"][i % 4], Resolution: ["FHD", "QHD", "4K UHD", "WQHD"][i % 4], "Refresh rate": ["144Hz", "165Hz", "180Hz", "240Hz"][i % 4], Panel: ["IPS", "Fast IPS", "VA", "OLED"][i % 4] };
    const name = `Màn hình ${model} ${specs.Size} ${specs.Resolution} ${specs["Refresh rate"]}`;
    const short = `${name}, tấm nền ${specs.Panel}, phù hợp gaming và làm việc đa nhiệm.`;
    return { categorySlug: "monitors", brand, name, slug: `vhpc-${slugify(name)}-${i + 1}`, short_description: short, description: makeDescription(name, short, specs), price: 2990000 + i * 850000, sale_price: i % 4 === 0 ? 2690000 + i * 820000 : null, stock: 5 + (i % 10), specs, is_featured: i < 8 };
  });
}

function buildRamProducts() {
  const models = ["Corsair Vengeance RGB", "Kingston Fury Beast", "G.Skill Trident Z5 RGB", "ADATA XPG Lancer", "TeamGroup T-Force Delta", "PNY XLR8 Gaming", "Crucial Pro", "Lexar Ares RGB"];
  return Array.from({ length: 12 }, (_, i) => {
    const model = models[i % models.length];
    const brand = model.split(" ")[0];
    const capacity = ["16GB", "32GB", "64GB"][i % 3];
    const type = i % 4 === 0 ? "DDR4" : "DDR5";
    const speed = type === "DDR4" ? ["3200MHz", "3600MHz"][i % 2] : ["5600MHz", "6000MHz", "6400MHz", "7200MHz"][i % 4];
    const kit = capacity === "16GB" ? "2x8GB" : capacity === "32GB" ? "2x16GB" : "2x32GB";
    const specs = { Capacity: capacity, Kit: kit, Type: type, Speed: speed, Heatsink: i % 2 === 0 ? "RGB Aluminum" : "Low-profile Aluminum", Warranty: "36 tháng" };
    const name = `RAM ${model} ${capacity} ${kit} ${type} ${speed}`;
    const short = `${name}, tối ưu cho PC gaming và máy làm việc cần băng thông bộ nhớ ổn định.`;
    return { categorySlug: "ram", brand, name, slug: `vhpc-${slugify(name)}-${i + 1}`, short_description: short, description: makeDescription(name, short, specs), price: 990000 + i * 420000, sale_price: i % 4 === 0 ? 890000 + i * 390000 : null, stock: 8 + (i % 12), specs, is_featured: false };
  });
}

function buildVgaProducts() {
  const models = ["ASUS Dual", "ASUS TUF Gaming", "MSI Ventus", "MSI Gaming X Trio", "Gigabyte Windforce", "Gigabyte Gaming OC", "Zotac Twin Edge", "Galax EX Gamer", "Sapphire Pulse", "PowerColor Hellhound"];
  const chipsets = ["RTX 3050 6GB", "RTX 4060 8GB", "RTX 4060 Ti 8GB", "RTX 4070 Super 12GB", "RTX 4070 Ti Super 16GB", "RTX 4080 Super 16GB", "RX 7600 8GB", "RX 7800 XT 16GB", "RX 7900 GRE 16GB"];
  return Array.from({ length: 13 }, (_, i) => {
    const model = models[i % models.length];
    const brand = model.split(" ")[0];
    const chipset = chipsets[i % chipsets.length];
    const specs = { Chipset: chipset, VRAM: chipset.includes("16GB") ? "16GB" : chipset.includes("12GB") ? "12GB" : chipset.includes("6GB") ? "6GB" : "8GB", Cooling: i % 3 === 0 ? "Triple Fan" : "Dual Fan", Power: i % 4 === 0 ? "750W PSU recommended" : "650W PSU recommended", Warranty: "36 tháng" };
    const name = `VGA ${model} ${chipset}`;
    const short = `${name}, phù hợp nâng cấp PC gaming, dựng hình và xử lý đồ hoạ theo nhu cầu.`;
    return { categorySlug: "vga", brand, name, slug: `vhpc-${slugify(name)}-${i + 1}`, short_description: short, description: makeDescription(name, short, specs), price: 3990000 + i * 1850000, sale_price: i % 5 === 0 ? 3690000 + i * 1780000 : null, stock: 4 + (i % 8), specs, is_featured: false };
  });
}

const PRODUCTS = [
  ...buildPcProducts("pc-gaming", 30, "PC Gaming", 15990000),
  ...buildPcProducts("pc-do-hoa-lam-viec", 25, "PC Đồ hoạ - Làm việc", 18990000),
  ...buildLaptopProducts(),
  ...buildMonitorProducts(),
  ...buildRamProducts(),
  ...buildVgaProducts(),
];

async function getOrCreateCategories() {
  const map = new Map();
  for (const category of CATEGORIES) {
    const aliases = [category.slug, ...category.aliases];
    const [rows] = await pool.query(`SELECT id, slug FROM categories WHERE slug IN (${aliases.map(() => "?").join(",")}) LIMIT 1`, aliases);
    if (rows.length) {
      map.set(category.slug, rows[0].id);
      if (isApply) await pool.execute("UPDATE categories SET name = ?, slug = ?, is_active = true, sort_order = ? WHERE id = ?", [category.name, category.slug, category.sort_order, rows[0].id]);
      console.log(`${isApply ? "Updated" : "Would update"} category: ${category.name} (${category.slug})`);
    } else {
      const id = crypto.randomUUID();
      map.set(category.slug, id);
      if (isApply) await pool.execute("INSERT INTO categories (id, name, slug, parent_id, image_url, is_active, sort_order) VALUES (?, ?, ?, NULL, NULL, true, ?)", [id, category.name, category.slug, category.sort_order]);
      console.log(`${isApply ? "Inserted" : "Would insert"} category: ${category.name} (${category.slug})`);
    }
  }
  return map;
}

async function getOrCreateBrands() {
  const map = new Map();
  for (const name of BRANDS) {
    const slug = slugify(name);
    const [rows] = await pool.query("SELECT id FROM brands WHERE slug = ? OR name = ? LIMIT 1", [slug, name]);
    if (rows.length) map.set(name, rows[0].id);
    else {
      const id = crypto.randomUUID();
      map.set(name, id);
      if (isApply) await pool.execute("INSERT INTO brands (id, name, slug, logo_url, is_active) VALUES (?, ?, ?, NULL, true)", [id, name, slug]);
      console.log(`${isApply ? "Inserted" : "Would insert"} brand: ${name}`);
    }
  }
  return map;
}

async function seedProducts(categoryIds, brandIds) {
  let inserted = 0;
  let skipped = 0;
  for (const product of PRODUCTS) {
    const [exists] = await pool.query("SELECT id FROM products WHERE slug = ? LIMIT 1", [product.slug]);
    if (exists.length) {
      skipped += 1;
      continue;
    }
    inserted += 1;
    if (!isApply) continue;
    await pool.execute(
      `INSERT INTO products (id, category_id, brand_id, name, slug, description, short_description, price, sale_price, stock, thumbnail_url, specs, avg_rating, is_active, is_featured, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, true, ?, NOW())`,
      [crypto.randomUUID(), categoryIds.get(product.categorySlug), brandIds.get(product.brand) ?? null, product.name, product.slug, product.description, product.short_description, product.price, product.sale_price, product.stock, JSON.stringify(product.specs), product.is_featured]
    );
  }
  console.log(`\nProducts: ${isApply ? "inserted" : "would insert"} ${inserted}, skipped existing ${skipped}, total seed list ${PRODUCTS.length}`);
}

async function main() {
  console.log(isDryRun ? "DRY RUN - no data will be changed" : "APPLY MODE - Railway DB will be updated");
  const categoryIds = await getOrCreateCategories();
  const brandIds = await getOrCreateBrands();
  await seedProducts(categoryIds, brandIds);
}

main().then(async () => pool.end()).catch(async (error) => { console.error(error.message || error); await pool.end(); process.exit(1); });
