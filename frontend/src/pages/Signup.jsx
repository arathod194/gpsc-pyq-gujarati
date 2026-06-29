import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(name, email, pw);
      toast.success("Welcome to GPSC PYQ!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 page-enter">
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Create account</h1>
        <p className="text-sm text-gray-500 mt-1">Free · Progress તરત જ track થશે</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required data-testid="signup-name" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="signup-email" />
          </div>
          <div>
            <Label htmlFor="pw">Password (min 6)</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} data-testid="signup-password" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="signup-submit">
            {loading ? "Creating…" : "Sign up"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-gray-500 text-center">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
