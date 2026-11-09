import { Router } from 'express';
import {
  listTransactions,
  getTransactionById,
} from '../controllers/transactionController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', listTransactions);
router.get('/:id', getTransactionById);

export default router;

