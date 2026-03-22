import { db } from '../db/client';
import { paginate, PaginationOptions } from '../utils/pagination';

export async function getUsersWithOrderCount(opts: PaginationOptions) {
  const result = await db.query(
    `SELECT u.*, COUNT(o.id)::int as order_count
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.active = true
     GROUP BY u.id
     LIMIT 50`
  );
  return paginate(result.rows, opts);
}
