import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  BrainCircuit,
  Briefcase,
  Brush,
  Check,
  ChevronDown,
  Clapperboard,
  Cloud,
  CreditCard,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lock,
  MonitorPlay,
  Music,
  Newspaper,
  Palette,
  Play,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Tv,
} from "lucide-react";
import { api } from "@/lib/api";
import type { PublicCategory, PublicPaymentMethod, PublicProduct } from "@/types/shared";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { HowItWorksTimeline } from "@/components/how-it-works-timeline";
import { VerificationWorkflow } from "@/components/verification-workflow";
import BlurText from "@/components/blur-text";
import { BlurHeading, Eyebrow } from "@/components/section-heading";
import PixelBlast from "@/components/pixel-blast";
import { LogoLoop } from "@/components/logo-loop";
import { BrandLogo } from "@/components/brand-logo";
import { PricingCarousel } from "@/components/pricing-carousel";
import { JazzcashIcon } from "@/components/icons/jazzcash";
import { EasypaisaIcon } from "@/components/icons/easypaisa";
import { NayapayIcon } from "@/components/icons/nayapay";
import { SadapayIcon } from "@/components/icons/sadapay";

export const metadata: Metadata = {
  title: "SubMate — Digital Subscriptions Pakistan",
  description: "SubMate is Pakistan's trusted digital subscription marketplace. Buy Netflix, Spotify, Canva Pro, ChatGPT Premium and other digital subscriptions in Pakistan. Pay in PKR with JazzCash, Easypaisa, or bank transfer.",
};

async function getFeatured(): Promise<{ items: PublicProduct[]; total: number }> {
  try {
    return await api<{ items: PublicProduct[]; total: number }>("/products?sort=newest&limit=8");
  } catch {
    return { items: [], total: 0 };
  }
}

async function getCategories(): Promise<PublicCategory[]> {
  try {
    return await api<PublicCategory[]>("/categories");
  } catch {
    return [];
  }
}

async function getPaymentMethods(): Promise<PublicPaymentMethod[]> {
  try {
    return await api<PublicPaymentMethod[]>("/payment-methods");
  } catch {
    return [];
  }
}

const fallbackMethods: PublicPaymentMethod[] = [
  { id: 1, name: "JazzCash", type: "JAZZCASH", accountDetails: {}, instructions: null, isActive: true },
  { id: 2, name: "Easypaisa", type: "EASYPAISA", accountDetails: {}, instructions: null, isActive: true },
  { id: 3, name: "NayaPay", type: "NAYAPAY", accountDetails: {}, instructions: null, isActive: true },
  { id: 4, name: "UBL Bank", type: "BANK_TRANSFER", accountDetails: {}, instructions: null, isActive: true },
];

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  streaming: Clapperboard,
  music: Music,
  productivity: Briefcase,
  education: GraduationCap,
  gaming: Gamepad2,
  security: ShieldCheck,
  ai: BrainCircuit,
  "artificial-intelligence": BrainCircuit,
  news: Newspaper,
  cloud: Cloud,
  tv: Tv,
  fitness: Dumbbell,
  tools: Wrench,
};

function Wrench(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

const methodMeta: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; desc: string; label: string }
> = {
  JAZZCASH: { icon: JazzcashIcon, desc: "Send instantly from your JazzCash wallet.", label: "Mobile wallet" },
  EASYPAISA: { icon: EasypaisaIcon, desc: "Send instantly from your Easypaisa account.", label: "Mobile wallet" },
  NAYAPAY: { icon: NayapayIcon, desc: "Pay directly from your NayaPay account.", label: "Digital bank" },
  SADAPAY: { icon: SadapayIcon, desc: "Pay directly from your Sadapay account.", label: "Digital bank" },
  BANK_TRANSFER: { icon: Landmark, desc: "Transfer from any Pakistani bank account.", label: "Bank transfer" },
  OTHER: { icon: CreditCard, desc: "Pay the way that works best for you.", label: "Alternative" },
};

const serviceBrands: Array<{ name: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { name: "Netflix", Icon: Clapperboard },
  { name: "Prime Video", Icon: Play },
  { name: "Disney+", Icon: Sparkles },
  { name: "Canva Pro", Icon: Palette },
  { name: "Spotify", Icon: Music },
  { name: "YouTube Premium", Icon: MonitorPlay },
  { name: "ChatGPT", Icon: BrainCircuit },
  { name: "Adobe CC", Icon: Brush },
  { name: "ExpressVPN", Icon: ShieldCheck },
  { name: "Microsoft 365", Icon: Cloud },
  { name: "Coursera Plus", Icon: GraduationCap },
  { name: "Xbox Game Pass", Icon: Gamepad2 },
];

