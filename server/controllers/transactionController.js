import { getDb } from '../config/db.js';
import { AppError, sendSuccess } from '../utils/apiResponse.js';

export function listTransactions(req, res, next) {
  try {
    const db = getDb();
    const {
      search = '',
      type = '',
      productId = '',
      startDate = '',
      endDate = '',
      page = '1',
      limit = '50',
    } = req.query;

    const conditions = [];
    const params = [];

    if (String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR t.note LIKE ? OR u.name LIKE ?)');
      params.push(term, term, term, term);
    }

    if (type === 'IN' || type === 'OUT') {
      conditions.push('t.type = ?');
      params.push(type);
    }

    if (productId && productId !== 'all') {
      const parsedProductId = Number(productId);
      if (Number.isInteger(parsedProductId) && parsedProductId > 0) {
        conditions.push('t.product_id = ?');
        params.push(parsedProductId);
      }
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
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (parsedPage - 1) * parsedLimit;

    const total = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM transactions t
         JOIN products p ON t.product_id = p.id
         JOIN users u ON t.user_id = u.id
         ${whereClause}`
      )
      .get(...params).count;

    const transactions = db
      .prepare(
        `SELECT
           t.id,
           t.product_id,
           p.name AS product_name,
           p.sku AS product_sku,
           c.name AS category_name,
           t.user_id,
           u.name AS user_name,
           t.type,
           t.quantity,
           t.previous_stock,
           t.new_stock,
           t.note,
           t.created_at
         FROM transactions t
         JOIN products p ON t.product_id = p.id
         JOIN categories c ON p.category_id = c.id
         JOIN users u ON t.user_id = u.id
         ${whereClause}
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, parsedLimit, offset);

    return sendSuccess(
      res,
      {
        transactions,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
        },
      },
      'Transactions fetched successfully.'
    );
  } catch (err) {
    next(err);
  }
}

export function getTransactionById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid transaction ID.', 400);
    }

    const db = getDb();
    const transaction = db
      .prepare(
        `SELECT
           t.*,
           p.name AS product_name,
           p.sku AS product_sku,
           c.name AS category_name,
           u.name AS user_name,
           u.email AS user_email
         FROM transactions t
         JOIN products p ON t.product_id = p.id
         JOIN categories c ON p.category_id = c.id
         JOIN users u ON t.user_id = u.id
         WHERE t.id = ?`
      )
      .get(id);

    if (!transaction) {
      throw new AppError('Transaction not found.', 404);
    }

    return sendSuccess(res, { transaction }, 'Transaction fetched successfully.');
  } catch (err) {
    next(err);
  }
}

