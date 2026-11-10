import { getDb } from '../config/db.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { toCsv } from '../utils/csv.js';

export function getInventoryReport(req, res, next) {
  try {
    const db = getDb();
    const { categoryId = '', format = 'json' } = req.query;

    const conditions = [];
    const params = [];

    if (categoryId && categoryId !== 'all') {
      const catId = Number(categoryId);
      if (Number.isInteger(catId) && catId > 0) {
        conditions.push('p.category_id = ?');
        params.push(catId);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = db
      .prepare(
        `SELECT
           p.id,
           p.sku,
           p.name,
           c.name AS category_name,
           p.quantity,
           p.min_stock_level,
           p.purchase_price,
           p.selling_price,
           ROUND(p.quantity * p.purchase_price, 2) AS purchase_valuation,
           ROUND(p.quantity * p.selling_price, 2) AS retail_valuation,
           ROUND(p.quantity * (p.selling_price - p.purchase_price), 2) AS potential_profit,
           CASE
             WHEN p.quantity = 0 THEN 'Out of Stock'
             WHEN p.quantity <= p.min_stock_level THEN 'Low Stock'
             ELSE 'In Stock'
           END AS status
         FROM products p
         JOIN categories c ON p.category_id = c.id
         ${whereClause}
         ORDER BY c.name ASC, p.name ASC`
      )
      .all(...params);

    const summary = items.reduce(
      (acc, item) => {
        acc.totalProducts += 1;
        acc.totalUnits += item.quantity;
        acc.totalPurchaseValuation = Math.round((acc.totalPurchaseValuation + item.purchase_valuation) * 100) / 100;
        acc.totalRetailValuation = Math.round((acc.totalRetailValuation + item.retail_valuation) * 100) / 100;
        acc.totalPotentialProfit = Math.round((acc.totalPotentialProfit + item.potential_profit) * 100) / 100;
        return acc;
      },
      {
        totalProducts: 0,
        totalUnits: 0,
        totalPurchaseValuation: 0,
        totalRetailValuation: 0,
        totalPotentialProfit: 0,
      }
    );

    if (format === 'csv') {
      const csv = toCsv(
        [
          { key: 'sku', label: 'SKU' },
          { key: 'name', label: 'Product Name' },
          { key: 'category_name', label: 'Category' },
          { key: 'quantity', label: 'Current Stock' },
          { key: 'min_stock_level', label: 'Min Stock Level' },
          { key: 'purchase_price', label: 'Purchase Price' },
          { key: 'selling_price', label: 'Selling Price' },
          { key: 'purchase_valuation', label: 'Inventory Valuation (Cost)' },
          { key: 'retail_valuation', label: 'Retail Valuation' },
          { key: 'status', label: 'Stock Status' },
        ],
        items
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="stockflow-inventory-report.csv"');
      return res.status(200).send(csv);
    }

    return sendSuccess(res, { items, summary }, 'Inventory report generated successfully.');
  } catch (err) {
    next(err);
  }
}

export function getLowStockReport(req, res, next) {
  try {
    const db = getDb();
    const { type = 'all', format = 'json' } = req.query;

    let condition = 'p.quantity <= p.min_stock_level';
    if (type === 'out_of_stock') {
      condition = 'p.quantity = 0';
    } else if (type === 'low_stock') {
      condition = 'p.quantity > 0 AND p.quantity <= p.min_stock_level';
    }

    const items = db
      .prepare(
        `SELECT
           p.id,
           p.sku,
           p.name,
           c.name AS category_name,
           p.quantity,
           p.min_stock_level,
           MAX(0, p.min_stock_level - p.quantity) AS shortage_units,
           p.purchase_price,
           ROUND(MAX(0, p.min_stock_level - p.quantity) * p.purchase_price, 2) AS estimated_restock_cost,
           CASE
             WHEN p.quantity = 0 THEN 'Out of Stock'
             ELSE 'Low Stock'
           END AS status
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE ${condition}
         ORDER BY p.quantity ASC, shortage_units DESC`
      )
      .all();

    const summary = {
      totalFlagged: items.length,
      outOfStockCount: items.filter((i) => i.quantity === 0).length,
      lowStockCount: items.filter((i) => i.quantity > 0).length,
      totalEstimatedRestockCost:
        Math.round(items.reduce((sum, i) => sum + i.estimated_restock_cost, 0) * 100) / 100,
    };

    if (format === 'csv') {
      const csv = toCsv(
        [
          { key: 'sku', label: 'SKU' },
          { key: 'name', label: 'Product Name' },
          { key: 'category_name', label: 'Category' },
          { key: 'quantity', label: 'Current Stock' },
          { key: 'min_stock_level', label: 'Min Stock Level' },
          { key: 'shortage_units', label: 'Units Needed' },
          { key: 'purchase_price', label: 'Unit Cost' },
          { key: 'estimated_restock_cost', label: 'Estimated Restock Cost' },
          { key: 'status', label: 'Status' },
        ],
        items
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="stockflow-low-stock-report.csv"');
      return res.status(200).send(csv);
    }

    return sendSuccess(res, { items, summary }, 'Low-stock report generated successfully.');
  } catch (err) {
    next(err);
  }
}

export function getTransactionsReport(req, res, next) {
  try {
    const db = getDb();
    const { type = '', startDate = '', endDate = '', format = 'json' } = req.query;

    const conditions = [];
    const params = [];

    if (type === 'IN' || type === 'OUT') {
      conditions.push('t.type = ?');
      params.push(type);
    }
    if (startDate) {
      conditions.push('date(t.created_at) >= date(?)');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('date(t.created_at) <= date(?)');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = db
      .prepare(
        `SELECT
           t.id,
           t.created_at,
           p.sku AS product_sku,
           p.name AS product_name,
           c.name AS category_name,
           t.type,
           t.quantity,
           t.previous_stock,
           t.new_stock,
           u.name AS user_name,
           t.note
         FROM transactions t
         JOIN products p ON t.product_id = p.id
         JOIN categories c ON p.category_id = c.id
         JOIN users u ON t.user_id = u.id
         ${whereClause}
         ORDER BY t.created_at DESC, t.id DESC`
      )
      .all(...params);

    const summary = items.reduce(
      (acc, tx) => {
        acc.transactionCount += 1;
        if (tx.type === 'IN') {
          acc.totalIn += tx.quantity;
        } else {
          acc.totalOut += tx.quantity;
        }
        acc.netChange = acc.totalIn - acc.totalOut;
        return acc;
      },
      { transactionCount: 0, totalIn: 0, totalOut: 0, netChange: 0 }
    );

    if (format === 'csv') {
      const csv = toCsv(
        [
          { key: 'id', label: 'Transaction ID' },
          { key: 'created_at', label: 'Timestamp' },
          { key: 'product_sku', label: 'SKU' },
          { key: 'product_name', label: 'Product Name' },
          { key: 'category_name', label: 'Category' },
          { key: 'type', label: 'Type' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'previous_stock', label: 'Previous Stock' },
          { key: 'new_stock', label: 'New Stock' },
          { key: 'user_name', label: 'Performed By' },
          { key: 'note', label: 'Note' },
        ],
        items
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="stockflow-transactions-report.csv"');
      return res.status(200).send(csv);
    }

    return sendSuccess(res, { items, summary }, 'Transactions report generated successfully.');
  } catch (err) {
    next(err);
  }
}