const brandLogos = serviceBrands.map(({ name, Icon }) => ({
  title: name,
  node: (
    <span className="inline-flex items-center gap-3 font-heading text-xl font-bold tracking-tight">
      <Icon className="h-6 w-6 text-primary" />
      {name}
    </span>
  ),
}));

const checks = ["Amount match", "Transaction ID", "Date check", "Readability"];

const dashboardSubs = [
  { name: "Netflix Standard", price: "Rs 1,250", renew: "Aug 12", status: "Active", tone: "success" as const },
  { name: "Spotify Premium", price: "Rs 800", renew: "Sep 02", status: "Active", tone: "success" as const },
  { name: "Canva Pro", price: "Rs 3,400", renew: "Jul 28", status: "Renew soon", tone: "warning" as const },
];

const featuredReview = {
  quote:
    "I never had an international card, so streaming services always felt out of reach. SubMate changed that — I pay with JazzCash and my Netflix is up within minutes. The admin actually confirms the payment before releasing access, which is exactly the trust I was looking for.",
  name: "Ayesha R.",
  role: "Streaming subscriber · Karachi",
  initials: "AR",
  subscription: "Netflix · Monthly",
};

const supportingReviews = [
  {
    quote: "The payment screenshot thing sounded risky, but the human confirmation makes it feel safe and honest.",
    name: "Bilal K.",
    role: "Spotify Premium · Lahore",
    initials: "BK",
  },
  {
    quote: "Renewal reminders saved me from losing Canva mid-project. Three notifications, zero surprises.",
    name: "Fatima S.",
    role: "Canva Pro · Islamabad",
    initials: "FS",
  },
];

const faqs = [
  {
    q: "How do I pay for a subscription?",
    a: "Pick a plan and pay the exact amount via JazzCash, Easypaisa or bank transfer. Upload a screenshot of the transaction and we'll verify it before delivering access.",
  },
  {
    q: "When will I get access?",
    a: "Most orders are confirmed within minutes during working hours. You'll be notified the moment an admin approves your payment, and your access appears on your dashboard.",
  },
  {
    q: "How does AI verification work?",
    a: "AI pre-checks your screenshot for amount match, transaction ID, date and readability. An administrator always makes the final call before access is released.",
  },
  {
    q: "What happens if my payment is rejected?",
    a: "You'll see exactly why it was rejected and can re-upload your proof or request a refund. Nothing is charged without your confirmation.",
  },
  {
    q: "Can I extend or cancel my subscription?",
    a: "Yes — renew early from your dashboard, or simply let a plan expire. We also remind you at 7, 3 and 1 days before renewal.",
  },
  {
    q: "Is my data safe?",
    a: "Credentials are encrypted at rest and shown only to you. We never store card details or share your information with anyone.",
  },
];

