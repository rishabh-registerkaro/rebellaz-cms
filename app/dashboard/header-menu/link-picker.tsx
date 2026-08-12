"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, FolderTree, Link2, Pencil, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PICKABLE_GROUPS, type PickablePage } from "@/app/lib/constants/sitePages";
import type { MenuLinkSource } from "@/app/lib/utils/menuTree";

/**
 * One menu entry's link, chosen by searching the site's real pages.
 *
 * Menu entries used to be two free-text boxes — an editor had to know the slug
 * and retype it, and a typo shipped a 404 with nothing to catch it. Here the
 * URL is never typed: it comes from the page that was picked. The label
 * defaults to that page's title and can be overridden, because nav copy is
 * often shorter than a page's own heading ("Decision Intelligence" in the
 * header, "Decision Intelligence for the energy sector" on the page).
 *
 * The escape hatch stays: "custom link" restores hand-typed entry for anything
 * with no page behind it — an external URL, or an anchor on the homepage.
 */
export type LinkValue = {
  title: string;
  url: string;
  page_id?: string | null;
  source?: MenuLinkSource;
};

type LinkPickerProps = {
  value: LinkValue;
  pages: PickablePage[];
  loading?: boolean;
  onChange: (patch: LinkValue) => void;
  /** Shown when nothing is attached yet, e.g. "Choose the page this menu item opens". */
  placeholder?: string;
  /** Deeper levels render tighter, matching the indentation they sit in. */
  size?: "md" | "sm";
  /**
   * Pick a destination only, no label. The CTA button's text is its own field,
   * so offering a second label here would be two inputs for one string.
   */
  urlOnly?: boolean;
};

