import Link from "next/link";
import NavLinks from "./nav-links";
import ThemeToggle from "./theme-toggle";

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-orange-200 bg-orange-500 text-white shadow-sm dark:border-orange-800 dark:bg-orange-700">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-6 px-4">
        <Link href="/browse" className="text-lg font-bold tracking-tight">
          HN Browser
        </Link>
        <NavLinks />
        <ThemeToggle />
      </div>
    </nav>
  );
}
