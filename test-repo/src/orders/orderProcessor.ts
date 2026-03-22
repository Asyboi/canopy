import { promises as fs } from 'fs';
import * as path from 'path';

export async function loadOrderConfig(): Promise<any> {
  const configPath = path.join(process.cwd(), 'config', 'orders.json');
  try {
    return JSON.parse(await fs.readFile(configPath, 'utf-8'));
  } catch { return {}; }
}

export async function saveOrderLog(orderId: string, log: string): Promise<void> {
  const logPath = path.join(process.cwd(), 'logs', `order-${orderId}.log`);
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, log, 'utf-8');
}
