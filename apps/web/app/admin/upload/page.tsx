import { FaCloudUploadAlt } from "react-icons/fa";
import { IoShieldCheckmark } from "react-icons/io5";
import Uploadmetadata from "../../../components/FileUpload";

export default function(){

  return (<div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-blue-600 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">SmartExamsHub</h1>
            <p className="text-sm text-blue-100">
              Admin Upload Center
            </p>
          </div>

          <nav className="flex gap-3">
            <button className="rounded-full bg-white px-4 py-2 text-blue-600 font-medium">
              Dashboard
            </button>

            <button className="rounded-full px-4 py-2 hover:bg-white/10">
              Uploads
            </button>

            <button className="rounded-full px-4 py-2 hover:bg-white/10">
              Library
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Hero */}
        <section className="rounded-3xl bg-gradient-to-r from-blue-600 to-blue-700 p-10 text-white shadow">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-widest">
            Content Ingestion
          </span>

          <h2 className="mt-4 text-4xl font-bold">
            Upload study files for exams, classes,
            subjects and content type
          </h2>

          <p className="mt-4 max-w-3xl text-blue-100">
            Add PDF or DOCX files and categorize them by exam,
            class, subject and type so students can browse
            books and question papers quickly.
          </p>
        </section>
          <Uploadmetadata />
      </main>
    </div>);
}