export function LinkPicker({
  value,
  pages,
  loading = false,
  onChange,
  placeholder = "Choose a page…",
  size = "md",
  urlOnly = false,
}: LinkPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isCustom = value.source === "custom";
  const isLabel = value.source === "label";
  const attachedPage = useMemo(
    () => (value.page_id ? pages.find((page) => page.id === value.page_id) : undefined),
    [pages, value.page_id]
  );

  // Close on an outside click or Escape — the panel overlays the entries below
  // it, and a menu with several rows would otherwise leave two panels open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? pages.filter(
          (page) =>
            page.title.toLowerCase().includes(needle) ||
            page.url.toLowerCase().includes(needle)
        )
      : pages;

    return PICKABLE_GROUPS.map((group) => ({
      group,
      items: matches.filter((page) => page.group === group),
    })).filter((section) => section.items.length > 0);
  }, [pages, query]);

  const selectPage = (page: PickablePage) => {
    onChange({ title: page.title, url: page.url, page_id: page.id, source: "page" });
    setQuery("");
    setOpen(false);
    setRenaming(false);
  };

  // The label survives either switch — an editor who picked the wrong page and
  // wants to point the same entry elsewhere shouldn't have to retype it.
  const useCustomLink = () => {
    onChange({ title: value.title, url: "", page_id: null, source: "custom" });
    setQuery("");
    setOpen(false);
  };

  const useHeadingOnly = () => {
    onChange({ title: value.title, url: "", page_id: null, source: "label" });
    setQuery("");
    setOpen(false);
  };

  const text = size === "sm" ? "text-xs" : "text-sm";
  const height = size === "sm" ? "h-9" : "h-10";

  /* ── Heading only: a label that opens its children ────────────────────── */
  if (isLabel) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={`${text} font-medium text-slate-300`}>
            Heading — opens its children, goes nowhere on click
          </label>
          <Button
            onClick={() => {
              onChange({ ...value, source: "page" });
              setOpen(true);
            }}
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200"
          >
            <Search className="h-3 w-3 mr-1.5" />
            Attach a page instead
          </Button>
        </div>
        <Input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Solutions"
          className={`bg-slate-900/60 border-slate-600 text-white placeholder-slate-400 ${height} ${text}`}
        />
        <p className="text-xs text-slate-500">
          Add child items below — this is what the visitor hovers to open them.
        </p>
      </div>
    );
  }

  /* ── Custom link: two plain fields, as before ─────────────────────────── */
  if (isCustom) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={`${text} font-medium text-slate-300`}>Custom link</label>
          <Button
            onClick={() => {
              onChange({ ...value, source: "page", page_id: null });
              setOpen(true);
            }}
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200"
          >
            <Search className="h-3 w-3 mr-1.5" />
            Pick a page instead
          </Button>
        </div>
        <div className={`grid grid-cols-1 gap-3 ${urlOnly ? "" : "sm:grid-cols-2"}`}>
          {!urlOnly && (
            <Input
              value={value.title}
              onChange={(e) => onChange({ ...value, title: e.target.value })}
              placeholder="Label shown in the menu"
              className={`bg-slate-900/60 border-slate-600 text-white placeholder-slate-400 ${height} ${text}`}
            />
          )}
          <Input
            value={value.url}
            onChange={(e) => onChange({ ...value, url: e.target.value })}
            placeholder="https://… or /a-path"
            className={`bg-slate-900/60 border-slate-600 text-white placeholder-slate-400 ${height} ${text}`}
          />
        </div>
        <p className="text-xs text-slate-500">
          Nothing checks a custom link — a wrong path gives visitors a 404.
        </p>
      </div>
    );
  }

  /* ── Picked page ──────────────────────────────────────────────────────── */
  // A dropdown parent legitimately has a label and no URL, so either half
  // counts as "something is attached" — except when only the URL matters.
  const hasLink = urlOnly ? Boolean(value.url) : Boolean(value.title || value.url);
  // An entry saved before the picker existed, or one whose page was deleted
  // since: the link still works, but there is no page to re-resolve it from.
  const orphaned = hasLink && Boolean(value.page_id) && !attachedPage && !loading;

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div
        className={`flex items-center gap-3 rounded-lg border bg-slate-900/60 px-3 py-2 ${
          hasLink ? "border-slate-600" : "border-dashed border-slate-600"
        }`}
      >
        <div className="min-w-0 flex-1">
          {hasLink ? (
            urlOnly ? (
              <p className={`${text} flex items-center gap-1.5 truncate font-mono text-white`}>
                <Link2 className="h-3 w-3 flex-shrink-0 text-slate-400" />
                {value.url}
              </p>
            ) : (
              <>
                <p className={`${text} font-medium text-white truncate`}>{value.title}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400 truncate font-mono">
                  <Link2 className="h-3 w-3 flex-shrink-0" />
                  {value.url || "no link — dropdown parent"}
                </p>
              </>
            )
          ) : (
            <p className={`${text} text-slate-400`}>{placeholder}</p>
          )}
        </div>

        {attachedPage?.status === "draft" && (
          <span className="flex-shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            Draft
          </span>
        )}

        {hasLink && !urlOnly && (
          <Button
            onClick={() => setRenaming((r) => !r)}
            size="sm"
            variant="ghost"
            title="Rename this entry in the menu"
            className="h-8 w-8 p-0 flex-shrink-0 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          onClick={() => setOpen((o) => !o)}
          size="sm"
          variant="outline"
          className={`flex-shrink-0 !gap-0 border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white ${
            size === "sm" ? "h-8 text-xs" : "h-9 text-xs"
          }`}
        >
          {hasLink ? "Change" : "Choose page"}
          <ChevronDown
            className={`h-3.5 w-3.5 ml-1.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {orphaned && (
        <p className="text-xs text-amber-400">
          The page behind this entry no longer exists. The link still points at{" "}
          <code>{value.url}</code> — pick a page to fix it.
        </p>
      )}

      {renaming && (
        <div className="flex items-center gap-2">
          <Input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Label shown in the menu"
            autoFocus
            className={`bg-slate-900/60 border-slate-600 text-white placeholder-slate-400 ${height} ${text}`}
          />
          {attachedPage && attachedPage.title !== value.title && (
            <Button
              onClick={() => onChange({ ...value, title: attachedPage.title })}
              size="sm"
              variant="ghost"
              className="h-8 flex-shrink-0 text-xs text-slate-400 hover:text-white"
            >
              Reset
            </Button>
          )}
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-slate-700 px-3">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              autoFocus
              className="h-10 w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="flex-shrink-0 text-slate-500 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {loading && <p className="px-3 py-6 text-center text-xs text-slate-500">Loading pages…</p>}

            {!loading && results.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                No page matches “{query}”.
              </p>
            )}

            {results.map((section) => (
              <div key={section.group}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.group}
                </p>
                {section.items.map((page) => {
                  const selected = page.id === value.page_id;
                  return (
                    <button
                      key={page.id}
                      onClick={() => selectPage(page)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-800 ${
                        selected ? "bg-indigo-500/10" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">{page.title}</span>
                        <span className="block truncate font-mono text-[11px] text-slate-500">
                          {page.url}
                        </span>
                      </span>
                      {page.status === "draft" && (
                        <span className="flex-shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
                          Draft
                        </span>
                      )}
                      {selected && <Check className="h-4 w-4 flex-shrink-0 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700">
            {!urlOnly && (
              <button
                onClick={useHeadingOnly}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <FolderTree className="h-3.5 w-3.5" />
                No page — just a heading that opens its children
              </button>
            )}
            <button
              onClick={useCustomLink}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Link2 className="h-3.5 w-3.5" />
              Use a custom link instead — external URL or anchor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
