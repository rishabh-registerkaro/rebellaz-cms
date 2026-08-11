"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/common/ConfirmDialog";
import {
  DEFAULT_CAREERS_CONTENT,
  HERO_STAT_COUNT,
  type CareersPageContent,
} from "@/app/lib/content/careers-content";

const inputCls =
  "w-full border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400";
const labelCls = "block text-sm font-medium text-slate-200 mb-2";
const cardCls = "bg-slate-800 border border-slate-700 shadow-sm p-6 space-y-5";
const itemCls = "border border-slate-600 p-4 space-y-4 bg-slate-900";

/** Headings support a line break; editors type a real newline. */
const MULTILINE_HINT = "Press Enter for a line break — the site keeps it.";

export default function CareersContentPage() {
  const confirm = useConfirm();
  const [content, setContent] = useState<CareersPageContent>(DEFAULT_CAREERS_CONTENT);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/careers-page", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Failed to load");
      setContent(json.data.content);
      setMetaTitle(json.data.metaTitle ?? "");
      setMetaDescription(json.data.metaDescription ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load content", {
        closeButton: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Replace one top-level section. */
  const setSection = <K extends keyof CareersPageContent>(
    key: K,
    value: Partial<CareersPageContent[K]>
  ) => setContent((c) => ({ ...c, [key]: { ...c[key], ...value } }));

  const save = async () => {
    setSaving(true);
    const toastId = toast.loading("Saving careers page...");
    try {
      const res = await fetch("/api/careers-page", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, metaTitle, metaDescription }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Save failed");
      toast.dismiss(toastId);
      toast.success("Careers page saved", { closeButton: true });
      setContent(json.data.content);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Something went wrong", {
        closeButton: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: "Reset to the default copy?",
      description:
        "Every section goes back to the text the page shipped with. Your current copy is replaced and cannot be recovered.",
      confirmLabel: "Reset copy",
      tone: "danger",
    });
    if (!ok) return;
    const toastId = toast.loading("Restoring default copy...");
    try {
      const res = await fetch("/api/careers-page", { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Reset failed");
      toast.dismiss(toastId);
      toast.success("Restored the default copy", { closeButton: true });
      setContent(json.data.content);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Reset failed", { closeButton: true });
    }
  };

  /** Generic list helpers, shared by the benefit cards and hiring steps. */
  function listOps<T>(items: T[], apply: (next: T[]) => void) {
    return {
      update: (i: number, patch: Partial<T>) =>
        apply(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x))),
      remove: (i: number) => apply(items.filter((_, idx) => idx !== i)),
      add: (blank: T) => apply([...items, blank]),
      move: (i: number, delta: -1 | 1) => {
        const j = i + delta;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[i], next[j]] = [next[j], next[i]];
        apply(next);
      },
    };
  }

  const benefitOps = listOps(content.benefits.cards, (cards) =>
    setSection("benefits", { cards })
  );
  const stepOps = listOps(content.hiring.steps, (steps) => setSection("hiring", { steps }));

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6 bg-slate-900">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-9 w-72 bg-muted animate-pulse" />
          <div className="h-64 bg-slate-800 border border-slate-700 animate-pulse" />
          <div className="h-96 bg-slate-800 border border-slate-700 animate-pulse" />
        </div>
      </div>
    );
  }

  /** Small header used by each repeater item. */
  const ItemHeader = ({
    label,
    index,
    total,
    onMove,
    onRemove,
  }: {
    label: string;
    index: number;
    total: number;
    onMove: (d: -1 | 1) => void;
    onRemove: () => void;
  }) => (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label} {index + 1}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="p-1.5 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full p-6 bg-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard/careers"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Careers
            </Link>
            <h1 className="text-3xl font-bold text-slate-100 mb-1">Careers Page Content</h1>
            <p className="text-slate-400">
              The copy around the roles listing. The roles themselves come from All Roles.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="border-slate-600 text-slate-200">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset copy
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>

        {/* 1 — Hero ----------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">1. Hero</h2>

          <div>
            <label className={labelCls}>Kicker</label>
            <Input
              className={inputCls}
              value={content.hero.kicker}
              onChange={(e) => setSection("hero", { kicker: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.hero.titleLead}
                onChange={(e) => setSection("hero", { titleLead: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading — highlighted word</label>
              <Input
                className={inputCls}
                value={content.hero.titleAccent}
                onChange={(e) => setSection("hero", { titleAccent: e.target.value })}
              />
              <p className="text-xs text-slate-400 mt-1">Shown in orange after the heading.</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Intro paragraph</label>
            <Textarea
              className={inputCls}
              rows={3}
              value={content.hero.subtitle}
              onChange={(e) => setSection("hero", { subtitle: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Stats</label>
            <p className="text-xs text-slate-400 -mt-1 mb-3">
              Exactly {HERO_STAT_COUNT} — the hero strip is a fixed four-column layout.
            </p>
            <div className="space-y-3">
              {Array.from({ length: HERO_STAT_COUNT }).map((_, i) => {
                const stat = content.hero.stats[i] ?? { value: "", accent: "", label: "" };
                const setStat = (patch: Partial<typeof stat>) => {
                  const stats = Array.from({ length: HERO_STAT_COUNT }).map(
                    (_, idx) =>
                      content.hero.stats[idx] ?? { value: "", accent: "", label: "" }
                  );
                  stats[i] = { ...stat, ...patch };
                  setSection("hero", { stats });
                };
                return (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      className={inputCls}
                      value={stat.value}
                      onChange={(e) => setStat({ value: e.target.value })}
                      placeholder={`Value ${i + 1} — e.g. 24/7`}
                    />
                    <Input
                      className={inputCls}
                      value={stat.accent}
                      onChange={(e) => setStat({ accent: e.target.value })}
                      placeholder="Orange suffix (optional)"
                    />
                    <Input
                      className={inputCls}
                      value={stat.label}
                      onChange={(e) => setStat({ label: e.target.value })}
                      placeholder="Label"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2 — Roles listing (not editable) ----------------------------- */}
        <div className="bg-slate-800 border border-slate-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-1">2. Open roles</h2>
          <p className="text-sm text-slate-400">
            The search, discipline tabs and role cards are generated from All Roles and
            Disciplines — nothing to edit here.
          </p>
        </div>

        {/* 3 — Benefits ------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">3. Why build here</h2>

          <SectionHeaderFields
            value={content.benefits}
            onChange={(patch) => setSection("benefits", patch)}
          />

          <div className="space-y-3">
            <label className={labelCls}>Cards ({content.benefits.cards.length})</label>
            {content.benefits.cards.map((card, i) => (
              <div key={i} className={itemCls}>
                <ItemHeader
                  label="Card"
                  index={i}
                  total={content.benefits.cards.length}
                  onMove={(d) => benefitOps.move(i, d)}
                  onRemove={() => benefitOps.remove(i)}
                />
                <Input
                  className={inputCls}
                  value={card.title}
                  onChange={(e) => benefitOps.update(i, { title: e.target.value })}
                  placeholder="Card title"
                />
                <Textarea
                  className={inputCls}
                  rows={2}
                  value={card.body}
                  onChange={(e) => benefitOps.update(i, { body: e.target.value })}
                  placeholder="Card body"
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => benefitOps.add({ title: "", body: "" })}
              className="border-slate-600 text-slate-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add card
            </Button>
          </div>
        </div>

        {/* 4 — Hiring steps --------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">4. How hiring works</h2>

          <SectionHeaderFields
            value={content.hiring}
            onChange={(patch) => setSection("hiring", patch)}
          />

          <div className="space-y-3">
            <label className={labelCls}>Steps ({content.hiring.steps.length})</label>
            <p className="text-xs text-slate-400 -mt-2">
              The 01 / 02 / 03 badge is numbered automatically from the order below.
            </p>
            {content.hiring.steps.map((step, i) => (
              <div key={i} className={itemCls}>
                <ItemHeader
                  label="Step"
                  index={i}
                  total={content.hiring.steps.length}
                  onMove={(d) => stepOps.move(i, d)}
                  onRemove={() => stepOps.remove(i)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    className={inputCls}
                    value={step.kicker}
                    onChange={(e) => stepOps.update(i, { kicker: e.target.value })}
                    placeholder="Kicker — e.g. Screen & verify"
                  />
                  <Input
                    className={inputCls}
                    value={step.title}
                    onChange={(e) => stepOps.update(i, { title: e.target.value })}
                    placeholder="Step title"
                  />
                </div>
                <Textarea
                  className={inputCls}
                  rows={2}
                  value={step.body}
                  onChange={(e) => stepOps.update(i, { body: e.target.value })}
                  placeholder="Step body"
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => stepOps.add({ kicker: "", title: "", body: "" })}
              className="border-slate-600 text-slate-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add step
            </Button>
          </div>
        </div>

        {/* 5 — Testimonials header -------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">5. Testimonials</h2>
          <p className="text-sm text-slate-400 -mt-3">
            Heading only — the quote cards themselves are still in code.
          </p>
          <SectionHeaderFields
            value={content.testimonials}
            onChange={(patch) => setSection("testimonials", patch)}
          />
        </div>

        {/* 6 — Pipeline -------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">6. Join the pipeline</h2>
          <p className="text-sm text-slate-400 -mt-3">
            Copy only — the registration form itself is unchanged.
          </p>

          <div>
            <label className={labelCls}>Kicker</label>
            <Input
              className={inputCls}
              value={content.pipeline.kicker}
              onChange={(e) => setSection("pipeline", { kicker: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Heading</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={content.pipeline.title}
              onChange={(e) => setSection("pipeline", { title: e.target.value })}
            />
            <p className="text-xs text-slate-400 mt-1">{MULTILINE_HINT}</p>
          </div>
          <div>
            <label className={labelCls}>Body</label>
            <Textarea
              className={inputCls}
              rows={3}
              value={content.pipeline.body}
              onChange={(e) => setSection("pipeline", { body: e.target.value })}
            />
          </div>
          <div className="space-y-3">
            <label className={labelCls}>Bullet points ({content.pipeline.points.length})</label>
            {content.pipeline.points.map((point, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  className={inputCls}
                  value={point}
                  onChange={(e) =>
                    setSection("pipeline", {
                      points: content.pipeline.points.map((p, idx) =>
                        idx === i ? e.target.value : p
                      ),
                    })
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Remove point"
                  onClick={() =>
                    setSection("pipeline", {
                      points: content.pipeline.points.filter((_, idx) => idx !== i),
                    })
                  }
                  className="border-red-500/40 text-red-600 hover:bg-red-50 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                setSection("pipeline", { points: [...content.pipeline.points, ""] })
              }
              className="border-slate-600 text-slate-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add point
            </Button>
          </div>
        </div>

        {/* SEO ----------------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">SEO</h2>
          <div>
            <label className={labelCls}>Meta title</label>
            <Input
              className={inputCls}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Careers"
            />
          </div>
          <div>
            <label className={labelCls}>Meta description</label>
            <Textarea
              className={inputCls}
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pb-10">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );

  /** Kicker + heading + intro — the trio every section below the hero shares. */
  function SectionHeaderFields({
    value,
    onChange,
  }: {
    value: { kicker: string; title: string; intro: string };
    onChange: (patch: Partial<{ kicker: string; title: string; intro: string }>) => void;
  }) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Kicker</label>
            <Input
              className={inputCls}
              value={value.kicker}
              onChange={(e) => onChange({ kicker: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Heading</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={value.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
            <p className="text-xs text-slate-400 mt-1">{MULTILINE_HINT}</p>
          </div>
        </div>
        <div>
          <label className={labelCls}>Intro paragraph</label>
          <Textarea
            className={inputCls}
            rows={2}
            value={value.intro}
            onChange={(e) => onChange({ intro: e.target.value })}
          />
        </div>
      </>
    );
  }
}
