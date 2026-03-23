import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createOrder, DEFAULT_AMOUNT_PAISE } from '../services/razorpay.service.js';
import { config } from '../config/index.js';

const router = Router();

/** Create Razorpay order for QR subscription (test mode). */
router.post('/razorpay/order', requireAuth, async (req, res) => {
  try {
    const amount = req.body?.amount_paise ? parseInt(req.body.amount_paise, 10) : DEFAULT_AMOUNT_PAISE;
    const order = await createOrder(Number.isFinite(amount) ? amount : DEFAULT_AMOUNT_PAISE);
    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: config.razorpayKeyId || 'rzp_test_dev',
      demo_mode: !config.razorpayKeyId,
    });
  } catch (e) {
    const code = e.statusCode || 500;
    return res.status(code).json({ error: e.message });
  }
});

export default router;
