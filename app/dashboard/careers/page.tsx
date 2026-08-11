"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAREER_TYPES, splitRate } from "@/app/lib/constants/career";
import { getDisciplines, type Discipline } from "@/lib/apiCallingDiscipline";
import { useConfirm } from "@/components/common/ConfirmDialog";
import {
  getCareers,
  deleteCareer,
  type Career,
  type Pagination,
} from "@/lib/apiCallingCareer";

const controlCls = "bg-slate-800 border border-slate-600 text-slate-200";

// "all" rather than "" because Radix Select treats an empty string value as
// "no selection" and refuses to render the item.
const ALL = "all";

function CareersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const [careers, setCareers] = useState<Career[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [featured, setFeatured] = useState(ALL);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  // Seeded from ?page= so a browser reload keeps the current page instead of
  // snapping back to 1. Only `page` is mirrored to the URL — the filters stay
  // as in-component state, unchanged from before.
  const [page, setPage] = useState(() => {
    const n = parseInt(searchParams.get("page") ?? "1", 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });

  /** Change page and reflect it in the URL in one go. */
  const goToPage = useCallback(
    (next: number) => {
      setPage(next);
      const qs = new URLSearchParams(window.location.search);
      if (next <= 1) qs.delete("page");
      else qs.set("page", String(next));
      const query = qs.toString();
      router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    },
    [router]
  );
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  useEffect(() => {
    getDisciplines()
      .then((res) => setDisciplines(res.disciplines ?? []))
      .catch(() => setDisciplines([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCareers({
        page,
        limit: 10,
        search,
        category: category === ALL ? "" : category,
        type: type === ALL ? "" : type,
        status: status === ALL ? "" : status,
        featured: featured === ALL ? "" : featured,
        sort,
      });
      setCareers(res.careers ?? []);
      setPagination(res.pagination ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load roles", {
        closeButton: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, category, type, status, featured, sort]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter change invalidates the current page number.
  const onFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    goToPage(1);
  };

  const handleDelete = async (career: Career) => {
    const ok = await confirm({
      title: `Delete "${career.title}"?`,
      description:
        "This permanently removes the role and its job description. Anyone on its public URL will get a 404.",
      confirmLabel: "Delete role",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(career._id);
    const toastId = toast.loading("Deleting role...");
    try {
      await deleteCareer(career._id);
      toast.dismiss(toastId);
      toast.success("Role deleted", { closeButton: true });
      load();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Failed to delete role", {
        closeButton: true,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen w-full p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-1">Careers</h1>
            <p className="text-slate-400">Manage the open roles listed on the careers page</p>
          </div>
          <Link href="/dashboard/careers/create-career">
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add New Role
            </Button>
          </Link>
        </div>

        {/* Filters — mirror the controls on the public careers page ------ */}
        <div className="bg-slate-800 border border-slate-700 shadow-sm p-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
              goToPage(1);
            }}
            className="flex gap-2 max-w-2xl"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className={`${controlCls} pl-9`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, location or duration... (Press Enter)"
              />
            </div>
            <Button type="submit" variant="outline" className="border-slate-600 text-slate-200">
              Apply
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={onFilterChange(setCategory)}>
              <SelectTrigger className={`${controlCls} w-[180px]`}>
                <SelectValue placeholder="All disciplines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="cursor-pointer">All disciplines</SelectItem>
                {disciplines.map((d) => (
                  <SelectItem key={d._id} value={d.name} className="cursor-pointer">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={type} onValueChange={onFilterChange(setType)}>
              <SelectTrigger className={`${controlCls} w-[150px]`}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="cursor-pointer">All types</SelectItem>
                {CAREER_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="cursor-pointer">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={onFilterChange(setStatus)}>
              <SelectTrigger className={`${controlCls} w-[150px]`}>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="cursor-pointer">All statuses</SelectItem>
                <SelectItem value="published" className="cursor-pointer">Published</SelectItem>
                <SelectItem value="draft" className="cursor-pointer">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select value={featured} onValueChange={onFilterChange(setFeatured)}>
              <SelectTrigger className={`${controlCls} w-[180px]`}>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="cursor-pointer">Featured & standard</SelectItem>
                <SelectItem value="true" className="cursor-pointer">Featured only</SelectItem>
                <SelectItem value="false" className="cursor-pointer">Standard only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v as "newest" | "oldest");
                goToPage(1);
              }}
            >
              <SelectTrigger className={`${controlCls} w-[150px]`}>
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="cursor-pointer">Newest first</SelectItem>
                <SelectItem value="oldest" className="cursor-pointer">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Listing -------------------------------------------------------- */}
        <div className="bg-slate-800 border border-slate-700 shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading roles...</div>
          ) : careers.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No roles found. Create one using the &ldquo;Add New Role&rdquo; button.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Discipline</th>
                    <th className="px-5 py-3 font-medium">Location</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Rate</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {careers.map((c) => (
                    <tr key={c._id} className="border-b border-slate-700 last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {c.featured && (
                            <Star
                              className="h-3.5 w-3.5 shrink-0 text-orange-500 fill-orange-500"
                              aria-label="Featured"
                            />
                          )}
                          <span className="font-medium text-slate-200">{c.title}</span>
                        </div>
                        <span className="text-xs text-slate-400">/careers/{c.slug}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{c.category}</td>
                      <td className="px-5 py-4 text-slate-300">{c.location}</td>
                      <td className="px-5 py-4 text-slate-300">
                        {c.type}
                        <span className="block text-xs text-slate-400">{c.duration}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-300 whitespace-nowrap">
                        {splitRate(c.salary, c.unit).amount}
                        <span className="text-slate-400">
                          {splitRate(c.salary, c.unit).period}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium border ${
                            c.status === "published"
                              ? "bg-green-500/15 text-green-400 border-green-500/40"
                              : "bg-yellow-500/15 text-yellow-400 border-yellow-500/40"
                          }`}
                        >
                          {c.status === "published" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-200"
                            onClick={() =>
                              router.push(`/dashboard/careers/update-career?id=${c._id}`)
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={deletingId === c._id}
                            className="border-red-500/40 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalCount}{" "}
              roles
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!pagination.hasPrevPage}
                onClick={() => goToPage(page - 1)}
                className="border-slate-600 text-slate-200"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!pagination.hasNextPage}
                onClick={() => goToPage(page + 1)}
                className="border-slate-600 text-slate-200"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * useSearchParams() requires a Suspense boundary in an app-router client page,
 * otherwise the whole route is forced out of static rendering.
 */
export default function CareersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full p-6 bg-slate-900" />}>
      <CareersPageInner />
    </Suspense>
  );
}
