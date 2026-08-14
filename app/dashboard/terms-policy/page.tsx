"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, FileText, AlignLeft, ShieldCheck, RefreshCw } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import dynamic from "next/dynamic";

const Tiptap = dynamic(() => import("@/components/common/Editor"), { ssr: false });

interface TermsPolicyFormData {
    // Terms & Conditions (/terms)
    metaTitle: string;
    metaDescription: string;
    title: string;
    subTitle: string;
    // Privacy Policy (/privacy) — its own header and SEO, because the site
    // renders it as a separate page.
    privacyMetaTitle: string;
    privacyMetaDescription: string;
    privacyTitle: string;
    privacySubTitle: string;
    content: { body: string };
    privacyPolicyContent: { body: string };
}

const defaultFormData: TermsPolicyFormData = {
    metaTitle: "Terms & Conditions · Rebellabz",
    metaDescription: "The terms governing your use of Rebellabz products and services.",
    title: "Terms & Conditions",
    subTitle: "Please read these terms carefully before using our services.",
    privacyMetaTitle: "Privacy Policy · Rebellabz",
    privacyMetaDescription: "What we collect when you use this site, why, and what we do with it.",
    privacyTitle: "Privacy Policy",
    privacySubTitle: "What happens to the information you send us through this site.",
    content: { body: "" },
    privacyPolicyContent: { body: "" },
};

function AutoResizeTextarea({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);

    const resize = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }, []);

    useEffect(() => { resize(); }, [value, resize]);

    return (
        <textarea
            ref={ref}
            value={value}
            rows={1}
            onChange={(e) => { onChange(e.target.value); resize(); }}
            placeholder={placeholder}
            className={className}
            style={{ overflowY: "hidden", resize: "none" }}
        />
    );
}

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    isOpen: boolean;
}

function SectionHeader({ icon, title, isOpen }: SectionHeaderProps) {
    return (
        <div className="flex items-center gap-3 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                {icon}
            </span>
            <span className="text-[15px] font-semibold text-slate-200">{title}</span>
            <span className="ml-auto shrink-0 text-slate-500">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
        </div>
    );
}

export default function TermsPolicyDashboardPage() {
    const [formData, setFormData] = useState<TermsPolicyFormData>(defaultFormData);
    const [loading, setLoading] = useState(true);
    // Which page is being saved, or null — so one button's spinner does not
    // appear on the other.
    const [saving, setSaving] = useState<"terms" | "privacy" | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        meta: true,
        terms: true,
        privacyMeta: false,
        privacy: false,
    });

    useEffect(() => {
        fetch("/api/terms-policy")
            .then((r) => r.json())
            .then((res) => {
                if (res.success && res.data) {
                    setFormData({
                        metaTitle: res.data.metaTitle || defaultFormData.metaTitle,
                        metaDescription: res.data.metaDescription || defaultFormData.metaDescription,
                        title: res.data.title || defaultFormData.title,
                        subTitle: res.data.subTitle || defaultFormData.subTitle,
                        privacyMetaTitle: res.data.privacyMetaTitle || defaultFormData.privacyMetaTitle,
                        privacyMetaDescription:
                            res.data.privacyMetaDescription || defaultFormData.privacyMetaDescription,
                        privacyTitle: res.data.privacyTitle || defaultFormData.privacyTitle,
                        privacySubTitle: res.data.privacySubTitle || defaultFormData.privacySubTitle,
                        content: { body: res.data.content?.body || "" },
                        privacyPolicyContent: { body: res.data.privacyPolicyContent?.body || "" },
                    });
                    setIsNew(false);
                } else {
                    setIsNew(true);
                }
            })
            .catch(() => toast.error("Failed to load terms & policy data"))
            .finally(() => setLoading(false));
    }, []);

    function toggleSection(key: string) {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function setField(field: keyof Omit<TermsPolicyFormData, "content" | "privacyPolicyContent">, value: string) {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }

    async function handleRevalidate() {
        const toastId = toast.loading("Revalidating cache...");
        try {
            const res = await fetch("/api/revalidate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags: ["terms-policy"] }),
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
    }

    /**
     * Save one page, not both.
     *
     * Each button sends only its own page's fields, so the other page's stored
     * values — including its "last updated" date — are never part of the
     * request. A legal document must not be redated because somebody fixed a
     * typo on the other one.
     *
     * The first save is different: there is no row yet, so it POSTs the whole
     * document and both pages start life together.
     */
    async function handleSave(scope: "terms" | "privacy") {
        setSaving(scope);
        try {
            const payload = isNew
                ? formData
                : scope === "terms"
                  ? {
                        metaTitle: formData.metaTitle,
                        metaDescription: formData.metaDescription,
                        title: formData.title,
                        subTitle: formData.subTitle,
                        content: formData.content,
                    }
                  : {
                        privacyMetaTitle: formData.privacyMetaTitle,
                        privacyMetaDescription: formData.privacyMetaDescription,
                        privacyTitle: formData.privacyTitle,
                        privacySubTitle: formData.privacySubTitle,
                        privacyPolicyContent: formData.privacyPolicyContent,
                    };

            const res = await fetch("/api/terms-policy", {
                method: isNew ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(
                    isNew
                        ? "Terms & Policy created!"
                        : scope === "terms"
                          ? "Terms page updated"
                          : "Privacy page updated"
                );
                setIsNew(false);
            } else {
                toast.error(data.message || "Failed to save");
            }
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setSaving(null);
        }
    }

    /** The save button that sits in each page group's header. */
    function SaveButton({ scope }: { scope: "terms" | "privacy" }) {
        const label = scope === "terms" ? "terms page" : "privacy page";
        return (
            <Button
                onClick={() => handleSave(scope)}
                disabled={saving !== null}
                className="bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer h-8 px-3 text-xs"
            >
                {saving === scope ? "Saving…" : `Save ${label}`}
            </Button>
        );
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    const inputCls =
        "bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-colors";
    const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5";
    const textareaCls =
        "w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors";

    return (
        <div className="min-h-screen bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">

                {/* Header */}
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Terms &amp; Policy</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            {isNew
                                ? "No data yet — fill in both pages and click Create Page."
                                : "Two pages, saved separately: each keeps its own revision date."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!isNew && (
                            <Button
                                variant="outline"
                                onClick={handleRevalidate}
                                className="border-amber-500/40 text-amber-400 bg-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Revalidate Cache
                            </Button>
                        )}
                        {isNew && (
                            <Button
                                onClick={() => handleSave("terms")}
                                disabled={saving !== null}
                                className="bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer"
                            >
                                {saving ? "Saving…" : "Create Page"}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Each public page gets its own labelled group: the screen
                        should answer "which URL does this end up on?" before an
                        editor opens anything. */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-3 border-b border-slate-700/60 pb-2">
                            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                                Terms &amp; Conditions
                            </h2>
                            <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                                /terms
                            </span>
                            {!isNew && (
                                <span className="ml-auto">
                                    <SaveButton scope="terms" />
                                </span>
                            )}
                        </div>

                    {/* Meta Section */}
                    <Collapsible.Root open={openSections.meta} onOpenChange={() => toggleSection("meta")}>
                        <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-800/40 backdrop-blur-sm">
                            <Collapsible.Trigger className="w-full cursor-pointer px-5 py-4 hover:bg-slate-800/60 transition-colors">
                                <SectionHeader icon={<FileText size={15} />} title="Title & SEO" isOpen={openSections.meta} />
                            </Collapsible.Trigger>
                            <Collapsible.Content>
                                <div className="border-t border-slate-700/60 px-5 pb-6 pt-5 space-y-4">
                                    <div>
                                        <label className={labelCls}>Meta Title</label>
                                        <Input
                                            className={inputCls}
                                            value={formData.metaTitle}
                                            onChange={(e) => setField("metaTitle", e.target.value)}
                                            placeholder="Terms & Conditions · Rebellabz"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Meta Description</label>
                                        <AutoResizeTextarea
                                            className={textareaCls}
                                            value={formData.metaDescription}
                                            onChange={(v) => setField("metaDescription", v)}
                                            placeholder="Read the terms and conditions and privacy policy…"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Page Title</label>
                                        <Input
                                            className={inputCls}
                                            value={formData.title}
                                            onChange={(e) => setField("title", e.target.value)}
                                            placeholder="Terms & Conditions"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Sub Title</label>
                                        <AutoResizeTextarea
                                            className={textareaCls}
                                            value={formData.subTitle}
                                            onChange={(v) => setField("subTitle", v)}
                                            placeholder="Please read these terms carefully before using our services."
                                        />
                                    </div>
                                </div>
                            </Collapsible.Content>
                        </div>
                    </Collapsible.Root>

                    {/* Terms & Conditions Content */}
                    <Collapsible.Root open={openSections.terms} onOpenChange={() => toggleSection("terms")}>
                        <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-800/40 backdrop-blur-sm">
                            <Collapsible.Trigger className="w-full cursor-pointer px-5 py-4 hover:bg-slate-800/60 transition-colors">
                                <SectionHeader icon={<AlignLeft size={15} />} title="Page content" isOpen={openSections.terms} />
                            </Collapsible.Trigger>
                            <Collapsible.Content>
                                <div className="border-t border-slate-700/60 px-5 pb-6 pt-5">
                                    <p className="mb-4 text-[12px] text-slate-500">
                                        The whole body of <span className="text-indigo-400 font-medium">/terms</span>. Headings become the page&apos;s section titles.
                                    </p>
                                    <div className="rounded-xl overflow-hidden border border-slate-700/60">
                                        <Tiptap
                                            content={formData.content.body}
                                            onChange={(html) =>
                                                setFormData((prev) => ({ ...prev, content: { body: html } }))
                                            }
                                            placeholder="Write the full terms and conditions here…"
                                        />
                                    </div>
                                </div>
                            </Collapsible.Content>
                        </div>
                    </Collapsible.Root>

                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center gap-3 border-b border-slate-700/60 pb-2">
                            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                                Privacy Policy
                            </h2>
                            <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                                /privacy
                            </span>
                            {!isNew && (
                                <span className="ml-auto">
                                    <SaveButton scope="privacy" />
                                </span>
                            )}
                        </div>

                    {/* Privacy page — its own header and SEO */}
                    <Collapsible.Root open={openSections.privacyMeta} onOpenChange={() => toggleSection("privacyMeta")}>
                        <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-800/40 backdrop-blur-sm">
                            <Collapsible.Trigger className="w-full cursor-pointer px-5 py-4 hover:bg-slate-800/60 transition-colors">
                                <SectionHeader icon={<FileText size={15} />} title="Title & SEO" isOpen={openSections.privacyMeta} />
                            </Collapsible.Trigger>
                            <Collapsible.Content>
                                <div className="border-t border-slate-700/60 px-5 pb-6 pt-5 space-y-4">
                                    <p className="text-[12px] text-slate-500">
                                        Heading, intro and search result for this page — separate from the terms fields above, so one page never describes the other.
                                    </p>
                                    <div>
                                        <label className={labelCls}>Meta Title</label>
                                        <Input
                                            className={inputCls}
                                            value={formData.privacyMetaTitle}
                                            onChange={(e) => setField("privacyMetaTitle", e.target.value)}
                                            placeholder="Privacy Policy · Rebellabz"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Meta Description</label>
                                        <AutoResizeTextarea
                                            className={textareaCls}
                                            value={formData.privacyMetaDescription}
                                            onChange={(v) => setField("privacyMetaDescription", v)}
                                            placeholder="What we collect when you use this site, why, and what we do with it."
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Page Title</label>
                                        <Input
                                            className={inputCls}
                                            value={formData.privacyTitle}
                                            onChange={(e) => setField("privacyTitle", e.target.value)}
                                            placeholder="Privacy Policy"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Sub Title</label>
                                        <AutoResizeTextarea
                                            className={textareaCls}
                                            value={formData.privacySubTitle}
                                            onChange={(v) => setField("privacySubTitle", v)}
                                            placeholder="What happens to the information you send us through this site."
                                        />
                                    </div>
                                </div>
                            </Collapsible.Content>
                        </div>
                    </Collapsible.Root>

                    {/* Privacy Policy Content */}
                    <Collapsible.Root open={openSections.privacy} onOpenChange={() => toggleSection("privacy")}>
                        <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-800/40 backdrop-blur-sm">
                            <Collapsible.Trigger className="w-full cursor-pointer px-5 py-4 hover:bg-slate-800/60 transition-colors">
                                <SectionHeader icon={<ShieldCheck size={15} />} title="Page content" isOpen={openSections.privacy} />
                            </Collapsible.Trigger>
                            <Collapsible.Content>
                                <div className="border-t border-slate-700/60 px-5 pb-6 pt-5">
                                    <p className="mb-4 text-[12px] text-slate-500">
                                        The whole body of <span className="text-indigo-400 font-medium">/privacy</span>, cookie wording included — there is no separate cookie page.
                                    </p>
                                    <div className="rounded-xl overflow-hidden border border-slate-700/60">
                                        <Tiptap
                                            content={formData.privacyPolicyContent.body}
                                            onChange={(html) =>
                                                setFormData((prev) => ({ ...prev, privacyPolicyContent: { body: html } }))
                                            }
                                            placeholder="Write the full privacy policy here…"
                                        />
                                    </div>
                                </div>
                            </Collapsible.Content>
                        </div>
                    </Collapsible.Root>
                    </section>
                </div>
            </div>
        </div>
    );
}
