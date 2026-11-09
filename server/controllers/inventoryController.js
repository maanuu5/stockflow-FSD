import { getDb } from '../config/db.js';
import { adjustStock } from '../services/inventoryService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export function getInventory(req, res, next) {
  try {
    const db = getDb();
    const { search = '', categoryId = '', status = '' } = req.query;

    const conditions = [];
    const params = [];

    if (String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(term, term);
    }

    if (categoryId && categoryId !== 'all') {
      const catId = Number(categoryId);
      if (Number.isInteger(catId) && catId > 0) {
        conditions.push('p.category_id = ?');
        params.push(catId);
      }
    }

    if (status === 'out_of_stock') {
      conditions.push('p.quantity = 0');
    } else if (status === 'low_stock') {
      conditions.push('p.quantity > 0 AND p.quantity <= p.min_stock_level');
    } else if (status === 'in_stock') {
      conditions.push('p.quantity > p.min_stock_level');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = db
      .prepare(
        `SELECT
           p.id,
           p.name,
           p.sku,
           p.category_id,
           c.name AS category_name,
           p.purchase_price,
           p.selling_price,
           p.quantity,
           p.min_stock_level,
           ROUND(p.quantity * p.purchase_price, 2) AS stock_value,
           CASE
             WHEN p.quantity = 0 THEN 'OUT_OF_STOCK'
             WHEN p.quantity <= p.min_stock_level THEN 'LOW_STOCK'
             ELSE 'IN_STOCK'
           END AS stock_status,
           p.updated_at
         FROM products p
         JOIN categories c ON p.category_id = c.id
         ${whereClause}
         ORDER BY
           CASE
             WHEN p.quantity = 0 THEN 0
             WHEN p.quantity <= p.min_stock_level THEN 1
             ELSE 2
           END ASC,
           p.name ASC`
      )
      .all(...params);

    const summary = db
      .prepare(
        `SELECT
           COUNT(*) AS totalProducts,
           COALESCE(SUM(quantity), 0) AS totalUnits,
           SUM(CASE WHEN quantity > min_stock_level THEN 1 ELSE 0 END) AS inStockCount,
           SUM(CASE WHEN quantity > 0 AND quantity <= min_stock_level THEN 1 ELSE 0 END) AS lowStockCount,
           SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS outOfStockCount
         FROM products`
      )
      .get();

    return sendSuccess(res, { items, summary }, 'Inventory fetched successfully.');
  } catch (err) {
    next(err);
  }
}

export function stockIn(req, res, next) {
  try {
    const { product_id, quantity, note } = req.body;
    const result = adjustStock({
      productId: product_id,
      userId: req.user.id,
      type: 'IN',
      quantity,
      note,
    });

    return sendSuccess(res, result, 'Stock added successfully.', 201);
  } catch (err) {
    next(err);
  }
}

export function stockOut(req, res, next) {
  try {
    const { product_id, quantity, note } = req.body;
    const result = adjustStock({
      productId: product_id,
      userId: req.user.id,
      type: 'OUT',
      quantity,
      note,
    });

    return sendSuccess(res, result, 'Stock removed successfully.', 201);
  } catch (err) {
    next(err);
  }
}

