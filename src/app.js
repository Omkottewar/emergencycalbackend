import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import qrRoutes from './routes/qr.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import alertRoutes from './routes/alert.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/qr', qrRoutes);
app.use('/payments', paymentRoutes);

/** Alert web + APIs — GET page, POST verify, POST call */
app.use('/alert', alertRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
