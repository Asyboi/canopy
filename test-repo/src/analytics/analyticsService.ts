import { db } from '../db/client';
import { getUsersWithOrderCount } from '../users/userService';
import { formatCurrency } from '../utils/currency';

export async function getProductSalesReport() {
  const result = await db.query(
    `SELECT p.id, p.name,
            COALESCE(SUM(s.quantity), 0) as total_sold,
            COALESCE(SUM(s.revenue), 0) as total_revenue
     FROM products p
     LEFT JOIN sales s ON s.product_id = p.id
     GROUP BY p.id, p.name`
  );
  return result.rows.map(r => ({
    ...r,
    formattedRevenue: formatCurrency(r.total_revenue)
  }));
}

export async function getDashboardStats() {
  const [salesReport, usersWithOrders] = await Promise.all([
    getProductSalesReport(),
    getUsersWithOrderCount({ page: 1, limit: 10 })
  ]);
  return { salesReport, usersWithOrders };
}

export async function loadAnalyticsCache(): Promise<any> {
  const { promises: fs } = await import('fs');
  const path = await import('path');
  const cachePath = path.join(process.cwd(), 'cache', 'analytics.json');
  try {
    return JSON.parse(await fs.readFile(cachePath, 'utf-8'));
  } catch { return null; }
}

export async function saveAnalyticsCache(data: any): Promise<void> {
  const { promises: fs } = await import('fs');
  const path = await import('path');
  const cachePath = path.join(process.cwd(), 'cache', 'analytics.json');
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(data), 'utf-8');
}
