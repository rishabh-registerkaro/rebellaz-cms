"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Page number that lives in the URL.
 *
 * Every listing in this dashboard paginates, and page number belongs in the
 * address bar: a reload, a back button or a shared link should land on the page
 * the admin was actually looking at, not snap back to the first one.
 *
 * Page 1 is written as *no* parameter rather than "?page=1" — the clean URL is
 * the canonical one, and it keeps the address bar quiet for the common case.
 *
 * Callers must render inside a <Suspense> boundary: useSearchParams() forces
 * the route out of static rendering otherwise.
 */
export function useUrlPagination(param = "page"): {
  page: number;
  goToPage: (next: number) => void;
} {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Seeded once from the URL. After that the component owns the value and
  // pushes it back out, so a re-render mid-navigation cannot reset the page.
  const [page, setPage] = useState(() => {
    const parsed = parseInt(searchParams.get(param) ?? "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });

  const goToPage = useCallback(
    (next: number) => {
      const target = Math.max(1, next);
      setPage(target);

      // Read from window rather than the `searchParams` snapshot so any other
      // query the page carries (a filter, a tab) survives a page change.
      const qs = new URLSearchParams(window.location.search);
      if (target <= 1) qs.delete(param);
      else qs.set(param, String(target));

      const query = qs.toString();
      router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    },
    [param, router]
  );

  return { page, goToPage };
}
