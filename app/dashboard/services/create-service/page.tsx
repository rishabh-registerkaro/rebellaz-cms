"use client";

import { useState } from "react";
import ServicePageForm from "../service-page-form";
import SolutionPageForm from "../solution-page-form";

/**
 * Two page templates live under Services, each with its own editor and its own
 * public route:
 *
 *  - "solution" — a fixed set of named sections; the layout picker chooses
 *    which of them render.
 *  - "division" — an ordered list the editor composes freely from intro,
 *    cards, chips, steps, checklist, table, notes and FAQ blocks.
 *
 * Both publish under /solutions/<slug>; the route reads the template and picks
 * the right renderer.
 *
 * Both alternate dark/light automatically. The solution page does it through
 * validated layouts; the division page derives each section's tone from its
 * position, so any order an editor builds still alternates.
 *
 * The choice is made up front because the two content shapes are not
 * interchangeable — switching afterwards would discard the page's content.
 */
type Template = "solution" | "division";

export default function CreateServicePage() {
  const [template, setTemplate] = useState<Template | null>(null);

  if (template === "solution") return <SolutionPageForm isNew />;

  if (template === "division") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Create Service Page</h1>
            <p className="text-slate-400">
              Compose the page from sections in any order. Sections alternate dark and light
              automatically — you never pick a tone.
            </p>
          </div>
          <ServicePageForm mode="create" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Create Service Page</h1>
          <p className="text-slate-400">Pick a layout. This cannot be changed later.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setTemplate("solution")}
            className="border border-slate-700 bg-slate-800 p-6 text-left transition-colors hover:border-slate-500"
          >
            <h2 className="mb-2 text-lg font-semibold text-slate-100">Solution pillar</h2>
            <p className="text-sm text-slate-400">
              A fixed structure: hero with stats, &ldquo;what we do&rdquo; cards, comparison table,
              FAQ and a closing enquiry panel. Choose which of those render with the layout picker.
            </p>
            <p className="mt-3 text-xs text-slate-500">Renders at /solutions/&lt;slug&gt;</p>
          </button>

          <button
            type="button"
            onClick={() => setTemplate("division")}
            className="border border-slate-700 bg-slate-800 p-6 text-left transition-colors hover:border-slate-500"
          >
            <h2 className="mb-2 text-lg font-semibold text-slate-100">Division (section builder)</h2>
            <p className="text-sm text-slate-400">
              Free-form: add intro, cards, chips, steps, checklist, table, notes and FAQ sections in
              any order. Use this when the page does not fit the pillar structure.
            </p>
            <p className="mt-3 text-xs text-slate-500">Renders at /solutions/&lt;slug&gt;</p>
          </button>
        </div>
      </div>
    </div>
  );
}
