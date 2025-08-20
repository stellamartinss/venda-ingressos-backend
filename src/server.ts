import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import authRouter from './routes/auth';
import eventsRouter from './routes/events';
import ordersRouter from './routes/orders';
import dashboardRouter from './routes/dashboard';
import adminRouter from './routes/admin';
import organizerRouter from './routes/organizer';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/events', eventsRouter);
app.use('/orders', ordersRouter);
app.use('/dashboard', dashboardRouter);
app.use('/admin', adminRouter);
app.use('/organizer', organizerRouter);

// Basic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${config.port}`);
});


