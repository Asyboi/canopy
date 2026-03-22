import { db } from '../db/client';
import { paginate, PaginationOptions } from '../utils/pagination';

export async function checkStock(productId: string, quantity: number): Promise<boolean> {
  const result = await db.query(
    `SELECT stock_quantity FROM products WHERE id = $1`, [productId]
  );
  return result.rows[0]?.stock_quantity >= quantity;
}

export async function getProductsWithSuppliers(opts: PaginationOptions) {
  // Replaced N+1 pattern with a single JOIN query, reducing database round-trips
  // from (1 + N) queries down to 1 regardless of the number of active products.
  const result = await db.query(`
    SELECT
      p.*,
      row_to_json(s.*) AS supplier
    FROM products p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.active = true
  `);
  return paginate(result.rows, opts);
}