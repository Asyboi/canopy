import express from 'express';
import { getOrdersWithItems } from './orders/orderService';
import { getProductsWithSuppliers } from './inventory/stockChecker';
import { getProductSalesReport, getDashboardStats } from './analytics/analyticsService';
import { getUsersWithOrderCount } from './users/userService';

// Side-effect imports that start polling intervals
import './orders/orderService';
import './inventory/inventoryService';
import './notifications/notificationService';

const app = express();
app.use(express.json());

app.get('/orders/:userId', async (req, res) => {
  const orders = await getOrdersWithItems(req.params.userId);
  res.json(orders);
});

app.get('/inventory/products', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const products = await getProductsWithSuppliers({ page, limit });
  res.json(products);
});

app.get('/analytics/sales', async (req, res) => {
  const report = await getProductSalesReport();
  res.json(report);
});

app.get('/analytics/dashboard', async (req, res) => {
  const stats = await getDashboardStats();
  res.json(stats);
});

app.get('/users', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const users = await getUsersWithOrderCount({ page, limit });
  res.json(users);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Shopflow server running on port ${PORT}`);
});
