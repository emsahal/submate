import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import "./globals.css";

const fontHeading = Manrope({
  variable: "--font-sans-heading",
  subsets: ["latin"],
  display: "swap",
});

const fontBody = Inter({
  variable: "--font-sans-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "SubMate",
    "digital subscriptions Pakistan",
    "Netflix Pakistan",
    "Spotify Pakistan",
    "Canva Pro Pakistan",
    "ChatGPT Pakistan",
    "subscription marketplace Pakistan",
    "JazzCash subscription",
    "Easypaisa subscription",
    "buy Netflix with JazzCash",
    "cheap subscriptions Pakistan",
    "online subscriptions PKR",
    "streaming services Pakistan",
    "YouTube Premium Pakistan",
    "subscription service Karachi Lahore Islamabad",
    "digital marketplace Pakistan",
    "admin verified subscriptions",
    "pay in PKR subscriptions",
  ],
  authors: [{ name: siteConfig.legalName, url: siteConfig.url }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  category: "marketplace",
  alternates: {
    canonical: siteConfig.url,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ["/og-image.png"],
    creator: "@submate_pk",
    site: "@submate_pk",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f6e58" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f0d" },
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  legalName: siteConfig.legalName,
  url: siteConfig.url,
  logo: `${siteConfig.url}/icon.svg`,
  description: siteConfig.description,
  email: siteConfig.supportEmail,
  contactPoint: {
    "@type": "ContactPoint",
    email: siteConfig.supportEmail,
    contactType: "customer support",
    availableLanguage: ["English", "Urdu"],
    areaServed: "PK",
  },
  sameAs: ["https://submate.tech"],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteConfig.url}/subscriptions?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

import { CookieConsent } from "@/components/cookie-consent";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontHeading.variable} ${fontBody.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
          <Toaster richColors position="top-center" />
          <ChatWidget />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
