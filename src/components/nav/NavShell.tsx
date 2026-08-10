"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-6 md:flex">
      <span className="mb-6 px-3 text-base font-semibold text-zinc-900">
        Spending Tracker
      </span>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                isActive(pathname, item.href)
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white md:hidden">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-center text-[10px] font-medium leading-tight ${
            isActive(pathname, item.href) ? "text-zinc-900" : "text-zinc-500"
          }`}
        >
          <span className="w-full truncate px-0.5">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
