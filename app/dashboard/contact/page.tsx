"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_CONTACT_CONTENT,
  HERO_STAT_COUNT,
  RAIL_STAT_COUNT,
  STEP_COUNT,
  LOCATION_ROW_COUNT,
  type ContactPageContent,
} from "@/app/lib/content/contact-content";

const inputCls =
  "w-full border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400";
const labelCls = "block text-sm font-medium text-slate-200 mb-2";
const cardCls = "bg-slate-800 border border-slate-700 shadow-sm p-6 space-y-5";
const itemCls = "border border-slate-600 p-4 space-y-4 bg-slate-900";
const noteCls = "text-xs text-slate-400";

export default function ContactContentPage() {
  const [content, setContent] = useState<ContactPageContent>(DEFAULT_CONTACT_CONTENT);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contact", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Failed to load");
      if (json.data) {
        setContent(json.data.content);
        setMetaTitle(json.data.metaTitle ?? "");
        setMetaDescription(json.data.metaDescription ?? "");
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

  const setSection = <K extends keyof ContactPageContent>(
    key: K,
    value: Partial<ContactPageContent[K]>
  ) => setContent((c) => ({ ...c, [key]: { ...c[key], ...value } }));

  /** Replace one entry of a fixed-length list without disturbing the others. */
  const setAt = <T,>(list: T[], index: number, patch: Partial<T>): T[] =>
    list.map((x, i) => (i === index ? { ...x, ...patch } : x));

  const save = async () => {
    setSaving(true);
    const toastId = toast.loading("Saving contact page...");
    try {
      const res = await fetch("/api/contact", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, metaTitle, metaDescription }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Save failed");
      toast.dismiss(toastId);
      toast.success("Contact page saved", { closeButton: true });
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
    setContent(DEFAULT_CONTACT_CONTENT);
    toast.message("Default copy loaded — press Save changes to keep it", { closeButton: true });
  };

  const faqs = {
    update: (i: number, patch: Partial<ContactPageContent["faq"]["items"][number]>) =>
      setSection("faq", { items: setAt(content.faq.items, i, patch) }),
    remove: (i: number) =>
      setSection("faq", { items: content.faq.items.filter((_, idx) => idx !== i) }),
    add: () =>
      setSection("faq", { items: [...content.faq.items, { question: "", answer: "" }] }),
    move: (i: number, delta: -1 | 1) => {
      const j = i + delta;
      if (j < 0 || j >= content.faq.items.length) return;
      const next = [...content.faq.items];
      [next[i], next[j]] = [next[j], next[i]];
      setSection("faq", { items: next });
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-900 p-6">
        <p className="text-slate-400">Loading contact page content…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-900 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-slate-100">Contact Page Content</h1>
            <p className="text-slate-400">
              The copy around the enquiry form. The form itself is part of the site.
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

          <div>
            <label className={labelCls}>Badge</label>
            <Input
              className={inputCls}
              value={content.hero.badge}
              onChange={(e) => setSection("hero", { badge: e.target.value })}
              placeholder="Lab open · taking new problems"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.hero.title}
                onChange={(e) => setSection("hero", { title: e.target.value })}
                placeholder="Bring us a problem worth"
              />
            </div>
            <div>
              <label className={labelCls}>Heading — highlighted words</label>
              <Input
                className={inputCls}
                value={content.hero.titleAccent}
                onChange={(e) => setSection("hero", { titleAccent: e.target.value })}
                placeholder="working on"
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

          <div>
            <label className={labelCls}>Stats</label>
            <p className={`${noteCls} mb-2`}>
              Exactly {HERO_STAT_COUNT} — the strip under the heading is a fixed three-column
              layout.
            </p>
            <div className="space-y-2">
              {content.hero.stats.map((stat, i) => (
                <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    className={inputCls}
                    value={stat.value}
                    onChange={(e) =>
                      setSection("hero", { stats: setAt(content.hero.stats, i, { value: e.target.value }) })
                    }
                    placeholder="< 48h"
                  />
                  <Input
                    className={inputCls}
                    value={stat.label}
                    onChange={(e) =>
                      setSection("hero", { stats: setAt(content.hero.stats, i, { label: e.target.value }) })
                    }
                    placeholder="First reply"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Right-hand rail --------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">2. Right-hand panel</h2>
          <p className={noteCls}>
            The cards beside the enquiry form. The form itself — topics, timeline, fields — is part
            of the site and is not edited here.
          </p>

          <div className={itemCls}>
            <h3 className="text-sm font-semibold text-slate-100">Reach the lab</h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={labelCls}>Card heading</label>
                <Input
                  className={inputCls}
                  value={content.rail.reach.heading}
                  onChange={(e) =>
                    setSection("rail", { reach: { ...content.rail.reach, heading: e.target.value } })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <Input
                  className={inputCls}
                  value={content.rail.reach.email}
                  onChange={(e) =>
                    setSection("rail", { reach: { ...content.rail.reach, email: e.target.value } })
                  }
                  placeholder="amigo@rebel-labz.com"
                />
              </div>
              <div>
                <label className={labelCls}>Phone — shown</label>
                <Input
                  className={inputCls}
                  value={content.rail.reach.phone}
                  onChange={(e) =>
                    setSection("rail", { reach: { ...content.rail.reach, phone: e.target.value } })
                  }
                  placeholder="+91-8828267791"
                />
              </div>
              <div>
                <label className={labelCls}>Phone — link</label>
                <Input
                  className={inputCls}
                  value={content.rail.reach.phoneHref}
                  onChange={(e) =>
                    setSection("rail", {
                      reach: { ...content.rail.reach, phoneHref: e.target.value },
                    })
                  }
                  placeholder="tel:+918828267791"
                />
                <p className={`${noteCls} mt-1`}>Must start with <code>tel:</code>.</p>
              </div>
              <div>
                <label className={labelCls}>LinkedIn — shown</label>
                <Input
                  className={inputCls}
                  value={content.rail.reach.linkedin}
                  onChange={(e) =>
                    setSection("rail", { reach: { ...content.rail.reach, linkedin: e.target.value } })
                  }
                  placeholder="linkedin.com/in/amigo-sharma"
                />
              </div>
              <div>
                <label className={labelCls}>LinkedIn — link</label>
                <Input
                  className={inputCls}
                  value={content.rail.reach.linkedinHref}
                  onChange={(e) =>
                    setSection("rail", {
                      reach: { ...content.rail.reach, linkedinHref: e.target.value },
                    })
                  }
                  placeholder="https://www.linkedin.com/in/amigo-sharma"
                />
              </div>
            </div>
          </div>

          <div className={itemCls}>
            <h3 className="text-sm font-semibold text-slate-100">Join the lab</h3>
            <p className={noteCls}>
              The &ldquo;8 open roles&rdquo; line is counted from published roles automatically.
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className={labelCls}>Card heading</label>
                <Input
                  className={inputCls}
                  value={content.rail.join.heading}
                  onChange={(e) =>
                    setSection("rail", { join: { ...content.rail.join, heading: e.target.value } })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Card link</label>
                <Input
                  className={inputCls}
                  value={content.rail.join.href}
                  onChange={(e) =>
                    setSection("rail", { join: { ...content.rail.join, href: e.target.value } })
                  }
                  placeholder="/careers"
                />
              </div>
            </div>
          </div>

          <div className={itemCls}>
            <h3 className="text-sm font-semibold text-slate-100">What you get from us</h3>
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={content.rail.eyebrow}
                onChange={(e) => setSection("rail", { eyebrow: e.target.value })}
                placeholder="What you get from us"
              />
            </div>
            <p className={noteCls}>Exactly {RAIL_STAT_COUNT} — a fixed three-column strip.</p>
            {content.rail.stats.map((stat, i) => (
              <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  className={inputCls}
                  value={stat.value}
                  onChange={(e) =>
                    setSection("rail", { stats: setAt(content.rail.stats, i, { value: e.target.value }) })
                  }
                  placeholder="6"
                />
                <Input
                  className={inputCls}
                  value={stat.label}
                  onChange={(e) =>
                    setSection("rail", { stats: setAt(content.rail.stats, i, { label: e.target.value }) })
                  }
                  placeholder="Design partners"
                />
              </div>
            ))}
          </div>

          <div className={itemCls}>
            <h3 className="text-sm font-semibold text-slate-100">Where the lab works</h3>
            <div>
              <label className={labelCls}>Image caption</label>
              <Input
                className={inputCls}
                value={content.rail.location.caption}
                onChange={(e) =>
                  setSection("rail", {
                    location: { ...content.rail.location, caption: e.target.value },
                  })
                }
                placeholder="Remote-first · No head office"
              />
            </div>
            <div>
              <label className={labelCls}>Title</label>
              <Input
                className={inputCls}
                value={content.rail.location.title}
                onChange={(e) =>
                  setSection("rail", {
                    location: { ...content.rail.location, title: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Body</label>
              <Textarea
                className={inputCls}
                rows={2}
                value={content.rail.location.body}
                onChange={(e) =>
                  setSection("rail", {
                    location: { ...content.rail.location, body: e.target.value },
                  })
                }
              />
            </div>
            <p className={noteCls}>Exactly {LOCATION_ROW_COUNT} rows under the card.</p>
            {content.rail.location.rows.map((row, i) => (
              <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  className={inputCls}
                  value={row.label}
                  onChange={(e) =>
                    setSection("rail", {
                      location: {
                        ...content.rail.location,
                        rows: setAt(content.rail.location.rows, i, { label: e.target.value }),
                      },
                    })
                  }
                  placeholder="Desk hours"
                />
                <Input
                  className={inputCls}
                  value={row.value}
                  onChange={(e) =>
                    setSection("rail", {
                      location: {
                        ...content.rail.location,
                        rows: setAt(content.rail.location.rows, i, { value: e.target.value }),
                      },
                    })
                  }
                  placeholder="Mon–Fri · 09:00–18:00 IST"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 3. What happens next ------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">3. What happens next</h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>Kicker</label>
              <Input
                className={inputCls}
                value={content.steps.eyebrow}
                onChange={(e) => setSection("steps", { eyebrow: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Heading</label>
              <Input
                className={inputCls}
                value={content.steps.heading}
                onChange={(e) => setSection("steps", { heading: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Subtitle</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={content.steps.aside}
              onChange={(e) => setSection("steps", { aside: e.target.value })}
            />
          </div>

          <p className={noteCls}>
            Exactly {STEP_COUNT} steps — the strip is a fixed four-column layout, so a fifth would
            not fit.
          </p>
          <div className="space-y-3">
            {content.steps.items.map((step, i) => (
              <div key={i} className={itemCls}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Step label</label>
                    <Input
                      className={inputCls}
                      value={step.ident}
                      onChange={(e) =>
                        setSection("steps", {
                          items: setAt(content.steps.items, i, { ident: e.target.value }),
                        })
                      }
                      placeholder="Step 01 · <48h"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Title</label>
                    <Input
                      className={inputCls}
                      value={step.title}
                      onChange={(e) =>
                        setSection("steps", {
                          items: setAt(content.steps.items, i, { title: e.target.value }),
                        })
                      }
                      placeholder="We read and reply"
                    />
                  </div>
                </div>
                <Textarea
                  className={inputCls}
                  rows={2}
                  value={step.body}
                  onChange={(e) =>
                    setSection("steps", {
                      items: setAt(content.steps.items, i, { body: e.target.value }),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* 4. FAQ ---------------------------------------------------------- */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">4. Quick answers — FAQ</h2>
            <Button type="button" variant="secondary" size="sm" onClick={faqs.add}>
              <Plus className="mr-2 h-4 w-4" /> Add question
            </Button>
          </div>
          <p className={noteCls}>Any number of questions.</p>

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
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Move question ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() => faqs.move(i, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Move question ${i + 1} down`}
                      disabled={i === content.faq.items.length - 1}
                      onClick={() => faqs.move(i, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove question ${i + 1}`}
                      onClick={() => faqs.remove(i)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
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
          </div>
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
              placeholder="Contact · Rebellabz"
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
