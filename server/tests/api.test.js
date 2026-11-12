import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Use a dedicated temporary SQLite database file (not in-memory, matching production behavior)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stockflow-test-'));
const testDbPath = path.join(tempDir, 'test-stockflow.db');
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';

const { createApp } = await import('../app.js');
const { closeDb } = await import('../config/db.js');

let server;
let baseUrl;
let authToken;
let createdCategoryId;
let secondCategoryId;
let createdProductId;

async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, data, headers: res.headers };
}

describe('StockFlow API Integration Tests', () => {
  before(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    closeDb();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('1. Admin can register and log in', async () => {
    const reg = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Test Admin', email: 'testadmin@stockflow.com', password: 'Password123' },
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.data.success, true);
    assert.ok(reg.data.data.token);
    assert.equal(reg.data.data.user.email, 'testadmin@stockflow.com');
    assert.equal(reg.data.data.user.password_hash, undefined);

    const login = await api('/auth/login', {
      method: 'POST',
      body: { email: 'testadmin@stockflow.com', password: 'Password123' },
    });
    assert.equal(login.status, 200);
    assert.ok(login.data.data.token);
    authToken = login.data.data.token;

    const me = await api('/auth/me', { token: authToken });
    assert.equal(me.status, 200);
    assert.equal(me.data.data.user.name, 'Test Admin');
  });

  it('2. Unauthorized users cannot access protected endpoints', async () => {
    const endpoints = [
      '/auth/me',
      '/products',
      '/categories',
      '/inventory',
      '/transactions',
      '/dashboard/stats',
      '/reports/inventory',
    ];
    for (const ep of endpoints) {
      const res = await api(ep);
      assert.equal(res.status, 401, `Expected 401 on ${ep}`);
    }
  });

  it('5. Categories can be created, updated, and prevent deletion if products exist', async () => {
    const cat1 = await api('/categories', {
      method: 'POST',
      token: authToken,
      body: { name: 'Electronics', description: 'Tech hardware' },
    });
    assert.equal(cat1.status, 201);
    createdCategoryId = cat1.data.data.category.id;

    const cat2 = await api('/categories', {
      method: 'POST',
      token: authToken,
      body: { name: 'Accessories', description: 'Peripherals' },
    });
    assert.equal(cat2.status, 201);
    secondCategoryId = cat2.data.data.category.id;

    const updateCat = await api(`/categories/${secondCategoryId}`, {
      method: 'PUT',
      token: authToken,
      body: { name: 'Office Accessories', description: 'Updated description' },
    });
    assert.equal(updateCat.status, 200);
    assert.equal(updateCat.data.data.category.name, 'Office Accessories');
  });

  it('3 & 4. Products can be added, updated, duplicate SKUs rejected', async () => {
    const prod = await api('/products', {
      method: 'POST',
      token: authToken,
      body: {
        name: 'Wireless Keyboard',
        sku: 'KB-001',
        description: 'Compact wireless keyboard',
        category_id: createdCategoryId,
        purchase_price: 40,
        selling_price: 75,
        quantity: 10,
        min_stock_level: 5,
      },
    });
    assert.equal(prod.status, 201);
    createdProductId = prod.data.data.product.id;
    assert.equal(prod.data.data.product.quantity, 10);

    // Duplicate SKU must be rejected with 409
    const dup = await api('/products', {
      method: 'POST',
      token: authToken,
      body: {
        name: 'Another Keyboard',
        sku: 'kb-001',
        category_id: createdCategoryId,
        purchase_price: 20,
        selling_price: 35,
        quantity: 5,
        min_stock_level: 2,
      },
    });
    assert.equal(dup.status, 409);

    // Update product
    const updated = await api(`/products/${createdProductId}`, {
      method: 'PUT',
      token: authToken,
      body: {
        name: 'Wireless Mechanical Keyboard',
        sku: 'KB-001',
        description: 'Updated description',
        category_id: createdCategoryId,
        purchase_price: 45,
        selling_price: 85,
        min_stock_level: 4,
      },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.data.product.name, 'Wireless Mechanical Keyboard');
    assert.equal(updated.data.data.product.quantity, 10);

    // Deleting category containing product must fail with 409
    const delCatFail = await api(`/categories/${createdCategoryId}`, {
      method: 'DELETE',
      token: authToken,
    });
    assert.equal(delCatFail.status, 409);
  });

  it('6, 7, 8 & 9. Stock-in, stock-out, insufficient stock prevention, and transaction logging', async () => {
    // Stock IN (+15 -> 25)
    const stockIn = await api('/inventory/stock-in', {
      method: 'POST',
      token: authToken,
      body: { product_id: createdProductId, quantity: 15, note: 'Supplier restock' },
    });
    assert.equal(stockIn.status, 201);
    assert.equal(stockIn.data.data.product.quantity, 25);
    assert.equal(stockIn.data.data.transaction.type, 'IN');
    assert.equal(stockIn.data.data.transaction.previous_stock, 10);
    assert.equal(stockIn.data.data.transaction.new_stock, 25);

    // Negative quantity rejected
    const negIn = await api('/inventory/stock-in', {
      method: 'POST',
      token: authToken,
      body: { product_id: createdProductId, quantity: -5 },
    });
    assert.equal(negIn.status, 400);

    // Stock OUT (-20 -> 5)
    const stockOut = await api('/inventory/stock-out', {
      method: 'POST',
      token: authToken,
      body: { product_id: createdProductId, quantity: 20, note: 'Customer order' },
    });
    assert.equal(stockOut.status, 201);
    assert.equal(stockOut.data.data.product.quantity, 5);
    assert.equal(stockOut.data.data.transaction.type, 'OUT');
    assert.equal(stockOut.data.data.transaction.previous_stock, 25);
    assert.equal(stockOut.data.data.transaction.new_stock, 5);

    // Exceeding available stock rejected (request 6 when 5 available)
    const overOut = await api('/inventory/stock-out', {
      method: 'POST',
      token: authToken,
      body: { product_id: createdProductId, quantity: 6, note: 'Should fail' },
    });
    assert.equal(overOut.status, 400);

    // Verify transaction list has initial + IN + OUT = 3 transactions
    const txList = await api('/transactions', { token: authToken });
    assert.equal(txList.status, 200);
    assert.equal(txList.data.data.transactions.length, 3);
  });

  it('10, 11 & 12. Dashboard stats, Reports, and CSV export match database', async () => {
    const stats = await api('/dashboard/stats', { token: authToken });
    assert.equal(stats.status, 200);
    assert.equal(stats.data.data.stats.totalProducts, 1);
    assert.equal(stats.data.data.stats.totalCategories, 2);
    assert.equal(stats.data.data.stats.totalInventoryUnits, 5);
    assert.equal(stats.data.data.stats.totalInventoryValuation, 225); // 5 * 45

    const invReport = await api('/reports/inventory', { token: authToken });
    assert.equal(invReport.status, 200);
    assert.equal(invReport.data.data.summary.totalUnits, 5);

    const invCsv = await api('/reports/inventory?format=csv', { token: authToken });
    assert.equal(invCsv.status, 200);
    assert.ok(invCsv.headers.get('content-type').includes('text/csv'));
    assert.ok(invCsv.data.includes('KB-001'));

    const txCsv = await api('/reports/transactions?format=csv', { token: authToken });
    assert.equal(txCsv.status, 200);
    assert.ok(txCsv.data.includes('Supplier restock'));
  });

  it('3 (cleanup). Products and empty categories can be deleted', async () => {
    const delProd = await api(`/products/${createdProductId}`, {
      method: 'DELETE',
      token: authToken,
    });
    assert.equal(delProd.status, 200);

    const delCat = await api(`/categories/${createdCategoryId}`, {
      method: 'DELETE',
      token: authToken,
    });
    assert.equal(delCat.status, 200);
  });
});

