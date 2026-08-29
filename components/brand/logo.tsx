import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col items-center", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-xl bg-white",
          compact ? "w-11 p-1" : "w-full p-2"
        )}
      >
        <Image
          src="/abn-logo.png"
          alt="ABN Property Maintenance"
          width={1536}
          height={1024}
          className="h-auto w-full object-contain"
          priority
        />
      </div>
    </div>
  );
}
