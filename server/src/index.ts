import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import getPort from 'get-port';
import { createApp } from './app';

// __dirname resolves to server/src/ when running via tsx,
// so path.join(__dirname, '..', '.env') correctly points to server/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const requiredKeys = ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY'];
for (const key of requiredKeys) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env — please add it before starting Canopy`);
    process.exit(1);
  }
}

const portFilePath = path.join(process.cwd(), '.canopy', 'server.port');

function cleanup(): void {
  try {
    fs.unlinkSync(portFilePath);
  } catch {
    // Port file may already be deleted
  }
}

async function main(): Promise<void> {
  const port = await getPort();
  const app = createApp();

  app.listen(port, () => {
    fs.mkdirSync(path.dirname(portFilePath), { recursive: true });
    fs.writeFileSync(portFilePath, String(port));
    console.log(`Canopy server listening on port ${port}`);
  });
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

main().catch((err) => {
  console.error('Failed to start Canopy server:', err);
  process.exit(1);
});
