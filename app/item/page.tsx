import { Suspense } from "react";
import ItemView from "./item-view";
import ThreadSkeleton from "./thread-skeleton";

// Static export can't prerender a route per HN id, so the thread lives at
// /item?id=N and renders client-side. The real title is set from the story once
// it loads.
export const metadata = {
  title: "Thread - Amber",
};

export default function ItemPage() {
  return (
    <Suspense fallback={<ThreadSkeleton />}>
      <ItemView />
    </Suspense>
  );
}
