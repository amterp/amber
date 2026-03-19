import { Suspense } from "react";
import BrowseControls from "./browse-controls";
import ResultsList from "./results-list";

export const metadata = {
  title: "Browse - HN Browser",
};

export default function BrowsePage() {
  return (
    <div>
      <Suspense fallback={null}>
        <BrowseControls />
      </Suspense>
      <Suspense fallback={<div className="py-8 text-center text-gray-400">Loading...</div>}>
        <ResultsList />
      </Suspense>
    </div>
  );
}
