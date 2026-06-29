import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) {
      toast.error("Passwords don't match");
      return;
    }
    if (pw.length < 6) {
      toast.error("Min 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      toast.success("Password reset successfully");
      navigate("/login");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-gray-600">Invalid reset link.</p>
        <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Request a new one</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 page-enter">
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Reset password</h1>
        <p className="text-sm text-gray-500 mt-1 font-gujarati">નવો password set કરો</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} data-testid="reset-pw" />
          </div>
          <div>
            <Label htmlFor="pw2">Confirm password</Label>
            <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} data-testid="reset-pw2" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="reset-submit">
            {loading ? "Resetting…" : "Reset password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
