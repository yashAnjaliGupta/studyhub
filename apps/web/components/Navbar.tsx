import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { getServerSession } from "next-auth";
import { authOptions } from "../app/api/auth/[...nextauth]/route";
import { UserDropdown } from "./UserDropdown";

export const Navbar = async () => {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-50 border-b bg-blue-700 text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/">
          <div className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap />
            StudyHub
          </div>
        </Link>

        <div className="mx-10 hidden w-full max-w-xl md:block">
          <SearchBar />
        </div>

        {session && session.user ? (
          <UserDropdown user={session.user} />
        ) : (
          <Link
            href="/signin"
            className="rounded-full bg-white px-5 py-2 font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
};