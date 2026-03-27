import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { assertConfig, config } from './src/config/index.js';
import rateLimit from "express-rate-limit";
assertConfig();


const callLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: "Too many calls, try later",
});

app.use("/call/initiate", callLimiter);
console.log("DB URL:", process.env.DATABASE_URL);
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});
app.listen(config.port, () => {
  console.log(`Emergency Alert API listening on http://localhost:${config.port}`);
});