import React, { useEffect, useState } from "react";
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
import { Brain, Sparkles, Play } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const ALL = "__all__";

export default function PracticeStart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ exams: [], years: [], subjects: [] });
  const [exam, setExam] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [count, setCount] = useState("10");
  const [aiTopic, setAiTopic] = useState("");
  const [aiSubject, setAiSubject] = useState("ઇતિહાસ");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    api.get("/questions/filters").then((res) => setFilters(res.data));
  }, []);

  const startPractice = async () => {
    const params = { count: Number(count) };
    if (exam !== ALL) params.exam = exam;
    if (subject !== ALL) params.subject = subject;
    const res = await api.get("/questions/random", { params });
    if (!res.data.length) {
      toast.error("આ ફિલ્ટર માટે કોઈ પ્રશ્ન મળ્યા નથી");
      return;
    }
    sessionStorage.setItem("practice_qs", JSON.stringify(res.data));
    sessionStorage.removeItem("practice_qids");
    navigate("/practice/run");
  };

  const startAIPractice = async () => {
    if (!user) {
      toast.error("AI practice માટે Login કરો");
      navigate("/login");
      return;
    }
    if (!aiTopic.trim()) {
      toast.error("Topic લખો");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post("/ai/generate", {
        subject: aiSubject,
        topic: aiTopic,
        count: 5,
      });
      if (!res.data.questions?.length) {
        toast.error("AI questions generate થઈ શક્યા નહીં");
        return;
      }
      // Wrap AI questions to MCQCard shape with synthetic ids
      const wrapped = res.data.questions.map((q, i) => ({
        id: `ai-${Date.now()}-${i}`,
        exam: "AI Practice",
        year: new Date().getFullYear(),
        subject: q.subject || aiSubject,
        topic: q.topic || aiTopic,
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        official_explanation: q.official_explanation,
        ai_generated: true,
      }));
      sessionStorage.setItem("practice_qs", JSON.stringify(wrapped));
      sessionStorage.setItem("practice_ai", "1");
      navigate("/practice/run");
    } catch (e) {
      toast.error("AI generation failed. પછી પ્રયત્ન કરો.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">Practice Mode</h1>
        <p className="mt-2 text-gray-600 font-gujarati">દરેક પ્રશ્ન પછી તરત જવાબ અને AI સમજૂતી</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PYQ Practice */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="h-10 w-10 rounded-md bg-blue-50 flex items-center justify-center mb-4">
            <Brain className="h-5 w-5 text-blue-700" />
          </div>
          <h2 className="text-xl font-medium text-gray-900">PYQ Practice</h2>
          <p className="text-sm text-gray-600 mt-1 font-gujarati">જૂના વર્ષોના વાસ્તવિક પ્રશ્નોથી અભ્યાસ કરો</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Exam</label>
              <Select value={exam} onValueChange={setExam}>
                <SelectTrigger data-testid="practice-exam"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All exams</SelectItem>
                  {filters.exams.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger data-testid="practice-subject"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All subjects</SelectItem>
                  {filters.subjects.map((s) => (<SelectItem key={s} value={s}><span className="font-gujarati">{s}</span></SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Questions</label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger data-testid="practice-count"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["5", "10", "15", "20"].map((n) => (<SelectItem key={n} value={n}>{n} questions</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={startPractice}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 btn-lift"
            data-testid="start-practice-btn"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Practice
          </Button>
        </div>

        {/* AI Practice */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 relative overflow-hidden">
          <div className="h-10 w-10 rounded-md bg-amber-50 flex items-center justify-center mb-4">
            <Sparkles className="h-5 w-5 text-amber-700" />
          </div>
          <h2 className="text-xl font-medium text-gray-900">AI Practice</h2>
          <p className="text-sm text-gray-600 mt-1 font-gujarati">તમારા choice ના topic પર Gemini દ્વારા નવા પ્રશ્નો</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Subject</label>
              <Select value={aiSubject} onValueChange={setAiSubject}>
                <SelectTrigger data-testid="ai-subject"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ઇતિહાસ", "ભૂગોળ", "બંધારણ", "વિજ્ઞાન", "અર્થશાસ્ત્ર", "સામાન્ય જ્ઞાન"].map((s) => (
                    <SelectItem key={s} value={s}><span className="font-gujarati">{s}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block uppercase tracking-wider">Topic</label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="દા.ત. મૌર્ય સામ્રાજ્ય"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-gujarati"
                data-testid="ai-topic-input"
              />
            </div>
            <div className="text-xs text-gray-500 font-gujarati pt-1">5 પ્રશ્નો બનશે • Gemini 3 Flash</div>
          </div>

          <Button
            onClick={startAIPractice}
            disabled={aiLoading}
            className="w-full mt-6 bg-amber-600 hover:bg-amber-700 btn-lift"
            data-testid="start-ai-practice-btn"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {aiLoading ? "Generating..." : "Generate AI Questions"}
          </Button>
        </div>
      </div>
    </div>
  );
}
