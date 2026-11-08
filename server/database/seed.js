import bcrypt from 'bcrypt';
import { getDb, initializeSchema, closeDb } from '../config/db.js';

const SALT_ROUNDS = 10;

async function seed() {
  const db = getDb();
  initializeSchema(db);

  const force = process.argv.includes('--force');

  const existingUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const existingCategories = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;

  if ((existingUsers > 0 || existingCategories > 0) && !force) {
    console.log('Database already contains data. Run with --force or use "npm run db:reset" to re-seed.');
    closeDb();
    return;
  }

  if (force) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM transactions;
      DELETE FROM products;
      DELETE FROM categories;
      DELETE FROM users;
      DELETE FROM sqlite_sequence WHERE name IN ('users', 'categories', 'products', 'transactions');
      PRAGMA foreign_keys = ON;
    `);
  }

  const adminPasswordHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);

  const categoriesData = [
    { name: 'Electronics', description: 'Monitors, laptops, networking gear, and office hardware' },
    { name: 'Computer Accessories', description: 'Keyboards, mice, docks, cables, and webcams' },
    { name: 'Office Furniture', description: 'Ergonomic chairs, standing desks, and storage units' },
    { name: 'Stationery & Paper', description: 'Notebooks, pens, printer paper, and folders' },
    { name: 'Packaging & Shipping', description: 'Corrugated boxes, tape, bubble wrap, and shipping labels' },
    { name: 'Breakroom & Supplies', description: 'Coffee pods, cups, cleaning wipes, and sanitizer' },
  ];

  // 22 realistic products across 6 categories.
  // Initial quantities will be reconciled directly with the chronological transactions below.
  const productsData = [
    {
      name: 'Dell UltraSharp 27" 4K Monitor',
      sku: 'ELC-MON-001',
      description: '27-inch IPS 4K USB-C hub monitor with 99% sRGB coverage',
      category: 'Electronics',
      purchase_price: 28500.0,
      selling_price: 39990.0,
      quantity: 18,
      min_stock_level: 5,
    },
    {
      name: 'TP-Link 24-Port Gigabit Switch',
      sku: 'ELC-NET-002',
      description: 'Rackmount unmanaged 24-port gigabit Ethernet switch',
      category: 'Electronics',
      purchase_price: 6200.0,
      selling_price: 8999.0,
      quantity: 4,
      min_stock_level: 6,
    },
    {
      name: 'Brother HL-L2350DW Laser Printer',
      sku: 'ELC-PRT-003',
      description: 'Compact monochrome wireless duplex laser printer',
      category: 'Electronics',
      purchase_price: 9800.0,
      selling_price: 13490.0,
      quantity: 0,
      min_stock_level: 4,
    },
    {
      name: 'APC Back-UPS 600VA Battery',
      sku: 'ELC-PWR-004',
      description: '600VA UPS battery backup and surge protector with USB port',
      category: 'Electronics',
      purchase_price: 4100.0,
      selling_price: 5990.0,
      quantity: 14,
      min_stock_level: 5,
    },
    {
      name: 'Logitech MX Master 3S Mouse',
      sku: 'ACC-MSE-001',
      description: 'Wireless ergonomic performance mouse with MagSpeed scroll',
      category: 'Computer Accessories',
      purchase_price: 5600.0,
      selling_price: 8495.0,
      quantity: 26,
      min_stock_level: 8,
    },
    {
      name: 'Keychron K2 Mechanical Keyboard',
      sku: 'ACC-KBD-002',
      description: '75% layout wireless mechanical keyboard with brown switches',
      category: 'Computer Accessories',
      purchase_price: 5200.0,
      selling_price: 7499.0,
      quantity: 5,
      min_stock_level: 6,
    },
    {
      name: 'Anker 11-in-1 USB-C Hub',
      sku: 'ACC-HUB-003',
      description: 'USB-C docking adapter with dual HDMI, Ethernet, and PD 100W',
      category: 'Computer Accessories',
      purchase_price: 3200.0,
      selling_price: 4999.0,
      quantity: 32,
      min_stock_level: 10,
    },
    {
      name: 'Logitech C920s Pro HD Webcam',
      sku: 'ACC-CAM-004',
      description: '1080p Full HD webcam with privacy shutter and dual mics',
      category: 'Computer Accessories',
      purchase_price: 3800.0,
      selling_price: 5895.0,
      quantity: 0,
      min_stock_level: 5,
    },
    {
      name: 'Braided USB-C to USB-C Cable (2m)',
      sku: 'ACC-CBL-005',
      description: '100W fast charging nylon braided USB-C cable, 2 meters',
      category: 'Computer Accessories',
      purchase_price: 450.0,
      selling_price: 999.0,
      quantity: 65,
      min_stock_level: 20,
    },
    {
      name: 'Herman Mesh Ergonomic Task Chair',
      sku: 'FRN-CHR-001',
      description: 'Breathable mesh office chair with adjustable lumbar support',
      category: 'Office Furniture',
      purchase_price: 14500.0,
      selling_price: 22990.0,
      quantity: 9,
      min_stock_level: 4,
    },
    {
      name: 'FlexiDesk Electric Standing Desk',
      sku: 'FRN-DSK-002',
      description: 'Dual-motor height adjustable 60x30 inch oak standing desk',
      category: 'Office Furniture',
      purchase_price: 19800.0,
      selling_price: 31500.0,
      quantity: 3,
      min_stock_level: 4,
    },
    {
      name: '3-Drawer Mobile File Cabinet',
      sku: 'FRN-CAB-003',
      description: 'Lockable steel under-desk pedestal cabinet with casters',
      category: 'Office Furniture',
      purchase_price: 6800.0,
      selling_price: 10990.0,
      quantity: 11,
      min_stock_level: 3,
    },
    {
      name: 'Dual Monitor Articulating Arm',
      sku: 'FRN-ARM-004',
      description: 'Gas-spring heavy duty dual monitor desk mount (17-32 in)',
      category: 'Office Furniture',
      purchase_price: 3600.0,
      selling_price: 6490.0,
      quantity: 15,
      min_stock_level: 5,
    },
    {
      name: 'JK Copier A4 Paper (5-Ream Box)',
      sku: 'STN-PPR-001',
      description: '2500 sheets 80gsm bright white multipurpose copy paper',
      category: 'Stationery & Paper',
      purchase_price: 1450.0,
      selling_price: 2150.0,
      quantity: 42,
      min_stock_level: 15,
    },
    {
      name: 'Pilot G2 Gel Pens (Box of 12)',
      sku: 'STN-PEN-002',
      description: '0.7mm fine point black retractable rolling ball gel pens',
      category: 'Stationery & Paper',
      purchase_price: 680.0,
      selling_price: 1190.0,
      quantity: 8,
      min_stock_level: 12,
    },
    {
      name: 'Moleskine Classic Hardcover Notebook',
      sku: 'STN-NBK-003',
      description: 'Ruled A5 hardcover notebook, 240 ivory pages',
      category: 'Stationery & Paper',
      purchase_price: 850.0,
      selling_price: 1599.0,
      quantity: 27,
      min_stock_level: 10,
    },
    {
      name: 'Expo Dry-Erase Markers (12-Pack)',
      sku: 'STN-MRK-004',
      description: 'Chisel tip low-odor whiteboard markers, assorted colors',
      category: 'Stationery & Paper',
      purchase_price: 590.0,
      selling_price: 1050.0,
      quantity: 0,
      min_stock_level: 8,
    },
    {
      name: 'Corrugated Shipping Boxes 12x10x8 (25-Pack)',
      sku: 'PKG-BOX-001',
      description: '32 ECT kraft corrugated cardboard mailer boxes',
      category: 'Packaging & Shipping',
      purchase_price: 1500.0,
      selling_price: 2600.0,
      quantity: 34,
      min_stock_level: 12,
    },
    {
      name: 'Heavy Duty Packing Tape (6-Roll Pack)',
      sku: 'PKG-TAP-002',
      description: '2-inch x 60-yard crystal clear acrylic sealing tape',
      category: 'Packaging & Shipping',
      purchase_price: 750.0,
      selling_price: 1350.0,
      quantity: 6,
      min_stock_level: 10,
    },
    {
      name: 'Thermal Shipping Labels 4x6 (500 Roll)',
      sku: 'PKG-LBL-003',
      description: 'Direct thermal perforated adhesive shipping labels',
      category: 'Packaging & Shipping',
      purchase_price: 620.0,
      selling_price: 1150.0,
      quantity: 29,
      min_stock_level: 10,
    },
    {
      name: 'Arabica Dark Roast Coffee Pods (100-Count)',
      sku: 'BRK-COF-001',
      description: 'Single-serve recyclable dark roast office coffee pods',
      category: 'Breakroom & Supplies',
      purchase_price: 2100.0,
      selling_price: 3490.0,
      quantity: 19,
      min_stock_level: 8,
    },
    {
      name: 'Disinfecting Surface Wipes (6-Canister Pack)',
      sku: 'BRK-WPE-002',
      description: '75-count lemon scent antibacterial desk & kitchen wipes',
      category: 'Breakroom & Supplies',
      purchase_price: 1150.0,
      selling_price: 1990.0,
      quantity: 3,
      min_stock_level: 6,
    },
  ];

  // 18 chronological transactions over the past 14 days
  // Each transaction defines SKU, type, quantity, daysAgo, and note.
  // We compute previous_stock and new_stock sequentially from each product's starting baseline
  // so that the final new_stock equals the exact product quantity above.
  const transactionSpecs = [
    { sku: 'ELC-MON-001', type: 'IN', quantity: 10, daysAgo: 13, note: 'Initial Q4 monitor restock from Dell distribution' },
    { sku: 'ELC-MON-001', type: 'OUT', quantity: 4, daysAgo: 10, note: 'Allocated to engineering onboarding batch' },
    { sku: 'ACC-MSE-001', type: 'IN', quantity: 15, daysAgo: 12, note: 'Weekly peripheral replenishment' },
    { sku: 'ACC-MSE-001', type: 'OUT', quantity: 5, daysAgo: 8, note: 'Dispatched to sales team workstations' },
    { sku: 'ELC-NET-002', type: 'OUT', quantity: 4, daysAgo: 11, note: 'Server rack upgrade on Floor 2' },
    { sku: 'ELC-PRT-003', type: 'OUT', quantity: 3, daysAgo: 9, note: 'Deployed to regional branch offices' },
    { sku: 'ACC-KBD-002', type: 'IN', quantity: 8, daysAgo: 9, note: 'Supplier shipment #PO-4012' },
    { sku: 'ACC-KBD-002', type: 'OUT', quantity: 6, daysAgo: 6, note: 'Fulfilled remote employee hardware requests' },
    { sku: 'ACC-CAM-004', type: 'OUT', quantity: 5, daysAgo: 7, note: 'Conference room AV refresh' },
    { sku: 'FRN-DSK-002', type: 'IN', quantity: 5, daysAgo: 7, note: 'Freight delivery #FD-881' },
    { sku: 'FRN-DSK-002', type: 'OUT', quantity: 4, daysAgo: 5, note: 'Installed in executive studio' },
    { sku: 'STN-PPR-001', type: 'IN', quantity: 25, daysAgo: 6, note: 'Monthly bulk paper replenishment' },
    { sku: 'STN-PPR-001', type: 'OUT', quantity: 8, daysAgo: 4, note: 'Issued to print center & admin floor' },
    { sku: 'STN-MRK-004', type: 'OUT', quantity: 6, daysAgo: 4, note: 'Workshop sprint room restock' },
    { sku: 'PKG-BOX-001', type: 'IN', quantity: 20, daysAgo: 3, note: 'Warehouse packaging restock' },
    { sku: 'PKG-TAP-002', type: 'OUT', quantity: 7, daysAgo: 2, note: 'Outbound fulfillment batch #OB-219' },
    { sku: 'BRK-COF-001', type: 'IN', quantity: 12, daysAgo: 2, note: 'Pantry monthly restock' },
    { sku: 'BRK-WPE-002', type: 'OUT', quantity: 5, daysAgo: 1, note: 'Facility sanitation distribution' },
  ];

  const runSeed = db.transaction(() => {
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );
    const userResult = insertUser.run('Alex Morgan', 'admin@stockflow.com', adminPasswordHash, 'admin');
    const adminId = userResult.lastInsertRowid;

    const insertCategory = db.prepare(
      'INSERT INTO categories (name, description) VALUES (?, ?)'
    );
    const categoryIdByName = new Map();
    for (const cat of categoriesData) {
      const res = insertCategory.run(cat.name, cat.description);
      categoryIdByName.set(cat.name, res.lastInsertRowid);
    }

    // Calculate net effect of seeded transactions per SKU so we can determine starting quantity
    // before those transactions, ensuring final quantity matches productsData exactly.
    const netDeltaBySku = new Map();
    for (const tx of transactionSpecs) {
      const prevDelta = netDeltaBySku.get(tx.sku) || 0;
      netDeltaBySku.set(tx.sku, prevDelta + (tx.type === 'IN' ? tx.quantity : -tx.quantity));
    }

    const insertProduct = db.prepare(`
      INSERT INTO products (
        name, sku, description, category_id, purchase_price, selling_price, quantity, min_stock_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const productBySku = new Map();
    const runningStockBySku = new Map();

    for (const prod of productsData) {
      const categoryId = categoryIdByName.get(prod.category);
      const res = insertProduct.run(
        prod.name,
        prod.sku,
        prod.description,
        categoryId,
        prod.purchase_price,
        prod.selling_price,
        prod.quantity,
        prod.min_stock_level
      );
      productBySku.set(prod.sku, res.lastInsertRowid);

      const netDelta = netDeltaBySku.get(prod.sku) || 0;
      // Starting stock before the chronological transactions occurred:
      runningStockBySku.set(prod.sku, prod.quantity - netDelta);
    }

    const insertTx = db.prepare(`
      INSERT INTO transactions (
        product_id, user_id, type, quantity, previous_stock, new_stock, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    for (const tx of transactionSpecs) {
      const productId = productBySku.get(tx.sku);
      const prevStock = runningStockBySku.get(tx.sku);
      const newStock = tx.type === 'IN' ? prevStock + tx.quantity : prevStock - tx.quantity;
      if (prevStock < 0 || newStock < 0) {
        throw new Error(`Invalid seed stock computation for ${tx.sku}`);
      }
      runningStockBySku.set(tx.sku, newStock);

      insertTx.run(
        productId,
        adminId,
        tx.type,
        tx.quantity,
        prevStock,
        newStock,
        tx.note,
        `-${tx.daysAgo} days`
      );
    }
  });

  runSeed();
  console.log('Seed completed: 1 admin user, 6 categories, 22 products, 18 transactions created.');
  closeDb();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  closeDb();
  process.exit(1);
});

