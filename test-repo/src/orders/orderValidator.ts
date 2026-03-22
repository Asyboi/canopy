export function validateOrder(order: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!order.userId) errors.push('userId is required');
  if (!order.items || order.items.length === 0) errors.push('items cannot be empty');
  if (!order.totalAmount || order.totalAmount <= 0) errors.push('totalAmount must be positive');
  return { valid: errors.length === 0, errors };
}
