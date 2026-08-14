import "dotenv/config";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { notify } from "../src/services/notifications.js";

async function run() {
  console.log("Fetching first user from DB...");
  const firstUser = await db.query.users.findFirst();

  if (!firstUser) {
    console.error("No users found in database to test with.");
    process.exit(1);
  }

  console.log(`Testing broadcast notification for user: ${firstUser.email} (ID: ${firstUser.id})`);

  // Generate a completely unique title to bypass dedupKey
  const uniqueTitle = `Test Broadcast ${Date.now()}`;
  const uniqueBody = "This is a test broadcast to verify notifications and email delivery.";
  
  try {
    console.log("Triggering notify function...");
    await notify({
      userId: firstUser.id,
      kind: "ADMIN",
      title: uniqueTitle,
      body: uniqueBody,
      dedupKey: `test-broadcast-${Date.now()}`,
    });
    console.log("Notify execution finished (check console for any async email errors).");
  } catch (error) {
    console.error("Error running notify:", error);
  }
}

// Keep process open slightly to allow async email dispatch to log
run().then(() => {
  setTimeout(() => {
    console.log("Exiting test.");
    process.exit(0);
  }, 5000);
});
