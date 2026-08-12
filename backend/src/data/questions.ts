/**
 * Curated Q&A knowledge base that grounds the Subly assistant's answers.
 * The AI matches the user's message to the closest entry here and replies
 * using its answer — anything outside this is handed off to WhatsApp/email.
 */

export interface KnowledgeQa {
  /** Example user phrasing(s) this entry answers. */
  q: string;
  /** Grounded answer the assistant should give. */
  a: string;
}

export const FAQ_KNOWLEDGE: KnowledgeQa[] = [
  /* ------------------------------- Greetings ------------------------------- */
  { q: "hi hello salam assalam o alaikum good morning good evening hey", a: "Hello! 👋 Welcome to Subly. I'm the Subly assistant. Ask me anything about our subscriptions, how to pay, verification, or your order — or message us on WhatsApp at +92 314 9466389 for a human." },
  { q: "who are you what is subly what do you sell about subly", a: "Subly is a Pakistani marketplace for digital subscriptions — Netflix, Spotify, YouTube Premium, Canva, ChatGPT Plus, Adobe and more. You pay in PKR and get access delivered to your account. Need a human? WhatsApp +92 314 9466389." },
  { q: "what can you help with what do you do", a: "I can help with: finding subscriptions, how payment and verification work, order status, subscription activation, renewals, refunds and general questions. For anything else, message us on WhatsApp at +92 314 9466389." },

  /* --------------------------------- Payment ------------------------------- */
  { q: "how do i pay how to pay payment methods what payment options", a: "After placing an order you'll see our payment methods: JazzCash, Easypaisa, NayaPay and bank transfer. Transfer the order amount in PKR and upload a screenshot of the payment from your order page. No card or international payment needed." },
  { q: "is payment secure is my payment safe payment safety", a: "Yes. You pay directly to our official JazzCash/Easypaisa/NayaPay/bank accounts and upload a payment screenshot for verification. Screenshots are stored securely and only the admin team can review them." },
  { q: "how long does payment verification take when will my payment be approved", a: "Payments are verified by our system and admin team, usually within a few hours to 24 hours. You'll get a notification (and email) the moment the payment is approved." },
  { q: "payment failed payment not showing my payment is pending", a: "If your payment isn't showing or still pending, wait for the admin review — pending payments are checked regularly. If nothing changes, message us on WhatsApp +92 314 9466389 with your order number so we can fix it fast." },
  { q: "can i cancel my order how to cancel", a: "You can cancel an order while it's pending payment from the order page. Once a payment is submitted or approved, the order can no longer be cancelled." },

  /* -------------------------------- Delivery ------------------------------- */
  { q: "when will my subscription be activated delivery time how long to get access", a: "Once your payment is approved, we fulfill your order and your subscription starts the same day. Access details appear on your subscription page as soon as the admin adds them. Activation is usually within 24 hours of approval." },
  { q: "where is my access i don't see my access no access details", a: "Open Dashboard → Subscriptions and click your subscription. Access details show there once your order is fulfilled and the admin adds them. If it's been more than a day after approval, contact us on WhatsApp +92 314 9466389." },
  { q: "i don't have access access not working login problem", a: "If your delivered access isn't working or you need a fresh login code, use the OTP/verification-code request on your subscription page (limited to 3 per day). Still stuck? Message us on WhatsApp +92 314 9466389." },

  /* ------------------------------ Subscriptions ---------------------------- */
  { q: "which subscriptions do you offer what subscriptions netflix spotify youtube", a: "We offer Netflix, Spotify, YouTube Premium, Disney+, HBO Max, Canva, ChatGPT Plus, Adobe and more. Browse the full catalogue on our storefront or ask me about a specific product." },
  { q: "is it a personal account or shared account is sharing allowed", a: "Every plan shows exactly what you get (personal, family or shared profile) on its product page. For anything unclear, ask us on WhatsApp +92 314 9466389 before buying." },
  { q: "how do i renew subscription renewal renewal price", a: "When your subscription is about to expire we notify you by email and in-app. Renewal extends your access from your current expiry date. For renewal pricing and steps, check your subscription page or ask us on WhatsApp +92 314 9466389." },
  { q: "my subscription expired what happens after expiry", a: "When a subscription expires, you'll get a notification and your renewal options in the dashboard. Renew to keep access without losing your account. Contact WhatsApp +92 314 9466389 if you need a custom renewal." },

  /* ------------------------------- Refunds -------------------------------- */
  { q: "refund refund policy can i get a refund money back", a: "Pending/rejected orders are refunded in full. Once access has been delivered and your subscription is activated, fulfilled orders are non-refundable. Contact WhatsApp +92 314 9466389 with your order number for any refund request." },
  { q: "order rejected my payment was rejected reason for rejection", a: "A payment is rejected when the screenshot is unclear, doesn't match the order amount, or can't be verified. You can re-upload a clear screenshot from your order page, or message us on WhatsApp +92 314 9466389." },

  /* -------------------------------- Privacy ------------------------------- */
  { q: "privacy is my data safe my information privacy policy", a: "Your data is kept private. Payment screenshots are only visible to the admin team for verification, and access details are encrypted and shown only to you on your subscription page." },
  { q: "is this legal legitimate is subly safe can i trust you", a: "Subly only lists subscriptions where you're eligible and the provider allows sharing. Please read the terms and provider eligibility before purchasing. For any concern, reach a human on WhatsApp +92 314 9466389." },

  /* ------------------------------- Contact -------------------------------- */
  { q: "how do i contact support contact human agent customer service", a: "For real-person help, message us on WhatsApp at +92 314 9466389 — quickest response. You can also email sarcasticsahal@gmail.com. Include your order number for fast help." },
  { q: "whatsapp number contact number support number", a: "Our WhatsApp is +92 314 9466389. Tap the WhatsApp button in the chat to message us directly. Email: sarcasticsahal@gmail.com." },

  /* ----------------------------- Misc / fallback --------------------------- */
  { q: "pricing price in pkr how much does it cost", a: "All prices are shown in PKR on each plan. Prices and availability can change, so always confirm on the product page before ordering. For any price question, ask us on WhatsApp +92 314 9466389." },
  { q: "chatgpt plus canva adobe netflix spotify price subscribe how", a: "Pick any product from the storefront, choose a plan, place the order, pay via JazzCash/Easypaisa/NayaPay/bank transfer, and upload the screenshot. We verify and activate your subscription. Want specifics? WhatsApp +92 314 9466389." },
  { q: "order status where is my order my order number tracking", a: "You can track your order from the Dashboard → Orders page. You'll also get a notification and email at every step: order created, payment submitted, approved, and fulfilled." },
];