import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-blue-800 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <div>
          <h3 className="text-lg font-bold">StudyHub</h3>
          <p className="text-sm text-blue-100">
            Smart learning platform for competitive exams.
          </p>
        </div>

        <div className="flex gap-8 text-sm text-blue-100">
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
        </div>

        <p className="text-sm text-blue-100">© 2026 StudyHub</p>
      </div>
    </footer>
  );
};