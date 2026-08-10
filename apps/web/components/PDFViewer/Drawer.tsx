"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side: "left" | "right";
  title: string;
  children: ReactNode;
}

export default function Drawer({ open, onClose, side, title, children }: DrawerProps) {
  return (
    <>
      {/* Backdrop — only blocks interaction/visible when open */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 z-40 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 dark:bg-slate-900 lg:hidden ${
          side === "left" ? "left-0" : "right-0"
        } ${open ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
