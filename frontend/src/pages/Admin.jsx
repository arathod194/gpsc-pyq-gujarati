import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, ShieldCheck, Upload, FileJson, FileText } from "lucide-react";
import { toast } from "sonner";

const EXAMS = ["GPSC Class 1-2", "Dy.SO/Nayab Mamlatdar", "PI", "GPSC Class 3"];
const SUBJECTS = ["ઇતિહાસ", "ભૂગોળ", "બંધારણ", "વિજ્ઞાન", "અર્થશાસ્ત્ર", "સામાન્ય જ્ઞાન", "ગુજરાતી સાહિત્ય"];

const emptyForm = () => ({
  exam: "GPSC Class 1-2",
  year: new Date().getFullYear(),
  subject: "ઇતિહાસ",
  topic: "",
  question_text: "",
  options: [
    { label: "ક", text: "" },
    { label: "ખ", text: "" },
    { label: "ગ", text: "" },
    { label: "ઘ", text: "" },
  ],
  correct_index: 0,
  official_explanation: "",
});

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/");
  }, [user, loading, navigate]);

  const refresh = () => api.get("/questions", { params: { limit: 500 } }).then((r) => setQuestions(r.data));

  useEffect(() => {
    if (user?.role === "admin") refresh();
  }, [user]);

  const save = async () => {
    if (!form.question_text.trim() || form.options.some((o) => !o.text.trim())) {
      toast.error("બધા fields ભરો");
      return;
    }
    setSaving(true);
    try {
      await api.post("/questions", form);
      toast.success("Question added");
      setForm(emptyForm());
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    await api.delete(`/questions/${id}`);
    toast.success("Deleted");
    refresh();
  };

  const importJSON = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(arr)) throw new Error("JSON must be an array or { questions: [...] }");
      const res = await api.post("/questions/bulk_import", { questions: arr });
      toast.success(`Imported ${res.data.inserted} questions${res.data.errors.length ? `, ${res.data.errors.length} errors` : ""}`);
      if (res.data.errors.length) console.warn("Import errors:", res.data.errors);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err.message || "Import failed");
    }
  };

  const importCSV = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await api.post("/questions/import_csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Imported ${res.data.inserted} questions${res.data.errors.length ? `, ${res.data.errors.length} errors` : ""}`);
      if (res.data.errors.length) console.warn("Import errors:", res.data.errors);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "CSV import failed");
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500">Manage questions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form + Bulk Import */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bulk Import card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1 flex items-center gap-2">
              <Upload className="h-4 w-4" /> Bulk Import
            </h2>
            <p className="text-xs text-gray-500 mb-4 font-gujarati">CSV અથવા JSON file upload કરો</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer flex flex-col items-center gap-1.5 p-4 border border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-center">
                <FileJson className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">JSON</span>
                <input type="file" accept="application/json,.json" onChange={importJSON} className="hidden" data-testid="import-json" />
              </label>
              <label className="cursor-pointer flex flex-col items-center gap-1.5 p-4 border border-dashed border-gray-300 rounded-md hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors text-center">
                <FileText className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-medium text-gray-700">CSV</span>
                <input type="file" accept=".csv,text/csv" onChange={importCSV} className="hidden" data-testid="import-csv" />
              </label>
            </div>
            <details className="mt-3 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-800">CSV columns / JSON shape</summary>
              <div className="mt-2 space-y-2">
                <p><b>CSV columns:</b> exam, year, subject, topic, question_text, opt_a, opt_b, opt_c, opt_d, correct_index (0-3 or A-D), official_explanation</p>
                <p><b>JSON:</b> array of objects with exam, year, subject, topic, question_text, options [{`{label, text}`} x 4], correct_index, official_explanation</p>
              </div>
            </details>
          </div>

          {/* Add form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 h-fit">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add new question
            </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Exam</Label>
                <Select value={form.exam} onValueChange={(v) => setForm({ ...form, exam: v })}>
                  <SelectTrigger data-testid="admin-exam"><SelectValue /></SelectTrigger>
                  <SelectContent>{EXAMS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} data-testid="admin-year" />
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                <SelectTrigger data-testid="admin-subject"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}><span className="font-gujarati">{s}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Topic (optional)</Label>
              <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="font-gujarati" data-testid="admin-topic" />
            </div>
            <div>
              <Label>Question (Gujarati)</Label>
              <Textarea
                rows={3}
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                className="font-gujarati"
                data-testid="admin-question"
              />
            </div>
            <div>
              <Label>Options</Label>
              <div className="space-y-2 mt-1">
                {form.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.correct_index === i}
                      onChange={() => setForm({ ...form, correct_index: i })}
                      data-testid={`admin-correct-${i}`}
                    />
                    <span className="font-mono-stat text-sm w-6">{o.label}.</span>
                    <Input
                      value={o.text}
                      onChange={(e) => {
                        const opts = [...form.options];
                        opts[i] = { ...opts[i], text: e.target.value };
                        setForm({ ...form, options: opts });
                      }}
                      className="font-gujarati"
                      data-testid={`admin-option-${i}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Radio = correct answer</p>
            </div>
            <div>
              <Label>Explanation (optional)</Label>
              <Textarea
                rows={2}
                value={form.official_explanation}
                onChange={(e) => setForm({ ...form, official_explanation: e.target.value })}
                className="font-gujarati"
                data-testid="admin-explanation"
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="admin-save-btn">
              {saving ? "Saving…" : "Save Question"}
            </Button>
          </div>
        </div>
        </div>

        {/* List */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">All Questions</h2>
            <span className="text-xs text-gray-500 font-mono-stat">{questions.length} total</span>
          </div>
          <div className="divide-y divide-gray-200 max-h-[80vh] overflow-y-auto">
            {questions.map((q) => (
              <div key={q.id} className="px-6 py-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs mb-1.5">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{q.exam}</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-mono-stat">{q.year}</span>
                    <span className="text-gray-500 font-gujarati">{q.subject}</span>
                  </div>
                  <p className="font-gujarati text-sm text-gray-900 truncate">{q.question_text}</p>
                </div>
                <button
                  onClick={() => del(q.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  data-testid={`admin-delete-${q.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
