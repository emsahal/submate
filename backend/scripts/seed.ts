import "dotenv/config";
import { db } from "../src/db/index.js";
import {
  categories,
  paymentMethods,
  products,
  plans,
  faqItems,
  blogPosts,
  subscriptions,
  subscriptionSlots,
  accessCredentials,
  reviews,
  orders,
} from "../src/db/schema.js";
import { count } from "drizzle-orm";

/**
 * Seed a starter catalog for local development / preview.
 * Idempotent: skips categories, payment methods and products that already exist.
 * Pass --force to wipe the catalog tables (and their dependent order data) and re-seed.
 */
async function main() {
  const force = process.argv.includes("--force");
  if (force) {
    await db.delete(subscriptionSlots);
    await db.delete(accessCredentials);
    await db.delete(subscriptions);
    await db.delete(reviews);
    await db.delete(orders);
    await db.delete(plans);
    await db.delete(products);
    await db.delete(blogPosts);
    await db.delete(faqItems);
    await db.delete(categories);
    await db.delete(paymentMethods);
    console.log("Wiped existing catalog — re-seeding from scratch.");
  }

  const categoryCount = await db.select({ value: count() }).from(categories);
  const hasData = (categoryCount[0]?.value ?? 0) > 0;
  if (hasData) {
    console.log("Database already has categories — skipping seed.");
    return;
  }

  /* ------------------------------ Categories ------------------------------ */
  const seededCategories = [
    { name: "Streaming", slug: "streaming", description: "Video and entertainment platforms", icon: "film", sortOrder: 1 },
    { name: "Music", slug: "music", description: "Music streaming and audio platforms", icon: "music", sortOrder: 2 },
    { name: "Productivity", slug: "productivity", description: "Tools for work, storage and collaboration", icon: "briefcase", sortOrder: 3 },
    { name: "Gaming", slug: "gaming", description: "Game subscriptions and cloud gaming", icon: "gamepad", sortOrder: 4 },
    { name: "Education", slug: "education", description: "Learning platforms and courses", icon: "graduation", sortOrder: 5 },
    { name: "Design", slug: "design", description: "Creative tools and asset libraries", icon: "palette", sortOrder: 6 },
  ] as const;

  const insertedCats = await db
    .insert(categories)
    .values([...seededCategories])
    .returning();
  const catByName = new Map(insertedCats.map((c) => [c.slug, c]));
  console.log(`Seeded ${insertedCats.length} categories.`);

  /* ---------------------------- Payment methods ---------------------------- */
  const insertedMethods = await db
    .insert(paymentMethods)
    .values([
      {
        name: "JazzCash",
        type: "JAZZCASH",
        accountDetails: { account: "0345 1234567", name: "Subly Payments" },
        instructions: "Send the exact amount to the JazzCash account, then upload your transaction screenshot.",
        sortOrder: 1,
      },
      {
        name: "Easypaisa",
        type: "EASYPAISA",
        accountDetails: { account: "0345 1234567", name: "Subly Payments" },
        instructions: "Send the exact amount to the Easypaisa account, then upload your transaction screenshot.",
        sortOrder: 2,
      },
      {
        name: "Bank Transfer",
        type: "BANK_TRANSFER",
        accountDetails: { account: "PK76 MEZN 0000 1234 5678 90", name: "Subly Payments", iban: "PK76MEZN00001234567890" },
        instructions: "Transfer the exact amount, then upload the transfer receipt screenshot.",
        sortOrder: 3,
      },
    ])
    .returning();
  console.log(`Seeded ${insertedMethods.length} payment methods.`);

  /* ------------------------------- Products ------------------------------- */
  const catalog: Array<{
    cat: string;
    product: Omit<typeof products.$inferInsert, "categoryId">;
    plans: Omit<typeof plans.$inferInsert, "productId" | "currency">[];
  }> = [
    {
      cat: "streaming",
      product: {
        name: "Netflix",
        slug: "netflix",
        shortDescription: "HD & 4K streaming with family profiles, ad-free movies and series.",
        description:
          "Netflix in HD or 4K with a shared family plan, separate profiles and a supported region in Pakistan. Watch original series, movies and documentaries on TV, mobile and web.",
        features: ["4K + HDR", "4 profiles", "Watch on TV, mobile & web", "Parental controls"],
        providerName: "Netflix",
        logoUrl: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/netflix.png",
        logoUrlDark: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/netflix-white.png",
        isVerified: true,
        status: "ACTIVE",
        isFeatured: true,
        sortOrder: 1,
        seoTitle: "Netflix Subscription in Pakistan — HD & 4K Streaming | Subly",
        seoDescription: "Get a Netflix subscription in Pakistan with 4K streaming and family profiles.",
      },
      plans: [
        { name: "1 Month", durationDays: 30, priceLocal: 350, priceUsd: 1, description: "1 screen — 30 days", sortOrder: 1 },
        { name: "3 Months", durationDays: 90, priceLocal: 1000, priceUsd: 4, description: "1 screen — 3 months", sortOrder: 2 },
        { name: "12 Months", durationDays: 365, priceLocal: 3900, priceUsd: 14, description: "1 screen — best value", sortOrder: 3 },
      ],
    },
    {
      cat: "streaming",
      product: {
        name: "Amazon Prime Video",
        slug: "amazon-prime-video",
        shortDescription: "Movies, series and Originals — included with Prime Video in Pakistan.",
        description:
          "Amazon Prime Video gives you a rich library of movies, hit series and award-winning Originals, streamed in HD on any device.",
        features: ["Prime Originals", "HD streaming", "Watch anywhere", "Add-on channels"],
        providerName: "Amazon",
        logoUrl: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/amazone.png",
        logoUrlDark: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/amazone-white.png",
        isVerified: true,
        status: "ACTIVE",
        isFeatured: true,
        sortOrder: 2,
        seoTitle: "Amazon Prime Video Subscription in Pakistan | Subly",
        seoDescription: "Get Amazon Prime Video in Pakistan with Originals, movies and series on any device.",
      },
      plans: [
        { name: "1 Month", durationDays: 30, priceLocal: 300, priceUsd: 1, description: "1 screen — 30 days", sortOrder: 1 },
        { name: "3 Months", durationDays: 90, priceLocal: 850, priceUsd: 3, description: "1 screen — 3 months", sortOrder: 2 },
        { name: "12 Months", durationDays: 365, priceLocal: 3400, priceUsd: 12, description: "1 screen — best value", sortOrder: 3 },
      ],
    },
    {
      cat: "streaming",
      product: {
        name: "Disney+",
        slug: "disney-plus",
        shortDescription: "Marvel, Star Wars, Pixar and Disney classics in 4K for the whole family.",
        description:
          "Stream Disney+, Pixar, Marvel, Star Wars and National Geographic content in 4K with separate profiles and parental controls.",
        features: ["Marvel & Star Wars", "4K + HDR", "4 profiles", "Family-friendly"],
        providerName: "Disney+",
        isVerified: true,
        status: "ACTIVE",
        isFeatured: true,
        sortOrder: 3,
        seoTitle: "Disney+ Subscription in Pakistan — 4K Family Streaming | Subly",
        seoDescription: "Get Disney+ in Pakistan with Marvel, Star Wars, Pixar and 4K family streaming.",
      },
      plans: [
        { name: "1 Month", durationDays: 30, priceLocal: 300, priceUsd: 1, description: "1 screen — 30 days", sortOrder: 1 },
        { name: "3 Months", durationDays: 90, priceLocal: 850, priceUsd: 3, description: "1 screen — 3 months", sortOrder: 2 },
        { name: "12 Months", durationDays: 365, priceLocal: 3400, priceUsd: 12, description: "1 screen — best value", sortOrder: 3 },
      ],
    },
    {
      cat: "streaming",
      product: {
        name: "HBO Max",
        slug: "hbo-max",
        shortDescription: "HBO Originals, DC and blockbuster movies in 4K.",
        description:
          "HBO Max brings you HBO Originals, DC Universe, Studio Ghibli and blockbuster films with up to 4K streaming and profiles.",
        features: ["HBO Originals", "DC Universe", "4K streaming", "Watch on any device"],
        providerName: "HBO",
        logoUrl: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/hbo.svg",
        isVerified: true,
        status: "ACTIVE",
        isFeatured: true,
        sortOrder: 4,
        seoTitle: "HBO Max Subscription in Pakistan — 4K Streaming | Subly",
        seoDescription: "Get HBO Max in Pakistan with HBO Originals, DC and blockbuster movies in 4K.",
      },
      plans: [
        { name: "1 Month", durationDays: 30, priceLocal: 350, priceUsd: 1, description: "1 screen — 30 days", sortOrder: 1 },
        { name: "3 Months", durationDays: 90, priceLocal: 1000, priceUsd: 4, description: "1 screen — 3 months", sortOrder: 2 },
        { name: "12 Months", durationDays: 365, priceLocal: 3900, priceUsd: 14, description: "1 screen — best value", sortOrder: 3 },
      ],
    },
    {
      cat: "music",
      product: {
        name: "YouTube Premium",
        slug: "youtube-premium",
        shortDescription: "Ad-free YouTube, background play and YouTube Music included.",
        description:
          "YouTube Premium removes all ads across YouTube and YouTube Music, enables background and picture-in-picture playback, and lets you download videos and songs offline.",
        features: ["No ads", "Background play", "YouTube Music", "Offline downloads"],
        providerName: "YouTube",
        logoUrl: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/youtube.png",
        logoUrlDark: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/youtube-white.png",
        isVerified: true,
        status: "ACTIVE",
        isFeatured: true,
        sortOrder: 5,
        seoTitle: "YouTube Premium Subscription in Pakistan — Ad-Free | Subly",
        seoDescription: "Get YouTube Premium in Pakistan with ad-free videos, background play and YouTube Music.",
      },
      plans: [
        { name: "1 Month", durationDays: 30, priceLocal: 400, priceUsd: 1, description: "30 days ad-free", sortOrder: 1 },
        { name: "3 Months", durationDays: 90, priceLocal: 1100, priceUsd: 4, description: "3 months — save 8%", sortOrder: 2 },
        { name: "12 Months", durationDays: 365, priceLocal: 4300, priceUsd: 15, description: "Best value — full year", sortOrder: 3 },
      ],
    },
    {
      cat: "music",
      product: {
        name: "Spotify Premium",
        slug: "spotify",
        shortDescription: "Ad-free music, offline downloads and podcasts on all devices.",
        description:
          "Spotify Premium gives you ad-free music streaming, offline downloads, high-quality audio and podcasts across mobile, desktop and web.",
        features: ["Ad-free", "Offline downloads", "High quality audio", "All devices"],
        providerName: "Spotify",
        logoUrl: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/spotify.png",
        logoUrlDark: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/spotify-white.png",
        isVerified: true,
        status: "ACTIVE",
        isFeatured: true,
        sortOrder: 6,
        seoTitle: "Spotify Premium Subscription in Pakistan | Subly",
        seoDescription: "Get Spotify Premium in Pakistan with ad-free music, offline downloads and podcasts.",
      },
      plans: [
        { name: "1 Month", durationDays: 30, priceLocal: 300, priceUsd: 1, description: "30 days ad-free", sortOrder: 1 },
        { name: "3 Months", durationDays: 90, priceLocal: 850, priceUsd: 3, description: "3 months — save 6%", sortOrder: 2 },
        { name: "12 Months", durationDays: 365, priceLocal: 3400, priceUsd: 12, description: "Best value — full year", sortOrder: 3 },
      ],
    },
    {
      cat: "design",
      product: {
        name: "Canva Pro",
        slug: "canva-pro",
        shortDescription: "Premium templates, brand kit and AI tools for designers.",
        description:
          "Canva Pro unlocks premium templates, brand kits, background remover, one-click resize, AI tools and 1TB of cloud storage for you and your team.",
        features: ["Premium templates", "Brand kit", "Background remover", "1TB cloud storage"],
        providerName: "Canva",
        isVerified: true,
        status: "ACTIVE",
        isFeatured: true,
        sortOrder: 7,
        seoTitle: "Canva Pro Subscription in Pakistan — Design Like a Pro | Subly",
        seoDescription: "Get Canva Pro in Pakistan with premium templates, brand kit and AI design tools.",
      },
      plans: [
        { name: "1 Month", durationDays: 30, priceLocal: 400, priceUsd: 1, description: "30 days of Canva Pro", sortOrder: 1 },
        { name: "3 Months", durationDays: 90, priceLocal: 1100, priceUsd: 4, description: "3 months — save 8%", sortOrder: 2 },
        { name: "12 Months", durationDays: 365, priceLocal: 4300, priceUsd: 15, description: "Best value — full year", sortOrder: 3 },
      ],
    },
    {
      cat: "design",
      product: {
        name: "Adobe Creative Cloud",
        slug: "adobe-creative-cloud",
        shortDescription: "All apps — Photoshop, Illustrator, Premiere Pro and more.",
        description:
          "Get every Adobe Creative Cloud app including Photoshop, Illustrator, Premiere Pro, After Effects and Lightroom with 100GB of cloud storage.",
        features: ["All 20+ apps", "Photoshop & Illustrator", "Premiere Pro", "100GB cloud storage"],
        providerName: "Adobe",
        logoUrl: "https://br-old-butterfly-ay63bpqx.storage.c-5.us-east-2.aws.neon.tech/subly-imgs/icons-imgs/adobe.png",
        isVerified: true,
        status: "ACTIVE",
        isFeatured: false,
        sortOrder: 8,
        seoTitle: "Adobe Creative Cloud Subscription in Pakistan | Subly",
        seoDescription: "Get Adobe Creative Cloud in Pakistan with Photoshop, Illustrator, Premiere Pro and more.",
      },
      plans: [
        { name: "1 Month", durationDays: 30, priceLocal: 1000, priceUsd: 4, description: "All apps for one month", sortOrder: 1 },
        { name: "3 Months", durationDays: 90, priceLocal: 2800, priceUsd: 10, description: "3 months — save 7%", sortOrder: 2 },
        { name: "12 Months", durationDays: 365, priceLocal: 11000, priceUsd: 39, description: "Best value — full year", sortOrder: 3 },
      ],
    },
  ];

  for (const entry of catalog) {
    const cat = catByName.get(entry.cat);
    if (!cat) continue;
    const [product] = await db.insert(products).values({ ...entry.product, categoryId: cat.id }).returning();
    if (!product) continue;
    await db
      .insert(plans)
      .values(entry.plans.map((p) => ({ ...p, productId: product.id, currency: "PKR" })));
    console.log(`Seeded product "${product.name}" with ${entry.plans.length} plans.`);
  }

  /* --------------------------------- FAQs --------------------------------- */
  const faqs = [
    {
      question: "How does manual payment verification work?",
      answer:
        "After placing an order you send the exact amount via JazzCash, Easypaisa or bank transfer, then upload a screenshot. Our AI pre-checks the screenshot and an administrator confirms it — usually within a few hours.",
      category: "payments",
      sortOrder: 1,
    },
    {
      question: "Is account sharing allowed?",
      answer:
        "No. Every subscription is used only where the provider's terms and the law permit. We never resell or share accounts, and we clearly state eligibility for each product.",
      category: "legal",
      sortOrder: 2,
    },
    {
      question: "What happens when my subscription expires?",
      answer:
        "We remind you 7, 3 and 1 days before expiry. After it expires you can renew from your dashboard to keep access without losing your subscription history.",
      category: "subscriptions",
      sortOrder: 3,
    },
    {
      question: "How do I get my access details?",
      answer:
        "Once your payment is approved and your order is fulfilled, your access link or code appears on your subscription page. Credentials are encrypted at rest.",
      category: "delivery",
      sortOrder: 4,
    },
    {
      question: "Can I get a refund?",
      answer:
        "If we can't deliver the subscription you paid for, you get a full refund. Because digital subscriptions are delivered instantly, completed orders are non-refundable.",
      category: "payments",
      sortOrder: 5,
    },
  ];
  await db.insert(faqItems).values(faqs);
  console.log(`Seeded ${faqs.length} FAQs.`);

  /* --------------------------------- Blog --------------------------------- */
  const posts: { title: string; slug: string; excerpt: string; content: string; status: "PUBLISHED"; tags: string[] }[] = [
    {
      title: "How manual payment verification works on Subly",
      slug: "how-payment-verification-works",
      excerpt: "A transparent look at how we verify payments, the role of AI, and why an admin always has the final say.",
      content:
        "# How manual payment verification works\n\nSubly lets you pay with JazzCash, Easypaisa or bank transfer. Here's what happens after you upload your screenshot:\n\n1. **AI pre-check** — our vision model reads the amount, date and transaction ID from your screenshot.\n2. **Admin review** — an administrator confirms the details manually. AI assists but never decides alone.\n3. **Fulfilment** — the moment your payment is approved, your order is fulfilled and your subscription starts.\n\n## Why this matters\n\nManual verification keeps digital subscriptions affordable in Pakistan where international cards are often unavailable. It also protects both you and us from mistakes and fraud.",
      status: "PUBLISHED",
      tags: ["payments", "guide"],
    },
    {
      title: "How to avoid expiring subscriptions",
      slug: "avoid-expiring-subscriptions",
      excerpt: "Renew early and never lose access with these simple tips.",
      content:
        "# How to avoid expiring subscriptions\n\nWe notify you 7, 3 and 1 day before your subscription expires. To renew:\n\n- Open your dashboard and go to **Subscriptions**.\n- Click **Renew** on the subscription you want to keep.\n- Pay using the same payment flow as your first order.\n\nRenewing early means no downtime and no lost history.",
      status: "PUBLISHED",
      tags: ["subscriptions", "tips"],
    },
  ];
  await db
    .insert(blogPosts)
    .values(
      posts.map((p) => ({
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: p.content,
        status: p.status,
        tags: p.tags,
        publishedAt: new Date(),
        coverImage: null,
        authorId: null,
      })),
    );
  console.log(`Seeded ${posts.length} blog posts.`);

  console.log("\nSeed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });