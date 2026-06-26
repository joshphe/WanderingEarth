"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 disabled:text-white/20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
        上一页
      </button>

      <span className="text-sm text-white/60">
        {page} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 disabled:text-white/20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
      >
        下一页
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
