import { getDb } from '../config/db.js';
import { AppError } from '../utils/apiResponse.js';

/**
 * Executes an atomic stock-in or stock-out operation inside a SQLite transaction.
 * Guarantees product quantity and transaction history stay consistent.
 */
export function adjustStock({ productId, userId, type, quantity, note = '' }) {
  const db = getDb();

  const parsedProductId = Number(productId);
  const parsedQty = Number(quantity);

  if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
    throw new AppError('Valid product_id is required.', 400);
  }
  if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
    throw new AppError('Quantity must be a positive whole number.', 400);
  }
  if (type !== 'IN' && type !== 'OUT') {
    throw new AppError('Transaction type must be IN or OUT.', 400);
  }

  const executeAdjustment = db.transaction(() => {
    const product = db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(parsedProductId);

    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const previousStock = product.quantity;
    let newStock;

    if (type === 'IN') {
      newStock = previousStock + parsedQty;
    } else {
      if (parsedQty > previousStock) {
        throw new AppError(
          `Insufficient stock for "${product.name}". Available: ${previousStock}, requested: ${parsedQty}.`,
          400
        );
      }
      newStock = previousStock - parsedQty;
    }

    db.prepare(
      `UPDATE products
       SET quantity = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(newStock, parsedProductId);

    const txResult = db
      .prepare(
        `INSERT INTO transactions (
          product_id, user_id, type, quantity, previous_stock, new_stock, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(parsedProductId, userId, type, parsedQty, previousStock, newStock, String(note || '').trim());

    const updatedProduct = db
      .prepare(
        `SELECT p.*, c.name AS category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(parsedProductId);

    const transaction = db
      .prepare(
        `SELECT t.*, p.name AS product_name, p.sku AS product_sku, u.name AS user_name
         FROM transactions t
         JOIN products p ON t.product_id = p.id
         JOIN users u ON t.user_id = u.id
         WHERE t.id = ?`
      )
      .get(txResult.lastInsertRowid);

    return { product: updatedProduct, transaction };
  });

  return executeAdjustment();
}

