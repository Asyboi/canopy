export interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// In production this would call FCM or APNs.
// Stubbed here to demonstrate the notification pipeline.
export async function sendPush(token: string, body: string): Promise<void> {
  const payload: PushPayload = {
    token,
    title: 'Taskly',
    body,
  };

  // Simulate network latency for the push gateway
  await new Promise<void>((resolve) => setTimeout(resolve, 50));

  console.log(`[push] sent to token=${token.slice(0, 8)}… body="${body}"`);
  void payload; // used in real implementation
}
