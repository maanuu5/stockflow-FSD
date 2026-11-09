import { getDb } from '../config/db.js';
import { AppError, sendSuccess } from '../utils/apiResponse.js';

const ALLOWED_SORT_COLUMNS = {
  name: 'p.name',
  sku: 'p.sku',
  purchase_price: 'p.purchase_price',
  selling_price: 'p.selling_price',
  quantity: 'p.quantity',
  created_at: 'p.created_at',
  updated_at: 'p.updated_at',
};

function validateProductPayload(body, isUpdate = false) {
  const {
    name,
    sku,
    description = '',
    category_id,
    purchase_price,
    selling_price,
    quantity = 0,
    min_stock_level = 5,
  } = body;

  const cleanName = String(name || '').trim();
  const cleanSku = String(sku || '').trim().toUpperCase();
  const parsedCategoryId = Number(category_id);
  const parsedPurchasePrice = Number(purchase_price);
  const parsedSellingPrice = Number(selling_price);
  const parsedQuantity = Number(quantity);
  const parsedMinStock = Number(min_stock_level);

  if (!cleanName) {
    throw new AppError('Product name is required.', 400);
  }
  if (!cleanSku) {
    throw new AppError('SKU is required.', 400);
  }
  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
    throw new AppError('A valid category is required.', 400);
  }
  if (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0) {
    throw new AppError('Purchase price must be a non-negative number.', 400);
  }
  if (!Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0) {
    throw new AppError('Selling price must be a non-negative number.', 400);
  }
  if (!isUpdate || body.quantity !== undefined) {
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      throw new AppError('Stock quantity must be a non-negative whole number.', 400);
    }
  }
  if (!Number.isInteger(parsedMinStock) || parsedMinStock < 0) {
    throw new AppError('Minimum stock threshold must be a non-negative whole number.', 400);
  }

  return {
    name: cleanName,
    sku: cleanSku,
    description: String(description || '').trim(),
    category_id: parsedCategoryId,
    purchase_price: Math.round(parsedPurchasePrice * 100) / 100,
    selling_price: Math.round(parsedSellingPrice * 100) / 100,
    quantity: body.quantity !== undefined ? parsedQuantity : undefined,
    min_stock_level: parsedMinStock,
  };
}

