import Image, { type ImageProps } from "next/image";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";
import Link from 'next/link'

import {
  Search,
  GraduationCap,
  ArrowRight,
  Atom,
  HeartPulse,
  Landmark,
  Cpu,
  Briefcase,
  BookOpen,
} from "lucide-react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

type Props = Omit<ImageProps, "src"> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;

  return (
    <>
      <Image {...rest} src={srcLight} className="imgLight" />
      <Image {...rest} src={srcDark} className="imgDark" />
    </>
  );
};


const exams = [
  {
    name: "CBSE",
    icon: BookOpen,
    description: "Central Board of Secondary Education resources.",

  },
  {
    name: "JEE",
    icon: Atom,
    description: "Engineering entrance exam for NITs & IIITs.",
  },
  {
    name: "NEET",
    icon: HeartPulse,
    description: "Medical entrance examination.",
  },
  // {
  //   name: "UPSC",
  //   icon: Landmark,
  //   description: "Civil Services preparation resources.",
  // },
  // {
  //   name: "GATE",
  //   icon: GraduationCap,
  //   description: "Engineering & PSU recruitment exam.",
  // },
  // {
  //   name: "CAT",
  //   icon: Briefcase,
  //   description: "MBA entrance examination.",
  // },
  // {
  //   name: "SSC",
  //   icon: BookOpen,
  //   description: "Government job examinations.",
  // },
  // {
  //   name: "Railway",
  //   icon: Cpu,
  //   description: "RRB recruitment exams.",
  // },
];

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 mb-16">

      {/* Banner */}
      <section className="mx-auto mt-6 max-w-7xl px-6">
        <div className="flex h-28 items-center justify-center rounded-xl border border-blue-200 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700">
          Advertisement Banner (728 × 90)
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto mt-10 grid max-w-7xl gap-8 px-6 lg:grid-cols-[1fr_220px]">
        <div>
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900">
              Select Your Exam
            </h1>

            <p className="mt-2 text-gray-500">
              Explore previous year papers, books, notes, syllabus and AI
              powered study material.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {exams.map((exam) => {
              const Icon = exam.icon;

              return (
                <Link href={exam.name || ""} key={exam.name}>
                  <div
                    key={exam.name}
                    className="group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Icon className="h-7 w-7" />
                    </div>

                    <h3 className="text-xl font-semibold text-slate-900">
                      {exam.name}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {exam.description}
                    </p>

                    <button className="mt-6 flex items-center gap-2 font-semibold text-blue-600 transition group-hover:gap-3">
                      Explore
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Ad */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex h-[600px] items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
            160 × 600 Ad
          </div>
        </aside>
      </section>
    </main>
  );
}