export default async function HomePage() {
  const [products, categories, rawMethods] = await Promise.all([
    getFeatured(),
    getCategories(),
    getPaymentMethods(),
  ]);
  const featured = products.items.slice(0, 8);
  const methods = rawMethods.length > 0 ? rawMethods : fallbackMethods;

  const featuredLogos = featured.map((p) => ({
    title: p.name,
    href: `/subscriptions/${p.slug}`,
    node: (
      <span className="inline-flex items-center gap-3 font-heading text-xl font-bold tracking-tight">
        {p.slug !== "netflix"
          ? p.logoUrl
            ? p.logoUrlDark
              ? (
                <>
                  <Image src={p.logoUrl} alt="" width={24} height={24} className="h-6 w-6 object-contain dark:hidden" />
                  <Image src={p.logoUrlDark} alt="" width={24} height={24} className="hidden h-6 w-6 object-contain dark:block" />
                </>
              )
              : (
                <Image src={p.logoUrl} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
              )
            : (
              <BrandLogo slug={p.slug} size={24} className="h-6 w-6" />
            )
          : null}
        {p.name}
      </span>
    ),
  }));

  const methodLogos = methods.map((m) => {
    const meta = methodMeta[m.type] ?? methodMeta.OTHER;
    const Icon = meta.icon;
    return {
      title: m.name,
      node: (
        <span className="inline-flex items-center gap-3 font-heading text-xl font-bold tracking-tight">
          <Icon className="h-6 w-6 text-primary" />
          {m.name}
        </span>
      ),
    };
  });

  return (
    <>
      {/* ── 1 · Hero ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[65vh] items-center overflow-hidden border-b border-border bg-background pt-4">
        {/* PixelBlast background */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-70">
          <PixelBlast
            variant="circle"
            pixelSize={4}
            color="#14b8a6"
            patternScale={2.5}
            patternDensity={1.15}
            pixelSizeJitter={0.4}
            enableRipples={false}
            liquid={false}
            speed={0.55}
            edgeFade={0.35}
            transparent
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-12 pt-6 text-center sm:pb-16 lg:pb-20 lg:pt-10">
          <Reveal delay={0} immediate>
            <div className="flex justify-center">
              <Eyebrow>Human-verified local payments</Eyebrow>
            </div>
          </Reveal>
          <h1 className="sr-only mt-5">Digital subscriptions, simplified for Pakistan</h1>
          <div aria-hidden="true">
            <BlurText
              text="Digital subscriptions, simplified for Pakistan"
              delay={120}
              animateBy="words"
              direction="bottom"
              align="center"
              className="display-hero mt-6"
            />
          </div>

          <Reveal delay={250} immediate>
            <p className="lead-lg mx-auto mt-7 max-w-xl text-muted-foreground">
              Discover eligible plans for streaming, music, productivity and more. Pay with JazzCash, Easypaisa or
              bank transfer — then get verified by a human and your access lands on your dashboard, fast.
            </p>
          </Reveal>

          <Reveal delay={350} immediate>
            <form
              action="/subscriptions"
              className="hero-search-form card-shadow mx-auto mt-9 flex max-w-xl items-center gap-2 rounded-xl border border-border bg-card p-1.5 pl-4"
            >
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                name="q"
                type="search"
                placeholder="Search Netflix, Spotify, Canva…"
                className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Search subscriptions"
              />
              <Button type="submit" size="lg" className="shrink-0">
                Search
              </Button>
            </form>
          </Reveal>

          <Reveal delay={450} immediate>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 text-[15px] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" /> Admin-verified payments
              </span>
              <span className="inline-flex items-center gap-2">
                <Banknote className="h-4.5 w-4.5 text-primary" /> Pay in PKR
              </span>
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-primary" /> Encrypted delivery
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 1.5 · Services marquee ───────────────────────────── */}
      <section className="border-b border-border bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <Reveal>
              <div className="flex justify-center">
                <Eyebrow>Featured apps</Eyebrow>
              </div>
            </Reveal>
            <BlurHeading
              text="Plans for the apps you love"
              className="display-xl mt-5"
              align="center"
            />
            <Reveal delay={150}>
              <p className="lead mx-auto mt-4 max-w-xl text-muted-foreground">
                Streaming, music, design and productivity — the services Pakistan subscribes to most.
              </p>
            </Reveal>
          </div>
          <LogoLoop
            logos={featuredLogos.length > 0 ? featuredLogos : brandLogos}
            speed={48}
            direction="left"
            logoHeight={24}
            gap={52}
            hoverSpeed={0}
            scaleOnHover
            fadeOut
            fadeOutColor="var(--background)"
            ariaLabel="Popular subscription services"
          />
        </div>
      </section>

      {/* ── 2 · Stats ────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:py-16 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
          <Reveal delay={0} className="md:px-10">
            <p className="stat-number">
              <CountUp value={featured.length} suffix="+" />
            </p>
            <p className="mt-3 text-lg font-semibold tracking-tight">Plans to compare</p>
            <p className="mt-1.5 max-w-xs text-muted-foreground">Verified subscriptions, ready to activate.</p>
          </Reveal>
          <Reveal delay={120} className="md:px-10">
            <p className="stat-number">
              <CountUp value={methods.length} />
            </p>
            <p className="mt-3 text-lg font-semibold tracking-tight">Local payment methods</p>
            <p className="mt-1.5 max-w-xs text-muted-foreground">JazzCash, Easypaisa and bank transfer.</p>
          </Reveal>
          <Reveal delay={240} className="md:px-10">
            <p className="stat-number text-gradient">PKR</p>
            <p className="mt-3 text-lg font-semibold tracking-tight">Pricing designed for Pakistan</p>
            <p className="mt-1.5 max-w-xs text-muted-foreground">Everything priced in rupees, shown up front.</p>
          </Reveal>
        </div>
      </section>

      {/* ── 3 · Payments — standardized ────────────────────────── */}
      <section className="section-pad border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Reveal>
              <div className="flex justify-center">
                <Eyebrow>Local payments</Eyebrow>
              </div>
            </Reveal>
            <BlurHeading
              text="Pay your way with local payments"
              className="display-xl mt-5"
              align="center"
            />
            <Reveal delay={200}>
              <p className="lead mx-auto mt-4 max-w-xl text-muted-foreground">
                No international credit card? No problem. Fund your subscriptions in rupees via the wallets Pakistan already trusts, with a human confirming every transaction.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <Badge variant="secondary" className="gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> No card required
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <Banknote className="h-3.5 w-3.5" /> PKR pricing
                </Badge>
                <Badge variant="secondary" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Manually verified
                </Badge>
              </div>
            </Reveal>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {methods.map((m, i) => {
              const meta = methodMeta[m.type] ?? methodMeta.OTHER;
              const Icon = meta.icon;
              return (
                <Reveal key={m.id ?? m.name} delay={i * 100}>
                  <div
                    className={`payment-method-card fill-card card-bubble card-lift group flex items-center gap-5 rounded-2xl border bg-card p-6 ${
                      i === 0 ? "border-primary/30 shadow-[0_0_0_1px_var(--primary)]" : "border-border"
                    }`}
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-lg font-bold tracking-tight">{m.name}</h3>
                        <Badge variant={i === 0 ? "default" : "secondary"}>{i === 0 ? "Most used" : "Active"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{meta.desc}</p>
                    </div>
                    <BadgeCheck className="h-5 w-5 shrink-0 text-success" />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* LogoLoop — payment methods marquee */}
        <Reveal delay={200}>
          <div className="mt-20 border-y border-border py-12">
            <div className="mx-auto mb-9 max-w-2xl text-center">
              <Reveal>
                <div className="flex justify-center">
                  <Eyebrow>Supported Wallets</Eyebrow>
                </div>
              </Reveal>
              <BlurHeading
                text="Trusted local payment methods"
                className="display-xl mt-5"
                align="center"
              />
              <Reveal delay={150}>
                <p className="lead mx-auto mt-4 max-w-xl text-muted-foreground">
                  Send payments securely via JazzCash, Easypaisa, NayaPay or direct bank transfer.
                </p>
              </Reveal>
            </div>
            <LogoLoop
              logos={methodLogos}
              speed={55}
              direction="left"
              logoHeight={26}
              gap={56}
              hoverSpeed={0}
              scaleOnHover
              fadeOut
              fadeOutColor="var(--background)"
              ariaLabel="Local payment methods"
            />
          </div>
        </Reveal>
      </section>

      {/* ── 4 · Popular subscriptions ────────────────────────── */}
      <section className="section-pad border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Reveal>
                <Eyebrow>Curated for you</Eyebrow>
              </Reveal>
              <BlurHeading text="Popular subscriptions" className="display-2xl mt-5" />
              <Reveal delay={200}>
                <p className="lead-lg mt-5 max-w-xl text-muted-foreground">
                  Verified, ready to activate and priced in rupees. Every plan is checked by a person before it is
                  listed.
                </p>
              </Reveal>
            </div>
            <Reveal delay={200}>
              <Button asChild variant="ghost" size="lg" className="shrink-0">
                <Link href="/subscriptions">
                  View all subscriptions <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
          </div>

          {categories.length > 0 ? (
            <Reveal delay={120}>
              <div className="mt-9 flex flex-wrap gap-2">
                <Link
                  href="/categories"
                  className="rounded-full border border-primary/40 bg-card px-4 py-1.5 text-sm font-medium text-primary"
                >
                  All
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/categories/${c.slug}`}
                    className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </Reveal>
          ) : null}

          {featured.length === 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product, i) => (
                <Reveal key={product.id} delay={(i % 4) * 80}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 5 · How it works — timeline ──────────────────────── */}
      <section className="section-pad mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Reveal>
            <Eyebrow>Simple by design</Eyebrow>
          </Reveal>
          <BlurHeading text="From plan to access in four steps" className="display-2xl mt-5" align="center" />
          <Reveal delay={200}>
            <p className="lead-lg mx-auto mt-5 max-w-xl text-muted-foreground">
              No international card, no complicated setup — just your money, verified by people.
            </p>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <HowItWorksTimeline />
        </Reveal>
      </section>

      {/* ── 6 · AI verification ──────────────────────────────── */}
      <section className="section-pad border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20">
            <div>
              <Reveal>
                <Eyebrow>AI-assisted review</Eyebrow>
              </Reveal>
              <BlurHeading text="AI helps. Humans decide." className="display-2xl mt-5 max-w-xl" />
              <Reveal delay={200}>
                <p className="lead-lg mt-6 max-w-lg text-muted-foreground">
                  Every payment screenshot is pre-analysed by AI to catch obvious issues. Then a real administrator
                  makes the final call — no algorithm decides alone whether you get your access.
                </p>
              </Reveal>

              <Reveal delay={300}>
                <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {checks.map((c) => (
                    <div
                      key={c}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-[15px] font-medium"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10 text-success">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {c}
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={400}>
                <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Average review time — under 15 minutes during
                  working hours.
                </p>
              </Reveal>
            </div>

            <Reveal delay={150}>
              <VerificationWorkflow />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 7 · Why SubMate — asymmetric ───────────────────────── */}
      <section className="section-pad mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>Why {siteConfig.name}</Eyebrow>
          </Reveal>
          <BlurHeading text="Built around trust and speed" className="display-2xl mt-5" />
          <Reveal delay={200}>
            <p className="lead-lg mt-5 max-w-xl text-muted-foreground">
              A marketplace that treats your payment like a handshake — checked, then honoured.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {/* Large — encrypted delivery */}
          <Reveal delay={0} className="lg:col-span-2 lg:row-span-2">
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 card-shadow sm:p-10">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Encrypted at rest
                </Badge>
              </div>
              <h3 className="mt-7 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Encrypted delivery</h3>
              <p className="lead-lg mt-4 max-w-lg text-muted-foreground">
                Access links and codes are encrypted at rest and revealed only to you on your dashboard. Nothing is
                handed over to anyone else — ever.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                  <Lock className="h-4 w-4" /> Locked
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-4 py-2 text-sm font-medium text-primary">
                  <ShieldCheck className="h-4 w-4" /> Verified
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success">
                  <KeyRound className="h-4 w-4" /> Access revealed
                </span>
              </div>
            </div>
          </Reveal>

          {/* Small — local payments */}
          <Reveal delay={100}>
            <div className="card-bubble flex h-full flex-col rounded-2xl border border-border bg-card p-7 card-shadow">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted text-primary">
                <Banknote className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight">Local payments, PKR prices</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                JazzCash, Easypaisa and bank transfer — everything priced in rupees, no card required.
              </p>
              <span className="mt-5 inline-flex w-fit rounded-lg bg-primary/10 px-3 py-1 font-heading text-sm font-bold text-primary">
                Rs prices
              </span>
            </div>
          </Reveal>

          {/* Small — expiry reminders */}
          <Reveal delay={200}>
            <div className="card-bubble flex h-full flex-col rounded-2xl border border-border bg-card p-7 card-shadow">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted text-primary">
                <Timer className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight">Expiry reminders</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Never lose access unexpectedly — we remind you before renewal.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="secondary">7 days</Badge>
                <Badge variant="secondary">3 days</Badge>
                <Badge variant="warning">1 day</Badge>
              </div>
            </div>
          </Reveal>

          {/* Small — track everything */}
          <Reveal delay={300} className="lg:col-span-3">
            <div className="card-bubble flex flex-col gap-6 rounded-2xl border border-border bg-card p-7 card-shadow sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-primary">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Track everything from one dashboard</h3>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                    Follow your order from submission to fulfilment, reveal credentials and check renewal dates — all in
                    one place.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="lg" className="shrink-0">
                <Link href="/dashboard">
                  Open dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 8 · Dashboard showcase ───────────────────────────── */}
      <section className="section-pad border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Reveal>
              <Eyebrow>Your control centre</Eyebrow>
            </Reveal>
            <BlurHeading text="Track everything from one dashboard" className="display-2xl mt-5" align="center" />
            <Reveal delay={200}>
              <p className="lead-lg mx-auto mt-5 max-w-xl text-muted-foreground">
                Active subscriptions, payment status, verification, renewal dates and access — organised, real-time and
                always yours.
              </p>
            </Reveal>
          </div>

          <Reveal delay={150}>
            <div className="relative mx-auto max-w-5xl">
              <div className="animate-float-soft absolute -top-5 right-10 z-10 flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium card-shadow">
                <Bell className="h-3.5 w-3.5 text-primary" /> Renews in 7 days
              </div>
              <div
                className="animate-float-soft-slow absolute -bottom-5 left-10 z-10 flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium card-shadow"
                style={{ animationDelay: "-3s" }}
              >
                <BadgeCheck className="h-3.5 w-3.5 text-success" /> Payment verified · Rs 1,250
              </div>

              <div className="card-shadow overflow-hidden rounded-2xl border border-border bg-card">
                {/* App header bar */}
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
                  <span className="font-heading text-sm font-semibold tracking-tight">Your dashboard</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Access ready
                  </span>
                </div>

                <div className="grid sm:grid-cols-[200px_1fr]">
                  {/* Sidebar */}
                  <div className="hidden border-r border-border bg-muted/20 p-5 sm:block">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Menu
                    </p>
                    <nav className="mt-3 space-y-1">
                      {[
                        { label: "Dashboard", active: true },
                        { label: "Orders", active: false },
                        { label: "Subscriptions", active: false },
                        { label: "Notifications", active: false },
                        { label: "Profile", active: false },
                      ].map((item) => (
                        <span
                          key={item.label}
                          className={`block rounded-md px-3 py-2 text-sm ${
                            item.active ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {item.label}
                        </span>
                      ))}
                    </nav>
                  </div>

                  {/* Main */}
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading text-xl font-bold tracking-tight">Welcome back, Ayesha</p>
                        <p className="text-sm text-muted-foreground">Here's what's happening with your access.</p>
                      </div>
                      <Badge variant="secondary" className="hidden sm:inline-flex">
                        Account verified
                      </Badge>
                    </div>

                    <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {[
                        { label: "Active subscriptions", value: "3", tone: "text-primary" },
                        { label: "Next renewal", value: "Aug 12", tone: "text-foreground" },
                        { label: "Verification", value: "Approved", tone: "text-success" },
                        { label: "Access", value: "Encrypted", tone: "text-foreground" },
                      ].map((t) => (
                        <div key={t.label} className="rounded-xl border border-border bg-muted/20 px-4 py-4">
                          <p className="text-xs text-muted-foreground">{t.label}</p>
                          <p className={`mt-1.5 font-heading text-lg font-bold tracking-tight ${t.tone}`}>{t.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 overflow-hidden rounded-xl border border-border">
                      <div className="grid grid-cols-[1.4fr_0.7fr_0.8fr_auto] gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Subscription</span>
                        <span>Price</span>
                        <span>Renewal</span>
                        <span className="text-right">Status</span>
                      </div>
                      {dashboardSubs.map((s) => (
                        <div
                          key={s.name}
                          className="grid grid-cols-[1.4fr_0.7fr_0.8fr_auto] items-center gap-2 border-b border-border px-4 py-3.5 text-sm last:border-0"
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className="font-heading font-bold">{s.price}</span>
                          <span className="text-muted-foreground">{s.renew}</span>
                          <span className="text-right">
                            <Badge variant={s.tone === "success" ? "success" : "warning"}>{s.status}</Badge>
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1.5">
                        <Bell className="h-3.5 w-3.5" /> 7-day reminder
                      </Badge>
                      <Badge variant="outline" className="gap-1.5">
                        <Lock className="h-3.5 w-3.5" /> Credentials encrypted
                      </Badge>
                      <Badge variant="outline" className="gap-1.5">
                        <KeyRound className="h-3.5 w-3.5" /> Revealed to you only
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 9 · Reviews — editorial ──────────────────────────── */}
      <section className="section-pad mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>Reviews</Eyebrow>
          </Reveal>
          <BlurHeading text="Trusted across Pakistan" className="display-2xl mt-5" />
          <Reveal delay={200}>
            <p className="lead-lg mt-5 max-w-xl text-muted-foreground">
              Real subscribers, real access, no credit card required.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <Reveal delay={100} className="lg:col-span-2">
            <figure className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-8 card-shadow sm:p-10">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/70 blur-3xl" />
              <div>
                <Quote className="h-8 w-8 text-primary/40" />
                <blockquote className="mt-6 max-w-2xl font-heading text-xl font-semibold leading-relaxed tracking-tight text-foreground/90 sm:text-2xl">
                  “{featuredReview.quote}”
                </blockquote>
              </div>
              <figcaption className="mt-8 flex items-center gap-4 border-t border-border pt-6">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted font-heading text-lg font-bold">
                  {featuredReview.initials}
                </span>
                <div className="flex-1">
                  <p className="text-base font-semibold">{featuredReview.name}</p>
                  <p className="text-sm text-muted-foreground">{featuredReview.role}</p>
                </div>
                <Badge variant="success" className="hidden sm:inline-flex">
                  {featuredReview.subscription}
                </Badge>
              </figcaption>
            </figure>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            {supportingReviews.map((r, i) => (
              <Reveal key={r.name} delay={200 + i * 100}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-7 card-shadow">
                  <blockquote className="flex-1 text-[17px] leading-relaxed text-foreground/85">“{r.quote}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted font-heading text-sm font-bold">
                      {r.initials}
                    </span>
                    <span>
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.role}</p>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10 · Pricing ──────────────────────────────────────── */}
      <section className="border-b border-border bg-background py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <h2 className="text-center font-heading font-medium text-4xl tracking-[-0.04em] sm:text-[2.75rem]">
              Pricing that makes sense
            </h2>
            <p className="mt-3 text-center text-xl text-muted-foreground -tracking-[0.01em] md:text-2xl">
              Choose a plan that fits your needs with no hidden costs
            </p>
          </Reveal>

          {featured.length === 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </div>
          ) : (
            <PricingCarousel products={featured} />
          )}
        </div>
      </section>

      {/* ── 11 · FAQ — split ─────────────────────────────────── */}
      <section className="section-pad border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div className="self-start lg:sticky lg:top-24">
              <Reveal>
                <Eyebrow>FAQ</Eyebrow>
              </Reveal>
              <BlurHeading text="Frequently asked questions" className="display-2xl mt-5" />
              <Reveal delay={200}>
                <p className="lead-lg mt-5 max-w-md text-muted-foreground">
                  Everything about paying, verification and access — answered plainly.
                </p>
              </Reveal>
              <Reveal delay={300}>
                <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Your credentials are encrypted at rest and never shared with anyone.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={400}>
                <Button asChild variant="ghost" size="lg" className="mt-5 px-0">
                  <Link href="/faq">
                    Read the full FAQ <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Reveal>
            </div>

            <Reveal delay={150} className="border-t border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group border-b border-border">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden sm:text-lg">
                    {f.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="pb-6 text-[15px] leading-relaxed text-muted-foreground sm:text-base">{f.a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 12 · Final CTA ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute left-[8%] top-1/3 hidden w-40 rounded-lg border border-border/60 bg-card/60 p-3 opacity-40 lg:block">
            <p className="text-sm font-bold">Rs 1,250</p>
            <p className="text-xs text-muted-foreground">Netflix · Monthly</p>
          </div>
          <div className="absolute right-[10%] top-1/4 hidden w-36 rounded-lg border border-border/60 bg-card/60 p-3 opacity-40 lg:block">
            <p className="flex items-center gap-1.5 text-sm font-bold text-success">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </p>
            <p className="text-xs text-muted-foreground">Payment confirmed</p>
          </div>
          <div className="absolute bottom-1/4 left-[16%] hidden w-32 rounded-lg border border-border/60 bg-card/60 p-3 opacity-30 lg:block">
            <p className="text-sm font-bold">JazzCash</p>
            <p className="text-xs text-muted-foreground">Instant</p>
          </div>
        </div>

        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <Reveal>
            <Eyebrow>Ready when you are</Eyebrow>
          </Reveal>
          <BlurHeading text="Your next subscription starts here" className="display-2xl mt-6" align="center" />
          <Reveal delay={200}>
            <p className="lead-lg mx-auto mt-6 max-w-xl text-muted-foreground">
              Browse the catalog, choose a plan and pay the way that works for you. We'll handle the verification from
              screenshot to access.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-foreground! text-background! hover:bg-foreground/90!">
                <Link href="/subscriptions">
                  <Search className="h-4 w-4" /> Browse subscriptions
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/faq">
                  How it works <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <p className="mt-9 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
              JazzCash · Easypaisa · Bank Transfer
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
