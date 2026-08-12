import { Badge } from "@/components/ui/badge";
import BlurText from "@/components/blur-text";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </Badge>
  );
}

export function BlurHeading({
  text,
  className = "",
  align = "left",
  delay = 80,
  as = "h2",
}: {
  text: string;
  className?: string;
  align?: "left" | "center";
  delay?: number;
  as?: "h1" | "h2" | "h3";
}) {
  const Heading = as;
  return (
    <>
      <Heading className="sr-only">{text}</Heading>
      <div aria-hidden="true">
        <BlurText text={text} delay={delay} animateBy="words" direction="top" align={align} className={className} />
      </div>
    </>
  );
}
