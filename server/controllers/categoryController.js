import { getDb } from '../config/db.js';
import { AppError, sendSuccess } from '../utils/apiResponse.js';

export function listCategories(req, res, next) {
  try {
    const db = getDb();
    const { search = '' } = req.query;
    const searchTerm = `%${String(search).trim()}%`;

    const categories = db
      .prepare(
        `SELECT
           c.id,
           c.name,
           c.description,
           c.created_at,
           COUNT(p.id) AS product_count,
           COALESCE(SUM(p.quantity), 0) AS total_units
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         WHERE c.name LIKE ? OR c.description LIKE ?
         GROUP BY c.id
         ORDER BY c.name ASC`
      )
      .all(searchTerm, searchTerm);

    return sendSuccess(res, { categories }, 'Categories fetched successfully.');
  } catch (err) {
    next(err);
  }
}

export function createCategory(req, res, next) {
  try {
    const { name, description = '' } = req.body;
    const cleanName = String(name || '').trim();

    if (!cleanName) {
      throw new AppError('Category name is required.', 400);
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
      .get(cleanName);

    if (existing) {
      throw new AppError('A category with this name already exists.', 409);
    }

    const result = db
      .prepare('INSERT INTO categories (name, description) VALUES (?, ?)')
      .run(cleanName, String(description || '').trim());

    const category = db
      .prepare(
        `SELECT c.id, c.name, c.description, c.created_at, 0 AS product_count, 0 AS total_units
         FROM categories c WHERE c.id = ?`
      )
      .get(result.lastInsertRowid);

    return sendSuccess(res, { category }, 'Category created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

export function updateCategory(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { name, description = '' } = req.body;
    const cleanName = String(name || '').trim();

    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid category ID.', 400);
    }
    if (!cleanName) {
      throw new AppError('Category name is required.', 400);
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Category not found.', 404);
    }

    const duplicate = db
      .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?')
      .get(cleanName, id);
    if (duplicate) {
      throw new AppError('Another category with this name already exists.', 409);
    }

    db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(
      cleanName,
      String(description || '').trim(),
      id
    );

    const category = db
      .prepare(
        `SELECT
           c.id,
           c.name,
           c.description,
           c.created_at,
           COUNT(p.id) AS product_count,
           COALESCE(SUM(p.quantity), 0) AS total_units
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         WHERE c.id = ?
         GROUP BY c.id`
      )
      .get(id);

    return sendSuccess(res, { category }, 'Category updated successfully.');
  } catch (err) {
    next(err);
  }
}

export function deleteCategory(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('Invalid category ID.', 400);
    }

    const db = getDb();
    const existing = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id);
    if (!existing) {
      throw new AppError('Category not found.', 404);
    }

    const reassignToRaw = req.query.reassignTo || req.body?.reassignTo;
    const productCount = db
      .prepare('SELECT COUNT(*) AS count FROM products WHERE category_id = ?')
      .get(id).count;

    if (productCount > 0) {
      if (!reassignToRaw) {
        throw new AppError(
          `Cannot delete "${existing.name}" because it contains ${productCount} product(s). Reassign products to another category first.`,
          409
        );
      }

      const targetCategoryId = Number(reassignToRaw);
      if (!Number.isInteger(targetCategoryId) || targetCategoryId <= 0 || targetCategoryId === id) {
        throw new AppError('Please choose a valid different target category for reassignment.', 400);
      }

      const targetCategory = db
        .prepare('SELECT id FROM categories WHERE id = ?')
        .get(targetCategoryId);
      if (!targetCategory) {
        throw new AppError('Target reassignment category not found.', 404);
      }

      const reassignAndDelete = db.transaction(() => {
        db.prepare('UPDATE products SET category_id = ?, updated_at = datetime(\'now\') WHERE category_id = ?').run(
          targetCategoryId,
          id
        );
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
      });
      reassignAndDelete();

      return sendSuccess(
        res,
        null,
        `Reassigned ${productCount} product(s) and deleted category "${existing.name}".`
      );
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return sendSuccess(res, null, `Category "${existing.name}" deleted successfully.`);
  } catch (err) {
    next(err);
  }
}

