import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Flame, CheckCircle2, XCircle, Trophy, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Daily() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const res = await api.get("/daily");
    setData(res.data);
    if (res.data.attempted) {
      setResult({
        correct: res.data.attempted.correct,
        correct_index: res.data.question.correct_index,
      });
      setSelected(res.data.attempted.selected_index);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (selected === null) {
      toast.error("એક option select કરો");
      return;
    }
    if (!user) {
      toast.error("Streak track કરવા Login કરો");
      navigate("/login");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/daily/answer", { selected_index: selected });
      setResult(res.data);
      if (res.data.correct && !res.data.already_attempted) {
        toast.success(`Streak: ${res.data.current_streak} 🔥`);
      }
    } catch (e) {
      toast.error("Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) return <div className="text-center py-20 text-gray-500">Loading…</div>;

  const q = data.question;
  const showAnswer = result !== null;

  const optionClass = (idx) => {
    let base = "mcq-option w-full flex items-start gap-3 p-4 border border-gray-200 rounded-md text-left";
    if (showAnswer) {
      if (idx === q.correct_index) base += " correct";
      else if (idx === selected && idx !== q.correct_index) base += " wrong";
    } else if (selected === idx) base += " selected";
    return base;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Daily Question</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-1">{data.date}</h1>
        </div>
        {user && (
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Streak</p>
              <p className="font-mono-stat text-2xl font-semibold text-amber-600 flex items-center gap-1 justify-end" data-testid="daily-streak">
                <Flame className="h-5 w-5" />
                {data.current_streak}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Longest</p>
              <p className="font-mono-stat text-2xl font-semibold text-gray-900 flex items-center gap-1 justify-end">
                <Trophy className="h-5 w-5 text-amber-500" />
                {data.longest_streak}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs mb-4">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{q.exam}</span>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-mono-stat">{q.year}</span>
          <span className="text-gray-500 font-gujarati">{q.subject}</span>
        </div>
        <p className="font-gujarati text-xl sm:text-2xl leading-relaxed text-gray-900 mb-6" data-testid="daily-question-text">
          {q.question_text}
        </p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              disabled={showAnswer}
              onClick={() => setSelected(i)}
              className={optionClass(i)}
              data-testid={`daily-option-${i}`}
            >
              <span className="font-mono-stat font-semibold text-gray-700 min-w-[24px]">{opt.label}.</span>
              <span className="font-gujarati text-lg leading-relaxed">{opt.text}</span>
            </button>
          ))}
        </div>

        {!showAnswer ? (
          <Button
            onClick={submit}
            disabled={submitting || selected === null}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 btn-lift"
            data-testid="daily-submit-btn"
          >
            {submitting ? "Submitting…" : "Submit Answer"}
          </Button>
        ) : (
          <div className="mt-6">
            <div className={`flex items-center gap-2 p-4 rounded-md border ${result.correct ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-800"}`}>
              {result.correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <p className="font-medium font-gujarati">
                {result.correct ? "સાચો જવાબ! Streak જાળવી રાખો." : "ખોટું. કાલે પાછા આવો!"}
              </p>
            </div>
            {q.official_explanation && (
              <div className="ai-explain rounded-md p-4 mt-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Explanation</p>
                <p className="font-gujarati text-base text-gray-800 leading-relaxed">{q.official_explanation}</p>
              </div>
            )}
            <Button
              onClick={() => navigate("/practice")}
              variant="outline"
              className="mt-4"
              data-testid="daily-go-practice"
            >
              Continue Practice <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
