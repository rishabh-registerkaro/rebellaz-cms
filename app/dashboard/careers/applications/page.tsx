"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Download, ExternalLink, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useUrlPagination } from "@/lib/useUrlPagination";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_COLORS,
  applicationStatusLabel,
  type ApplicationStatusValue,
} from "@/app/lib/constants/application";
import {
  deleteApplication,
  getApplications,
  updateApplicationStatus,
  type CareerApplication,
} from "@/lib/apiCallingApplication";
import type { Pagination } from "@/lib/apiCallingCareer";
import { ViewApplication } from "@/components/common/ViewApplication";

const controlCls = "bg-slate-800 border border-slate-600 text-slate-200";

// "all" rather than "" — Radix Select treats an empty string as "no selection".
const ALL = "all";

function ApplicationsInner() {
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const { page, goToPage } = useUrlPagination();

  // Seeded from the URL so the overview can link straight to "this role" or
  // "everyone shortlisted" and land on a filtered list.
  const [careerId, setCareerId] = useState(() => searchParams.get("careerId") ?? "");

  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<CareerApplication | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? ALL);
  const [source, setSource] = useState(ALL);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApplications({
        page,
        limit: 10,
        search,
        careerId,
        status: status === ALL ? "" : status,
        source: source === ALL ? "" : source,
      });
      setApplications(res.applications ?? []);
      setPagination(res.pagination ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load applications", {
        closeButton: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, status, source, careerId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Any filter change invalidates the current page number. */
  const onFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    goToPage(1);
  };

  const changeStatus = async (application: CareerApplication, next: string) => {
    setBusyId(application._id);
    try {
      await updateApplicationStatus(application._id, next);
      // Patch in place rather than refetching: the list is filtered and sorted
      // server-side, and a refetch would jump the row out from under the click.
      setApplications((rows) =>
        rows.map((row) =>
          row._id === application._id
            ? { ...row, status: next as ApplicationStatusValue }
            : row
        )
      );
      toast.success(`Moved to ${applicationStatusLabel(next)}`, { closeButton: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update", {
        closeButton: true,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (application: CareerApplication) => {
    const ok = await confirm({
      title: `Delete ${application.name}'s application?`,
      description:
        "This removes the application and permanently deletes the CV attached to it. It cannot be undone.",
      confirmLabel: "Delete application",
      tone: "danger",
    });
    if (!ok) return;

    setBusyId(application._id);
    const toastId = toast.loading("Deleting application...");
    try {
      await deleteApplication(application._id);
      toast.dismiss(toastId);
      toast.success("Application deleted", { closeButton: true });
      load();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Failed to delete", {
        closeButton: true,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen w-full p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-1">Applications</h1>
            <p className="text-slate-400">
              Candidates who applied through the careers pages, with their CVs
            </p>
          </div>
          <Link href="/dashboard/careers/overview">
            <Button variant="outline" className="border-slate-600 text-slate-200">
              Role overview
            </Button>
          </Link>
        </div>

        {careerId && (
          <div className="flex items-center justify-between gap-3 border border-indigo-500/40 bg-indigo-500/10 px-4 py-3">
            <span className="text-sm text-indigo-200">
              Showing applications for one role only.
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-200"
              onClick={() => {
                setCareerId("");
                // Drop it from the URL too, or a reload would re-apply it.
                const qs = new URLSearchParams(window.location.search);
                qs.delete("careerId");
                window.history.replaceState(null, "", qs.toString() ? `?${qs}` : window.location.pathname);
                goToPage(1);
              }}
            >
              Show all
            </Button>
          </div>
        )}

        {/* Filters -------------------------------------------------------- */}
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
                placeholder="Search by name, email, phone or role... (Press Enter)"
              />
            </div>
            <Button type="submit" variant="outline" className="border-slate-600 text-slate-200">
              Apply
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={onFilterChange(setStatus)}>
              <SelectTrigger className={`${controlCls} w-[170px]`}>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="cursor-pointer">
                  All statuses
                </SelectItem>
                {APPLICATION_STATUSES.map((value) => (
                  <SelectItem key={value} value={value} className="cursor-pointer">
                    {applicationStatusLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={source} onValueChange={onFilterChange(setSource)}>
              <SelectTrigger className={`${controlCls} w-[190px]`}>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="cursor-pointer">
                  All sources
                </SelectItem>
                {APPLICATION_SOURCES.map((value) => (
                  <SelectItem key={value} value={value} className="cursor-pointer">
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Listing -------------------------------------------------------- */}
        <div className="bg-slate-800 border border-slate-700 shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No applications yet. They arrive here when someone applies on the site.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-5 py-3 font-medium">Candidate</th>
                    <th className="px-5 py-3 font-medium">Applied for</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">CV</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Received</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application._id} className="border-b border-slate-700 last:border-0">
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setViewing(application)}
                          className="font-medium text-slate-200 hover:text-indigo-300 cursor-pointer text-left"
                        >
                          {application.name}
                        </button>
                        <span className="block text-xs text-slate-400">{application.email}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {application.roleTitle ?? (
                          <span className="text-slate-400">Talent pipeline</span>
                        )}
                        {application.discipline && (
                          <span className="block text-xs text-slate-400">
                            {application.discipline}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-300 whitespace-nowrap">
                        {application.phoneNo}
                      </td>
                      <td className="px-5 py-4">
                        {application.resumeUrl ? (
                          <a
                            href={application.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={application.resumeName || "Open CV"}
                            className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-indigo-200 hover:underline"
                          >
                            <Download className="size-3.5 shrink-0" />
                            Open
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Select
                          value={application.status}
                          onValueChange={(next) => changeStatus(application, next)}
                          disabled={busyId === application._id}
                        >
                          <SelectTrigger
                            className={`w-[140px] text-xs ${APPLICATION_STATUS_COLORS[application.status]}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUSES.map((value) => (
                              <SelectItem key={value} value={value} className="cursor-pointer">
                                {applicationStatusLabel(value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-200"
                            onClick={() => setViewing(application)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === application._id}
                            className="border-red-500/40 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(application)}
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
              applications
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

      <ViewApplication
        application={viewing}
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      />
    </div>
  );
}

/**
 * useSearchParams() (via useUrlPagination) requires a Suspense boundary in an
 * app-router client page, otherwise the whole route is forced out of static
 * rendering.
 */
export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full p-6 bg-slate-900" />}>
      <ApplicationsInner />
    </Suspense>
  );
}
