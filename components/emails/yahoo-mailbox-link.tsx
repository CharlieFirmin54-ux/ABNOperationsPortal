import { ExternalLink, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { YAHOO_MAIL_LOGIN_URL } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

export function YahooMailboxLink({
  className,
  label = "Add Yahoo mailbox",
  appearance = "button",
}: {
  className?: string;
  label?: string;
  appearance?: "button" | "nav";
}) {
  if (appearance === "nav") {
    return (
      <a
        href={YAHOO_MAIL_LOGIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white",
          className
        )}
      >
        <Mail className="size-4" />
        <span className="flex-1">{label}</span>
        <ExternalLink className="size-3.5 opacity-60" />
      </a>
    );
  }

  return (
    <a
      href={YAHOO_MAIL_LOGIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-10 bg-[#6001d2] px-4 text-white hover:bg-[#4b01a8]",
        className
      )}
    >
      <Mail className="size-4" />
      {label}
      <ExternalLink className="size-3.5 opacity-80" />
    </a>
  );
}
