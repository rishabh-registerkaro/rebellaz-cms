"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Editor from "@/components/common/Editor";
import {
  CAREER_TYPES,
  CAREER_UNITS,
  slugifyCareer,
  splitRate,
  typeHasDuration,
  TYPE_PAY,
} from "@/app/lib/constants/career";
import { getDisciplines, type Discipline } from "@/lib/apiCallingDiscipline";
import {
  createCareer,
  updateCareer,
  type Career,
  type CareerPayload,
  type PerkInput,
} from "@/lib/apiCallingCareer";

const inputCls =
  "w-full border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400";
const labelCls = "block text-sm font-medium text-slate-200 mb-2";
const cardCls = "bg-slate-800 border border-slate-700 shadow-sm p-6 space-y-5";

/**
 * Repeatable title + description pairs for the role's "What we offer" section.
 *
 * Per-role rather than one global list: an internship and a staff role rarely
 * offer the same thing. Leaving every row blank hides the section on the public
 * page instead of printing an empty heading.
 */
function PerkList({
  values,
  onChange,
}: {
  values: PerkInput[];
  onChange: (next: PerkInput[]) => void;
}) {
  // Always offer one empty row so there is somewhere to type without hunting
  // for an "add" button first.
  const rows = values.length ? values : [{ title: "", desc: "" }];

  const update = (index: number, patch: Partial<PerkInput>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={index} className="border border-slate-700 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              className={inputCls}
              value={row.title}
              onChange={(e) => update(index, { title: e.target.value })}
              placeholder={`Offer ${index + 1} — e.g. Remote-first, always`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Move offer ${index + 1} up`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Move offer ${index + 1} down`}
              disabled={index === rows.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove offer ${index + 1}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              ✕
            </Button>
          </div>
          <Textarea
            className={inputCls}
            rows={2}
            value={row.desc}
            onChange={(e) => update(index, { desc: e.target.value })}
            placeholder="Work from anywhere; we hire the person, not the timezone."
          />
        </div>
      ))}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Shown as the &ldquo;What we offer&rdquo; grid at the foot of the role page. Leave
          empty to hide that section entirely.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...rows, { title: "", desc: "" }])}
        >
          Add offer
        </Button>
      </div>
    </div>
  );
}

type Props = {
  /** Present when editing; absent when creating. */
  career?: Career;
};

const EMPTY: CareerPayload = {
  title: "",
  slug: "",
  category: "",
  location: "",
  type: "",
  duration: "",
  salary: "",
  unit: "/day",
  featured: false,
  description: "",
  summary: "",
  perks: [],
  metaTitle: "",
  metaDescription: "",
  status: "draft",
};

/** Map a saved role onto the form's shape. */
function toFormState(career?: Career): CareerPayload {
  if (!career) return EMPTY;
  return {
    title: career.title,
    slug: career.slug,
    category: career.category,
    location: career.location,
    type: career.type,
    duration: career.duration,
    salary: career.salary,
    unit: career.unit,
    featured: career.featured,
    description: career.description ?? "",
    summary: career.summary ?? "",
    perks: career.perks ?? [],
    metaTitle: career.metaTitle ?? "",
    metaDescription: career.metaDescription ?? "",
    status: career.status,
  };
}

