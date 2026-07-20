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
import { Trash2, Plus, ShieldCheck, Upload, FileJson, FileText, Inbox, BarChart3, Mail, Users, BookOpen, Bookmark } from "lucide-react";
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
  const [tab, setTab] = useState("questions");
  const [questions, setQuestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) navigate("/");
  }, [user, loading, navigate]);

  const refresh = () => api.get("/questions", { params: { limit: 500 } }).then((r) => setQuestions(r.data));
  const loadMessages = () => api.get("/admin/messages").then((r) => setMessages(r.data)).catch(() => {});
  const loadOverview = () => api.get("/admin/overview").then((r) => setOverview(r.data)).catch(() => {});

  useEffect(() => {
    if (user?.role === "admin") {
      refresh();
      loadMessages();
      loadOverview();
    }
  }, [user]);

  const markRead = async (id) => {
    await api.post(`/admin/messages/${id}/read`);
    loadMessages();
    loadOverview();
  };

  const deleteMessage = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    await api.delete(`/admin/messages/${id}`);
    toast.success("Message deleted");
    loadMessages();
    loadOverview();
  };

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
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500">Manage questions, messages & data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 border-b border-gray-200">
        {[
          { id: "questions", label: "Questions", icon: BookOpen },
          { id: "messages", label: "Messages", icon: Inbox, badge: overview?.unread_messages || 0 },
          { id: "overview", label: "Data Overview", icon: BarChart3 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`admin-tab-${t.id}`}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.badge > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center" data-testid="unread-badge">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "questions" && (
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
      )}

      {tab === "messages" && (
      <div className="bg-white border border-gray-200 rounded-lg" data-testid="admin-messages-panel">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Mail className="h-4 w-4" /> Contact Messages
          </h2>
          <span className="text-xs text-gray-500 font-mono-stat">{messages.length} total</span>
        </div>
        {messages.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500" data-testid="messages-empty">
            No messages yet. Contact form submissions will appear here.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 max-h-[75vh] overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className={`px-6 py-4 ${!m.read ? "bg-blue-50/40" : ""}`} data-testid={`message-${m.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{m.name}</span>
                      {!m.read && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-semibold">NEW</span>}
                      <a href={`mailto:${m.email}`} className="text-xs text-blue-600 hover:underline">{m.email}</a>
                    </div>
                    <p className="text-sm text-gray-700 mt-1.5 whitespace-pre-wrap">{m.message}</p>
                    <p className="text-xs text-gray-400 mt-2 font-mono-stat">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!m.read && (
                      <button onClick={() => markRead(m.id)} className="text-xs text-blue-600 hover:underline" data-testid={`message-read-${m.id}`}>
                        Mark read
                      </button>
                    )}
                    <button onClick={() => deleteMessage(m.id)} className="text-gray-400 hover:text-red-600 transition-colors" data-testid={`message-delete-${m.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {tab === "overview" && (
      <div data-testid="admin-overview-panel">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Questions", value: overview?.total_questions, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
            { label: "Users", value: overview?.total_users, icon: Users, color: "text-emerald-600 bg-emerald-50" },
            { label: "Attempts", value: overview?.total_attempts, icon: BarChart3, color: "text-amber-600 bg-amber-50" },
            { label: "Bookmarks", value: overview?.total_bookmarks, icon: Bookmark, color: "text-purple-600 bg-purple-50" },
            { label: "Messages", value: overview?.total_messages, icon: Mail, color: "text-rose-600 bg-rose-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-5" data-testid={`stat-${s.label.toLowerCase()}`}>
              <div className={`h-9 w-9 rounded-md flex items-center justify-center mb-3 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 font-mono-stat">{s.value ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Questions by subject</h2>
          </div>
          <div className="p-6 space-y-3">
            {(overview?.subjects || []).map((s) => {
              const max = Math.max(...(overview?.subjects || []).map((x) => x.count), 1);
              return (
                <div key={s.subject} className="flex items-center gap-3" data-testid={`subject-bar-${s.subject}`}>
                  <span className="text-sm text-gray-700 font-gujarati w-32 shrink-0 truncate">{s.subject}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(s.count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 font-mono-stat w-8 text-right">{s.count}</span>
                </div>
              );
            })}
            {(!overview?.subjects || overview.subjects.length === 0) && (
              <p className="text-sm text-gray-500">No questions yet.</p>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
