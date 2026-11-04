import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './db/client.js';

try {
  await checkDatabaseConnection();
  console.log('Database connected successfully');
} catch (err) {
  console.error('Database connection failed:', err.message);
  process.exit(1);
}

createApp().listen(env.port, () => {
  console.log(`GameVault API listening on http://localhost:${env.port}/api/v1`);
});
