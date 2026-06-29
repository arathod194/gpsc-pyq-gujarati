import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, pw);
      toast.success("Logged in");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 page-enter">
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-500 mt-1">Login કરો અને તમારી progress જુઓ</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email"
            />
          </div>
          <div>
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              data-testid="login-password"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="login-submit">
            {loading ? "Logging in…" : "Login"}
          </Button>
        </form>
        <p className="mt-3 text-xs text-gray-500 text-center">
          <Link to="/forgot-password" className="text-blue-600 hover:underline" data-testid="forgot-link">Forgot password?</Link>
        </p>
        <p className="mt-6 text-sm text-gray-500 text-center">
          Don&apos;t have an account? <Link to="/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
