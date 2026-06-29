import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import MCQCard from "@/components/MCQCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function QuestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState(null);
  const [sel, setSel] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    api.get(`/questions/${id}`).then((r) => setQ(r.data));
    if (user) {
      api.get("/bookmarks").then((r) => setBookmarked(r.data.some((b) => b.id === id)));
    }
  }, [id, user]);

  if (!q) return <div className="text-center py-20 text-gray-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <MCQCard
        question={q}
        index={1}
        mode="practice"
        selected={sel}
        onSelect={(i) => { setSel(i); setRevealed(true); }}
        showAnswer={revealed}
        bookmarked={bookmarked}
        onBookmarkToggle={() => setBookmarked((b) => !b)}
      />
    </div>
  );
}
