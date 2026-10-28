import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@repo/auth";
import { UserDropdown } from "./UserDropdown";

export const Navbar = async () => {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-50 border-b border-blue-600/30 bg-blue-700/95 backdrop-blur text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white transition hover:opacity-95">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur ring-1 ring-white/30">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span>StudyHub</span>
          </Link>
        </div>

        <div className="mx-6 hidden flex-1 max-w-lg md:block">
          <SearchBar />
        </div>

        <div className="flex items-center gap-3">
          {session && session.user ? (
            <UserDropdown user={session.user} />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/signin"
                className="rounded-full px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};