export function listProducts(req, res, next) {
  try {
    const db = getDb();
    const {
      search = '',
      categoryId = '',
      stockStatus = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query;

    const conditions = [];
    const params = [];

    if (String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
      params.push(term, term, term);
    }

    if (categoryId && categoryId !== 'all') {
      const catId = Number(categoryId);
      if (Number.isInteger(catId) && catId > 0) {
        conditions.push('p.category_id = ?');
        params.push(catId);
      }
    }

    if (stockStatus === 'out_of_stock') {
      conditions.push('p.quantity = 0');
    } else if (stockStatus === 'low_stock') {
      conditions.push('p.quantity > 0 AND p.quantity <= p.min_stock_level');
    } else if (stockStatus === 'in_stock') {
      conditions.push('p.quantity > p.min_stock_level');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortColumn = ALLOWED_SORT_COLUMNS[sortBy] || 'p.created_at';
    const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' ? 1000 : Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (parsedPage - 1) * parsedLimit;

    const total = db
      .prepare(`SELECT COUNT(*) AS count FROM products p ${whereClause}`)
      .get(...params).count;

    const products = db
      .prepare(
        `SELECT
           p.*,
           c.name AS category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         ${whereClause}
         ORDER BY ${sortColumn} ${orderDirection}, p.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, parsedLimit, offset);

    return sendSuccess(
      res,
      {
        products,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
        },
      },
      'Products fetched successfully.'
    );
  } catch (err) {
    next(err);
  }
}

export function getProductById(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid product ID.', 400);
    }

    const db = getDb();
    const product = db
      .prepare(
        `SELECT p.*, c.name AS category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(id);

    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const transactions = db
      .prepare(
        `SELECT t.*, u.name AS user_name
         FROM transactions t
         JOIN users u ON t.user_id = u.id
         WHERE t.product_id = ?
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT 15`
      )
      .all(id);

    return sendSuccess(res, { product, transactions }, 'Product fetched successfully.');
  } catch (err) {
    next(err);
  }
}

export function createProduct(req, res, next) {
  try {
    const data = validateProductPayload(req.body, false);
    const initialQty = data.quantity ?? 0;

    const db = getDb();

    const category = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(data.category_id);
    if (!category) {
      throw new AppError('Selected category does not exist.', 404);
    }

    const duplicateSku = db
      .prepare('SELECT id FROM products WHERE UPPER(sku) = UPPER(?)')
      .get(data.sku);
    if (duplicateSku) {
      throw new AppError(`A product with SKU "${data.sku}" already exists.`, 409);
    }

    const createTx = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO products (
            name, sku, description, category_id, purchase_price, selling_price, quantity, min_stock_level
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.name,
          data.sku,
          data.description,
          data.category_id,
          data.purchase_price,
          data.selling_price,
          initialQty,
          data.min_stock_level
        );

      const newProductId = result.lastInsertRowid;

      if (initialQty > 0 && req.user?.id) {
        db.prepare(
          `INSERT INTO transactions (
            product_id, user_id, type, quantity, previous_stock, new_stock, note
          ) VALUES (?, ?, 'IN', ?, 0, ?, 'Initial stock added on product creation')`
        ).run(newProductId, req.user.id, initialQty, initialQty);
      }

      return db
        .prepare(
          `SELECT p.*, c.name AS category_name
           FROM products p
           JOIN categories c ON p.category_id = c.id
           WHERE p.id = ?`
        )
        .get(newProductId);
    });

    const product = createTx();
    return sendSuccess(res, { product }, 'Product created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

export function updateProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid product ID.', 400);
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Product not found.', 404);
    }

    const data = validateProductPayload(req.body, true);

    const category = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(data.category_id);
    if (!category) {
      throw new AppError('Selected category does not exist.', 404);
    }

    const duplicateSku = db
      .prepare('SELECT id FROM products WHERE UPPER(sku) = UPPER(?) AND id != ?')
      .get(data.sku, id);
    if (duplicateSku) {
      throw new AppError(`Another product with SKU "${data.sku}" already exists.`, 409);
    }

    const nextQuantity = data.quantity !== undefined ? data.quantity : existing.quantity;

    const updateTx = db.transaction(() => {
      db.prepare(
        `UPDATE products
         SET name = ?, sku = ?, description = ?, category_id = ?,
             purchase_price = ?, selling_price = ?, quantity = ?,
             min_stock_level = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        data.name,
        data.sku,
        data.description,
        data.category_id,
        data.purchase_price,
        data.selling_price,
        nextQuantity,
        data.min_stock_level,
        id
      );

      // Keep transaction log consistent if quantity was modified during product edit
      if (nextQuantity !== existing.quantity && req.user?.id) {
        const diff = nextQuantity - existing.quantity;
        const type = diff > 0 ? 'IN' : 'OUT';
        db.prepare(
          `INSERT INTO transactions (
            product_id, user_id, type, quantity, previous_stock, new_stock, note
          ) VALUES (?, ?, ?, ?, ?, ?, 'Stock adjusted via product edit')`
        ).run(id, req.user.id, type, Math.abs(diff), existing.quantity, nextQuantity);
      }

      return db
        .prepare(
          `SELECT p.*, c.name AS category_name
           FROM products p
           JOIN categories c ON p.category_id = c.id
           WHERE p.id = ?`
        )
        .get(id);
    });

    const product = updateTx();
    return sendSuccess(res, { product }, 'Product updated successfully.');
  } catch (err) {
    next(err);
  }
}

export function deleteProduct(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid product ID.', 400);
    }

    const db = getDb();
    const existing = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Product not found.', 404);
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return sendSuccess(res, null, `Product "${existing.name}" deleted successfully.`);
  } catch (err) {
    next(err);
  }
}

