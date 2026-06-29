import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Trophy, Flame, Calendar } from "lucide-react";
import AdSlot from "@/components/AdSlot";

const TABS = [
  { value: "mock", label: "Best Mock", icon: Trophy },
  { value: "weekly", label: "Weekly", icon: Calendar },
  { value: "streak", label: "Streak", icon: Flame },
];

export default function Leaderboard() {
  const [scope, setScope] = useState("mock");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/leaderboard", { params: { scope } }).then((r) => {
      setEntries(r.data.entries);
      setLoading(false);
    });
  }, [scope]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="mb-8">
        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Leaderboard</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-1">Top performers</h1>
        <p className="text-sm text-gray-500 mt-2 font-gujarati">સ્પર્ધા આપણને વધુ સારી તૈયારી માટે પ્રેરિત કરે છે</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setScope(t.value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              scope === t.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
            data-testid={`leaderboard-tab-${t.value}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-600 font-gujarati">હજુ સુધી કોઈ entry નથી — પહેલા તમે બનો!</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {entries.map((e, i) => (
            <div
              key={e.user_id}
              className={`flex items-center gap-4 px-6 py-4 ${i !== entries.length - 1 ? "border-b border-gray-200" : ""}`}
              data-testid={`leaderboard-row-${i}`}
            >
              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-mono-stat font-semibold text-sm ${
                i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-600"
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{e.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{e.extra}</p>
              </div>
              <p className="font-mono-stat text-xl font-semibold text-gray-900">{e.score}</p>
            </div>
          ))}
        </div>
      )}

      <AdSlot slot={process.env.REACT_APP_ADSENSE_SLOT_LEADERBOARD} format="auto" />
    </div>
  );
}
