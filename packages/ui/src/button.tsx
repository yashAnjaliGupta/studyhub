"use client";

import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  appName: string;
}

export const Button = ({ children, className, appName }: ButtonProps) => {
  return (
    <div>
      <button
        className={className}
        onClick={() => alert(`Hello from your ${appName} app!`)}
      >
        {children}
      </button>
      <div className="text-red-500">hello from button</div>
    </div>
    
  );
};
