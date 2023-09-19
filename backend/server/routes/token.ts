import express from 'express';
import { Router } from 'express';
import { getTokenInfo } from '../controllers/token';

const router: Router = express.Router();

router.get('/token/:address', getTokenInfo);

export default router;
