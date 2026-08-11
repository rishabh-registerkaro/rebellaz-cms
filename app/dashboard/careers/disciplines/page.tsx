"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Check, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { slugifyCareer } from "@/app/lib/constants/career";
import {
  getDisciplines,
  createDiscipline,
  updateDiscipline,
  deleteDiscipline,
  type Discipline,
} from "@/lib/apiCallingDiscipline";
import { useConfirm } from "@/components/common/ConfirmDialog";

const inputCls =
  "w-full border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400";
const labelCls = "block text-sm font-medium text-slate-200 mb-2";

type Draft = { name: string; slug: string; description: string; active: boolean };

const EMPTY: Draft = { name: "", slug: "", description: "", active: true };

export default function DisciplinesPage() {
  const confirm = useConfirm();
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  // null = the "add new" form; otherwise the id being edited.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDisciplines();
      setDisciplines(res.disciplines ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load disciplines", {
        closeButton: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setSlugTouched(false);
  };

  const startEdit = (d: Discipline) => {
    setEditingId(d._id);
    setSlugTouched(true);
    setDraft({
      name: d.name,
      slug: d.slug,
      description: d.description ?? "",
      active: d.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Name is required", { closeButton: true });
      return;
    }

    setSaving(true);
    const toastId = toast.loading(editingId ? "Updating discipline..." : "Adding discipline...");
    try {
      const payload = {
        name,
        slug: draft.slug.trim() || slugifyCareer(name),
        description: draft.description.trim(),
        active: draft.active,
      };
      const res = editingId
        ? await updateDiscipline(editingId, payload)
        : await createDiscipline(payload);
      toast.dismiss(toastId);
      // The rename cascade reports how many roles it touched — surface it.
      toast.success(res?.message ?? "Saved", { closeButton: true });
      resetForm();
      load();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Something went wrong", {
        closeButton: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: Discipline) => {
    const ok = await confirm({
      title: `Delete the discipline "${d.name}"?`,
      description:
        "This cannot be undone. Disciplines still assigned to a role can't be deleted — set them inactive instead.",
      confirmLabel: "Delete discipline",
      tone: "danger",
    });
    if (!ok) return;
    const toastId = toast.loading("Deleting discipline...");
    try {
      await deleteDiscipline(d._id);
      toast.dismiss(toastId);
      toast.success("Discipline deleted", { closeButton: true });
      if (editingId === d._id) resetForm();
      load();
    } catch (error) {
      toast.dismiss(toastId);
      // In-use disciplines are refused with a message naming the count.
      toast.error(error instanceof Error ? error.message : "Failed to delete discipline", {
        closeButton: true,
        duration: 8000,
      });
    }
  };

  const toggleActive = async (d: Discipline) => {
    try {
      await updateDiscipline(d._id, { active: !d.active });
      toast.success(`"${d.name}" is now ${d.active ? "inactive" : "active"}`, {
        closeButton: true,
      });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update discipline", {
        closeButton: true,
      });
    }
  };

  /** Move a discipline up or down by swapping positions with its neighbour. */
  const move = async (index: number, delta: -1 | 1) => {
    const target = disciplines[index + delta];
    const current = disciplines[index];
    if (!target || !current) return;
    try {
      await Promise.all([
        updateDiscipline(current._id, { position: target.position }),
        updateDiscipline(target._id, { position: current.position }),
      ]);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder", {
        closeButton: true,
      });
    }
  };

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
            <h1 className="text-3xl font-bold text-slate-100 mb-1">Disciplines</h1>
            <p className="text-slate-400">
              The discipline tabs shown on the public careers page, and the options available
              when adding a role.
            </p>
          </div>
        </div>

        {/* Add / edit -------------------------------------------------- */}
        <div className="bg-slate-800 border border-slate-700 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">
              {editingId ? "Edit discipline" : "Add a discipline"}
            </h2>
            {editingId && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="border-slate-600 text-slate-200"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancel edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                className={inputCls}
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    name,
                    slug: slugTouched ? d.slug : slugifyCareer(name),
                  }));
                }}
                placeholder="e.g. Subsea & Diving"
              />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <Input
                className={inputCls}
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setDraft((d) => ({ ...d, slug: e.target.value }));
                }}
                placeholder="auto-generated from name"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <Textarea
              className={inputCls}
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Internal note — not shown on the site."
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              className="h-4 w-4 accent-orange-600"
            />
            <span className="text-sm text-slate-200">
              Active — available when adding a role, and shown as a tab on the site
            </span>
          </label>

          <div className="flex justify-end">
            <Button
              onClick={save}
              disabled={saving}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              {editingId ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {saving ? "Updating..." : "Update discipline"}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {saving ? "Adding..." : "Add discipline"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Listing ------------------------------------------------------ */}
        <div className="bg-slate-800 border border-slate-700 shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading disciplines...</div>
          ) : disciplines.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No disciplines yet. Add one above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-5 py-3 font-medium w-20">Order</th>
                  <th className="px-5 py-3 font-medium">Discipline</th>
                  <th className="px-5 py-3 font-medium">Roles</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {disciplines.map((d, i) => (
                  <tr key={d._id} className="border-b border-slate-700 last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Move ${d.name} up`}
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                          className="px-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${d.name} down`}
                          disabled={i === disciplines.length - 1}
                          onClick={() => move(i, 1)}
                          className="px-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-200">{d.name}</span>
                      <span className="block text-xs text-slate-400">{d.slug}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{d.careerCount ?? 0}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => toggleActive(d)}
                        className={`px-2 py-1 text-xs font-medium border cursor-pointer ${
                          d.active
                            ? "bg-green-500/15 text-green-400 border-green-500/40"
                            : "bg-slate-500/15 text-slate-400 border-slate-500/40"
                        }`}
                      >
                        {d.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-200"
                          onClick={() => startEdit(d)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 text-red-600 hover:bg-red-50"
                          onClick={() => remove(d)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Renaming a discipline updates every role using it. A discipline in use can&apos;t be
          deleted — reassign those roles first, or set it inactive to retire it without
          affecting existing roles.
        </p>
      </div>
    </div>
  );
}
