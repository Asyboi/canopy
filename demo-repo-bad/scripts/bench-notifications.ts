// Benchmark: aggressive notification polling
// Runs the poller for 5 seconds to demonstrate wasted I/O cycles

import { startNotificationPolling } from '../src/notifications/notificationPoller';

console.log('[bench] Running notification polling benchmark for 5 seconds...');
startNotificationPolling('user_1');

setTimeout(() => {
  console.log('[bench] Done. In 5 seconds, the poller fired ~10 times — all unnecessary.');
  process.exit(0);
}, 5000);
