"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageField } from "@/components/common/ImageField";
import {
  DEFAULT_SOLUTION_CONTENT,
  HERO_STAT_COUNT,
  SOLUTION_LAYOUTS,
  type SolutionLayoutId,
  type SolutionPageContent,
} from "@/app/lib/content/solution-content";

const inputCls =
  "w-full border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400";
const labelCls = "block text-sm font-medium text-slate-200 mb-2";
const cardCls = "bg-slate-800 border border-slate-700 shadow-sm p-6 space-y-5";
const itemCls = "border border-slate-600 p-4 space-y-4 bg-slate-900";
const noteCls = "text-xs text-slate-400";

export type SolutionFormData = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  content: SolutionPageContent;
};

/** The ↑ ↓ ✕ cluster every repeatable row carries. */
function RowControls({
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
}) {
  return (
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
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function SolutionPageForm({
  initial,
  isNew,
  status = "draft",
}: {
  initial?: SolutionFormData;
  isNew: boolean;
  /** Current status of the page being edited; new pages start as drafts. */
  status?: "draft" | "published";
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [content, setContent] = useState<SolutionPageContent>(
    initial?.content ?? DEFAULT_SOLUTION_CONTENT
  );
  const [saving, setSaving] = useState(false);

  /**
   * The layout is fixed once a page is live.
   *
   * Switching it on a published page silently adds or removes whole sections
   * from a URL people already have — the comparison table and FAQ simply
   * vanish. Drafts stay free to change; a live page must be unpublished first,
   * which makes that consequence a deliberate step.
   */
  const layoutLocked = !isNew && status === "published";

  /**
   * Merge a patch into one section.
   *
   * Constrained to the object-valued keys: `layout` is a plain string, and
   * spreading it here would turn "standard" into {0:"s",1:"t",…}.
   */
  type SectionKey = {
    [K in keyof SolutionPageContent]: SolutionPageContent[K] extends object ? K : never;
  }[keyof SolutionPageContent];

  const setSection = <K extends SectionKey>(
    key: K,
    value: Partial<SolutionPageContent[K]>
  ) => setContent((c) => ({ ...c, [key]: { ...c[key], ...value } }));

  /** Replace one entry of a list without disturbing the others. */
  const setAt = <T,>(list: T[], index: number, patch: Partial<T>): T[] =>
    list.map((x, i) => (i === index ? { ...x, ...patch } : x));

  const move = <T,>(list: T[], i: number, delta: -1 | 1): T[] => {
    const j = i + delta;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  const save = async (status: "draft" | "published") => {
    const cleanSlug = slugify(slug || content.hero.title);
    if (!cleanSlug) {
      toast.error("A slug is required — it becomes /solutions/<slug>.", { closeButton: true });
      return;
    }

    setSaving(true);
    const toastId = toast.loading(status === "published" ? "Publishing…" : "Saving draft…");
    try {
      const payload = {
        slug: cleanSlug,
        template: "solution",
        metaTitle,
        metaDescription,
        content,
        status,
      };
      const res = await fetch(isNew ? "/api/services" : `/api/services/${initial?.slug}`, {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Save failed");

      toast.dismiss(toastId);
      toast.success(status === "published" ? "Published" : "Saved as draft", {
        closeButton: true,
      });
      router.push("/dashboard/services");
      router.refresh();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Something went wrong", {
        closeButton: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-slate-100">
              {isNew ? "New Solution Page" : "Edit Solution Page"}
            </h1>
            <p className="text-slate-400">
              Renders at <code>/solutions/{slugify(slug) || "…"}</code>. Sections alternate
              dark/light automatically — nothing to configure.
            </p>
          </div>
        </div>

        {/* SEO ----------------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">SEO / Meta</h2>
          <div>
            <label className={labelCls}>
              Slug <span className="text-red-500">*</span>
            </label>
            <Input
              className={inputCls}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="decision-intelligence"
            />
            <p className={`${noteCls} mt-1`}>Public URL: /solutions/{slugify(slug) || "…"}</p>
          </div>
          <div>
            <label className={labelCls}>Meta title</label>
            <Input
              className={inputCls}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
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

        {/* Layout --------------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">Layout</h2>
          <p className={noteCls}>
            Which sections the page renders, and in what order. Every layout alternates dark and
            light automatically — two sections of the same tone can never end up side by side.
          </p>
          {layoutLocked && (
            <p className="border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              This page is published, so its layout is locked — changing it would add or remove
              whole sections from a live URL. Save it as a draft first to change the layout.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {SOLUTION_LAYOUTS.map((l) => {
              const active = content.layout === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={layoutLocked}
                  aria-pressed={active}
                  onClick={() =>
                    setContent((c) => ({ ...c, layout: l.id as SolutionLayoutId }))
                  }
                  className={`border p-4 text-left transition-colors ${
                    active
                      ? "border-orange-500 bg-slate-900"
                      : "border-slate-600 bg-slate-900 hover:border-slate-500"
                  } ${layoutLocked ? "cursor-not-allowed opacity-50 hover:border-slate-600" : ""}`}
                >
                  <span className="block text-sm font-semibold text-slate-100">{l.name}</span>
                  <span className="mt-1 block text-xs text-slate-400">{l.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Hero -------------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">1. Hero</h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Pillar label</label>
              <Input
                className={inputCls}
                value={content.hero.pillar}
                onChange={(e) => setSection("hero", { pillar: e.target.value })}
                placeholder="Pillar 01"
              />
            </div>
            <div>
              <label className={labelCls}>
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                className={inputCls}
                value={content.hero.title}
                onChange={(e) => setSection("hero", { title: e.target.value })}
                placeholder="Decision Intelligence"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Tagline</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={content.hero.tagline}
              onChange={(e) => setSection("hero", { tagline: e.target.value })}
            />
          </div>

          <ImageField
            label="Hero image"
            value={content.hero.image}
            onChange={(image) => setSection("hero", { image })}
            hint="Uploaded straight into the Media Library."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Image alt text</label>
              <Input
                className={inputCls}
                value={content.hero.alt}
                onChange={(e) => setSection("hero", { alt: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Image caption</label>
              <Input
                className={inputCls}
                value={content.hero.badge}
                onChange={(e) => setSection("hero", { badge: e.target.value })}
                placeholder="Signal → Decision"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className={itemCls}>
              <h3 className="text-sm font-semibold text-slate-100">Primary button</h3>
              <Input
                className={inputCls}
                value={content.hero.primaryCta.label}
                onChange={(e) =>
                  setSection("hero", {
                    primaryCta: { ...content.hero.primaryCta, label: e.target.value },
                  })
                }
                placeholder="Explore Offerings"
              />
              <Input
                className={inputCls}
                value={content.hero.primaryCta.href}
                onChange={(e) =>
                  setSection("hero", {
                    primaryCta: { ...content.hero.primaryCta, href: e.target.value },
                  })
                }
                placeholder="#offerings"
              />
            </div>
            <div className={itemCls}>
              <h3 className="text-sm font-semibold text-slate-100">Secondary button</h3>
              <Input
                className={inputCls}
                value={content.hero.secondaryCta.label}
                onChange={(e) =>
                  setSection("hero", {
                    secondaryCta: { ...content.hero.secondaryCta, label: e.target.value },
                  })
                }
                placeholder="Schedule a Consultation"
              />
              <Input
                className={inputCls}
                value={content.hero.secondaryCta.href}
                onChange={(e) =>
                  setSection("hero", {
                    secondaryCta: { ...content.hero.secondaryCta, href: e.target.value },
                  })
                }
                placeholder="#openlab"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Stats</label>
            <p className={`${noteCls} mb-2`}>
              Exactly {HERO_STAT_COUNT} — the strip under the buttons is a fixed three-column
              layout.
            </p>
            {content.hero.stats.map((stat, i) => (
              <div key={i} className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  className={inputCls}
                  value={stat.value}
                  onChange={(e) =>
                    setSection("hero", { stats: setAt(content.hero.stats, i, { value: e.target.value }) })
                  }
                  placeholder="4"
                />
                <Input
                  className={inputCls}
                  value={stat.label}
                  onChange={(e) =>
                    setSection("hero", { stats: setAt(content.hero.stats, i, { label: e.target.value }) })
                  }
                  placeholder="Offerings"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 2. Offerings --------------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">2. What we do</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("offerings", {
                  items: [
                    ...content.offerings.items,
                    { badge: "", title: "", body: "", bullets: [""], image: "", alt: "" },
                  ],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add offering
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={content.offerings.eyebrow}
                onChange={(e) => setSection("offerings", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.offerings.heading}
                onChange={(e) => setSection("offerings", { heading: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Subtitle</label>
              <Input
                className={inputCls}
                value={content.offerings.aside}
                onChange={(e) => setSection("offerings", { aside: e.target.value })}
              />
            </div>
          </div>

          {content.offerings.items.map((item, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={item.badge}
                  onChange={(e) =>
                    setSection("offerings", {
                      items: setAt(content.offerings.items, i, { badge: e.target.value }),
                    })
                  }
                  placeholder={`0${i + 1} // Strategy`}
                />
                <RowControls
                  index={i}
                  length={content.offerings.items.length}
                  onMove={(idx, d) =>
                    setSection("offerings", { items: move(content.offerings.items, idx, d) })
                  }
                  onRemove={(idx) =>
                    setSection("offerings", {
                      items: content.offerings.items.filter((_, x) => x !== idx),
                    })
                  }
                  label="offering"
                />
              </div>

              <Input
                className={inputCls}
                value={item.title}
                onChange={(e) =>
                  setSection("offerings", {
                    items: setAt(content.offerings.items, i, { title: e.target.value }),
                  })
                }
                placeholder="Enterprise Intelligence Strategy"
              />
              <Textarea
                className={inputCls}
                rows={2}
                value={item.body}
                onChange={(e) =>
                  setSection("offerings", {
                    items: setAt(content.offerings.items, i, { body: e.target.value }),
                  })
                }
                placeholder="One-line description of the capability."
              />

              <div>
                <label className={labelCls}>Bullets</label>
                {item.bullets.map((b, bi) => (
                  <div key={bi} className="mb-2 flex items-center gap-2">
                    <Input
                      className={inputCls}
                      value={b}
                      onChange={(e) =>
                        setSection("offerings", {
                          items: setAt(content.offerings.items, i, {
                            bullets: item.bullets.map((x, xi) => (xi === bi ? e.target.value : x)),
                          }),
                        })
                      }
                      placeholder={`Point ${bi + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove point ${bi + 1}`}
                      onClick={() =>
                        setSection("offerings", {
                          items: setAt(content.offerings.items, i, {
                            bullets: item.bullets.filter((_, xi) => xi !== bi),
                          }),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setSection("offerings", {
                      items: setAt(content.offerings.items, i, { bullets: [...item.bullets, ""] }),
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add point
                </Button>
              </div>

              <ImageField
                label="Card image"
                value={item.image}
                onChange={(image) =>
                  setSection("offerings", {
                    items: setAt(content.offerings.items, i, { image }),
                  })
                }
              />
              <Input
                className={inputCls}
                value={item.alt}
                onChange={(e) =>
                  setSection("offerings", {
                    items: setAt(content.offerings.items, i, { alt: e.target.value }),
                  })
                }
                placeholder="Image alt text"
              />
            </div>
          ))}
        </div>

        {/* 3. Comparison --------------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">3. Why choose us</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("comparison", {
                  rows: [...content.comparison.rows, { feature: "", traditional: "", rebel: "" }],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add row
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={content.comparison.eyebrow}
                onChange={(e) => setSection("comparison", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.comparison.heading}
                onChange={(e) => setSection("comparison", { heading: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Subtitle</label>
              <Input
                className={inputCls}
                value={content.comparison.aside}
                onChange={(e) => setSection("comparison", { aside: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {(["feature", "traditional", "rebel"] as const).map((col) => (
              <div key={col}>
                <label className={labelCls}>Column: {col}</label>
                <Input
                  className={inputCls}
                  value={content.comparison.columns[col]}
                  onChange={(e) =>
                    setSection("comparison", {
                      columns: { ...content.comparison.columns, [col]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
          </div>

          {content.comparison.rows.map((row, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={row.feature}
                  onChange={(e) =>
                    setSection("comparison", {
                      rows: setAt(content.comparison.rows, i, { feature: e.target.value }),
                    })
                  }
                  placeholder="Output"
                />
                <RowControls
                  index={i}
                  length={content.comparison.rows.length}
                  onMove={(idx, d) =>
                    setSection("comparison", { rows: move(content.comparison.rows, idx, d) })
                  }
                  onRemove={(idx) =>
                    setSection("comparison", {
                      rows: content.comparison.rows.filter((_, x) => x !== idx),
                    })
                  }
                  label="row"
                />
              </div>
              <Textarea
                className={inputCls}
                rows={2}
                value={row.traditional}
                onChange={(e) =>
                  setSection("comparison", {
                    rows: setAt(content.comparison.rows, i, { traditional: e.target.value }),
                  })
                }
                placeholder="Traditional AI column"
              />
              <Textarea
                className={inputCls}
                rows={2}
                value={row.rebel}
                onChange={(e) =>
                  setSection("comparison", {
                    rows: setAt(content.comparison.rows, i, { rebel: e.target.value }),
                  })
                }
                placeholder="Rebel Labz column"
              />
            </div>
          ))}
        </div>

        {/* 4. FAQ ----------------------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">4. FAQ</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("faq", { items: [...content.faq.items, { question: "", answer: "" }] })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add question
            </Button>
          </div>

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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              className={inputCls}
              value={content.faq.cta.label}
              onChange={(e) => setSection("faq", { cta: { ...content.faq.cta, label: e.target.value } })}
              placeholder="Ask the lab"
            />
            <Input
              className={inputCls}
              value={content.faq.cta.href}
              onChange={(e) => setSection("faq", { cta: { ...content.faq.cta, href: e.target.value } })}
              placeholder="/contact"
            />
          </div>

          {content.faq.items.map((item, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={item.question}
                  onChange={(e) =>
                    setSection("faq", {
                      items: setAt(content.faq.items, i, { question: e.target.value }),
                    })
                  }
                  placeholder={`Question ${i + 1}`}
                />
                <RowControls
                  index={i}
                  length={content.faq.items.length}
                  onMove={(idx, d) => setSection("faq", { items: move(content.faq.items, idx, d) })}
                  onRemove={(idx) =>
                    setSection("faq", { items: content.faq.items.filter((_, x) => x !== idx) })
                  }
                  label="question"
                />
              </div>
              <Textarea
                className={inputCls}
                rows={3}
                value={item.answer}
                onChange={(e) =>
                  setSection("faq", {
                    items: setAt(content.faq.items, i, { answer: e.target.value }),
                  })
                }
                placeholder="Answer"
              />
            </div>
          ))}
        </div>

        {/* 5. Closing panel ------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">5. Closing section</h2>
          <p className={noteCls}>
            The left-hand copy only. The enquiry form beside it is part of the site, and its
            &ldquo;Interested in&rdquo; options come from the offering titles above.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Status badge</label>
              <Input
                className={inputCls}
                value={content.contact.badge}
                onChange={(e) => setSection("contact", { badge: e.target.value })}
                placeholder="Lab Status: Open"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <Input
                className={inputCls}
                value={content.contact.email}
                onChange={(e) => setSection("contact", { email: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.contact.title}
                onChange={(e) => setSection("contact", { title: e.target.value })}
                placeholder="The most important"
              />
            </div>
            <div>
              <label className={labelCls}>Heading — italic part</label>
              <Input
                className={inputCls}
                value={content.contact.titleAccent}
                onChange={(e) => setSection("contact", { titleAccent: e.target.value })}
                placeholder="conversations"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Intro paragraph</label>
            <Textarea
              className={inputCls}
              rows={3}
              value={content.contact.lede}
              onChange={(e) => setSection("contact", { lede: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Status note</label>
            <Input
              className={inputCls}
              value={content.contact.note}
              onChange={(e) => setSection("contact", { note: e.target.value })}
              placeholder="[ Lab Node: Online / Open to Collaboration ]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-10">
          <Button type="button" variant="secondary" onClick={() => save("draft")} disabled={saving}>
            Save as Draft
          </Button>
          <Button type="button" onClick={() => save("published")} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create & Publish" : "Update & Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
