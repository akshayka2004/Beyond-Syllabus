"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, BookOpen, Search, ChevronRight, GraduationCap } from "lucide-react";
import { cn, titleCase } from "@/lib/utils";
import { useData } from "@/contexts/dataContext";
import ErrorDisplay from "@/components/ErrorDisplay";
import { Spinner } from "@/components/ui/spinner";
import { getLastSelection, saveLastSelection } from "@/lib/journey";
import { findSharedYearPrograms } from "@/lib/semesters";

const cap = (s?: string) => titleCase(s);
const semName = (id: string) => `Semester ${id.replace("s", "").replace(/^0+/, "")}`;
const semNum = (id: string) => Number(id.replace(/\D/g, "")) || 999;

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

const MotionDiv = motion.div;

/** A searchable, card-style picker — friendlier than a native dropdown. */
function SearchPicker({
  items,
  labelFor,
  onPick,
  placeholder,
  icon,
}: {
  items: string[];
  labelFor: (id: string) => string;
  onPick: (id: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const filtered = items
    .filter((i) => labelFor(i).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => labelFor(a).localeCompare(labelFor(b)));

  return (
    <div className="w-full max-w-md">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pr-1">
        {filtered.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm transition hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon || <BookOpen className="h-4 w-4" />}
            </span>
            <span className="flex-1 font-medium">{labelFor(id)}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            No matches for “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}

export function SelectionForm() {
  const router = useRouter();
  const {
    data: directory,
    universities,
    isFetching,
    isError,
    error,
    ensureUniversity,
  } = useData();

  const [step, setStep] = useState(1);
  const [u, setU] = useState<string | null>(null);
  const [p, setP] = useState<string | null>(null);
  const [sch, setSch] = useState<string | null>(null);
  const [sem, setSem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [lastSelection] = useState(() => getLastSelection());
  const hydratedFromUrl = useRef(false);

  // Breadcrumbs across the app link here with ?university=&program=&scheme=.
  // Honor them: land the visitor on the right step with state restored,
  // instead of silently resetting to step 1.
  useEffect(() => {
    if (hydratedFromUrl.current) return;
    if (!universities || !universities.length) return;
    const q = new URLSearchParams(window.location.search);
    const qu = q.get("university");
    if (!qu || !universities.includes(qu)) return;
    hydratedFromUrl.current = true;
    const qp = q.get("program");
    const qsch = q.get("scheme");
    (async () => {
      setIsLoading(true);
      setLoadingMessage("Restoring your place...");
      await ensureUniversity(qu);
      setU(qu);
      if (qp && qsch) {
        setP(qp);
        setSch(qsch);
        setStep(4);
      } else if (qp) {
        setP(qp);
        setStep(3);
      } else {
        setStep(2);
      }
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universities]);

  const steps = ["University", "Program", "Scheme", "Semester"];

  const uniData = u ? directory[u] : null;
  const progData = u && p ? directory[u][p] : null;
  const schemeData = u && p && sch ? directory[u][p][sch] : null;

  const loadStep = async (
    message: string,
    nextStep: number,
    fn: () => void,
    task?: () => Promise<unknown>
  ) => {
    setIsLoading(true);
    setLoadingMessage(message);
    await Promise.all([task?.(), new Promise((r) => setTimeout(r, 200))]);
    fn();
    setIsLoading(false);
    setStep(nextStep);
  };

  const reset = (level: number) => {
    if (level <= 1) setU(null);
    if (level <= 2) setP(null);
    if (level <= 3) setSch(null);
    if (level <= 4) setSem(null);
    setStep(level);
  };

  // Takes the semester id directly: reading `sem` state here would race the
  // setState from the same click (the old first-tap-does-nothing bug).
  const submit = (semId: string) => {
    if (!u || !p || !sch) return;
    saveLastSelection({ university: u, program: p, scheme: sch, semester: semId });
    setIsLoading(true);
    setLoadingMessage("Loading your subjects...");
    router.push(`/${u}/${p}/${sch}/${semId}`);
  };

  if (isFetching) return null;
  if (isError) return <ErrorDisplay errorMessage={error?.message || "Error fetching data"} />;
  if (!universities || !universities.length)
    return <ErrorDisplay errorMessage="No directory data available." />;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg rounded-2xl bg-card border border-border mt-[5vh]">
      <div className="flex items-center justify-center p-3 border-b border-border md:gap-2">
        {steps.map((label, i) => {
          const num = i + 1;
          const active = step === num;
          const done = step > num;
          return (
            <div key={label} className="flex items-center">
              <Button
                disabled={!active && !done}
                variant={"ghost"}
                onClick={() => reset(num)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : done
                      ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20"
                      : "bg-muted text-muted-foreground border-transparent cursor-not-allowed"
                )}
              >
                {label}
              </Button>
              {num < steps.length && <span className="mx-1 text-muted-foreground text-xs">›</span>}
            </div>
          );
        })}
      </div>

      <CardHeader>
        <CardTitle className="text-center text-xl font-bold">Find Your Syllabus</CardTitle>
        <CardDescription className="text-center">
          Follow the steps to find the curriculum for your course.
        </CardDescription>
      </CardHeader>

        <CardContent className="space-y-4 flex items-center justify-center min-h-[220px] md:min-h-[300px] px-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <MotionDiv
              key="loading"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full text-center space-y-4"
            >
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary" />
                  <Spinner className="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <h3 className="text-lg font-semibold text-primary">{loadingMessage}</h3>
                  <p className="text-muted-foreground text-sm">
                    Please wait while we prepare your content...
                  </p>
                </motion.div>
              </div>
            </MotionDiv>
          ) : (
            <>
              {step === 1 && (
                <MotionDiv key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex w-full justify-center">
                  <div className="flex w-full flex-col items-center gap-4">
                    {lastSelection && universities.includes(lastSelection.university) && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/${lastSelection.university}/${lastSelection.program}/${lastSelection.scheme}/${lastSelection.semester}`
                          )
                        }
                        className="w-full max-w-md rounded-xl border border-primary/40 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
                      >
                        <p className="text-xs text-muted-foreground">Continue where you left off</p>
                        <p className="text-sm font-semibold">
                          {cap(lastSelection.program)} · {semName(lastSelection.semester)}
                        </p>
                      </button>
                    )}
                    <div className="text-center">
                      <p className="text-lg font-bold">Which university?</p>
                      <p className="text-sm text-muted-foreground">Search or pick from the list.</p>
                    </div>
                    <SearchPicker
                      items={universities}
                      labelFor={cap}
                      placeholder="Search universities…"
                      icon={<GraduationCap className="h-4 w-4" />}
                      onPick={(v) =>
                        loadStep("Loading programs...", 2, () => setU(v), () => ensureUniversity(v))
                      }
                    />
                  </div>
                </MotionDiv>
              )}

              {step === 2 && uniData && (
                <MotionDiv key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="flex w-full justify-center">
                  <div className="flex w-full flex-col items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold">Choose your program</p>
                      <p className="text-sm text-muted-foreground">{cap(u ?? "")}</p>
                    </div>
                    <SearchPicker
                      items={Object.keys(uniData)}
                      labelFor={cap}
                      placeholder="Search programs…"
                      onPick={(v) => {
                        // One scheme? Choosing from a single option is not a
                        // decision: skip straight to semesters.
                        const schemes = u ? Object.keys(directory[u]?.[v] ?? {}) : [];
                        if (schemes.length === 1) {
                          loadStep("Loading semesters...", 4, () => {
                            setP(v);
                            setSch(schemes[0]);
                          });
                        } else {
                          loadStep("Loading schemes...", 3, () => setP(v));
                        }
                      }}
                    />
                  </div>
                </MotionDiv>
              )}

              {step === 3 && progData && (
                <MotionDiv key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3 w-full">
                  <div className="flex items-center gap-2 justify-center">
                    <Label className="text-base font-semibold">3. Select Scheme</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Your syllabus depends on your scheme.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(progData)
                      .sort()
                      .map((id) => (
                        <button
                          key={id}
                          type="button"
                          className={cn(
                            "p-4 rounded-xl border-2 transition hover:shadow-md hover:bg-primary/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                            sch === id ? "border-primary bg-primary/10" : "border-border"
                          )}
                          onClick={() => loadStep("Loading semesters...", 4, () => setSch(id))}
                        >
                          <BookOpen className="h-7 w-7 mx-auto mb-2 text-primary" />
                          <p className="font-semibold text-sm">{cap(id)}</p>
                        </button>
                      ))}
                  </div>
                </MotionDiv>
              )}

              {step === 4 && schemeData && (
                <MotionDiv key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-3 w-full">
                  <Label className="text-center block font-semibold">4. Pick Semester</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.keys(schemeData)
                        .sort((a, b) => semNum(a) - semNum(b))
                        .map((id) => (
                          <button
                            key={id}
                            type="button"
                            aria-label={`Open ${semName(id)}`}
                            className={cn(
                              "rounded-xl p-4 border-2 transition cursor-pointer hover:shadow-md hover:bg-primary/10",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                              sem === id ? "border-primary bg-primary/10" : "border-border"
                            )}
                            onClick={() => {
                              setSem(id);
                              submit(id);
                            }}
                          >
                            <BookOpen className="h-5 w-5 mb-1 mx-auto text-primary" />
                            <p className="text-xs font-semibold text-center">{semName(id)}</p>
                          </button>
                        ))}
                    </div>
                    {(() => {
                      const semesterIds = Object.keys(schemeData);
                      const nums = semesterIds.map(semNum).sort((a, b) => a - b);
                      const hasGaps =
                        nums.length > 0 &&
                        (nums[0] > 1 || nums[nums.length - 1] - nums[0] + 1 !== nums.length);
                      if (!hasGaps) return null;

                      // Some universities publish the first year separately,
                      // shared across branches (KTU 2024 does this). If a
                      // sibling program covers the missing early semesters,
                      // the syllabus is not missing, just filed elsewhere.
                      const shared =
                        u && sch
                          ? findSharedYearPrograms({
                              programs: directory[u],
                              currentProgramId: p ?? "",
                              schemeId: sch,
                              currentSemesterIds: semesterIds,
                            })
                          : [];

                      if (shared.length) {
                        return (
                          <div className="pt-2 space-y-2 text-center">
                            <p className="text-xs text-muted-foreground">
                              Looking for your first year? At this university it is
                              shared across branches, so those semesters are
                              published separately:
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {shared.map((sp) => (
                                <button
                                  key={sp.id}
                                  type="button"
                                  onClick={() => {
                                    setP(sp.id);
                                    setStep(4);
                                  }}
                                  className="text-xs px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  {cap(sp.id)}
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · Sem {sp.semesters.join(", ")}
                                  </span>
                                </button>
                              ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Not sure which one is yours? Your university&apos;s scheme
                              document says which group your branch belongs to.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Not seeing your semester? It hasn’t been added yet.
                        </p>
                      );
                    })()}
                </MotionDiv>
              )}
            </>
          )}
        </AnimatePresence>
      </CardContent>

      <CardFooter className="p-3 flex justify-between">
        <Button
          variant="default"
          size="sm"
          onClick={() => (step === 1 ? router.push("/") : reset(step - 1))}
        >
          Back
        </Button>
      </CardFooter>
    </Card>
  );
}
