import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Bookmark, ArrowRight } from "lucide-react";

export default function Bookmarks() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    api.get("/bookmarks").then((r) => { setItems(r.data); setBusy(false); });
  }, [user]);

  if (busy) return <div className="text-center py-20 text-gray-500">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
          <Bookmark className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Bookmarks</h1>
          <p className="text-sm text-gray-500 font-mono-stat">{items.length} saved</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-600 font-gujarati">હજુ સુધી કોઈ bookmark નથી</p>
          <Link to="/browse" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Browse questions →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((q) => (
            <Link
              to={`/question/${q.id}`}
              key={q.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm hover:border-gray-300 transition-all flex flex-col"
              data-testid={`bookmark-${q.id}`}
            >
              <div className="flex items-center gap-2 text-xs mb-3">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{q.exam}</span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-mono-stat">{q.year}</span>
              </div>
              <p className="font-gujarati text-base text-gray-900 leading-relaxed line-clamp-3 flex-1">{q.question_text}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-gujarati">{q.subject}</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
