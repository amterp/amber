"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/browse", label: "Browse" },
  { href: "/highlights", label: "Highlights" },
  { href: "/api-docs", label: "API Docs" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 text-sm font-medium sm:gap-4">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={
            pathname === href
              ? "text-white underline underline-offset-4"
              : "text-orange-100 hover:text-white transition-colors"
          }
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
