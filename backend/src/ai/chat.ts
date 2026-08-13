// Curated Q&A knowledge base (covers greetings, payments, privacy, orders, subscriptions, refunds, WhatsApp)
export const FAQ_KNOWLEDGE = [
  { q: "hi|hello|salam|assalam oalaikum|hey|good morning|good afternoon", a: "Hello! 👋 Welcome to SubMate. I'm the SubMate assistant. Ask me anything about our subscriptions, how to pay, verification, or your order — or message us on WhatsApp at +92 314 9466389 for a human." },
  { q: "how do i pay|payment methods|payment options", a: "After placing an order you'll see our payment methods: JazzCash, Easypaisa, NayaPay and bank transfer. Transfer the order amount in PKR and upload a screenshot of the payment from your order page. No card or international payment needed." },
  { q: "is payment secure|is my payment safe", a: "Yes. You pay directly to our official JazzCash/Easypaisa/NayaPay/bank accounts and upload a screenshot of the payment. Screenshots are stored securely and only the admin team can review them." },
  { q: "how long does payment verification take|when will my payment be approved", a: "Payments are verified by our system and admin team, usually within a few hours to 24 hours. You'll get a notification (and email) the moment the payment is approved." },
  { q: "payment failed|payment not showing|payment pending", a: "If your payment isn't showing or still pending, wait for the admin review — pending payments are checked regularly. If nothing changes, message us on WhatsApp +92 314 9466389 with your order number so we can fix it fast." },
  { q: "can i cancel my order|how to cancel", a: "You can cancel an order while it's pending payment from the order page. Once a payment is submitted or approved, the order can no longer be cancelled." },
  { q: "when will my subscription be activated|delivery time|get access", a: "Once your payment is approved, we fulfill your order and your subscription starts the same day. Access details appear on your subscription page as soon as the admin adds them. Activation is usually within 24 hours of approval." },
  { q: "where is my access|i don't see my access|no access details", a: "Open Dashboard → Subscriptions and click your subscription. Access details appear there once your order is fulfilled and the admin adds them. If it's been more than a day after approval, contact us on WhatsApp +92 314 9466389." },
  { q: "i don't have access|access not working|login problem", a: "If your delivered access isn't working or you need a fresh access code, use the access-code request on your subscription page (limited to 3 per day). Enter the code only on the official service website or app. Still stuck? Message us on WhatsApp +92 314 9466389." },
  { q: "which subscriptions do you offer|which subscriptions netflix spotify youtube", a: "We offer Netflix, Spotify, YouTube Premium, Canva, ChatGPT Plus, Adobe and more. Browse the full catalogue on our storefront or ask me about a specific product." },
  { q: "is it a personal account or shared account|is sharing allowed", a: "Every plan shows exactly what you get (personal, family or shared profile) on its product page. For anything unclear, ask us on WhatsApp +92 314 9466389 before buying." },
  { q: "how do i renew subscription|renewal price", a: "When your subscription is about to expire we notify you by email and in-app. Renewal extends your access from your current expiry date. For renewal pricing and steps, check your subscription page or ask us on WhatsApp +92 314 9466389." },
  { q: "my subscription expired what happens after expiry", a: "When a subscription expires, you'll get a notification and your renewal options in the dashboard. Renew to keep access without losing your account. Contact WhatsApp +92 314 9466389 if you need a custom renewal." },
  { q: "refund refund policy|money back", a: "Pending/rejected orders are refunded in full. Once access has been delivered and your subscription is activated, fulfilled orders are non-refundable. Contact WhatsApp +92 314 9466389 with your order number for any refund request." },
  { q: "order rejected|my payment was rejected|reason for rejection", a: "A payment is rejected when the screenshot is unclear, doesn't match the order amount, or can't be verified. You can re-upload a clear screenshot from your order page, or message us on WhatsApp +92 314 9466389." },
  { q: "privacy|is my data safe|information privacy policy", a: "Your data is kept private. Payment screenshots are only visible to the admin team for verification, and access details are encrypted and shown only to you on your subscription page. SubMate is an independent subscription platform and is not affiliated with or endorsed by any third-party service." },
  { q: "is this legal legitimate|is subly safe|can i trust you", a: "SubMate is an independent subscription platform and is not affiliated with or endorsed by any third-party service. SubMate only lists subscriptions where you're eligible and the provider allows sharing. Please read the terms and provider eligibility before purchasing. For any concern, reach a human on WhatsApp +92 314 9466389." },
  { q: "how do i contact support|contact human agent|customer service", a: "For real-person help, message us on WhatsApp at +92 314 9466389 — quickest response. Include your order number for fast help." },
  { q: "whatsapp number|contact number|support number", a: "Our WhatsApp is +92 314 9466389. Tap the WhatsApp button in the chat to message us directly." },
  { q: "pricing price in pkr|how much does it cost", a: "All prices are shown in PKR on each plan. Prices and availability can change, so always confirm on the product page before ordering. For any price question, ask us on WhatsApp +92 314 9466389." },
  { q: "order status|where is my order|my order number|tracking", a: "You can track your order from the Dashboard → Orders page. You'll also get a notification and email at every step: order created, payment submitted, approved, and fulfilled." },
];

// ---------- Tokeniser & matcher ----------

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function tokenSet(s: string): Set<string> {
  return new Set(tokenize(s));
}

function answerFromKnowledge(userQuery: string): string | null {
  const q = userQuery.toLowerCase();

  // 1) Greeting shortcuts
  if (/^\s*(hi|hello|salam|hey|good morning|good afternoon)\s*$/.test(q)) {
    return "Hello! 👋 Welcome to SubMate. I'm the SubMate assistant. Ask me anything about our subscriptions, how to pay, verification, or your order — or message us on WhatsApp at +92 314 9466389 for a human.";
  }

  // 2) Keyword‑overlap match against FAQ_KNOWLEDGE
  const userTokens = tokenize(q);
  let best: string | null = null;
  let bestScore = 0;

  for (const entry of FAQ_KNOWLEDGE) {
    const kSet = tokenSet(entry.q);
    let score = 0;
    for (const t of userTokens) {
      if (kSet.has(t)) { score += 2; }
      else {
        for (const k of kSet) {
          if (k.startsWith(t) || t.startsWith(k)) { score += 1; break; }
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry.a;
    }
  }

  // Require at least 2 "point" matches (an exact token or two partials)
  return bestScore >= 2 ? best : null;
}

// ---------- Fallback when knowledge doesn't match ----------

const HUMAN_FALLBACK =
  "I'm not 100% sure about that. A human from our team can help — message us on WhatsApp at +92 314 9466389.";

/* ---------- Route handler (called by the frontend) ---------- */

export function getChatReply(messages: Array<{role: string; content: string}>): string {
  // 1) Try the local knowledge‑base matcher first (instant, no AI)
  const lastUser = messages.find((m) => m.role === "user");
  if (lastUser) {
    const grounded = answerFromKnowledge(lastUser.content);
    if (grounded) return grounded;
  }

  // 2) Fallback: WhatsApp/email note (AI is optional; if unavailable just show the fallback)
  return HUMAN_FALLBACK;
}