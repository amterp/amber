"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ItemNotFoundError } from "@/lib/algolia";
import { renderHnHtml } from "@/lib/comment-html";
import { loadThread } from "@/lib/hn-item";
import { headerFromSubmission, recallSubmission } from "@/lib/seen-store";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";
import { Thread } from "@/lib/types";
import ArticlePane from "./article-pane";
import CommentThread from "./comment-thread";
import StoryHeaderBar, { ItemViewMode } from "./story-header";
import ThreadSkeleton from "./thread-skeleton";

type Status = "loading" | "ready" | "missing" | "error";

interface LoadState {
  key: string;
  status: Status;
  thread: Thread | null;
}

export default function ItemView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const coarse = useCoarsePointer();

  const [retryKey, setRetryKey] = useState(0);
  const [loaded, setLoaded] = useState<LoadState>({
    key: "",
    status: "loading",
    thread: null,
  });

  // Which request the stored result belongs to. Deriving "loading" from a key
  // mismatch, rather than resetting state in an effect, means the previous
  // story's comments can never flash under a new story's header.
  const requestKey = `${id}:${retryKey}`;
  const view: LoadState =
    loaded.key === requestKey
      ? loaded
      : { key: requestKey, status: "loading", thread: null };
  const { status, thread } = view;

  // Reading the seen store during render lets the real title paint on the first
  // frame rather than after the comment fetch. Safe against hydration: the store
  // is empty on a fresh load, so server and client agree.
  const placeholder = useMemo(() => {
    const sub = recallSubmission(id);
    return sub ? headerFromSubmission(sub) : null;
  }, [id]);

  useEffect(() => {
    if (!id) {
      router.replace("/browse");
      return;
    }

    let cancelled = false;

    loadThread(id)
      .then((result) => {
        if (cancelled) return;
        if (result.kind === "comment") {
          router.replace(`/item?id=${result.storyId}#c${result.commentId}`);
          return;
        }
        setLoaded({ key: requestKey, status: "ready", thread: result.thread });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoaded({
          key: requestKey,
          status: err instanceof ItemNotFoundError ? "missing" : "error",
          thread: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id, requestKey, router]);

  const story = thread?.story ?? placeholder;

  useEffect(() => {
    if (!story?.title) return;
    document.title = `${story.title} - Amber`;
  }, [story?.title]);

  const viewMode: ItemViewMode =
    coarse && searchParams.get("view") === "article" ? "article" : "comments";

  const setViewMode = useCallback(
    (next: ItemViewMode) => {
      const params = new URLSearchParams(searchParams);
      if (next === "article") params.set("view", "article");
      else params.delete("view");
      // replace, not push: the toggle is a tab, so Back should return to the
      // list rather than walk through view changes.
      router.replace(`/item?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // A mouse user landing on ?view=article (a shared link, say) gets the
  // comments, and the URL is corrected so it stops claiming otherwise.
  useEffect(() => {
    if (coarse || searchParams.get("view") !== "article") return;
    const params = new URLSearchParams(searchParams);
    params.delete("view");
    router.replace(`/item?${params.toString()}`, { scroll: false });
  }, [coarse, searchParams, router]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/browse");
  }, [router]);

  const selfText = useMemo(
    () => renderHnHtml(thread?.story.text ?? null),
    [thread]
  );

  if (!id) return null;

  return (
    <div>
      <StoryHeaderBar
        story={story}
        coarse={coarse}
        view={viewMode}
        onViewChange={setViewMode}
        onBack={goBack}
      />

      {viewMode === "article" ? (
        <ArticlePane
          url={story?.url ?? null}
          title={story?.title ?? "Article"}
          domain={story?.domain ?? null}
          onShowComments={() => setViewMode("comments")}
        />
      ) : (
        <div className="mx-auto max-w-5xl px-4 py-4">
          {selfText && (
            <div
              className="hn-text mb-4 border-b border-gray-100 pb-4 text-gray-800 dark:border-gray-800 dark:text-gray-200"
              dangerouslySetInnerHTML={{ __html: selfText }}
            />
          )}

          {status === "loading" && <ThreadSkeleton />}

          {status === "missing" && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Story not found.
              </p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                This item may have been deleted, or the ID is wrong.
              </p>
              <button
                type="button"
                onClick={() => router.push("/browse")}
                className="mt-4 text-sm text-orange-600 hover:underline dark:text-orange-400"
              >
                Back to browse
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="py-12 text-center">
              <p className="mb-2 text-sm text-red-500 dark:text-red-400">
                Couldn&apos;t load this thread.
              </p>
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="text-sm text-orange-600 hover:underline dark:text-orange-400"
              >
                Try again
              </button>
            </div>
          )}

          {status === "ready" && thread && (
            <CommentThread thread={thread} articleUrl={thread.story.url} />
          )}
        </div>
      )}

      {/* One-thumb swap, so switching never means reaching for the header. */}
      {coarse && story?.url && (
        <button
          type="button"
          onClick={() =>
            setViewMode(viewMode === "article" ? "comments" : "article")
          }
          className="fixed bottom-4 right-4 z-40 rounded-full bg-gray-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm dark:bg-gray-100/90 dark:text-gray-900"
        >
          {viewMode === "article"
            ? `Comments${story.commentCount ? ` (${story.commentCount})` : ""}`
            : "Article"}
        </button>
      )}
    </div>
  );
}
