import React from "react";

/** Small skeleton primitives used across the app to reduce loading jank. */

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} aria-hidden />;
}

export function QuestionCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-11/12 mb-2" />
      <Skeleton className="h-5 w-3/4 mb-4" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <Skeleton className="h-8 w-8 rounded-md" />
      <Skeleton className="h-3 w-20 mt-4" />
      <Skeleton className="h-8 w-16 mt-2" />
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 last:border-b-0">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-12 ml-auto" />
        <Skeleton className="h-3 w-10 ml-auto" />
      </div>
    </div>
  );
}
