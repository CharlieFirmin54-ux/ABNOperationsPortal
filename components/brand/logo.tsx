import { cn } from "@/lib/utils";

export function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <svg
        viewBox="0 0 48 48"
        className={cn("text-white", compact ? "size-8" : "size-11")}
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3.5"
          y="3.5"
          width="41"
          height="41"
          rx="8"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M14 23.5 24 14.5l10 9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 22.5V33h13V22.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M22 33v-6.5h4V33"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <p className="mt-2 text-[11px] font-semibold tracking-[0.18em] text-white">
          ABN MAINTENANCE
        </p>
      )}
    </div>
  );
}
