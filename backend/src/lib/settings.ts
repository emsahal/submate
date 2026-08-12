import { db } from "../db/index.js";
import { settings } from "../db/schema.js";

export interface SettingsShape {
  storeName: string;
  supportEmail: string;
  currency: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  seo: {
    defaultTitle: string;
    defaultDescription: string;
  };
  order: {
    pendingExpiryHours: number;
    screenshotMaxBytes: number;
    allowedMimeTypes: string[];
  };
  notifications: {
    expiry7d: boolean;
    expiry3d: boolean;
    expiry1d: boolean;
    expired: boolean;
  };
}

const defaults: SettingsShape = {
  storeName: "Subly",
  supportEmail: "support@subly.pk",
  currency: "PKR",
  maintenanceMode: false,
  maintenanceMessage: "We're doing some maintenance. Back soon.",
  seo: {
    defaultTitle: "Affordable Digital Subscriptions in Pakistan | Subly",
    defaultDescription:
      "Discover eligible digital subscription plans, compare options, and manage your subscriptions easily with Subly.",
  },
  order: {
    pendingExpiryHours: 48,
    screenshotMaxBytes: 6 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/jpg"],
  },
  notifications: {
    expiry7d: true,
    expiry3d: true,
    expiry1d: true,
    expired: true,
  },
};

/** Merge stored settings over defaults. Stored values are always JSON. */
export async function getSettings(): Promise<SettingsShape> {
  const rows = await db.select().from(settings);
  const merged = structuredClone(defaults) as unknown as Record<string, unknown>;
  for (const row of rows) {
    const value = row.value as Record<string, unknown>;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      merged[row.key] = { ...(merged[row.key] as object), ...value };
    } else {
      merged[row.key] = value;
    }
  }
  return merged as unknown as SettingsShape;
}

export async function getSetting<K extends keyof SettingsShape>(key: K): Promise<SettingsShape[K]> {
  const all = await getSettings();
  return all[key];
}

export async function setSetting(
  key: string,
  value: unknown,
  updatedBy?: string,
): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: value as Record<string, unknown>, updatedBy: updatedBy ?? null })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: value as Record<string, unknown>, updatedBy: updatedBy ?? null, updatedAt: new Date() },
    });
}

export async function allSettings(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(settings);
  const out: Record<string, unknown> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}