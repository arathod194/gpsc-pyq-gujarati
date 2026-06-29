import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import MCQCard from "@/components/MCQCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function PracticeRun() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selections, setSelections] = useState({});
  const [revealed, setRevealed] = useState({});
  const [bookmarkSet, setBookmarkSet] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const isAi = sessionStorage.getItem("practice_ai") === "1";

  useEffect(() => {
    const load = async () => {
      const cached = sessionStorage.getItem("practice_qs");
      const idsCached = sessionStorage.getItem("practice_qids");
      let qs = [];
      if (cached) {
        qs = JSON.parse(cached);
      } else if (idsCached) {
        const ids = JSON.parse(idsCached);
        const res = await api.get("/questions", { params: { limit: 500 } });
        qs = res.data.filter((q) => ids.includes(q.id));
      } else {
        const res = await api.get("/questions/random", { params: { count: 10 } });
        qs = res.data;
      }
      setQuestions(qs);
      setLoading(false);

      // load bookmarks if logged in
      if (user) {
        try {
          const r = await api.get("/bookmarks");
          setBookmarkSet(new Set(r.data.map((b) => b.id)));
        } catch (e) {
          // Bookmark fetch failed; non-blocking
        }
      }
    };
    load();
    return () => {
      sessionStorage.removeItem("practice_ai");
    };
  }, [user]);

  const current = questions[idx];

  const onSelect = useCallback(
    (i) => {
      if (!current) return;
      setSelections((prev) => ({ ...prev, [current.id]: i }));
      setRevealed((prev) => ({ ...prev, [current.id]: true }));
    },
    [current]
  );

  const toggleBookmark = (qid) => {
    setBookmarkSet((prev) => {
      const n = new Set(prev);
      if (n.has(qid)) n.delete(qid);
      else n.add(qid);
      return n;
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading…</div>;
  }
  if (!questions.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 font-gujarati">કોઈ પ્રશ્ન મળ્યો નથી</p>
        <Button className="mt-4" onClick={() => navigate("/practice")}>Back</Button>
      </div>
    );
  }

  const completed = Object.keys(revealed).length;
  const correct = questions.filter((q) => selections[q.id] === q.correct_index).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/practice")} data-testid="back-to-practice">
          <Home className="h-4 w-4 mr-1" /> Exit
        </Button>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono-stat text-gray-600">{idx + 1} / {questions.length}</span>
          <span className="font-mono-stat text-emerald-600">{correct} correct</span>
          <span className="font-mono-stat text-gray-500">{completed} done</span>
        </div>
      </div>

      {/* Progress strip */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
        />
      </div>

      <MCQCard
        question={current}
        index={idx + 1}
        mode="practice"
        selected={selections[current.id] ?? null}
        onSelect={onSelect}
        showAnswer={!!revealed[current.id]}
        bookmarked={bookmarkSet.has(current.id) && !isAi}
        onBookmarkToggle={() => toggleBookmark(current.id)}
      />

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          data-testid="prev-question"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        {idx < questions.length - 1 ? (
          <Button
            onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
            className="bg-blue-600 hover:bg-blue-700 btn-lift"
            data-testid="next-question"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={() => navigate("/practice")}
            className="bg-emerald-600 hover:bg-emerald-700 btn-lift"
            data-testid="finish-practice"
          >
            Finish ({correct}/{questions.length})
          </Button>
        )}
      </div>
    </div>
  );
}
