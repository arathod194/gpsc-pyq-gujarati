import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import { AuthProvider } from "@/lib/auth";
import Header from "@/components/Header";
import StickyAd from "@/components/StickyAd";
import Landing from "@/pages/Landing";
import Browse from "@/pages/Browse";
import PracticeStart from "@/pages/PracticeStart";
import PracticeRun from "@/pages/PracticeRun";
import MockTest from "@/pages/MockTest";
import Dashboard from "@/pages/Dashboard";
import Bookmarks from "@/pages/Bookmarks";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Admin from "@/pages/Admin";
import QuestionDetail from "@/pages/QuestionDetail";
import Daily from "@/pages/Daily";
import Leaderboard from "@/pages/Leaderboard";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/practice" element={<PracticeStart />} />
              <Route path="/practice/run" element={<PracticeRun />} />
              <Route path="/mock" element={<MockTest />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/question/:id" element={<QuestionDetail />} />
              <Route path="/daily" element={<Daily />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
            </Routes>
          </main>
          <footer className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">G</div>
                    <span className="font-semibold tracking-tight text-gray-900">GPSC PYQ</span>
                  </div>
                  <p className="text-xs text-gray-500 font-gujarati leading-relaxed">
                    GPSC તૈયારી — free, ગુજરાતી, AI-powered.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Practice</p>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/daily" className="text-gray-600 hover:text-gray-900">Daily Question</a></li>
                    <li><a href="/browse" className="text-gray-600 hover:text-gray-900">Browse PYQs</a></li>
                    <li><a href="/practice" className="text-gray-600 hover:text-gray-900">Practice Mode</a></li>
                    <li><a href="/mock" className="text-gray-600 hover:text-gray-900">Mock Test</a></li>
                    <li><a href="/leaderboard" className="text-gray-600 hover:text-gray-900">Leaderboard</a></li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Company</p>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/about" className="text-gray-600 hover:text-gray-900">About</a></li>
                    <li><a href="/contact" className="text-gray-600 hover:text-gray-900">Contact</a></li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Legal</p>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy Policy</a></li>
                    <li><a href="/terms" className="text-gray-600 hover:text-gray-900">Terms of Service</a></li>
                  </ul>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-gray-500">© 2026 GPSC Gujarat PYQ. Free educational resource — not affiliated with GPSC.</p>
                <p className="text-xs text-gray-500 font-gujarati">તૈયારી માટે best of luck!</p>
              </div>
            </div>
          </footer>
          <StickyAd />
        </div>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
