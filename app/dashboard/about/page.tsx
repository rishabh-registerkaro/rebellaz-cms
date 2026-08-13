"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageField } from "@/components/common/ImageField";
import {
  DEFAULT_ABOUT_CONTENT,
  STAT_COUNT,
  type AboutPageContent,
} from "@/app/lib/content/about-content";

const inputCls =
  "w-full border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400";
const labelCls = "block text-sm font-medium text-slate-200 mb-2";
const cardCls = "bg-slate-800 border border-slate-700 shadow-sm p-6 space-y-5";
const itemCls = "border border-slate-600 p-4 space-y-3 bg-slate-900";
const noteCls = "text-xs text-slate-400";

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

export default function AboutContentPage() {
  const [content, setContent] = useState<AboutPageContent>(DEFAULT_ABOUT_CONTENT);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/about", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Failed to load");
      if (json.aboutPage) {
        setContent(json.aboutPage.content);
        setMetaTitle(json.aboutPage.metaTitle ?? "");
        setMetaDescription(json.aboutPage.metaDescription ?? "");
      }
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

  /**
   * Merge a patch into one section.
   *
   * Constrained to the object-valued keys: `stats` is an array, and spreading
   * it here would turn it into an object keyed by index.
   */
  type SectionKey = {
    [K in keyof AboutPageContent]: AboutPageContent[K] extends unknown[] ? never : K;
  }[keyof AboutPageContent];

  const setSection = <K extends SectionKey>(
    key: K,
    value: Partial<AboutPageContent[K]>
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

  const save = async () => {
    setSaving(true);
    const toastId = toast.loading("Saving About page...");
    try {
      const res = await fetch("/api/about", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, metaTitle, metaDescription }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Save failed");
      toast.dismiss(toastId);
      toast.success("About page saved", { closeButton: true });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Something went wrong", {
        closeButton: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const resetCopy = () => {
    setContent(DEFAULT_ABOUT_CONTENT);
    toast.message("Default copy loaded — press Save to keep it", { closeButton: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-900 p-6">
        <p className="text-slate-400">Loading About page content…</p>
      </div>
    );
  }

  const { hero, story, values, stats, team, standards, partners, faq, dualCta } = content;

  return (
    <div className="min-h-screen w-full bg-slate-900 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-slate-100">About Page Content</h1>
            <p className="text-slate-400">
              Every section of /about. Sections alternate dark and light automatically — nothing to
              configure.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={resetCopy} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset copy
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        {/* 1. Hero -------------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">1. Hero</h2>
          <p className={noteCls}>
            The left column only. The orbit animation beside it is part of the site — it has no
            authored copy.
          </p>

          <div>
            <label className={labelCls}>Kicker</label>
            <Input
              className={inputCls}
              value={hero.badge}
              onChange={(e) => setSection("hero", { badge: e.target.value })}
              placeholder="Founded 2025 · Year Two"
            />
          </div>
          <div>
            <label className={labelCls}>Heading</label>
            <Input
              className={inputCls}
              value={hero.title}
              onChange={(e) => setSection("hero", { title: e.target.value })}
            />
            <p className={`${noteCls} mt-1`}>The red full stop is added by the site.</p>
          </div>
          <div>
            <label className={labelCls}>Intro paragraph</label>
            <Textarea
              className={inputCls}
              rows={3}
              value={hero.lede}
              onChange={(e) => setSection("hero", { lede: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className={itemCls}>
              <h3 className="text-sm font-semibold text-slate-100">Primary button</h3>
              <Input
                className={inputCls}
                value={hero.primaryCta.label}
                onChange={(e) =>
                  setSection("hero", { primaryCta: { ...hero.primaryCta, label: e.target.value } })
                }
              />
              <Input
                className={inputCls}
                value={hero.primaryCta.href}
                onChange={(e) =>
                  setSection("hero", { primaryCta: { ...hero.primaryCta, href: e.target.value } })
                }
                placeholder="#story"
              />
            </div>
            <div className={itemCls}>
              <h3 className="text-sm font-semibold text-slate-100">Secondary button</h3>
              <Input
                className={inputCls}
                value={hero.secondaryCta.label}
                onChange={(e) =>
                  setSection("hero", {
                    secondaryCta: { ...hero.secondaryCta, label: e.target.value },
                  })
                }
              />
              <Input
                className={inputCls}
                value={hero.secondaryCta.href}
                onChange={(e) =>
                  setSection("hero", {
                    secondaryCta: { ...hero.secondaryCta, href: e.target.value },
                  })
                }
                placeholder="#cta"
              />
            </div>
          </div>
        </div>

        {/* 2. Where we are ------------------------------------------------ */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">2. Where we are</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("story", {
                  cards: [...story.cards, { stage: "", title: "", body: "" }],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add card
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={story.eyebrow}
                onChange={(e) => setSection("story", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={story.heading}
                onChange={(e) => setSection("story", { heading: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Intro paragraph</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={story.lede}
              onChange={(e) => setSection("story", { lede: e.target.value })}
            />
          </div>

          {story.cards.map((card, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={card.stage}
                  onChange={(e) =>
                    setSection("story", { cards: setAt(story.cards, i, { stage: e.target.value }) })
                  }
                  placeholder="Already running"
                />
                <RowControls
                  index={i}
                  length={story.cards.length}
                  onMove={(idx, d) => setSection("story", { cards: move(story.cards, idx, d) })}
                  onRemove={(idx) =>
                    setSection("story", { cards: story.cards.filter((_, x) => x !== idx) })
                  }
                  label="card"
                />
              </div>
              <Input
                className={inputCls}
                value={card.title}
                onChange={(e) =>
                  setSection("story", { cards: setAt(story.cards, i, { title: e.target.value }) })
                }
                placeholder="The memory core"
              />
              <Textarea
                className={inputCls}
                rows={2}
                value={card.body}
                onChange={(e) =>
                  setSection("story", { cards: setAt(story.cards, i, { body: e.target.value }) })
                }
              />
            </div>
          ))}
        </div>

        {/* 3. What drives us ---------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">3. What drives us</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("values", {
                  items: [...values.items, { code: "", title: "", desc: "", metric: "" }],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add commitment
            </Button>
          </div>
          <p className={noteCls}>The 01 // 02 numbering is added by the site.</p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={values.eyebrow}
                onChange={(e) => setSection("values", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={values.heading}
                onChange={(e) => setSection("values", { heading: e.target.value })}
              />
            </div>
          </div>

          {values.items.map((item, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={item.code}
                  onChange={(e) =>
                    setSection("values", { items: setAt(values.items, i, { code: e.target.value }) })
                  }
                  placeholder="Transparency"
                />
                <RowControls
                  index={i}
                  length={values.items.length}
                  onMove={(idx, d) => setSection("values", { items: move(values.items, idx, d) })}
                  onRemove={(idx) =>
                    setSection("values", { items: values.items.filter((_, x) => x !== idx) })
                  }
                  label="commitment"
                />
              </div>
              <Input
                className={inputCls}
                value={item.title}
                onChange={(e) =>
                  setSection("values", { items: setAt(values.items, i, { title: e.target.value }) })
                }
                placeholder="Radical Transparency"
              />
              <Textarea
                className={inputCls}
                rows={2}
                value={item.desc}
                onChange={(e) =>
                  setSection("values", { items: setAt(values.items, i, { desc: e.target.value }) })
                }
              />
              <Input
                className={inputCls}
                value={item.metric}
                onChange={(e) =>
                  setSection("values", { items: setAt(values.items, i, { metric: e.target.value }) })
                }
                placeholder="100% auditable decisions"
              />
            </div>
          ))}
        </div>

        {/* 4. Stats band --------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">4. Stats band</h2>
          <p className={noteCls}>
            Exactly {STAT_COUNT} — the red band is a fixed four-column layout.
          </p>
          {stats.map((stat, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                className={inputCls}
                value={stat.value}
                onChange={(e) =>
                  setContent((c) => ({ ...c, stats: setAt(c.stats, i, { value: e.target.value }) }))
                }
                placeholder="6"
              />
              <Input
                className={inputCls}
                value={stat.label}
                onChange={(e) =>
                  setContent((c) => ({ ...c, stats: setAt(c.stats, i, { label: e.target.value }) }))
                }
                placeholder="Design partners"
              />
            </div>
          ))}
        </div>

        {/* 5. Founding team ------------------------------------------------ */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">5. Founding team</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("team", {
                  members: [...team.members, { name: "", role: "", bio: "" }],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add member
            </Button>
          </div>
          <p className={noteCls}>
            A member without a photo shows an initials monogram, which is what the site does today.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={team.eyebrow}
                onChange={(e) => setSection("team", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={team.heading}
                onChange={(e) => setSection("team", { heading: e.target.value })}
              />
            </div>
          </div>

          {team.members.map((member, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={member.name}
                  onChange={(e) =>
                    setSection("team", {
                      members: setAt(team.members, i, { name: e.target.value }),
                    })
                  }
                  placeholder="Sana Rahal"
                />
                <RowControls
                  index={i}
                  length={team.members.length}
                  onMove={(idx, d) => setSection("team", { members: move(team.members, idx, d) })}
                  onRemove={(idx) =>
                    setSection("team", { members: team.members.filter((_, x) => x !== idx) })
                  }
                  label="member"
                />
              </div>
              <Input
                className={inputCls}
                value={member.role}
                onChange={(e) =>
                  setSection("team", { members: setAt(team.members, i, { role: e.target.value }) })
                }
                placeholder="Founder / Research"
              />
              <Textarea
                className={inputCls}
                rows={2}
                value={member.bio}
                onChange={(e) =>
                  setSection("team", { members: setAt(team.members, i, { bio: e.target.value }) })
                }
              />
              <ImageField
                label="Portrait (optional)"
                optional
                value={member.image ?? ""}
                onChange={(image) =>
                  setSection("team", { members: setAt(team.members, i, { image }) })
                }
                hint="Uploaded straight into the Media Library."
              />
              {member.image && (
                <Input
                  className={inputCls}
                  value={member.alt ?? ""}
                  onChange={(e) =>
                    setSection("team", { members: setAt(team.members, i, { alt: e.target.value }) })
                  }
                  placeholder="Photo alt text"
                />
              )}
            </div>
          ))}
        </div>

        {/* 6. Operational standards ---------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">6. Operational standards</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("standards", {
                  items: [...standards.items, { code: "", title: "", desc: "" }],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add standard
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={standards.eyebrow}
                onChange={(e) => setSection("standards", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={standards.heading}
                onChange={(e) => setSection("standards", { heading: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Intro paragraph</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={standards.body}
              onChange={(e) => setSection("standards", { body: e.target.value })}
            />
          </div>

          {standards.items.map((item, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={item.code}
                  onChange={(e) =>
                    setSection("standards", {
                      items: setAt(standards.items, i, { code: e.target.value }),
                    })
                  }
                  placeholder="DATA_SOV"
                />
                <RowControls
                  index={i}
                  length={standards.items.length}
                  onMove={(idx, d) =>
                    setSection("standards", { items: move(standards.items, idx, d) })
                  }
                  onRemove={(idx) =>
                    setSection("standards", {
                      items: standards.items.filter((_, x) => x !== idx),
                    })
                  }
                  label="standard"
                />
              </div>
              <Input
                className={inputCls}
                value={item.title}
                onChange={(e) =>
                  setSection("standards", {
                    items: setAt(standards.items, i, { title: e.target.value }),
                  })
                }
                placeholder="Data Sovereignty"
              />
              <Textarea
                className={inputCls}
                rows={2}
                value={item.desc}
                onChange={(e) =>
                  setSection("standards", {
                    items: setAt(standards.items, i, { desc: e.target.value }),
                  })
                }
              />
            </div>
          ))}
        </div>

        {/* 7. Design partners ---------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">7. Design partners</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("partners", {
                  offers: [...partners.offers, { code: "", title: "", body: "", note: "" }],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add offer
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={partners.eyebrow}
                onChange={(e) => setSection("partners", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={partners.heading}
                onChange={(e) => setSection("partners", { heading: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Subtitle</label>
              <Input
                className={inputCls}
                value={partners.aside}
                onChange={(e) => setSection("partners", { aside: e.target.value })}
              />
            </div>
          </div>

          {partners.offers.map((offer, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={offer.code}
                  onChange={(e) =>
                    setSection("partners", {
                      offers: setAt(partners.offers, i, { code: e.target.value }),
                    })
                  }
                  placeholder="Paid pilot first"
                />
                <RowControls
                  index={i}
                  length={partners.offers.length}
                  onMove={(idx, d) =>
                    setSection("partners", { offers: move(partners.offers, idx, d) })
                  }
                  onRemove={(idx) =>
                    setSection("partners", {
                      offers: partners.offers.filter((_, x) => x !== idx),
                    })
                  }
                  label="offer"
                />
              </div>
              <Input
                className={inputCls}
                value={offer.title}
                onChange={(e) =>
                  setSection("partners", {
                    offers: setAt(partners.offers, i, { title: e.target.value }),
                  })
                }
                placeholder="Prove it on your problem"
              />
              <Textarea
                className={inputCls}
                rows={2}
                value={offer.body}
                onChange={(e) =>
                  setSection("partners", {
                    offers: setAt(partners.offers, i, { body: e.target.value }),
                  })
                }
              />
              <Input
                className={inputCls}
                value={offer.note}
                onChange={(e) =>
                  setSection("partners", {
                    offers: setAt(partners.offers, i, { note: e.target.value }),
                  })
                }
                placeholder="No annual contract to start"
              />
            </div>
          ))}

          <div className={itemCls}>
            <h3 className="text-sm font-semibold text-slate-100">Cohort banner</h3>
            <Input
              className={inputCls}
              value={partners.cohort.eyebrow}
              onChange={(e) =>
                setSection("partners", {
                  cohort: { ...partners.cohort, eyebrow: e.target.value },
                })
              }
              placeholder="Cohort Two · Now Open"
            />
            <Textarea
              className={inputCls}
              rows={2}
              value={partners.cohort.body}
              onChange={(e) =>
                setSection("partners", { cohort: { ...partners.cohort, body: e.target.value } })
              }
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                className={inputCls}
                value={partners.cohort.cta.label}
                onChange={(e) =>
                  setSection("partners", {
                    cohort: {
                      ...partners.cohort,
                      cta: { ...partners.cohort.cta, label: e.target.value },
                    },
                  })
                }
                placeholder="Apply as a design partner"
              />
              <Input
                className={inputCls}
                value={partners.cohort.cta.href}
                onChange={(e) =>
                  setSection("partners", {
                    cohort: {
                      ...partners.cohort,
                      cta: { ...partners.cohort.cta, href: e.target.value },
                    },
                  })
                }
                placeholder="#cta"
              />
            </div>
          </div>
        </div>

        {/* 8. FAQ ----------------------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">8. FAQ</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setSection("faq", { items: [...faq.items, { question: "", answer: "" }] })
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add question
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={faq.eyebrow}
                onChange={(e) => setSection("faq", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={faq.heading}
                onChange={(e) => setSection("faq", { heading: e.target.value })}
              />
            </div>
          </div>

          {faq.items.map((item, i) => (
            <div key={i} className={itemCls}>
              <div className="flex items-start gap-3">
                <Input
                  className={inputCls}
                  value={item.question}
                  onChange={(e) =>
                    setSection("faq", { items: setAt(faq.items, i, { question: e.target.value }) })
                  }
                  placeholder={`Question ${i + 1}`}
                />
                <RowControls
                  index={i}
                  length={faq.items.length}
                  onMove={(idx, d) => setSection("faq", { items: move(faq.items, idx, d) })}
                  onRemove={(idx) =>
                    setSection("faq", { items: faq.items.filter((_, x) => x !== idx) })
                  }
                  label="question"
                />
              </div>
              <Textarea
                className={inputCls}
                rows={3}
                value={item.answer}
                onChange={(e) =>
                  setSection("faq", { items: setAt(faq.items, i, { answer: e.target.value }) })
                }
              />
            </div>
          ))}
        </div>

        {/* 9. Closing panels ------------------------------------------------ */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">9. Closing panels</h2>
          <p className={noteCls}>The two panels at the foot of the page.</p>

          {(["partners", "careers"] as const).map((side) => {
            const panel = dualCta[side];
            return (
              <div key={side} className={itemCls}>
                <h3 className="text-sm font-semibold text-slate-100">
                  {side === "partners" ? "Left — clients & partners" : "Right — careers & talent"}
                </h3>
                <Input
                  className={inputCls}
                  value={panel.eyebrow}
                  onChange={(e) =>
                    setSection("dualCta", {
                      [side]: { ...panel, eyebrow: e.target.value },
                    } as Partial<AboutPageContent["dualCta"]>)
                  }
                  placeholder="For Clients & Partners"
                />
                <Input
                  className={inputCls}
                  value={panel.heading}
                  onChange={(e) =>
                    setSection("dualCta", {
                      [side]: { ...panel, heading: e.target.value },
                    } as Partial<AboutPageContent["dualCta"]>)
                  }
                />
                <Textarea
                  className={inputCls}
                  rows={2}
                  value={panel.body}
                  onChange={(e) =>
                    setSection("dualCta", {
                      [side]: { ...panel, body: e.target.value },
                    } as Partial<AboutPageContent["dualCta"]>)
                  }
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    className={inputCls}
                    value={panel.cta.label}
                    onChange={(e) =>
                      setSection("dualCta", {
                        [side]: { ...panel, cta: { ...panel.cta, label: e.target.value } },
                      } as Partial<AboutPageContent["dualCta"]>)
                    }
                  />
                  <Input
                    className={inputCls}
                    value={panel.cta.href}
                    onChange={(e) =>
                      setSection("dualCta", {
                        [side]: { ...panel, cta: { ...panel.cta, href: e.target.value } },
                      } as Partial<AboutPageContent["dualCta"]>)
                    }
                    placeholder="/careers"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* SEO -------------------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">SEO</h2>
          <div>
            <label className={labelCls}>Meta title</label>
            <Input
              className={inputCls}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="About Us · Rebellabz"
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
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
