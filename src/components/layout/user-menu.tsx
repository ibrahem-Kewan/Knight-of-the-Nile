"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { logoutAction } from "@/server/actions/auth";
import { LayoutDashboard, LogOut, ChevronDown, User } from "lucide-react";

export function UserMenu({ name, dashboardHref }: { name: string; dashboardHref: string }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
      >
        <User className="h-4 w-4" />
        <span className="hidden max-w-[10ch] truncate sm:inline">{name}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-48 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <Link
            href={dashboardHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
          >
            <LayoutDashboard className="h-4 w-4" /> {t("myDashboard")}
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted"
          >
            <User className="h-4 w-4" /> {t("profile")}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm text-danger hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> {t("logout")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
