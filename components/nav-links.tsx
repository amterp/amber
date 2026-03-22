"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

const allLinks = [
  { href: "/browse", label: "Browse" },
  { href: "/highlights", label: "Highlights" },
  { href: "/api-docs", label: "API Docs" },
];

const links = isStaticExport
  ? allLinks.filter((l) => l.href !== "/api-docs")
  : allLinks;

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2 text-sm font-medium sm:gap-4">
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
      <span className="text-orange-300 dark:text-orange-400">|</span>
      <a
        href="https://hn.algolia.com/api"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-orange-200 hover:text-white transition-colors dark:text-orange-300"
      >
        Powered by Algolia
      </a>
    </div>
  );
}
