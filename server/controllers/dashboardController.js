import { getDb } from '../config/db.js';
import { sendSuccess } from '../utils/apiResponse.js';

export function getDashboardStats(req, res, next) {
  try {
    const db = getDb();

    const productMetrics = db
      .prepare(
        `SELECT
           COUNT(*) AS totalProducts,
           COALESCE(SUM(quantity), 0) AS totalInventoryUnits,
           ROUND(COALESCE(SUM(quantity * purchase_price), 0), 2) AS totalInventoryValuation,
           ROUND(COALESCE(SUM(quantity * selling_price), 0), 2) AS totalRetailValuation,
           SUM(CASE WHEN quantity > 0 AND quantity <= min_stock_level THEN 1 ELSE 0 END) AS lowStockCount,
           SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS outOfStockCount
         FROM products`
      )
      .get();

    const totalCategories = db
      .prepare('SELECT COUNT(*) AS count FROM categories')
      .get().count;

    const totalTransactions = db
      .prepare('SELECT COUNT(*) AS count FROM transactions')
      .get().count;

    const lowStockAlerts = db
      .prepare(
        `SELECT
           p.id,
           p.name,
           p.sku,
           p.quantity,
           p.min_stock_level,
           c.name AS category_name,
           CASE
             WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
             ELSE 'LOW_STOCK'
           END AS stock_status
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.quantity <= p.min_stock_level
         ORDER BY p.quantity ASC, p.name ASC
         LIMIT 12`
      )
      .all();

    return sendSuccess(
      res,
      {
        stats: {
          totalProducts: productMetrics.totalProducts || 0,
          totalCategories: totalCategories || 0,
          totalInventoryUnits: productMetrics.totalInventoryUnits || 0,
          totalInventoryValuation: productMetrics.totalInventoryValuation || 0,
          totalRetailValuation: productMetrics.totalRetailValuation || 0,
          lowStockCount: productMetrics.lowStockCount || 0,
          outOfStockCount: productMetrics.outOfStockCount || 0,
          totalTransactions: totalTransactions || 0,
        },
        lowStockAlerts,
      },
      'Dashboard statistics fetched successfully.'
    );
  } catch (err) {
    next(err);
  }
}

export function getRecentTransactions(req, res, next) {
  try {
    const db = getDb();
    const limit = Math.min(25, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const transactions = db
      .prepare(
        `SELECT
           t.id,
           t.product_id,
           p.name AS product_name,
           p.sku AS product_sku,
           t.type,
           t.quantity,
           t.previous_stock,
           t.new_stock,
           t.note,
           t.created_at,
           u.name AS user_name
         FROM transactions t
         JOIN products p ON t.product_id = p.id
         JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT ?`
      )
      .all(limit);

    return sendSuccess(res, { transactions }, 'Recent transactions fetched successfully.');
  } catch (err) {
    next(err);
  }
}

export function getStockChartData(req, res, next) {
  try {
    const db = getDb();

    const stockByCategory = db
      .prepare(
        `SELECT
           c.id,
           c.name AS category,
           COUNT(p.id) AS productCount,
           COALESCE(SUM(p.quantity), 0) AS totalUnits,
           ROUND(COALESCE(SUM(p.quantity * p.purchase_price), 0), 2) AS totalValue
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id
         ORDER BY totalUnits DESC, c.name ASC`
      )
      .all();

    const statusCounts = db
      .prepare(
        `SELECT
           SUM(CASE WHEN quantity > min_stock_level THEN 1 ELSE 0 END) AS inStock,
           SUM(CASE WHEN quantity > 0 AND quantity <= min_stock_level THEN 1 ELSE 0 END) AS lowStock,
           SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS outOfStock
         FROM products`
      )
      .get();

    const rawMovement = db
      .prepare(
        `SELECT
           date(created_at) AS day,
           SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) AS stockIn,
           SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) AS stockOut
         FROM transactions
         WHERE date(created_at) >= date('now', '-13 days')
         GROUP BY date(created_at)
         ORDER BY day ASC`
      )
      .all();

    // Build a continuous 14-day timeline so the movement chart has no missing days
    const movementMap = new Map(rawMovement.map((r) => [r.day, r]));
    const movementSeries = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const isoDay = d.toISOString().slice(0, 10);
      const entry = movementMap.get(isoDay);
      movementSeries.push({
        date: isoDay,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        stockIn: entry ? entry.stockIn : 0,
        stockOut: entry ? entry.stockOut : 0,
      });
    }

    return sendSuccess(
      res,
      {
        stockByCategory,
        stockStatusBreakdown: [
          { name: 'In Stock', value: statusCounts?.inStock || 0 },
          { name: 'Low Stock', value: statusCounts?.lowStock || 0 },
          { name: 'Out of Stock', value: statusCounts?.outOfStock || 0 },
        ],
        movementSeries,
      },
      'Chart data fetched successfully.'
    );
  } catch (err) {
    next(err);
  }
}

