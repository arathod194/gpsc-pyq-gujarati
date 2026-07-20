import React, { lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import { AuthProvider } from "@/lib/auth";
import Header from "@/components/Header";
import StickyAd from "@/components/StickyAd";
import InstallPrompt from "@/components/InstallPrompt";

// Landing is eagerly imported (above-the-fold, primary SEO target)
import Landing from "@/pages/Landing";

// All other routes are code-split for faster initial paint
const Browse = lazy(() => import("@/pages/Browse"));
const PracticeStart = lazy(() => import("@/pages/PracticeStart"));
const PracticeRun = lazy(() => import("@/pages/PracticeRun"));
const MockTest = lazy(() => import("@/pages/MockTest"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Bookmarks = lazy(() => import("@/pages/Bookmarks"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Admin = lazy(() => import("@/pages/Admin"));
const QuestionDetail = lazy(() => import("@/pages/QuestionDetail"));
const Daily = lazy(() => import("@/pages/Daily"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function RouteFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="h-32 bg-gray-100 rounded-lg" />
          <div className="h-32 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Suspense fallback={<RouteFallback />}>
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          <footer className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">G</div>
                    <span className="font-semibold tracking-tight text-gray-900">GPSC Track</span>
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
                <p className="text-xs text-gray-500">© 2026 GPSC Track. Free educational resource — not affiliated with GPSC.</p>
                <p className="text-xs text-gray-500 font-gujarati">તૈયારી માટે best of luck!</p>
              </div>
            </div>
          </footer>
          <StickyAd />
          <InstallPrompt />
        </div>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
