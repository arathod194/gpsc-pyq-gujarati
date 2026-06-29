import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Bookmark, Target, Trophy, ListChecks, Flame, MailWarning, X, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { toast } from "sonner";
import { StatCardSkeleton, ListRowSkeleton, Skeleton } from "@/components/Skeletons";
import usePageTitle from "@/lib/usePageTitle";

export default function Dashboard() {
  usePageTitle("Dashboard");
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [nextStep, setNextStep] = useState(null);
  const [resending, setResending] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.get("/stats"), api.get("/attempts"), api.get("/me/next-step")]).then(([s, a, n]) => {
      setStats(s.data);
      setAttempts(a.data);
      setNextStep(n.data);
    });
  }, [user]);

  const resend = async () => {
    setResending(true);
    try {
      const res = await api.post("/auth/resend-verification");
      if (res.data.dev_link) {
        toast.info(`Dev link: ${res.data.dev_link}`, { duration: 12000 });
      } else {
        toast.success("Verification email sent");
      }
      refresh();
    } catch (e) {
      toast.error("Failed to send");
    } finally {
      setResending(false);
    }
  };

  if (!user || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="dashboard-skeleton">
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <Skeleton className="lg:col-span-3 h-80" />
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-20" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <Skeleton className="h-5 w-32" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { icon: ListChecks, label: "Attempts", value: stats.total_attempts, accent: "blue" },
    { icon: Target, label: "Accuracy", value: `${stats.accuracy}%`, accent: "emerald" },
    { icon: Trophy, label: "Best Mock", value: `${stats.best_mock_score}`, accent: "amber" },
    { icon: Flame, label: "Streak", value: stats.current_streak, accent: "rose" },
    { icon: Bookmark, label: "Bookmarks", value: stats.bookmarks, accent: "sky" },
  ];

  const accentBg = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
  };

  // Chart colors per subject (assigned cyclically)
  const BAR_COLORS = ["#2563EB", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4", "#EF4444"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      {!user.email_verified && !bannerDismissed && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-md p-4">
          <MailWarning className="h-5 w-5 text-amber-700 shrink-0" />
          <p className="text-sm text-amber-900 flex-1 font-gujarati">તમારો email હજુ verify થયો નથી. inbox check કરો.</p>
          <Button size="sm" variant="outline" onClick={resend} disabled={resending} data-testid="resend-verify-btn">
            {resending ? "Sending…" : "Resend"}
          </Button>
          <button onClick={() => setBannerDismissed(true)} className="text-amber-700 hover:text-amber-900" data-testid="dismiss-verify">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Welcome back,</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">{user.name}</h1>
        </div>
        <Link
          to="/daily"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 hover:bg-amber-100 transition-colors"
          data-testid="dashboard-daily-link"
        >
          <Flame className="h-4 w-4" />
          <span className="text-sm font-medium">Daily Question</span>
        </Link>
      </div>

      {/* Smart Next-Step suggestion */}
      {nextStep && (
        <NextStepCard step={nextStep} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className={`h-8 w-8 rounded-md flex items-center justify-center ${accentBg[c.accent]}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="mt-4 text-xs text-gray-500 uppercase tracking-wider">{c.label}</p>
            <p className="mt-1 font-mono-stat text-2xl font-semibold text-gray-900" data-testid={`stat-${c.label.toLowerCase()}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Subject chart */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Subject-wise accuracy</h2>
            <span className="text-xs text-gray-500 font-mono-stat">{stats.subject_breakdown?.length || 0} subjects</span>
          </div>
          {stats.subject_breakdown && stats.subject_breakdown.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subject_breakdown} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fontFamily: "Hind Vadodara, sans-serif" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12 }}
                    formatter={(value, name, p) => [`${value}% (${p.payload.correct}/${p.payload.total})`, "Accuracy"]}
                  />
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                    {stats.subject_breakdown.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-sm text-gray-500 font-gujarati">
              પ્રથમ practice attempt પછી ડેટા આવશે
            </div>
          )}
        </div>

        {/* Streak + quick actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-900">Streak</p>
            </div>
            <p className="font-mono-stat text-4xl font-semibold text-gray-900 mt-3">{stats.current_streak} <span className="text-base text-gray-500 font-normal">days</span></p>
            <p className="text-xs text-gray-600 mt-1 font-mono-stat">Longest: {stats.longest_streak}</p>
            <Link to="/daily" className="mt-4 inline-block text-sm text-blue-600 hover:underline font-medium">
              Today&apos;s question →
            </Link>
          </div>
          <Link to="/leaderboard" className="block bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-gray-900">Leaderboard</p>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-gujarati">Top performers જુઓ</p>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Recent attempts</h2>
        </div>
        {attempts.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 font-gujarati">હજુ સુધી કોઈ attempt નથી — practice શરૂ કરો!</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {attempts.slice(0, 10).map((a) => {
              const pct = Math.round((a.score / a.total) * 100);
              const dt = new Date(a.completed_at);
              return (
                <div key={a.id} className="px-6 py-4 flex items-center justify-between" data-testid={`attempt-${a.id}`}>
                  <div>
                    <p className="text-sm text-gray-900 capitalize">{a.mode} {a.exam && `· ${a.exam}`}</p>
                    <p className="text-xs text-gray-500 font-mono-stat mt-0.5">{dt.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-stat text-base font-semibold">{a.score}/{a.total}</p>
                    <p className={`text-xs font-mono-stat ${pct >= 60 ? "text-emerald-600" : "text-red-600"}`}>{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NextStepCard({ step }) {
  const tones = {
    blue: "from-blue-50 to-blue-100/40 border-blue-200 text-blue-900",
    amber: "from-amber-50 to-rose-50 border-amber-200 text-amber-900",
    emerald: "from-emerald-50 to-emerald-100/40 border-emerald-200 text-emerald-900",
  };
  const tone = tones[step.tone] || tones.blue;
  return (
    <div
      className={`mb-8 bg-gradient-to-br ${tone} border rounded-lg p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 page-enter`}
      data-testid="next-step-card"
    >
      <div className="h-10 w-10 rounded-md bg-white/80 flex items-center justify-center shrink-0">
        <Lightbulb className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider opacity-70 font-semibold">Next step for you</p>
        <p className="text-lg sm:text-xl font-semibold mt-1">{step.title}</p>
        <p className="text-sm opacity-80 mt-0.5 font-gujarati">{step.subtitle}</p>
      </div>
      <Link
        to={step.cta_url}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-gray-900 hover:bg-black text-white text-sm font-medium transition-colors btn-lift shrink-0"
        data-testid="next-step-cta"
      >
        {step.cta_label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
