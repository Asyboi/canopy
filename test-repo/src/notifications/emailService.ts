export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  console.log(`Email sent to ${to}: ${subject}`);
}

export async function sendOrderConfirmation(to: string, orderId: string, total: string): Promise<void> {
  console.log(`Order confirmation sent to ${to} for order ${orderId} (${total})`);
}

export async function sendLowStockAlert(productName: string, quantity: number): Promise<void> {
  console.log(`Low stock alert: ${productName} has ${quantity} units remaining`);
}
