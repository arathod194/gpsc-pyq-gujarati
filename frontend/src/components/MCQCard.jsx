import React, { useState } from "react";
import { Sparkles, Loader2, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

/**
 * MCQCard – renders a single MCQ question with selectable options, reveal state,
 * AI explanation trigger, and optional bookmark toggle.
 *
 * props:
 *   question: Question object
 *   index: number (1-based for display)
 *   mode: "practice" | "mock"
 *   selected: number | null
 *   onSelect: (idx) => void
 *   revealed: boolean (in mock mode usually false until result)
 *   showAnswer: boolean (whether to show correct/wrong markers)
 *   bookmarked: boolean
 *   onBookmarkToggle: () => void
 */
export default function MCQCard({
  question,
  index,
  mode = "practice",
  selected,
  onSelect,
  revealed,
  showAnswer,
  bookmarked,
  onBookmarkToggle,
}) {
  const { user } = useAuth();
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchExplanation = async () => {
    setAiLoading(true);
    try {
      const res = await api.post("/ai/explain", { question_id: question.id });
      setAiText(res.data.explanation);
    } catch (e) {
      toast.error("AI સમજૂતી લાવી શકાઈ નથી. પછી પ્રયત્ન કરો.");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast.error("Bookmark કરવા માટે Login કરો");
      return;
    }
    try {
      if (bookmarked) {
        await api.delete(`/bookmarks/${question.id}`);
      } else {
        await api.post("/bookmarks", { question_id: question.id });
      }
      onBookmarkToggle && onBookmarkToggle();
    } catch (e) {
      toast.error("Bookmark સેવ થઈ નથી");
    }
  };

  const optionClass = (idx) => {
    let base = "mcq-option flex items-start gap-3 p-4 border border-gray-200 rounded-md cursor-pointer text-left";
    if (showAnswer) {
      if (idx === question.correct_index) base += " correct";
      else if (idx === selected && idx !== question.correct_index) base += " wrong";
    } else if (selected === idx) {
      base += " selected";
    }
    return base;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 page-enter">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono-stat text-gray-500">Q{String(index).padStart(2, "0")}</span>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium">
            {question.exam}
          </span>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium font-mono-stat">
            {question.year}
          </span>
          <span className="text-gray-500 font-gujarati">{question.subject}</span>
        </div>
        {user && (
          <button
            onClick={toggleBookmark}
            data-testid={`bookmark-btn-${question.id}`}
            className="text-gray-400 hover:text-blue-600 transition-colors"
            aria-label="Bookmark"
          >
            {bookmarked ? <BookmarkCheck className="h-5 w-5 text-blue-600" /> : <Bookmark className="h-5 w-5" />}
          </button>
        )}
      </div>

      <p className="font-gujarati text-xl sm:text-2xl leading-relaxed text-gray-900 mb-6" data-testid={`question-text-${question.id}`}>
        {question.question_text}
      </p>

      <div className="space-y-3">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={mode === "practice" && showAnswer}
            onClick={() => onSelect(idx)}
            className={optionClass(idx)}
            data-testid={`option-${question.id}-${idx}`}
          >
            <span className="font-mono-stat font-semibold text-gray-700 min-w-[24px]">
              {opt.label}.
            </span>
            <span className="font-gujarati text-lg leading-relaxed">{opt.text}</span>
          </button>
        ))}
      </div>

      {showAnswer && question.official_explanation && (
        <div className="mt-6 ai-explain rounded-md p-4">
          <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">
            Official Explanation
          </p>
          <p className="font-gujarati text-base text-gray-800 leading-relaxed">
            {question.official_explanation}
          </p>
        </div>
      )}

      {showAnswer && (
        <div className="mt-4">
          {!aiText && !aiLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExplanation}
              data-testid={`ai-explain-btn-${question.id}`}
              className="btn-lift"
            >
              <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
              AI સમજૂતી મેળવો
            </Button>
          )}
          {aiLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-gujarati">સમજૂતી તૈયાર થઈ રહી છે...</span>
            </div>
          )}
          {aiText && (
            <div className="mt-2 ai-explain rounded-md p-4" data-testid={`ai-explanation-${question.id}`}>
              <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> AI Explanation
              </p>
              <p className="font-gujarati text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                {aiText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
