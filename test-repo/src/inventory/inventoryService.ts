import { db } from '../db/client';
import { sendLowStockAlert } from '../notifications/emailService';

export async function checkLowStock(): Promise<void> {
  const lowStock = await db.query(
    `SELECT * FROM products WHERE stock_quantity < reorder_threshold`
  );
  for (const product of lowStock.rows) {
    await sendLowStockAlert(product.name, product.stock_quantity);
  }
}

export async function saveInventorySnapshot(data: any[]): Promise<string> {
  const { promises: fs } = await import('fs');
  const path = await import('path');
  const snapshotDir = path.join(process.cwd(), 'snapshots');
  const filename = `inventory-${Date.now()}.json`;
  const filepath = path.join(snapshotDir, filename);
  await fs.mkdir(snapshotDir, { recursive: true });
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  return filepath;
}
