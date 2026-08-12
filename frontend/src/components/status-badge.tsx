import {
  aiVerdictConfig,
  orderStatusConfig,
  paymentStatusConfig,
  reviewStatusConfig,
  subscriptionStatusConfig,
} from "@/config/site";
import { Badge, type BadgeProps } from "@/components/ui/badge";

type Tone = NonNullable<BadgeProps["variant"]>;

function tone(variant: string): BadgeProps["variant"] {
  return (variant || "secondary") as BadgeProps["variant"];
}

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = orderStatusConfig[status] ?? { label: status, tone: "secondary" as Tone };
  return (
    <Badge variant={tone(config.tone)} className={className}>
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = paymentStatusConfig[status] ?? { label: status, tone: "secondary" as Tone };
  return <Badge variant={tone(config.tone)} className={className}>{config.label}</Badge>;
}

export function AiVerdictBadge({ status, className }: { status: string; className?: string }) {
  const config = aiVerdictConfig[status] ?? { label: status, tone: "secondary" as Tone };
  return <Badge variant={tone(config.tone)} className={className}>{config.label}</Badge>;
}

export function SubscriptionStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = subscriptionStatusConfig[status] ?? { label: status, tone: "secondary" as Tone };
  return <Badge variant={tone(config.tone)} className={className}>{config.label}</Badge>;
}

export function ReviewStatusBadge({ status, className }: { status: string; className?: string }) {
  const config = reviewStatusConfig[status] ?? { label: status, tone: "secondary" as Tone };
  return <Badge variant={tone(config.tone)} className={className}>{config.label}</Badge>;
}

export function ToneBadge({ tone: t, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <Badge variant={t} className={className}>
      {label}
    </Badge>
  );
}
