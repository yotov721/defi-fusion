import express from 'express';
import { Router } from 'express';
import contractController from '../controllers/contract';

const router: Router = express.Router();

router.get('/contract/:address', contractController.getContractInfo);

export default router;
