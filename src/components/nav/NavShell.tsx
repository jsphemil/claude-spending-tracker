"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { NAV_ICONS } from "./icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="hidden w-[72px] shrink-0 flex-col items-center gap-7 border-r border-border bg-surface py-5 md:flex"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" className="h-4 w-4">
          <path d="M4 15 L9 9 L13 12 L20 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <ul className="flex w-full flex-col items-center gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = NAV_ICONS[item.href];
          return (
            <li key={item.href} className="relative w-full flex justify-center">
              {active && (
                <span className="absolute left-2 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-accent" />
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                aria-label={item.label}
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                  active ? "bg-accent-soft text-accent" : "text-fg-subtle hover:bg-surface-2 hover:text-fg"
                }`}
              >
                {Icon && <Icon />}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />
      <ThemeToggle className="h-9 w-9" />
    </nav>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = NAV_ICONS[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-center text-[10px] font-medium leading-tight ${
              active ? "text-accent" : "text-fg-subtle"
            }`}
          >
            {Icon && <Icon className="h-5 w-5" />}
            <span className="w-full truncate px-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
