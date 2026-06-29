import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Bookmark, Target, Trophy, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.get("/stats"), api.get("/attempts")]).then(([s, a]) => {
      setStats(s.data);
      setAttempts(a.data);
    });
  }, [user]);

  if (!user || !stats) return <div className="text-center py-20 text-gray-500">Loading…</div>;

  const cards = [
    { icon: ListChecks, label: "Attempts", value: stats.total_attempts, accent: "blue" },
    { icon: Target, label: "Accuracy", value: `${stats.accuracy}%`, accent: "emerald" },
    { icon: Trophy, label: "Best Mock", value: `${stats.best_mock_score}`, accent: "amber" },
    { icon: Bookmark, label: "Bookmarks", value: stats.bookmarks, accent: "rose" },
  ];

  const accentBg = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="mb-8">
        <p className="text-sm text-gray-500">Welcome back,</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">{user.name}</h1>
      </div>

      {/* Stats grid - Control Room */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className={`h-8 w-8 rounded-md flex items-center justify-center ${accentBg[c.accent]}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="mt-4 text-xs text-gray-500 uppercase tracking-wider">{c.label}</p>
            <p className="mt-1 font-mono-stat text-3xl font-semibold text-gray-900" data-testid={`stat-${c.label.toLowerCase()}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Link to="/practice" className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
          <p className="text-sm font-semibold text-gray-900">Practice</p>
          <p className="text-xs text-gray-500 mt-1 font-gujarati">PYQ અને AI પ્રશ્નો સાથે અભ્યાસ</p>
        </Link>
        <Link to="/mock" className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
          <p className="text-sm font-semibold text-gray-900">Mock Test</p>
          <p className="text-xs text-gray-500 mt-1 font-gujarati">ટાઈમર સાથે વાસ્તવિક પરીક્ષા</p>
        </Link>
        <Link to="/bookmarks" className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
          <p className="text-sm font-semibold text-gray-900">Bookmarks</p>
          <p className="text-xs text-gray-500 mt-1 font-gujarati">તમારા સેવ કરેલા પ્રશ્નો</p>
        </Link>
      </div>

      {/* Recent attempts */}
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
