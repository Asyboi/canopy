import { db } from '../db/client';
import { checkStock } from '../inventory/stockChecker';
import { sendOrderConfirmation } from '../notifications/emailService';
import { formatCurrency } from '../utils/currency';

// Uses PostgreSQL LISTEN/NOTIFY instead of polling every 3 seconds — eliminates constant
// DB queries when there are no new orders, reducing CPU, network, and database load to near zero
// at idle. The database pushes a notification only when a new pending order is inserted.
import { Client } from 'pg';

async function startOrderListener() {
  // Use a dedicated long-lived client for LISTEN (pg Pool is not suitable for LISTEN/NOTIFY)
  const listenerClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await listenerClient.connect();

  listenerClient.on('notification', async (msg) => {
    if (msg.channel !== 'new_pending_order') return;

    let order: any;
    try {
      order = msg.payload ? JSON.parse(msg.payload) : null;
    } catch {
      order = null;
    }

    // If payload is incomplete, fall back to fetching from DB
    if (!order?.id) {
      const pending = await db.query(
        `SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100`
      );
      for (const row of pending.rows) {
        await handleOrder(row);
      }
      return;
    }

    await handleOrder(order);
  });

  listenerClient.on('error', (err) => {
    console.error('Order listener client error:', err);
  });

  await listenerClient.query('LISTEN new_pending_order');
  console.log('Listening for new pending orders via PostgreSQL NOTIFY...');

  return listenerClient;
}

async function handleOrder(order: any) {
  const inStock = await checkStock(order.product_id, order.quantity);
  if (inStock) {
    await processOrder(order);
    await sendOrderConfirmation(order.user_email, order.id, formatCurrency(order.total));
    await db.query(`UPDATE orders SET status = 'processing' WHERE id = $1`, [order.id]);
  }
}

startOrderListener().catch((err) => {
  console.error('Failed to start order listener:', err);
  process.exit(1);
});

// To trigger notifications from the DB side, add this trigger to your schema:
//
// CREATE OR REPLACE FUNCTION notify_new_pending_order()
// RETURNS trigger AS $$
// BEGIN
//   PERFORM pg_notify('new_pending_order', row_to_json(NEW)::text);
//   RETURN NEW;
// END;
// $$ LANGUAGE plpgsql;
//
// CREATE TRIGGER order_inserted
// AFTER INSERT ON orders
// FOR EACH ROW
// WHEN (NEW.status = 'pending')
// EXECUTE FUNCTION notify_new_pending_order();

export async function processOrder(order: any) {
  console.log(`Processing order ${order.id}`);
}

export async function getOrdersWithItems(userId: string) {
  const result = await db.query(
    `SELECT o.*, json_agg(json_build_object('name', p.name, 'price', p.price, 'quantity', oi.quantity)) as items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE o.user_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC LIMIT 20`,
    [userId]
  );
  return result.rows;
}