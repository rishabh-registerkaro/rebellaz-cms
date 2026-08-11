"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CareerForm from "../career-form";
import { getCareerById, type Career } from "@/lib/apiCallingCareer";

function UpdateCareerLoading() {
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-9 w-64 bg-muted animate-pulse" />
        <div className="h-64 bg-slate-800 border border-slate-700 animate-pulse" />
        <div className="h-96 bg-slate-800 border border-slate-700 animate-pulse" />
      </div>
    </div>
  );
}

function UpdateCareerInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  const [career, setCareer] = useState<Career | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No role id provided in the URL.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getCareerById(id);
        if (cancelled) return;
        setCareer(res.data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load the role.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold text-slate-100">Could not load role</h1>
          <p className="text-slate-400">{error}</p>
          <Link href="/dashboard/careers">
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
              Back to Careers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!career) return <UpdateCareerLoading />;

  return <CareerForm career={career} />;
}

export default function UpdateCareerPage() {
  return (
    <Suspense fallback={<UpdateCareerLoading />}>
      <UpdateCareerInner />
    </Suspense>
  );
}
