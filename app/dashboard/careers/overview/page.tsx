"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateCareer } from "@/lib/apiCallingCareer";
import { getCareerStats, type CareerStatRole, type CareerStatsResponse } from "@/lib/apiCallingApplication";
import { applicationStatusLabel } from "@/app/lib/constants/application";

/** One number with its label — the strip along the top of the page. */
function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-4">
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}

/**
 * Careers overview: which roles are live, and how many people applied to each.
 *
 * The counts come from one grouped query rather than a request per role — see
 * /api/careers/stats. Hiding and unhiding happens here too, because "this role
 * has 40 applications, take it down" is one thought, not two pages.
 */
export default function CareersOverviewPage() {
  const [data, setData] = useState<CareerStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getCareerStats());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load overview", {
        closeButton: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleHidden = async (role: CareerStatRole) => {
    setBusyId(role._id);
    const next = !role.hidden;
    try {
      await updateCareer(role._id, { hidden: next });
      // Patched in place: a refetch would re-sort the table under the cursor,
      // and the only thing that changed is this row.
      setData((current) =>
        current
          ? {
              ...current,
              roles: current.roles.map((item) =>
                item._id === role._id
                  ? { ...item, hidden: next, live: item.status === "published" && !next }
                  : item
              ),
              totals: {
                ...current.totals,
                hidden: current.totals.hidden + (next ? 1 : -1),
                live:
                  current.totals.live +
                  (role.status === "published" ? (next ? -1 : 1) : 0),
              },
            }
          : current
      );
      toast.success(next ? "Role hidden from the site" : "Role is live again", {
        closeButton: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role", {
        closeButton: true,
      });
    } finally {
      setBusyId(null);
    }
  };

  const totals = data?.totals;

  return (
    <div className="min-h-screen w-full p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-1">Careers overview</h1>
            <p className="text-slate-400">
              How many people applied to each role, and which roles are still collecting
            </p>
          </div>
          <Link href="/dashboard/careers/applications">
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
              <Users className="h-4 w-4 mr-2" />
              All applications
            </Button>
          </Link>
        </div>

        {totals && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Live roles" value={totals.live} hint="Published and not hidden" />
              <Stat label="Hidden" value={totals.hidden} hint="Kept, but off the site" />
              <Stat label="Drafts" value={totals.draft} hint="Never published" />
              <Stat
                label="Applications"
                value={totals.applications}
                hint={`${totals.unassignedApplications} without a role`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(totals.byStatus).map(([status, count]) => (
                <Link
                  key={status}
                  href={`/dashboard/careers/applications?status=${status}`}
                  className="px-3 py-1.5 text-xs border border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-400 hover:text-indigo-300"
                >
                  {applicationStatusLabel(status)}: <strong>{count}</strong>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="bg-slate-800 border border-slate-700 shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading overview...</div>
          ) : !data || data.roles.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No roles yet. Create one from Careers → Add New Role.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-400">
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Discipline</th>
                    <th className="px-5 py-3 font-medium">Applications</th>
                    <th className="px-5 py-3 font-medium">Last received</th>
                    <th className="px-5 py-3 font-medium">On the site</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.roles.map((role) => (
                    <tr key={role._id} className="border-b border-slate-700 last:border-0">
                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-200">{role.title}</span>
                        <span className="block text-xs text-slate-400">/careers/{role.slug}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{role.category}</td>
                      <td className="px-5 py-4">
                        {role.applications > 0 ? (
                          <Link
                            href={`/dashboard/careers/applications?careerId=${role._id}`}
                            className="text-indigo-300 hover:text-indigo-200 hover:underline font-medium"
                          >
                            {role.applications}
                          </Link>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                        {role.lastApplicationAt
                          ? new Date(role.lastApplicationAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        {/* Three states, not two: a draft was never live, a
                            hidden role was and can come back. */}
                        <span
                          className={`px-2 py-1 text-xs font-medium border ${
                            role.live
                              ? "bg-green-500/15 text-green-400 border-green-500/40"
                              : role.hidden
                                ? "bg-orange-500/15 text-orange-400 border-orange-500/40"
                                : "bg-yellow-500/15 text-yellow-400 border-yellow-500/40"
                          }`}
                        >
                          {role.live ? "Live" : role.hidden ? "Hidden" : "Draft"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === role._id}
                            className="border-slate-600 text-slate-200"
                            title={
                              role.hidden
                                ? "Put this role back on the site"
                                : "Take this role off the site, keeping it and its applications"
                            }
                            onClick={() => toggleHidden(role)}
                          >
                            {role.hidden ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Link href={`/dashboard/careers/update-career?id=${role._id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
