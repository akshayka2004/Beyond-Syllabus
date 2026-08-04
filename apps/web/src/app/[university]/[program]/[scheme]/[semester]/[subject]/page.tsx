"use client";

import { notFound } from "next/navigation";
import { titleCase } from "@/lib/utils";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CourseModules } from "./_components/CourseModules";
import { ExamRunwayCard } from "./_components/ExamRunwayCard";
import { PyqCard } from "./_components/PyqCard";
import ErrorDisplay from "@/components/ErrorDisplay";
import { AnimatedDiv } from "@/components/AnimatedDiv";

import { useUniversityData } from "@/contexts";
import { Spinner } from "@/components/ui/spinner";
import { use, useEffect } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SubjectPageProps, DirectoryStructure } from "@/lib/types";
import { Header } from "@/components/Header";

function findDataPath(
  directoryStructure: DirectoryStructure,
  resolvedParams: {
    university: string;
    program: string;
    scheme: string;
    semester: string;
    subject: string;
  }
): {
  university: any;
  program: any;
  scheme: any;
  semester: any;
  subject: any;
} | null {
  const {
    university: universityId,
    program: programId,
    scheme: schemeId,
    semester: semesterId,
    subject: subjectId,
  } = resolvedParams;

  const university = { id: universityId, name: capitalizeWords(universityId) };
  const universityData = directoryStructure[universityId];
  if (!universityData) return null;

  const program = { id: programId, name: capitalizeWords(programId) };
  const programData = universityData[programId];
  if (!programData) return null;

  const scheme = { id: schemeId, name: capitalizeWords(schemeId) };
  const schemeData = programData[schemeId];
  if (!schemeData) return null;

  const semester = {
    id: semesterId,
    name: formatSemesterName(semesterId),
    subjects: Array.isArray(schemeData[semesterId]?.subjects)
      ? schemeData[semesterId].subjects
      : [],
  };
  if (!schemeData[semesterId]) return null;

  const subject = semester.subjects.find((sub: any) => sub.id === subjectId);
  if (!subject) return null;

  return { university, program, scheme, semester, subject };
}

function formatSemesterName(semesterId: string): string {
  if (!semesterId) return "";
  return `Semester ${semesterId.replace("s", "").replace(/^0+/, "")}`;
}
function capitalizeWords(str: string | undefined): string {
  return titleCase(str);
}

export default function SubjectPage({ params }: SubjectPageProps) {
  const resolvedParams = use(params);
  const {
    error,
    isError,
    isFetching,
    data: directoryStructure,
  } = useUniversityData(resolvedParams.university);

  // Browser-tab / history title. Students search and share by subject code;
  // full crawler metadata needs the server-component refactor (M2).
  const pageData = directoryStructure
    ? findDataPath(directoryStructure, resolvedParams)
    : null;
  useEffect(() => {
    if (pageData) {
      document.title = `${capitalizeWords(pageData.subject.name)} (${
        pageData.subject.code ?? pageData.subject.id
      }) | Beyond Syllabus`;
    }
  }, [pageData]);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading syllabus data...</p>
        </div>
      </div>
    );
  }

  if (isError || !directoryStructure) {
    return (
      <ErrorDisplay
        errorMessage={error || "Could not fetch directory structure."}
      />
    );
  }

  const dataPath = pageData;

  if (!dataPath) {
    notFound();
  }

  const { university, program, scheme, semester, subject } = dataPath;

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: university.name, href: `/select?university=${university.id}` },
    {
      label: program.name,
      href: `/select?university=${university.id}&program=${program.id}`,
    },
    {
      label: scheme.name,
      href: `/select?university=${university.id}&program=${program.id}&scheme=${scheme.id}`,
    },
    {
      label: semester.name,
      href: `/${university.id}/${program.id}/${scheme.id}/${semester.id}`,
    },
    { label: capitalizeWords(subject.name) },
  ];

  return (
    <div className="paper-texture flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 mt-[10vh]">
        <AnimatedDiv>
          <div className="max-w-6xl mx-auto">
            <Breadcrumbs items={breadcrumbItems} />

            <div className="mt-8 mb-12">
              <h1 className="text-3xl font-bold md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                {capitalizeWords(subject.name)}
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                {subject.code}
              </p>

              {/* Hero: the notebook is the one place everything happens */}
              <div className="mt-6 rounded-2xl bg-peach p-5 md:p-6">
                <p className="text-sm text-muted-foreground">
                  This subject and its {(subject.modules || []).length} modules are
                  ready as a workspace. Chat with them, generate an exam paper,
                  build a concept map, and keep your notes — all in one place.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button size="lg" className="group h-[46px] shadow-md" asChild>
                    <Link
                      href={{
                        pathname: "/notebook",
                        query: {
                          university: university.id,
                          program: program.id,
                          scheme: scheme.id,
                          semester: semester.id,
                          subject: subject.id,
                        },
                      }}
                    >
                      <BookOpen className="mr-2 h-5 w-5" />
                      Open in Notebook
                      <ChevronRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {["Grounded chat", "Exam paper + answers", "Concept map", "Flashcards", "Audio overview"].map(
                      (f) => (
                        <span key={f} className="rounded-full border border-[hsl(var(--ink)/0.2)] px-2.5 py-1">
                          {f}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-12 lg:grid-cols-[1fr_350px] ">
              <div className="space-y-8 ">
                <h2 className="text-2xl font-bold">Course Modules</h2>
                <CourseModules
                  subjectId={subject.id}
                  modules={subject.modules || []}
                />
              </div>
              <div className=" flex gap-5 w-full flex-col">
                <ExamRunwayCard
                  subjectName={capitalizeWords(subject.name)}
                  modules={(subject.modules || []).map((m: any) => ({
                    title: m.title || "",
                    content: m.content || "",
                  }))}
                />
                <PyqCard
                  subjectName={capitalizeWords(subject.name)}
                  pyqs={(subject as any).pyqs || []}
                />
              </div>
            </div>
          </div>
        </AnimatedDiv>
      </main>
    </div>
  );
}
