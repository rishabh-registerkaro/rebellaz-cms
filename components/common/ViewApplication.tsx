"use client";

import { Download } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  APPLICATION_STATUS_COLORS,
  applicationStatusLabel,
} from "@/app/lib/constants/application";
import type { CareerApplication } from "@/lib/apiCallingApplication";

/** Human size for the CV, so an admin knows what they are about to open. */
function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
      <span className="text-sm text-slate-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-white text-right break-words">{value}</span>
    </div>
  );
}

/**
 * The whole application in one panel: who applied, what for, and the CV.
 *
 * A drawer rather than a page — reviewing candidates is a scan-and-move-on
 * job, and a route change per candidate would cost a round trip to a remote
 * database for data the listing already has.
 */
export function ViewApplication({
  application,
  open,
  onOpenChange,
}: {
  application: CareerApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-slate-900 w-[440px] text-white overflow-y-auto">
        {application && (
          <>
            <SheetHeader>
              <SheetTitle className="text-white text-2xl">View Application</SheetTitle>
              <SheetDescription className="text-slate-400">Candidate details</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 p-4 mt-2">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white">{application.name}</h2>
                <p className="text-sm text-slate-400">{application.email}</p>
                <span
                  className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${APPLICATION_STATUS_COLORS[application.status]}`}
                >
                  {applicationStatusLabel(application.status)}
                </span>
              </div>

              <div className="space-y-3">
                <Item label="Phone" value={application.phoneNo} />
                <Item
                  label="Applied for"
                  value={application.roleTitle || "Talent pipeline (no specific role)"}
                />
                {application.discipline && (
                  <Item label="Discipline" value={application.discipline} />
                )}
                <Item label="Submitted from" value={application.source} />
                {application.pagePath && <Item label="Page" value={application.pagePath} />}
                <Item
                  label="Received"
                  value={new Date(application.createdAt).toLocaleString()}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide mb-2">
                  CV / Resume
                </h3>
                {application.resumeUrl ? (
                  // Opens the PDF on the media host in a new tab; noopener so
                  // the opened page cannot reach back into the dashboard.
                  <a
                    href={application.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 transition-colors hover:border-indigo-400 hover:bg-slate-800"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-indigo-500/20 text-indigo-300">
                      <Download className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {application.resumeName || "Open CV"}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {formatBytes(application.resumeBytes) || "Click to open in a new tab"}
                      </span>
                    </span>
                  </a>
                ) : (
                  <p className="text-sm text-slate-400">No CV attached.</p>
                )}
              </div>

              {application.note && (
                <div>
                  <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wide mb-2">
                    Why this role
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                    {application.note}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
