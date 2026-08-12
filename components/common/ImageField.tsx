"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { uploadFileToMedia } from "@/app/lib/utils/media";

/**
 * A URL field backed by the Media Library.
 *
 * Every asset the site renders should be a CMS-hosted URL rather than a file
 * baked into the frontend, so this uploads straight into the library and writes
 * the resulting URL back. The field stays editable for pasting a URL that is
 * already in the library.
 *
 * Shared by the solution and division editors — one uploader, one behaviour.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
  optional,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  /** Shows a clear button, for images the page renders only when present. */
  optional?: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}…`);
    try {
      const { url } = await uploadFileToMedia(file);
      onChange(url);
      toast.dismiss(toastId);
      toast.success("Uploaded to the Media Library", { closeButton: true });
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof Error ? error.message : "Upload failed", {
        closeButton: true,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">{label}</label>
      <div className="flex items-start gap-3">
        <Input
          className="w-full border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-400"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…/media-rebel/image.jpg"
        />
        <label className="shrink-0">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              // Reset so re-picking the same file still fires a change.
              e.target.value = "";
            }}
          />
          <span className="inline-flex cursor-pointer items-center gap-2 border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload"}
          </span>
        </label>
        {optional && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Remove ${label}`}
            className="shrink-0 border border-slate-600 bg-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-3 h-24 w-auto border border-slate-700 object-cover" />
      )}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default ImageField;
