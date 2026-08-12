import * as React from "react";

export function NayapayIcon({
  size = 48,
  color = "currentColor",
  strokeWidth = 2,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="24" cy="24" r="21.5"/><path d="M24 14.5a9.5 9.5 0 0 0-9.5 9.5v11.04a.5.5 0 0 0 .742.438l1.412-.78A9.6 9.6 0 0 1 21.3 33.5H24a9.5 9.5 0 0 0 0-19"/>
    </svg>
  );
}
