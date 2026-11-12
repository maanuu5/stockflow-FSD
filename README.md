# StockFlow – Full-Stack Inventory Management System

StockFlow is a modern, full-stack inventory management web application designed for small businesses to organize product catalogs, manage categories, execute atomic stock-in and stock-out operations, audit transaction ledgers, and export inventory analytics.

---

## 1. Key Features

- **Secure Authentication**: Admin registration & login with `bcrypt` password hashing, JWT bearer tokens, persistent sessions, and protected routes/endpoints.
- **Real-Time Dashboard**: Database-driven KPIs (total products, categories, inventory units, cost & retail valuation, low-stock & out-of-stock counts), 14-day movement bar chart, category distribution donut chart, recent activity table, and low-stock alerts.
- **Product Management (CRUD)**: Add, edit, view, and delete products with unique SKU enforcement, category assignment, purchase/selling pricing, stock thresholds, search, category/status filters, multi-column sorting, and pagination.
- **Category Management**: Create, edit, and delete categories with live product and unit counts. Prevents accidental deletion of categories with products unless products are reassigned to another category.
- **Atomic Inventory Operations**: Stock-IN and Stock-OUT workflows wrapped in SQLite transactions (`db.transaction`) so product quantities and transaction logs always update atomically. Prevents negative quantities and stock-outs exceeding available stock.
- **Transaction Audit History**: Searchable, filterable ledger by product, movement type (`IN`/`OUT`), and date range showing previous stock, new stock, operator, timestamp, and notes.
- **Reports & CSV Export**: Valuation & stock report, low-stock/out-of-stock shortage report, and movement report—all exportable as downloadable `.csv` files.
- **SaaS Interface**: Collapsible sidebar, global search bar, live low-stock notification popover, toast notifications, confirmation dialogs, and Light/Dark theme support.

---

## 2. Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, React Router DOM, Lucide React, Recharts, Axios |
| **Backend** | Node.js, Express.js, REST API, JSON Web Tokens (`jsonwebtoken`), `bcrypt` |
| **Database** | Persistent SQLite via `better-sqlite3` (foreign keys + WAL mode + indexes) |

---

## 3. Project Structure

```text
stockflow/
├── client/                     # React + Vite frontend
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── components/         # Reusable Modal, ConfirmDialog, StatusBadge, etc.
│       ├── context/            # AuthContext, ThemeContext, ToastContext
│       ├── hooks/              # useDebounce
│       ├── layouts/            # DashboardLayout (sidebar, top navbar, notifications)
│       ├── pages/              # Dashboard, Products, Categories, Inventory, Transactions, Reports, Settings, Login, Register
│       ├── services/           # Axios client & interceptors
│       ├── utils/              # Currency, date, and stock status formatters
│       ├── App.jsx
│       └── main.jsx
├── server/                     # Express + SQLite backend
│   ├── config/                 # Environment & persistent SQLite connection
│   ├── controllers/            # Route handlers for auth, products, categories, inventory, transactions, dashboard, reports
│   ├── database/               # schema.sql, init.js, seed.js, stockflow.db
│   ├── middleware/             # JWT authentication & centralized error handler
│   ├── routes/                 # Modular Express routers
│   ├── services/               # Transactional inventory adjustment service
│   ├── tests/                  # Node integration test suite (api.test.js)
│   ├── utils/                  # API response helpers & CSV generator
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

---

## 4. Database Schema

SQLite tables defined in `server/database/schema.sql` with `PRAGMA foreign_keys = ON`:

- **`users`**: `id`, `name`, `email` (unique), `password_hash`, `role`, `created_at`
- **`categories`**: `id`, `name` (unique), `description`, `created_at`
- **`products`**: `id`, `name`, `sku` (unique), `description`, `category_id` (FK → `categories.id`), `purchase_price`, `selling_price`, `quantity` (`>= 0`), `min_stock_level` (`>= 0`), `created_at`, `updated_at`
- **`transactions`**: `id`, `product_id` (FK → `products.id`), `user_id` (FK → `users.id`), `type` (`'IN' | 'OUT'`), `quantity` (`> 0`), `previous_stock`, `new_stock`, `note`, `created_at`

---

## 5. Getting Started (Local Setup)

### Prerequisites
- **Node.js** v20+ (tested on Node v24)
- **npm** v10+

### 1. Install Dependencies
From the root `stockflow/` directory:
```bash
npm install
npm run install:all
```

### 2. Configure Environment Variables (Optional)
Default development values work out of the box, or copy `server/.env.example` to `server/.env`:
```env
PORT=5000
JWT_SECRET=stockflow_dev_secret_change_in_production
JWT_EXPIRES_IN=7d
DB_PATH=./database/stockflow.db
CLIENT_URL=http://localhost:5173
```

### 3. Initialize the Database
Start with a **fresh 0-value workspace** (recommended for first-time guided onboarding; includes the demo admin account and 0 products/categories/transactions):
```bash
npm run db:empty
```
*(Or, if you want to load sample demo products and transactions right away, run `npm run db:reset`.)*

### 4. Start the Application
Run both the Express API (`http://localhost:5000`) and Vite frontend (`http://localhost:5173`) concurrently:
```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 6. Demo Admin Credentials

Use these credentials on the login page (or click **Use Demo Admin Credentials**):

- **Email**: `admin@stockflow.com`
- **Password**: `Admin@123`

---

## 7. API Endpoints Reference

All endpoints except `/api/health`, `/api/auth/register`, and `/api/auth/login` require `Authorization: Bearer <token>`.

### Authentication
- `POST /api/auth/register` — Register a new admin account
- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET /api/auth/me` — Fetch current authenticated user
- `PUT /api/auth/profile` — Update user display name
- `PUT /api/auth/password` — Change account password

