"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useUrlPagination } from "@/lib/useUrlPagination";
import { deleteResume, getResumes, type ResumeAsset } from "@/lib/apiCallingApplication";
import type { Pagination } from "@/lib/apiCallingCareer";

const controlCls = "bg-slate-800 border border-slate-600 text-slate-200";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Every CV that has been uploaded, in its own folder on the media host.
 *
 * Deliberately not part of the Media Library: these are candidates' personal
 * documents, and an editor picking a hero image should never be able to browse
 * into them or attach one to a page.
 */
function ResumesInner() {
  const confirm = useConfirm();
  const { page, goToPage } = useUrlPagination();

  const [assets, setAssets] = useState<ResumeAsset[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getResumes({ page, limit: 20, search });
      setAssets(res.assets ?? []);
      setPagination(res.pagination ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load resumes", {
        closeButton: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (asset: ResumeAsset) => {
    const ok = await confirm({
      title: `Delete "${asset.filename}"?`,
      description:
        "The file is removed from the server. Any application that linked to it keeps its record, but the CV link will stop working.",
      confirmLabel: "Delete CV",
      tone: "danger",
    });
    if (!ok) return;

    setBusyKey(asset.key);
    const toastId = toast.loading("Deleting CV...");
    try {
      await deleteResume(asset.key);
      toast.dismiss(toastId);
      toast.success("CV deleted", { closeButton: true });
      load();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Failed to delete", {
        closeButton: true,
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="min-h-screen w-full p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-1">Resume assets</h1>
          <p className="text-slate-400">
            Every CV uploaded through the careers forms — PDF only, stored separately from the
            Media Library
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 shadow-sm p-4">
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
                placeholder="Search by filename... (Press Enter)"
              />
            </div>
            <Button type="submit" variant="outline" className="border-slate-600 text-slate-200">
              Apply
            </Button>
          </form>
        </div>

        <div className="bg-slate-800 border border-slate-700 shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading resumes...</div>
          ) : assets.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No CVs yet. They appear here when a candidate applies with one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-5 py-3 font-medium">File</th>
                    <th className="px-5 py-3 font-medium">Size</th>
                    <th className="px-5 py-3 font-medium">Uploaded</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.key} className="border-b border-slate-700 last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-indigo-300" />
                          <span className="font-medium text-slate-200">{asset.filename}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300 whitespace-nowrap">
                        {formatBytes(asset.bytes)}
                      </td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(asset.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <a href={asset.url} target="_blank" rel="noopener noreferrer">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-200"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyKey === asset.key}
                            className="border-red-500/40 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(asset)}
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
              files
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

/** useSearchParams() needs a Suspense boundary in an app-router client page. */
export default function ResumesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full p-6 bg-slate-900" />}>
      <ResumesInner />
    </Suspense>
  );
}
