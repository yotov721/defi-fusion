import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

import tokenRoutes from './routes/token';
import contractRoutes from './routes/contract';

app.use(tokenRoutes);
app.use(contractRoutes);

export default app;
