import Link from "next/link";
import ThemeToggle from "./theme-toggle";

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-orange-200 bg-orange-500 text-white shadow-sm dark:border-orange-800 dark:bg-orange-700">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          HN Browser
        </Link>
        <div className="flex gap-4 text-sm font-medium">
          <Link href="/browse" className="hover:text-orange-100 transition-colors">
            Browse
          </Link>
          <Link href="/monthly" className="hover:text-orange-100 transition-colors">
            Monthly
          </Link>
          <Link href="/api" className="hover:text-orange-100 transition-colors">
            API Docs
          </Link>
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
}