### Products
- `GET /api/products` — List products (`search`, `categoryId`, `stockStatus`, `sortBy`, `sortOrder`, `page`, `limit`)
- `GET /api/products/:id` — Get product details and recent transactions
- `POST /api/products` — Create a new product (enforces unique SKU)
- `PUT /api/products/:id` — Update product fields
- `DELETE /api/products/:id` — Delete a product

### Categories
- `GET /api/categories` — List categories with product counts & unit totals
- `POST /api/categories` — Create category
- `PUT /api/categories/:id` — Update category
- `DELETE /api/categories/:id` — Delete empty category (or pass `?reassignTo=<id>` to move products first)

### Inventory & Transactions
- `GET /api/inventory` — List inventory levels and summary counts
- `POST /api/inventory/stock-in` — Atomic stock addition (`{ product_id, quantity, note }`)
- `POST /api/inventory/stock-out` — Atomic stock deduction with available-stock check
- `GET /api/transactions` — Paginated transaction ledger (`search`, `type`, `productId`, `startDate`, `endDate`)
- `GET /api/transactions/:id` — Single transaction details

### Dashboard & Reports
- `GET /api/dashboard/stats` — Live KPIs & low-stock alerts
- `GET /api/dashboard/recent-transactions` — Latest stock movements
- `GET /api/dashboard/stock-chart` — Category distribution & 14-day movement chart series
- `GET /api/reports/inventory` — Inventory valuation report (supports `?format=csv`)
- `GET /api/reports/low-stock` — Low/out-of-stock shortage report (supports `?format=csv`)
- `GET /api/reports/transactions` — Movement report (supports `?format=csv`)

---

## 8. Running Tests

Run the automated backend integration tests covering authentication, RBAC/JWT protection, product/category CRUD, duplicate SKU rejection, atomic stock-in/out, negative/excess stock prevention, dashboard metrics, and CSV exports:

```bash
npm test
```

---

## 9. Deploying on Vercel (Services Mode)

This repository is configured to deploy on **Vercel** using **Vercel Services** (`vercel.json`):

- **`client`** (`root: "client"`, `framework: "vite"`) — Public React/Vite SPA served on `/(.*)` with SPA fallback in `client/vercel.json`.
- **`server`** (`root: "server"`, `framework: "express"`, `entrypoint: "server.js"`) — Public Express API service routed from `/api/(.*)`.

1. Import `https://github.com/maanuu5/stockflow-FSD` in the Vercel dashboard (keep **Root Directory** as `.`).
2. Add an environment variable in Vercel Project Settings:
   - `JWT_SECRET` = `<any strong random string>`
3. Click **Deploy** (or run `vercel dev` locally with the Vercel CLI to run all services together).
   - Frontend (`client/dist`) is served as static assets with client-side SPA routing.
   - Backend Express API routes (`/api/*`) run through the `server` service (`server/server.js`).
   - On Vercel, SQLite automatically uses `/tmp/stockflow.db` and seeds the demo admin account (`admin@stockflow.com` / `Admin@123`) on cold start with 0 initial products/categories so first-time users can test the guided onboarding flow. *(Note: `/tmp` in Vercel serverless is ephemeral across cold starts; for permanent cloud storage, deploy the Node server to a host with persistent disk or swap SQLite for a managed database.)*

---

## 10. Screenshots

*(Run `npm run dev` and capture screenshots of the following screens for your project report submission)*:
- **Dashboard Overview** — KPIs, 14-day movement bar chart, category donut chart, and low-stock alerts
- **Products Catalog** — Search, category filters, sorting, and Add/Edit modal
- **Inventory Operations** — Stock-IN / Stock-OUT modal with live stock preview
- **Reports & CSV Export** — Valuation analytics and downloadable CSV reports

