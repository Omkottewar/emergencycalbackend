import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { assertConfig, config } from './src/config/index.js';

assertConfig();
console.log("DB URL:", process.env.DATABASE_URL);
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});
app.listen(config.port, () => {
  console.log(`Emergency Alert API listening on http://localhost:${config.port}`);
});