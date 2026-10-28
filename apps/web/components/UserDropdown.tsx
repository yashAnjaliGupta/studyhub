'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, ChevronDown } from 'lucide-react';

interface UserDropdownProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const getInitials = (name?: string | null, email?: string | null) => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (parts.length >= 2 && first && last) {
      const fChar = first[0] || '';
      const lChar = last[0] || '';
      return (fChar + lChar).toUpperCase();
    }
    if (first) {
      return first.substring(0, 2).toUpperCase();
    }
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '?';
};

export const UserDropdown = ({ user }: UserDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const toggleDropdown = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  const initials = getInitials(user.name, user.email);

  return (
    <div
      ref={containerRef}
      className="relative inline-block text-left"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={toggleDropdown}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
        className="flex items-center gap-1.5 focus:outline-none group cursor-pointer"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 font-bold text-white shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg ring-2 ring-white/30 group-hover:ring-white/80 overflow-hidden">
          {user.image && !imgError ? (
            <img
              src={user.image}
              alt={user.name || 'User avatar'}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl bg-white p-2 text-slate-800 shadow-2xl ring-1 ring-black/5 backdrop-blur-lg z-50 transition-all animate-in fade-in zoom-in-95 duration-150">
          {/* User Info Header */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 border border-slate-100/80">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white text-sm shadow-sm">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user.name || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate font-normal">
                {user.email || ''}
              </p>
            </div>
          </div>

          <div className="my-1.5 h-px bg-slate-100" />

          {/* Action Items */}
          <div className="space-y-0.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0 text-red-500" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
