"use client";

// Contact Us page editor. Edits the single ContactPageContent document the
// frontend /contact-us page renders — hero, the copy around the enquiry form,
// the 24/7 duty-desk band, the FAQ and the closing banner.
//
// It previously described the contact page of the project this CMS was forked
// from: a tabbed quote/inquiry card with document types, legalisation
// destinations, a WhatsApp hotline and an office map. None of that is on this
// site, so every one of those fields changed nothing.

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  Inbox,
  Megaphone,
  PhoneCall,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  CONTACT_META_DEFAULTS,
  defaultContactContent,
  withContactDefaults,
  type ContactPageContent,
} from "@/app/lib/content/contact-content";

// ─── Shared styles (same idiom as the About editor) ──────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500";
const textareaCls = `${inputCls} resize-y`;
const cardWrapCls = "bg-slate-800/30 p-4 rounded-lg border border-slate-700";
const labelCls = "text-sm font-medium text-slate-200";
const addBtnCls =
  "border-slate-600 bg-slate-800/60 text-slate-200 hover:bg-slate-700 hover:text-white";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Section({
  id,
  icon,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  hint?: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible.Root open={open} onOpenChange={() => onToggle(id)}>
      <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-800/40">
        <Collapsible.Trigger className="w-full cursor-pointer px-5 py-4 text-left hover:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="text-indigo-400">{icon}</span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-white">{title}</span>
              {hint && <span className="block text-xs text-slate-500">{hint}</span>}
            </span>
            {open ? (
              <ChevronDown size={16} className="text-slate-400" />
            ) : (
              <ChevronRight size={16} className="text-slate-400" />
            )}
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="space-y-4 border-t border-slate-700/60 px-5 pb-6 pt-5">
            {children}
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactDashboardPage() {
  const [metaTitle, setMetaTitle] = useState(CONTACT_META_DEFAULTS.metaTitle);
  const [metaDescription, setMetaDescription] = useState(
    CONTACT_META_DEFAULTS.metaDescription
  );
  const [content, setContent] = useState<ContactPageContent>(defaultContactContent());
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ seo: true, hero: true });

  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  /** Update one top-level block, e.g. set("hero", { ...hero, badge }) */
  const set = <K extends keyof ContactPageContent>(
    key: K,
    value: ContactPageContent[K]
  ) => setContent((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contact", { credentials: "include" });
        const data = await res.json();
        if (data.success && data.data) {
          setExists(true);
          setMetaTitle(data.data.metaTitle ?? CONTACT_META_DEFAULTS.metaTitle);
          setMetaDescription(
            data.data.metaDescription ?? CONTACT_META_DEFAULTS.metaDescription
          );
          setContent(withContactDefaults(data.data.content));
        }
      } catch {
        toast.error("Failed to load the contact page", { closeButton: true });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRevalidate = async () => {
    const toastId = toast.loading("Revalidating cache...");
    try {
      const res = await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: ["contact-page"] }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cache cleared — frontend will fetch fresh content", { id: toastId });
      } else {
        toast.error(data.message || "Revalidation failed", { id: toastId });
      }
    } catch {
      toast.error("Revalidation failed", { id: toastId });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("Saving...", { closeButton: true });
    try {
      const res = await fetch("/api/contact", {
        method: exists ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ metaTitle, metaDescription, content }),
      });
      const data = await res.json();
      toast.dismiss(toastId);
      if (res.ok && data.success) {
        setExists(true);
        toast.success("Contact page saved — live site updated", { closeButton: true });
      } else {
        toast.error(data.message || "Failed to save", { closeButton: true });
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to save", { closeButton: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6 flex items-center justify-center">
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }

  const { hero, enquiry, emergency, faq, cta } = content;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-white">Contact Page</h1>
            <p className="text-slate-400">
              Everything on <code className="text-indigo-300">/contact-us</code>, in the
              order it appears.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRevalidate}
              variant="outline"
              className={addBtnCls}
              type="button"
            >
              <RefreshCw size={15} className="mr-2" />
              Clear cache
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-500 text-white hover:bg-indigo-600"
              type="button"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* SEO ------------------------------------------------------- */}
        <Section
          id="seo"
          icon={<FileText size={15} />}
          title="SEO / Meta"
          hint="Browser tab title and the search-result description."
          open={!!open.seo}
          onToggle={toggle}
        >
          <Field label="Meta title">
            <Input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Meta description">
            <textarea
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className={textareaCls}
            />
          </Field>
        </Section>

        {/* Hero ------------------------------------------------------ */}
        <Section
          id="hero"
          icon={<Sparkles size={15} />}
          title="Hero"
          hint="The top of the page: pill, headline, intro and the two buttons."
          open={!!open.hero}
          onToggle={toggle}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pill text" hint="Beside the green dot.">
              <Input
                value={hero.badge}
                onChange={(e) => set("hero", { ...hero, badge: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Pill suffix" hint="Muted text after the pill.">
              <Input
                value={hero.badgeSuffix}
                onChange={(e) => set("hero", { ...hero, badgeSuffix: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Headline">
              <Input
                value={hero.titleLead}
                onChange={(e) => set("hero", { ...hero, titleLead: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Headline (orange part)">
              <Input
                value={hero.titleAccent}
                onChange={(e) => set("hero", { ...hero, titleAccent: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Intro paragraph">
            <textarea
              rows={3}
              value={hero.subtitle}
              onChange={(e) => set("hero", { ...hero, subtitle: e.target.value })}
              className={textareaCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary button">
              <Input
                value={hero.ctaPrimary}
                onChange={(e) => set("hero", { ...hero, ctaPrimary: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Secondary button">
              <Input
                value={hero.ctaSecondary}
                onChange={(e) => set("hero", { ...hero, ctaSecondary: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* Enquiry --------------------------------------------------- */}
        <Section
          id="enquiry"
          icon={<Inbox size={15} />}
          title="Enquiry form"
          hint="The copy around the form. The form fields themselves are fixed."
          open={!!open.enquiry}
          onToggle={toggle}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kicker">
              <Input
                value={enquiry.kicker}
                onChange={(e) => set("enquiry", { ...enquiry, kicker: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Heading">
              <Input
                value={enquiry.heading}
                onChange={(e) => set("enquiry", { ...enquiry, heading: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Intro paragraph">
            <textarea
              rows={2}
              value={enquiry.intro}
              onChange={(e) => set("enquiry", { ...enquiry, intro: e.target.value })}
              className={textareaCls}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Routing label">
              <Input
                value={enquiry.routingLabel}
                onChange={(e) =>
                  set("enquiry", { ...enquiry, routingLabel: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Desk name">
              <Input
                value={enquiry.deskName}
                onChange={(e) => set("enquiry", { ...enquiry, deskName: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Desk location" hint="Shown until a region is chosen.">
              <Input
                value={enquiry.deskLocation}
                onChange={(e) =>
                  set("enquiry", { ...enquiry, deskLocation: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          </div>

          {/* Region options */}
          <div className={cardWrapCls}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className={labelCls}>Project region options</p>
                <p className="text-xs text-slate-500">
                  The dropdown in the form, in this order.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={addBtnCls}
                onClick={() =>
                  set("enquiry", { ...enquiry, regions: [...enquiry.regions, ""] })
                }
              >
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {enquiry.regions.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={r}
                    onChange={(e) => {
                      const regions = [...enquiry.regions];
                      regions[i] = e.target.value;
                      set("enquiry", { ...enquiry, regions });
                    }}
                    className={inputCls}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                    onClick={() =>
                      set("enquiry", {
                        ...enquiry,
                        regions: enquiry.regions.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Field label="Consent checkbox text">
            <textarea
              rows={2}
              value={enquiry.consentText}
              onChange={(e) =>
                set("enquiry", { ...enquiry, consentText: e.target.value })
              }
              className={textareaCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Submit button">
              <Input
                value={enquiry.submitLabel}
                onChange={(e) =>
                  set("enquiry", { ...enquiry, submitLabel: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Reply note" hint="Small print beside the button.">
              <Input
                value={enquiry.replyNote}
                onChange={(e) => set("enquiry", { ...enquiry, replyNote: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Success heading">
              <Input
                value={enquiry.successHeading}
                onChange={(e) =>
                  set("enquiry", { ...enquiry, successHeading: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Success text">
              <Input
                value={enquiry.successText}
                onChange={(e) =>
                  set("enquiry", { ...enquiry, successText: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Success button">
              <Input
                value={enquiry.successButton}
                onChange={(e) =>
                  set("enquiry", { ...enquiry, successButton: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* Emergency ------------------------------------------------- */}
        <Section
          id="emergency"
          icon={<PhoneCall size={15} />}
          title="24/7 duty desk"
          hint="The dark band with the emergency phone and email."
          open={!!open.emergency}
          onToggle={toggle}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Badge">
              <Input
                value={emergency.badge}
                onChange={(e) => set("emergency", { ...emergency, badge: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Heading">
              <Input
                value={emergency.heading}
                onChange={(e) =>
                  set("emergency", { ...emergency, heading: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Body">
            <textarea
              rows={3}
              value={emergency.body}
              onChange={(e) => set("emergency", { ...emergency, body: e.target.value })}
              className={textareaCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone label">
              <Input
                value={emergency.phoneLabel}
                onChange={(e) =>
                  set("emergency", { ...emergency, phoneLabel: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Phone number" hint="Also becomes the tap-to-call link.">
              <Input
                value={emergency.phoneNumber}
                onChange={(e) =>
                  set("emergency", { ...emergency, phoneNumber: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Email label">
              <Input
                value={emergency.emailLabel}
                onChange={(e) =>
                  set("emergency", { ...emergency, emailLabel: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Email address">
              <Input
                value={emergency.emailAddress}
                onChange={(e) =>
                  set("emergency", { ...emergency, emailAddress: e.target.value })
                }
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* FAQ ------------------------------------------------------- */}
        <Section
          id="faq"
          icon={<HelpCircle size={15} />}
          title="FAQ"
          hint="Questions shown below the form."
          open={!!open.faq}
          onToggle={toggle}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kicker">
              <Input
                value={faq.kicker}
                onChange={(e) => set("faq", { ...faq, kicker: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Heading">
              <Input
                value={faq.heading}
                onChange={(e) => set("faq", { ...faq, heading: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Intro">
            <textarea
              rows={2}
              value={faq.intro}
              onChange={(e) => set("faq", { ...faq, intro: e.target.value })}
              className={textareaCls}
            />
          </Field>

          <div className="flex items-center justify-between">
            <p className={labelCls}>Questions</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={addBtnCls}
              onClick={() =>
                set("faq", { ...faq, items: [...faq.items, { q: "", a: "" }] })
              }
            >
              <Plus size={14} className="mr-1" /> Add question
            </Button>
          </div>
          <div className="space-y-3">
            {faq.items.map((item, i) => (
              <div key={i} className={cardWrapCls}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">#{i + 1}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                    onClick={() =>
                      set("faq", { ...faq, items: faq.items.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="space-y-3">
                  <Input
                    placeholder="Question"
                    value={item.q}
                    onChange={(e) => {
                      const items = [...faq.items];
                      items[i] = { ...items[i], q: e.target.value };
                      set("faq", { ...faq, items });
                    }}
                    className={inputCls}
                  />
                  <textarea
                    rows={3}
                    placeholder="Answer"
                    value={item.a}
                    onChange={(e) => {
                      const items = [...faq.items];
                      items[i] = { ...items[i], a: e.target.value };
                      set("faq", { ...faq, items });
                    }}
                    className={textareaCls}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Closing banner -------------------------------------------- */}
        <Section
          id="cta"
          icon={<Megaphone size={15} />}
          title="Closing banner"
          hint="The dark panel at the foot of the page."
          open={!!open.cta}
          onToggle={toggle}
        >
          <Field label="Heading">
            <Input
              value={cta.heading}
              onChange={(e) => set("cta", { ...cta, heading: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Body">
            <textarea
              rows={3}
              value={cta.body}
              onChange={(e) => set("cta", { ...cta, body: e.target.value })}
              className={textareaCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary button">
              <Input
                value={cta.primaryLabel}
                onChange={(e) => set("cta", { ...cta, primaryLabel: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Secondary button" hint="Links to the About page.">
              <Input
                value={cta.secondaryLabel}
                onChange={(e) => set("cta", { ...cta, secondaryLabel: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>
      </div>
    </div>
  );
}
