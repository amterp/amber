import Link from "next/link";
import NavLinks from "./nav-links";
import ThemeToggle from "./theme-toggle";

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-orange-200 bg-orange-500 text-white shadow-sm dark:border-orange-800 dark:bg-orange-700">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4 sm:gap-6">
        <Link href="/browse" className="text-base font-bold tracking-tight sm:text-lg">
          Amber
        </Link>
        <NavLinks />
        <ThemeToggle />
      </div>
    </nav>
  );
}
