import { Router } from 'express';
import {
  getInventoryReport,
  getLowStockReport,
  getTransactionsReport,
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/inventory', getInventoryReport);
router.get('/low-stock', getLowStockReport);
router.get('/transactions', getTransactionsReport);

export default router;

