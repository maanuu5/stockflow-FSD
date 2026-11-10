import { Router } from 'express';
import {
  getDashboardStats,
  getRecentTransactions,
  getStockChartData,
} from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/stats', getDashboardStats);
router.get('/recent-transactions', getRecentTransactions);
router.get('/stock-chart', getStockChartData);

export default router;

