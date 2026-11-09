import { Router } from 'express';
import { getInventory, stockIn, stockOut } from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', getInventory);
router.post('/stock-in', stockIn);
router.post('/stock-out', stockOut);

export default router;

