import React from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/lib/usePageTitle";
import { BookOpen, Sparkles, Target, Users } from "lucide-react";

export default function About() {
  usePageTitle("About");
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← Home</Link>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-4 mb-3">About GPSC Track</h1>
      <p className="text-base text-gray-600 leading-relaxed font-gujarati">
        ગુજરાત જાહેર સેવા આયોગ (GPSC) ની તૈયારી માટે વર્ષોના previous year questions એક જ જગ્યાએ, ગુજરાતી ભાષામાં, AI-powered explanations સાથે — સંપૂર્ણ free.
      </p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={BookOpen} title="Curated PYQs" desc="GPSC Class 1-2, Dy.SO, PI અને વધુ exams ના real previous year questions." />
        <Card icon={Sparkles} title="AI Explanations" desc="દરેક જવાબ માટે Gemini-powered વિગતવાર ગુજરાતી સમજૂતી." />
        <Card icon={Target} title="Mock + Practice" desc="ટાઈમર સાથે mock test અને instant-reveal practice mode." />
        <Card icon={Users} title="Free for Everyone" desc="કોઈ subscription નહીં, કોઈ paywall નહીં — ads થી supported." />
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-3">Our Mission</h2>
        <p className="text-gray-700 leading-relaxed">
          Quality GPSC preparation materials in Gujarati are limited and often expensive. We&apos;re building a free, transparent, accessible platform — so geography, income, or coaching access never decides who can prepare well.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-3">Disclaimer</h2>
        <p className="text-gray-700 leading-relaxed text-sm">
          GPSC Track is an <b>independent educational platform</b>. We are <b>not affiliated</b> with the Gujarat Public Service Commission or any government body. Question sources are public GPSC papers. Always verify against official sources before exam decisions.
        </p>
      </section>

      <section className="mt-10 border-t border-gray-200 pt-6 flex flex-wrap gap-4 text-sm">
        <Link to="/contact" className="text-blue-600 hover:underline">Contact</Link>
        <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
        <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
      </section>
    </div>
  );
}

function Card({ icon: Icon, title, desc }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="h-9 w-9 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600 mt-1 font-gujarati">{desc}</p>
    </div>
  );
}
