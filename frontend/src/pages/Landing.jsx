import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Timer, BookOpen, Award, Brain, Bookmark, Search } from "lucide-react";
import AdSlot from "@/components/AdSlot";
import usePageTitle from "@/lib/usePageTitle";

const HERO_IMG = "https://images.pexels.com/photos/8085257/pexels-photo-8085257.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const features = [
  {
    icon: BookOpen,
    title: "Browse PYQs",
    desc: "વર્ષ, પરીક્ષા અને વિષય પ્રમાણે પ્રશ્નો શોધો",
    accent: "blue",
  },
  {
    icon: Brain,
    title: "Practice Mode",
    desc: "દરેક પ્રશ્ન પછી તરત જવાબ + AI સમજૂતી",
    accent: "amber",
  },
  {
    icon: Timer,
    title: "Mock Test",
    desc: "Real exam જેવો અનુભવ — ટાઇમર સાથે",
    accent: "emerald",
  },
  {
    icon: Sparkles,
    title: "AI Questions",
    desc: "ટોપિક પ્રમાણે Gemini દ્વારા નવા પ્રશ્નો",
    accent: "violet",
  },
  {
    icon: Bookmark,
    title: "Bookmarks",
    desc: "મુશ્કેલ પ્રશ્નો સેવ કરો અને ફરી અભ્યાસ કરો",
    accent: "rose",
  },
  {
    icon: Award,
    title: "Progress Tracking",
    desc: "Accuracy, mock scores અને attempts જુઓ",
    accent: "sky",
  },
];

const accentBg = {
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-sky-700",
};

export default function Landing() {
  usePageTitle("GPSC Previous Year Questions in Gujarati", { suffix: false });
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const goSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/browse?q=${encodeURIComponent(term)}`);
    else navigate("/browse");
  };
  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-gray-200 rounded-full text-xs font-medium text-gray-700 bg-white mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              GPSC Class 1-2 · Dy.SO · PI · અને વધુ
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tight font-bold text-gray-900 leading-[1.05]">
              ગુજરાત GPSC <br className="hidden sm:block" />
              <span className="text-blue-600">Previous Year</span> Questions
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl leading-relaxed font-gujarati">
              એક જ જગ્યાએ વર્ષોની GPSC પ્રશ્નપત્રિકા. પ્રેક્ટિસ કરો, મોક ટેસ્ટ આપો, અને AI દ્વારા દરેક જવાબની વિગતવાર સમજૂતી મેળવો.
            </p>

            {/* Inline search — top-of-funnel */}
            <form onSubmit={goSearch} className="mt-6 max-w-xl">
              <div className="relative flex items-center bg-white border border-gray-200 rounded-lg pl-3 pr-1 py-1 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-colors">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search: ઇતિહાસ, બંધારણ, GPSC 2023…"
                  className="flex-1 px-3 py-2 outline-none text-sm bg-transparent font-gujarati"
                  data-testid="hero-search-input"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 btn-lift shrink-0"
                  data-testid="hero-search-btn"
                >
                  Search
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="text-gray-500">Popular:</span>
                {["ઇતિહાસ", "બંધારણ", "ભૂગોળ", "વિજ્ઞાન"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => navigate(`/browse?q=${encodeURIComponent(tag)}`)}
                    className="text-blue-600 hover:underline font-gujarati"
                    data-testid={`hero-chip-${tag}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/practice">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="hero-start-practice">
                  Start Practice
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link to="/browse">
                <Button size="lg" variant="outline" className="btn-lift" data-testid="hero-browse">
                  Browse Questions
                </Button>
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <Stat number="500+" label="Questions" />
              <Stat number="10+" label="Years" />
              <Stat number="AI" label="Explanations" />
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="aspect-[4/5] rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={HERO_IMG}
                  alt="Student preparing for GPSC"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hidden md:block">
                <p className="text-xs text-gray-500 mb-1">Today&apos;s Practice</p>
                <p className="font-mono-stat text-2xl font-semibold text-gray-900">12 / 15</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">80% accuracy</p>
              </div>
              <div className="absolute -top-6 -right-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hidden md:block">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-semibold">AI Powered</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">Gemini 3 Flash</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
              એક platform, સંપૂર્ણ તૈયારી
            </h2>
            <p className="mt-4 text-gray-600">
              GPSC તૈયારી માટે જરૂરી દરેક tool: practice, mock, AI explanations, progress tracking.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                data-testid={`feature-${f.title.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className={`h-10 w-10 rounded-md flex items-center justify-center mb-4 ${accentBg[f.accent]}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-600 font-gujarati">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <AdSlot slot={process.env.REACT_APP_ADSENSE_SLOT_LEADERBOARD} format="auto" className="mb-12" />
        <div className="bg-gray-900 rounded-lg px-8 py-12 sm:p-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              તૈયારી શરૂ કરો — Free
            </h2>
            <p className="mt-3 text-gray-300 max-w-xl">
              Sign up કરો અને તમારી progress track કરો, bookmarks સેવ કરો, અને AI-generated practice questions મેળવો.
            </p>
          </div>
          <Link to="/signup">
            <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 btn-lift" data-testid="cta-signup">
              Create Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ number, label }) {
  return (
    <div>
      <p className="font-mono-stat text-3xl font-semibold text-gray-900">{number}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
