"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode;
  className?: string;
  appName?: string;
  variant?: "solid" | "outline";
}

export const Button = ({ children, className, appName: _appName = "", variant = "solid", ...props }: ButtonProps) => {
  void _appName;
  return (
    <button
      className={`${variant === "outline" ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "bg-indigo-600 text-white hover:bg-indigo-700"} rounded-md px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
};
