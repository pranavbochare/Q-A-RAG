import { Router } from 'express';
import { askQuestion } from '../controllers/queryController.js';

const router = Router();

// POST /api/query/ask  { docId, question }
router.post('/ask', askQuestion);

export default router;
