import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  href,
  actionLabel,
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** When set, the whole card becomes a link to that section. */
  href?: string;
  /** Visually-hidden text appended to the link for screen readers (e.g. "View details"). */
  actionLabel?: string;
}) {
  const body = (
    <Card className={cn("h-full", href && "transition-colors group-hover:border-gold/60 group-hover:bg-muted/40")}>
      <CardContent className="flex h-full items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className={cn("text-sm text-muted-foreground", href && "group-hover:text-foreground")}>{label}</p>
          <p className="mt-1 font-display text-3xl text-gold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {href && (
          <ArrowLeft
            aria-hidden
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-gold ltr:rotate-180 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
          />
        )}
      </CardContent>
    </Card>
  );

  if (!href) return body;

  return (
    <Link
      href={href}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {body}
      {actionLabel && <span className="sr-only">{actionLabel}</span>}
    </Link>
  );
}
