import "dotenv/config";
import { runExpiryJob, expireStaleOrders } from "../src/services/expiry.js";

/**
 * Standalone expiry job — intended for a scheduler (cron / GitHub Actions).
 * Equivalent to POST /api/cron/expiry but without the HTTP layer.
 */
async function main() {
  console.log(`[expiry-job] started ${new Date().toISOString()}`);

  const staleOrders = await expireStaleOrders();
  console.log(`[expiry-job] expired ${staleOrders} stale order(s).`);

  const summary = await runExpiryJob();
  console.log(
    `[expiry-job] checked=${summary.checked} expired=${summary.expired} expiringSoon=${summary.expiringSoon} notifications=${summary.notificationsCreated}`,
  );

  console.log(`[expiry-job] finished ${new Date().toISOString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[expiry-job] failed", err);
    process.exit(1);
  });