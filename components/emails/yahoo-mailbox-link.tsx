import { Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { YAHOO_MAIL_LOGIN_URL } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

export function YahooMailboxLink({
  className,
  label = "Add Yahoo mailbox",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={YAHOO_MAIL_LOGIN_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-10 bg-[#6001d2] px-4 text-white hover:bg-[#4b01a8]",
        className
      )}
    >
      <Mail className="size-4" />
      {label}
    </a>
  );
}
