import "dotenv/config";
import { sendEmail } from "../src/services/email.js";

async function run() {
  console.log("Testing email sending using sendEmail service...");
  const success = await sendEmail({
    to: "sarcasticsahal@gmail.com",
    subject: "SubMate Service Test",
    title: "Checking Service Delivery",
    body: "Hello,\n\nThis is a test of the newly updated plain-text style email template using the official sendEmail service.",
    link: "https://submate.tech/dashboard",
  });

  if (success) {
    console.log("✓ Email service executed successfully! Email sent.");
  } else {
    console.error("✗ Email service returned failure. Check console errors above.");
  }
}

run();
