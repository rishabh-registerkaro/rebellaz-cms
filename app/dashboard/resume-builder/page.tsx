"use client";

import { useEffect, useState } from "react";
import ServicePageForm, {
  normalizeContent,
  type ServicePageFormData,
} from "../services/service-page-form";

/**
 * Resume Builder — the /resume-builder page on the website.
 *
 * There is exactly one of these, so it gets its own screen rather than sitting
 * in the Services list: a page that can only ever exist once does not belong in
 * a list of things you create many of, and an editor could otherwise delete it
 * from a screen that has nothing to do with it.
 *
 * It is stored as a ServicePage with template "resume-builder" (the document is
 * already a hero plus ordered sections with a working editor), so it reuses
 * ServicePageForm — just pinned to the one slug instead of taking it from the
 * URL.
 */

const SLUG = "resume-builder";

function Loading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-9 w-64 bg-slate-700 rounded animate-pulse" />
        <div className="h-40 bg-slate-800/60 rounded-2xl animate-pulse" />
        <div className="h-72 bg-slate-800/60 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

export default function ResumeBuilderPage() {
  const [initialData, setInitialData] = useState<ServicePageFormData | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/services/${SLUG}`, { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.message || "Failed to load the Resume Builder page.");
          return;
        }
        const page = data.data;
        setInitialData({
          slug: page.slug ?? SLUG,
          template: page.template ?? "resume-builder",
          metaTitle: page.metaTitle ?? "",
          metaDescription: page.metaDescription ?? "",
          content: normalizeContent(page.content),
        });
        setStatus(page.status === "published" ? "published" : "draft");
      } catch {
        if (!cancelled) setError("Failed to load the Resume Builder page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6 flex items-center justify-center">
        <p className="text-slate-300 text-center">{error}</p>
      </div>
    );
  }

  if (!initialData) return <Loading />;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
          <p className="text-slate-400 flex flex-wrap items-center gap-2">
            The <code className="text-indigo-300">/resume-builder</code> page
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                status === "published"
                  ? "bg-green-500/20 text-green-300"
                  : "bg-yellow-500/20 text-yellow-300"
              }`}
            >
              {status === "published" ? "Published" : "Draft"}
            </span>
          </p>
          {/* Uses --rl-* tokens directly rather than amber-*: the theme
              remaps only some of that scale, so amber-200 stayed a pale
              dark-theme value and was invisible on this light background. */}
          <div className="mt-4 border border-[var(--rl-orange)]/35 bg-[var(--rl-orange-soft)] px-4 py-3">
            <p className="text-sm leading-relaxed text-[var(--rl-ink-2)]">
              <strong className="font-semibold text-[var(--rl-orange-strong)]">Editing the plans:</strong> the{" "}
              <code className="bg-white px-1 py-0.5 text-[13px] text-[var(--rl-ink)]">pricing</code> table holds one row per billing period —
              period, then each plan&rsquo;s price and its small print. The two{" "}
              <code className="bg-white px-1 py-0.5 text-[13px] text-[var(--rl-ink)]">pricing-…-features</code> lists are the ticks under each
              plan. Change the wording freely, but keep each section&rsquo;s{" "}
              <strong className="font-semibold text-[var(--rl-orange-strong)]">id</strong> as it is, or that
              block disappears from the website.
            </p>
          </div>
        </div>
        <ServicePageForm mode="update" initialData={initialData} originalSlug={SLUG} />
      </div>
    </div>
  );
}
