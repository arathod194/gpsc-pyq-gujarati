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
            </Routes>
          </main>
          <footer className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-500">© 2026 GPSC Gujarat PYQ — Free to use</p>
              <p className="text-xs text-gray-500 font-gujarati">તૈયારી માટે best of luck!</p>
            </div>
          </footer>
          <StickyAd />
        </div>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
