import "dotenv/config";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "SubMate <noreply@submate.tech>";

console.log("Resend API Key:", apiKey ? `${apiKey.substring(0, 6)}...` : "not set");
console.log("From Email:", fromEmail);

if (!apiKey) {
  console.error("Error: RESEND_API_KEY is not set in .env");
  process.exit(1);
}

const resend = new Resend(apiKey);

async function run() {
  try {
    console.log("Sending test email...");
    const response = await resend.emails.send({
      from: fromEmail,
      to: "sarcasticsahal@gmail.com",
      subject: "SubMate Test Email",
      html: "<p>This is a test email from SubMate backend script to verify Resend setup.</p>",
    });

    if (response.error) {
      console.error("Resend returned an error:", JSON.stringify(response.error, null, 2));
    } else {
      console.log("Email sent successfully! Message ID:", response.data?.id);
    }
  } catch (error) {
    console.error("Exception occurred while sending email:", error);
  }
}

run();