export default function CareerForm({ career }: Props) {
  const router = useRouter();
  // Seeded straight from props rather than in an effect: the update page only
  // renders this component once the role has loaded, so `career` never changes
  // identity underneath us and syncing it in an effect would just cause an
  // extra cascading render.
  const [form, setForm] = useState<CareerPayload>(() => toFormState(career));
  const [saving, setSaving] = useState(false);
  // Once the author edits the slug by hand, stop deriving it from the title.
  // An existing role always counts as touched — its URL is already published.
  const [slugTouched, setSlugTouched] = useState(Boolean(career));

  // Disciplines are editor-managed, so the options come from the API rather
  // than a constant. Inactive ones are excluded, except the one already
  // assigned to this role — otherwise editing a role on a retired discipline
  // would silently blank its category.
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  const loadDisciplines = useCallback(async () => {
    try {
      const res = await getDisciplines();
      const all = res.disciplines ?? [];
      setDisciplines(all.filter((d) => d.active || d.name === career?.category));
    } catch {
      // Non-fatal: the field falls back to whatever is already selected.
      setDisciplines([]);
    }
  }, [career?.category]);

  useEffect(() => {
    loadDisciplines();
  }, [loadDisciplines]);

  const set = <K extends keyof CareerPayload>(key: K, value: CareerPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // What the Type selection implies for the rest of the pay fields.
  const showsDuration = typeHasDuration(form.type);
  const pay = TYPE_PAY[form.type];
  const payLabel = pay?.label ?? "Salary";
  const payHint = pay?.hint ?? "Include the currency symbol — shown verbatim on the site.";
  const payPlaceholder = pay
    ? pay.unit === "/month"
      ? "e.g. $2–3k"
      : "e.g. $140–190k"
    : "e.g. £700–820 or $160–190k";

  /**
   * Changing Type rewrites the fields it governs, so a role switched from
   * Contract to Full-time cannot keep a stale "6-mo" duration or a "/day" rate
   * that the form no longer shows — and therefore no longer lets anyone fix.
   */
  const onTypeChange = (type: string) => {
    setForm((prev) => ({
      ...prev,
      type,
      duration: typeHasDuration(type) ? prev.duration : "",
      unit: TYPE_PAY[type]?.unit ?? prev.unit,
    }));
  };

  const onTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : slugifyCareer(title),
    }));
  };

  const save = async (status: "draft" | "published") => {
    const required: Array<[keyof CareerPayload, string]> = [
      ["title", "Title"],
      ["category", "Category"],
      ["location", "Location"],
      ["type", "Type"],
      ...(typeHasDuration(form.type)
        ? ([["duration", "Duration"]] as Array<[keyof CareerPayload, string]>)
        : []),
      ["salary", payLabel],
    ];
    const missing = required.filter(([k]) => !String(form[k] ?? "").trim()).map(([, l]) => l);
    if (missing.length) {
      toast.error(`Please fill in: ${missing.join(", ")}`, { closeButton: true });
      return;
    }

    setSaving(true);
    const toastId = toast.loading(status === "published" ? "Publishing role..." : "Saving draft...");
    try {
      // The perk editor keeps a trailing blank row to type into; it is a UI
      // affordance, not content, so entries without a title are dropped.
      const payload: CareerPayload = {
        ...form,
        perks: (form.perks ?? [])
          .map((p) => ({ title: p.title.trim(), desc: p.desc.trim() }))
          .filter((p) => p.title),
        status,
      };
      if (career) {
        await updateCareer(career._id, payload);
      } else {
        await createCareer(payload);
      }
      toast.dismiss(toastId);
      toast.success(`Role ${status === "published" ? "published" : "saved"} successfully`, {
        closeButton: true,
      });
      router.push("/dashboard/careers");
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
    <div className="min-h-screen w-full p-6 bg-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-1">
            {career ? "Edit Role" : "Add New Role"}
          </h1>
          <p className="text-slate-400">
            Open roles shown on the careers page and its detail pages.
          </p>
        </div>

        {/* Role details ------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">Role details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                className={inputCls}
                value={form.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. Senior DP Operator"
              />
            </div>

            <div>
              <label className={labelCls}>Slug</label>
              <Input
                className={inputCls}
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                placeholder="auto-generated from title"
              />
              <p className="text-xs text-slate-400 mt-1">
                Public URL: /careers/{form.slug || "…"}
              </p>
            </div>

            <div>
              <label className={labelCls}>
                Category <span className="text-red-500">*</span>
              </label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select a discipline" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((d) => (
                    <SelectItem key={d._id} value={d.name} className="cursor-pointer">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={labelCls}>
                Type <span className="text-red-500">*</span>
              </label>
              <Select value={form.type} onValueChange={onTypeChange}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Full-time / Contract / Residency / Internship" />
                </SelectTrigger>
                <SelectContent>
                  {CAREER_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="cursor-pointer">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={labelCls}>
                Location <span className="text-red-500">*</span>
              </label>
              <Input
                className={inputCls}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. North Sea, UK"
              />
            </div>

            {/* A permanent role has no duration, and asking for one invites
                junk ("." / "N/A") that then leaks into the public meta line. */}
            {showsDuration && (
              <div>
                <label className={labelCls}>
                  Duration <span className="text-red-500">*</span>
                </label>
                <Input
                  className={inputCls}
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="e.g. 6-mo, 24-month, 6/6 rotation"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Shown on the site as{" "}
                  <span className="text-slate-200">
                    {form.location || "Remote"} · {form.duration || "6-mo"}{" "}
                    {form.type.toLowerCase()}
                  </span>
                </p>
              </div>
            )}

            <div>
              <label className={labelCls}>
                {payLabel} <span className="text-red-500">*</span>
              </label>
              <Input
                className={inputCls}
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
                placeholder={payPlaceholder}
              />
              <p className="text-xs text-slate-400 mt-1">{payHint}</p>
            </div>

            {/* Only a bounded engagement has a rate the author chooses; the
                open-ended types are fixed to the period their pay is quoted
                in (annual salary / monthly stipend). */}
            {showsDuration && (
            <div>
              <label className={labelCls}>Rate period</label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="/day" />
                </SelectTrigger>
                <SelectContent>
                  {CAREER_UNITS.map((u) => (
                    <SelectItem key={u} value={u} className="cursor-pointer">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">
                Displayed as{" "}
                <span className="text-slate-200">
                  {splitRate(form.salary || "£700–820", form.unit).amount}
                  {splitRate(form.salary || "£700–820", form.unit).period}
                </span>
                {" — the period is added for you, so leave it out of Salary."}
              </p>
            </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="h-4 w-4 accent-orange-600"
            />
            <span className="text-sm text-slate-200">
              Featured — pin to the &ldquo;Featured this week&rdquo; panel on the careers hero
            </span>
          </label>
        </div>

        {/* Job description ---------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">Job description</h2>
          <p className="text-sm text-slate-400 -mt-3">
            Rendered as the body of the role&apos;s detail page. Use headings for
            &ldquo;About the role&rdquo;, &ldquo;Key responsibilities&rdquo;, &ldquo;What
            you&apos;ll need&rdquo; and &ldquo;What we offer&rdquo;.
          </p>

          <div>
            <label className={labelCls}>Summary</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="One-line blurb used on cards and as the meta description fallback."
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <Editor
              content={form.description || ""}
              onChange={(html) => set("description", html)}
              placeholder="Write the full job description here..."
            />
          </div>

          <div>
            <label className={labelCls}>What we offer</label>
            <PerkList
              values={form.perks ?? []}
              onChange={(next) => set("perks", next)}
            />
          </div>
        </div>

        {/* SEO ----------------------------------------------------------- */}
        <div className={cardCls}>
          <h2 className="text-lg font-semibold text-slate-100">SEO</h2>
          <div>
            <label className={labelCls}>Meta title</label>
            <Input
              className={inputCls}
              value={form.metaTitle}
              onChange={(e) => set("metaTitle", e.target.value)}
              placeholder={form.title ? `${form.title} — Careers` : "Defaults to the role title"}
            />
          </div>
          <div>
            <label className={labelCls}>Meta description</label>
            <Textarea
              className={inputCls}
              rows={3}
              value={form.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
              placeholder="Falls back to the summary when empty."
            />
          </div>
        </div>

        {/* Actions -------------------------------------------------------- */}
        <div className="flex flex-wrap gap-3 justify-end pb-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/careers")}
            className="border-slate-600 text-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => save("draft")}
            className="border-slate-600 text-slate-200"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => save("published")}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {saving ? "Publishing..." : career ? "Update & Publish" : "Publish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
