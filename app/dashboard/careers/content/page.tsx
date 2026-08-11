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
  type CareersPageContent,
} from "@/app/lib/content/careers-content";

const inputCls =
  "w-full border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400";
const labelCls = "block text-sm font-medium text-slate-200 mb-2";
const cardCls = "bg-slate-800 border border-slate-700 shadow-sm p-6 space-y-5";
const itemCls = "border border-slate-600 p-4 space-y-4 bg-slate-900";
const noteCls = "text-xs text-slate-400";

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

  /** Generic list helpers, shared by the perk cards, FAQs and pipeline bullets. */
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

  /** The ↑ ↓ ✕ cluster every repeatable row carries. */
  const RowControls = ({
    index,
    length,
    onMove,
    onRemove,
    label,
  }: {
    index: number;
    length: number;
    onMove: (i: number, d: -1 | 1) => void;
    onRemove: (i: number) => void;
    label: string;
  }) => (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Move ${label} ${index + 1} up`}
        disabled={index === 0}
        onClick={() => onMove(index, -1)}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Move ${label} ${index + 1} down`}
        disabled={index === length - 1}
        onClick={() => onMove(index, 1)}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Remove ${label} ${index + 1}`}
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-4 w-4 text-red-400" />
      </Button>
    </div>
  );

  const perks = listOps(content.perks.items, (items) => setSection("perks", { items }));
  const faqs = listOps(content.faq.items, (items) => setSection("faq", { items }));
  /**
   * Bullets are plain strings, so they cannot share listOps — its `update`
   * spreads a patch object, which would turn "text" into {0:"t",1:"e",…}.
   */
  const setBullets = (next: string[]) => setSection("pipeline", { bullets: next });
  const bullets = {
    update: (i: number, value: string) =>
      setBullets(content.pipeline.bullets.map((b, idx) => (idx === i ? value : b))),
    remove: (i: number) => setBullets(content.pipeline.bullets.filter((_, idx) => idx !== i)),
    add: () => setBullets([...content.pipeline.bullets, ""]),
    move: (i: number, delta: -1 | 1) => {
      const j = i + delta;
      if (j < 0 || j >= content.pipeline.bullets.length) return;
      const next = [...content.pipeline.bullets];
      [next[i], next[j]] = [next[j], next[i]];
      setBullets(next);
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-900 p-6">
        <p className="text-slate-400">Loading careers page content…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard/careers"
              className="mb-2 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Careers
            </Link>
            <h1 className="mb-1 text-3xl font-bold text-slate-100">Careers Page Content</h1>
            <p className="text-slate-400">
              The copy around the roles listing. The roles themselves come from All Roles.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={reset} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset copy
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        {/* 1. Hero ------------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">1. Hero</h2>
          <p className={noteCls}>
            The badge above the heading (&ldquo;8 open roles · hiring now&rdquo;) is counted from
            published roles automatically.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.hero.title}
                onChange={(e) => setSection("hero", { title: e.target.value })}
                placeholder="The work behind adaptive"
              />
            </div>
            <div>
              <label className={labelCls}>Heading — highlighted word</label>
              <Input
                className={inputCls}
                value={content.hero.titleAccent}
                onChange={(e) => setSection("hero", { titleAccent: e.target.value })}
                placeholder="intelligence"
              />
              <p className={`${noteCls} mt-1`}>Shown in brand red after the heading.</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Intro paragraph</label>
            <Textarea
              className={inputCls}
              rows={3}
              value={content.hero.lede}
              onChange={(e) => setSection("hero", { lede: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Button label</label>
              <Input
                className={inputCls}
                value={content.hero.cta.label}
                onChange={(e) =>
                  setSection("hero", { cta: { ...content.hero.cta, label: e.target.value } })
                }
                placeholder="Browse open roles"
              />
            </div>
            <div>
              <label className={labelCls}>Button link</label>
              <Input
                className={inputCls}
                value={content.hero.cta.href}
                onChange={(e) =>
                  setSection("hero", { cta: { ...content.hero.cta, href: e.target.value } })
                }
                placeholder="#roles"
              />
              <p className={`${noteCls} mt-1`}>
                <code>#roles</code> scrolls to the listing. A full URL also works.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Open roles header ------------------------------------------ */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">2. Open roles — header</h2>
          <p className={noteCls}>
            Only the copy above the board. The role cards, discipline tabs and pagination are
            generated from All Roles and Disciplines.
          </p>

          <div>
            <label className={labelCls}>Kicker</label>
            <Input
              className={inputCls}
              value={content.roles.eyebrow}
              onChange={(e) => setSection("roles", { eyebrow: e.target.value })}
              placeholder="Open Roles"
            />
          </div>
          <div>
            <label className={labelCls}>Heading</label>
            <Input
              className={inputCls}
              value={content.roles.heading}
              onChange={(e) => setSection("roles", { heading: e.target.value })}
              placeholder="Find your next problem to work on"
            />
          </div>
          <div>
            <label className={labelCls}>Subtitle</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={content.roles.aside}
              onChange={(e) => setSection("roles", { aside: e.target.value })}
            />
          </div>
        </div>

        {/* 3. Why build here --------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">3. Why build here</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => perks.add({ title: "", desc: "" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add card
            </Button>
          </div>
          <p className={noteCls}>
            Any number of cards — the grid reflows to fit. An empty list hides the section.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={content.perks.eyebrow}
                onChange={(e) => setSection("perks", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.perks.heading}
                onChange={(e) => setSection("perks", { heading: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Subtitle</label>
              <Input
                className={inputCls}
                value={content.perks.aside}
                onChange={(e) => setSection("perks", { aside: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            {content.perks.items.map((perk, i) => (
              <div key={i} className={itemCls}>
                <div className="flex items-start gap-3">
                  <Input
                    className={inputCls}
                    value={perk.title}
                    onChange={(e) => perks.update(i, { title: e.target.value })}
                    placeholder={`Card ${i + 1} title — e.g. Remote-first, always`}
                  />
                  <RowControls
                    index={i}
                    length={content.perks.items.length}
                    onMove={perks.move}
                    onRemove={perks.remove}
                    label="card"
                  />
                </div>
                <Textarea
                  className={inputCls}
                  rows={2}
                  value={perk.desc}
                  onChange={(e) => perks.update(i, { desc: e.target.value })}
                  placeholder="Work from anywhere; we hire the person, not the timezone."
                />
              </div>
            ))}
            {content.perks.items.length === 0 && (
              <p className={noteCls}>No cards — this section will be hidden on the site.</p>
            )}
          </div>
        </div>

        {/* 4. FAQ --------------------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">4. Before you apply — FAQ</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => faqs.add({ question: "", answer: "" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add question
            </Button>
          </div>
          <p className={noteCls}>
            Any number of questions. The first one is open by default on the site.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={content.faq.eyebrow}
                onChange={(e) => setSection("faq", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.faq.heading}
                onChange={(e) => setSection("faq", { heading: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Subtitle</label>
              <Input
                className={inputCls}
                value={content.faq.aside}
                onChange={(e) => setSection("faq", { aside: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            {content.faq.items.map((item, i) => (
              <div key={i} className={itemCls}>
                <div className="flex items-start gap-3">
                  <Input
                    className={inputCls}
                    value={item.question}
                    onChange={(e) => faqs.update(i, { question: e.target.value })}
                    placeholder={`Question ${i + 1}`}
                  />
                  <RowControls
                    index={i}
                    length={content.faq.items.length}
                    onMove={faqs.move}
                    onRemove={faqs.remove}
                    label="question"
                  />
                </div>
                <Textarea
                  className={inputCls}
                  rows={3}
                  value={item.answer}
                  onChange={(e) => faqs.update(i, { answer: e.target.value })}
                  placeholder="Answer"
                />
              </div>
            ))}
            {content.faq.items.length === 0 && (
              <p className={noteCls}>No questions — this section will be hidden on the site.</p>
            )}
          </div>
        </div>

        {/* 5. Pipeline ---------------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">5. Join the pipeline</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => bullets.add()}>
              <Plus className="mr-2 h-4 w-4" /> Add bullet
            </Button>
          </div>
          <p className={noteCls}>
            Copy only. The form beside it — name, email, discipline, CV upload — is part of the
            site, and its discipline list comes from Disciplines.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={content.pipeline.eyebrow}
                onChange={(e) => setSection("pipeline", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.pipeline.heading}
                onChange={(e) => setSection("pipeline", { heading: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Bullets</label>
            {content.pipeline.bullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-3">
                <Input
                  className={inputCls}
                  value={bullet}
                  onChange={(e) => bullets.update(i, e.target.value)}
                  placeholder={`Bullet ${i + 1}`}
                />
                <RowControls
                  index={i}
                  length={content.pipeline.bullets.length}
                  onMove={bullets.move}
                  onRemove={bullets.remove}
                  label="bullet"
                />
              </div>
            ))}
          </div>
        </div>

        {/* SEO ------------------------------------------------------------ */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">SEO</h2>
          <div>
            <label className={labelCls}>Meta title</label>
            <Input
              className={inputCls}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Careers · Rebellabz"
            />
          </div>
          <div>
            <label className={labelCls}>Meta description</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="secondary" onClick={reset} disabled={saving}>
            Reset copy
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
