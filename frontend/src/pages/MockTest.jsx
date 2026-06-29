import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timer, Play, ChevronLeft, ChevronRight, Flag, CheckCircle2, XCircle, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import usePageTitle from "@/lib/usePageTitle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ALL = "__all__";

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function MockTest() {
  usePageTitle("Mock Test");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stage, setStage] = useState("setup"); // setup | running | result
  const [filters, setFilters] = useState({ exams: [], subjects: [] });
  const [exam, setExam] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [count, setCount] = useState("10");
  const [duration, setDuration] = useState("600"); // seconds
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    api.get("/questions/filters").then((res) => setFilters(res.data));
  }, []);

  const submit = useCallback(async () => {
    clearInterval(intervalRef.current);
    const qids = questions.map((q) => q.id);
    const ans = qids.map((qid) => (answers[qid] === undefined ? null : answers[qid]));
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

    let score = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_index) score++;
    });

    if (user) {
      try {
        const res = await api.post("/attempts", {
          mode: "mock",
          exam: exam !== ALL ? exam : null,
          year: null,
          question_ids: qids,
          answers: ans,
          time_taken_sec: timeTaken,
        });
        setResult({ ...res.data, questions });
      } catch (e) {
        setResult({ score, total: questions.length, time_taken_sec: timeTaken, questions, answers: ans, question_ids: qids });
      }
    } else {
      setResult({ score, total: questions.length, time_taken_sec: timeTaken, questions, answers: ans, question_ids: qids });
    }
    setStage("result");
  }, [questions, answers, user, exam]);

  useEffect(() => {
    if (stage !== "running") return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          submit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [stage, submit]);

  const start = async () => {
    const params = { count: Number(count) };
    if (exam !== ALL) params.exam = exam;
    if (subject !== ALL) params.subject = subject;
    const res = await api.get("/questions/random", { params });
    if (res.data.length < Number(count)) {
      toast.warning(`ફક્ત ${res.data.length} પ્રશ્નો ઉપલબ્ધ છે`);
    }
    if (!res.data.length) {
      toast.error("કોઈ પ્રશ્ન મળ્યો નથી");
      return;
    }
    setQuestions(res.data);
    setAnswers({});
    setIdx(0);
    setTimeLeft(Number(duration));
    startTimeRef.current = Date.now();
    setStage("running");
  };

  if (stage === "setup") {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">Mock Test</h1>
          <p className="mt-2 text-gray-600 font-gujarati">ટાઈમર સાથે વાસ્તવિક પરીક્ષાનો અનુભવ</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Exam</label>
              <Select value={exam} onValueChange={setExam}>
                <SelectTrigger data-testid="mock-exam"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All exams</SelectItem>
                  {filters.exams.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger data-testid="mock-subject"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All subjects</SelectItem>
                  {filters.subjects.map((s) => <SelectItem key={s} value={s}><span className="font-gujarati">{s}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Questions</label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger data-testid="mock-count"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["10", "15", "20", "25"].map((n) => <SelectItem key={n} value={n}>{n} questions</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger data-testid="mock-duration"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                  <SelectItem value="900">15 minutes</SelectItem>
                  <SelectItem value="1800">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            <p className="font-medium">Rules:</p>
            <ul className="mt-1 list-disc list-inside text-amber-700 font-gujarati">
              <li>Timer ઓટોમેટિક submit કરશે</li>
              <li>બધા પ્રશ્નોના જવાબ આપો અને Submit પર click કરો</li>
              <li>Mock test દરમ્યાન જવાબ બતાવાશે નહીં</li>
            </ul>
          </div>

          <Button onClick={start} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="start-mock-btn">
            <Play className="h-4 w-4 mr-2" /> Start Mock Test
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "running") {
    const current = questions[idx];
    const sel = answers[current.id];
    const lowTime = timeLeft < 60;
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Sticky top */}
        <div className="sticky top-16 z-30 bg-gray-50/95 backdrop-blur border-b border-gray-200 -mx-4 px-4 py-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono-stat text-gray-600">{idx + 1} / {questions.length}</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md border ${lowTime ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-gray-200 text-gray-900"}`}>
              <Timer className="h-4 w-4" />
              <span className="font-mono-stat text-base font-semibold" data-testid="mock-timer">{fmt(timeLeft)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              data-testid="submit-mock-btn"
            >
              <Flag className="h-4 w-4 mr-1" /> Submit
            </Button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs mb-4">
            <span className="font-mono-stat text-gray-500">Q{String(idx + 1).padStart(2, "0")}</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{current.exam}</span>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-mono-stat">{current.year}</span>
            <span className="text-gray-500 font-gujarati">{current.subject}</span>
          </div>
          <p className="font-gujarati text-xl sm:text-2xl leading-relaxed text-gray-900 mb-6" data-testid={`mock-question-${idx}`}>
            {current.question_text}
          </p>
          <div className="space-y-3">
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setAnswers((a) => ({ ...a, [current.id]: i }))}
                className={`mcq-option w-full flex items-start gap-3 p-4 border border-gray-200 rounded-md text-left ${sel === i ? "selected" : ""}`}
                data-testid={`mock-option-${idx}-${i}`}
              >
                <span className="font-mono-stat font-semibold text-gray-700 min-w-[24px]">{opt.label}.</span>
                <span className="font-gujarati text-lg leading-relaxed">{opt.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-gray-500 font-mono-stat hidden sm:block">{Object.keys(answers).length} answered</span>
          {idx < questions.length - 1 ? (
            <Button onClick={() => setIdx((i) => i + 1)} className="bg-blue-600 hover:bg-blue-700 btn-lift">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 btn-lift">
              <Flag className="h-4 w-4 mr-1" /> Submit
            </Button>
          )}
        </div>

        {/* Question palette */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Questions</p>
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
            {questions.map((q, i) => {
              const answered = answers[q.id] !== undefined;
              const active = i === idx;
              return (
                <button
                  key={q.id}
                  onClick={() => setIdx(i)}
                  className={`h-9 w-9 rounded-md text-xs font-mono-stat border transition-all ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : answered
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                  data-testid={`palette-${i}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit mock test?</AlertDialogTitle>
              <AlertDialogDescription>
                {questions.length - Object.keys(answers).length} questions unanswered. તમે submit કરવા માંગો છો?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={submit} data-testid="confirm-submit">
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Result stage
  const pct = result ? Math.round((result.score / result.total) * 100) : 0;
  const shareText = result
    ? `🎯 GPSC Mock Test: ${result.score}/${result.total} (${pct}%) — તમે પણ free માં try કરો! ${window.location.origin}/mock`
    : "";
  const shareCard = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My GPSC Mock Test Score",
          text: shareText,
          url: `${window.location.origin}/mock`,
        });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toast.success("Result copied to clipboard");
    } catch (e) {
      // user cancelled share or clipboard failed
    }
  };
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-50/60 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">Mock Test Result</p>
          <p className="font-mono-stat text-5xl sm:text-6xl font-bold text-gray-900" data-testid="result-score">
            {result.score} / {result.total}
          </p>
          <p className="mt-3 text-2xl font-medium text-gray-700">{pct}%</p>
          <p className="mt-2 text-sm text-gray-500 font-mono-stat">Time: {fmt(result.time_taken_sec)}</p>
          {pct >= 80 && (
            <p className="mt-3 inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-medium font-gujarati">
              🏆 શાનદાર! Streak જાળવી રાખો
            </p>
          )}
        </div>

        {/* Share row */}
        <div className="mt-8">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Share your result</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={shareCard}
              className="btn-lift"
              data-testid="share-native-btn"
            >
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors btn-lift"
              data-testid="share-whatsapp"
            >
              WhatsApp
            </a>
            <a
              href={twUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-gray-900 hover:bg-black text-white text-sm font-medium transition-colors btn-lift"
              data-testid="share-twitter"
            >
              Twitter
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setStage("setup")} variant="outline" data-testid="retry-mock">Try Again</Button>
          <Button onClick={() => navigate("/dashboard")} className="bg-blue-600 hover:bg-blue-700">View Dashboard</Button>
          <Button onClick={() => navigate("/leaderboard")} variant="outline">Leaderboard</Button>
        </div>
      </div>

      {/* Review */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-medium text-gray-900">Review</h2>
        {questions.map((q, i) => {
          const sel = result.answers?.[i];
          const isRight = sel === q.correct_index;
          return (
            <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                {isRight ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-1 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-1 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-mono-stat">Q{i + 1}</p>
                  <p className="font-gujarati text-base text-gray-900 mt-1 leading-relaxed">{q.question_text}</p>
                  <div className="mt-3 space-y-1.5 text-sm font-gujarati">
                    {q.options.map((o, oi) => {
                      const isCorrect = oi === q.correct_index;
                      const isPicked = oi === sel;
                      return (
                        <div
                          key={oi}
                          className={`px-3 py-2 rounded border ${
                            isCorrect
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : isPicked
                              ? "border-red-300 bg-red-50 text-red-800"
                              : "border-gray-200 text-gray-700"
                          }`}
                        >
                          <span className="font-mono-stat mr-2">{o.label}.</span>
                          {o.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
