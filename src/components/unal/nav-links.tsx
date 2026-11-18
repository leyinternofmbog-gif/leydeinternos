"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  label: string;
  href: string;
  exact?: boolean;
  // Rutas hijas que tienen su propia entrada en el menú.
  exclude?: string[];
};

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  if (item.exclude?.some((p) => pathname.startsWith(p))) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="unal-menu-links">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="unal-menu-link"
            aria-current={isActive(pathname, item) ? "page" : undefined}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
