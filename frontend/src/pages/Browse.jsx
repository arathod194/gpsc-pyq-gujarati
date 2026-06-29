import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import AdSlot from "@/components/AdSlot";
import usePageTitle from "@/lib/usePageTitle";
import { QuestionCardSkeleton } from "@/components/Skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export default function Browse() {
  usePageTitle("Browse PYQs");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ exams: [], years: [], subjects: [] });
  const [exam, setExam] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/questions/filters").then((res) => setFilters(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (exam !== ALL) params.exam = exam;
    if (year !== ALL) params.year = Number(year);
    if (subject !== ALL) params.subject = subject;
    if (q.trim()) params.q = q.trim();
    api
      .get("/questions", { params })
      .then((res) => setQuestions(res.data))
      .finally(() => setLoading(false));
  }, [exam, year, subject, q]);

  const clearFilters = () => {
    setExam(ALL);
    setYear(ALL);
    setSubject(ALL);
    setQ("");
  };

  const hasFilters = exam !== ALL || year !== ALL || subject !== ALL || q.trim();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">Browse Questions</h1>
        <p className="mt-2 text-gray-600">પરીક્ષા, વર્ષ અને વિષય પ્રમાણે ફિલ્ટર કરો</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
              data-testid="browse-search-input"
            />
          </div>
          <Select value={exam} onValueChange={setExam}>
            <SelectTrigger data-testid="filter-exam">
              <SelectValue placeholder="All exams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All exams</SelectItem>
              {filters.exams.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger data-testid="filter-year">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All years</SelectItem>
              {filters.years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger data-testid="filter-subject">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All subjects</SelectItem>
              {filters.subjects.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="font-gujarati">{s}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-gray-500 font-mono-stat">{questions.length} results</p>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:underline flex items-center gap-1"
              data-testid="clear-filters"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="browse-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <QuestionCardSkeleton key={i} />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-600">કોઈ પ્રશ્નો મળ્યા નથી</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questions.map((qst, i) => (
            <React.Fragment key={qst.id}>
              <div
                onClick={() => navigate(`/question/${qst.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all"
                data-testid={`question-card-${qst.id}`}
              >
                <div className="flex items-center gap-2 text-xs mb-3">
                  <span className="font-mono-stat text-gray-500">Q{String(i + 1).padStart(2, "0")}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{qst.exam}</span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-mono-stat">{qst.year}</span>
                </div>
                <p className="font-gujarati text-base text-gray-900 leading-relaxed line-clamp-3">
                  {qst.question_text}
                </p>
                <p className="mt-3 text-xs text-gray-500 font-gujarati">{qst.subject} {qst.topic && `· ${qst.topic}`}</p>
              </div>
              {(i + 1) % 6 === 0 && i !== questions.length - 1 && (
                <div className="md:col-span-2">
                  <AdSlot slot={process.env.REACT_APP_ADSENSE_SLOT_INLINE} format="auto" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => {
              const ids = questions.map((q) => q.id);
              sessionStorage.setItem("practice_qids", JSON.stringify(ids));
              navigate("/practice/run");
            }}
            className="bg-blue-600 hover:bg-blue-700 btn-lift"
            data-testid="practice-results-btn"
          >
            Practice all {questions.length} questions
          </Button>
        </div>
      )}
    </div>
  );
}
