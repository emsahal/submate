"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type LogoLoopLogo = {
  node?: React.ReactNode;
  title?: string;
  href?: string;
};

type LogoLoopProps = {
  logos: LogoLoopLogo[];
  speed?: number;
  direction?: "left" | "right";
  logoHeight?: number;
  gap?: number;
  hoverSpeed?: number;
  scaleOnHover?: boolean;
  fadeOut?: boolean;
  fadeOutColor?: string;
  ariaLabel?: string;
  className?: string;
};

export function LogoLoop({
  logos,
  speed = 80,
  direction = "left",
  logoHeight = 28,
  gap = 32,
  hoverSpeed = 0,
  scaleOnHover = false,
  fadeOut = false,
  fadeOutColor,
  ariaLabel = "Logo loop",
  className,
}: LogoLoopProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const speedRef = React.useRef(speed);
  const hoverSpeedRef = React.useRef(hoverSpeed);
  const hoverRef = React.useRef(false);
  const repsRef = React.useRef(4);
  const [reps, setReps] = React.useState(4);

  speedRef.current = speed;
  hoverSpeedRef.current = hoverSpeed;

  // Repeat the list until it comfortably fills the container so the
  // marquee never shows empty gaps, even when only a few logos exist.
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const measure = () => {
      const list = track.querySelector(".logoloop__list");
      if (!list) return;
      const listW = list.getBoundingClientRect().width;
      const containerW = container.clientWidth;
      if (listW <= 0) return;
      const needed = Math.max(2, Math.ceil(containerW / listW) + 1);
      setReps((prev) => (prev === needed ? prev : needed));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [logos]);

  React.useLayoutEffect(() => {
    repsRef.current = reps;
  }, [reps]);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    let last = performance.now();
    let x = 0;
    const dir = direction === "left" ? -1 : 1;

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = hoverRef.current ? hoverSpeedRef.current : speedRef.current;
      x += target * dir * dt;
      const step = track.scrollWidth / repsRef.current;
      if (step > 0) {
        if (x <= -step) x += step;
        if (x >= step) x -= step;
        track.style.transform = `translate3d(${x}px, 0, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [direction]);

  const renderList = (key: number, ariaHidden: boolean) => (
    <div className="logoloop__list" aria-hidden={ariaHidden || undefined} key={key}>
      {logos.map((logo, i) => (
        <div className="logoloop__item" key={i}>
          {logo.href ? (
            <a className="logoloop__link" href={logo.href}>
              {logo.node ?? logo.title}
            </a>
          ) : (
            <span className="logoloop__node">{logo.node ?? logo.title}</span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "logoloop",
        scaleOnHover && "logoloop--scale-hover",
        fadeOut && "logoloop--fade",
        className,
      )}
      style={
        {
          "--logoloop-gap": `${gap}px`,
          "--logoloop-logoHeight": `${logoHeight}px`,
          ...(fadeOutColor ? { "--logoloop-fadeColor": fadeOutColor } : {}),
        } as React.CSSProperties
      }
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
    >
      <div ref={trackRef} className="logoloop__track" aria-label={ariaLabel}>
        {Array.from({ length: reps }).map((_, i) => renderList(i, i > 0))}
      </div>
    </div>
  );
}
