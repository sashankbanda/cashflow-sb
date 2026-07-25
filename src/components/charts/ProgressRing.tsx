import { cn } from "@/lib/cn";

export interface ProgressRingProps {
  /** 0..1; values over 1 render as a full ring (overflow styling is the caller's). */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Color via text-* classes (ring strokes currentColor). */
  className?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
}

/** Round-capped progress ring with a quiet track; center slot for content. */
export function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 6,
  className,
  children,
  ...aria
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(progress, 1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      role={aria["aria-label"] ? "img" : undefined}
      aria-label={aria["aria-label"]}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.25, 1, 0.5, 1)" }}
        />
      </svg>
      {children ? (
        <span className="absolute inset-0 flex items-center justify-center">{children}</span>
      ) : null}
    </span>
  );
}
