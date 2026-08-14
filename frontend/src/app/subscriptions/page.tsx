import type { Metadata } from "next";
import * as React from "react";
import SubscriptionsPageContent from "./subscriptions-page-client";

export const metadata: Metadata = {
  title: "Premium Subscriptions in Pakistan",
  description: "Browse and buy premium digital subscriptions in Pakistan. Pay in PKR with JazzCash, Easypaisa, or bank transfer. Get verified instantly and receive access on your dashboard.",
};

export default function SubscriptionsPage() {
  return (
    <React.Suspense fallback={null}>
      <SubscriptionsPageContent />
    </React.Suspense>
  );
}
