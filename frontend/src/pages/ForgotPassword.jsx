import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSent(true);
      if (res.data.dev_link) {
        setDevLink(res.data.dev_link);
        toast.info("Email service not configured — use the dev link below");
      } else {
        toast.success("Check your inbox for reset link");
      }
    } catch (e) {
      toast.error("Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 page-enter">
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Forgot password</h1>
        <p className="text-sm text-gray-500 mt-1 font-gujarati">તમારો email enter કરો. અમે reset link મોકલીશું.</p>

        {!sent ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="forgot-email"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="forgot-submit">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        ) : (
          <div className="mt-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800">
              જો account મળશે, તો reset link તમારા inbox માં મોકલવામાં આવ્યું છે.
            </div>
            {devLink && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-xs">
                <p className="font-semibold text-amber-800 mb-2">DEV mode (email not configured):</p>
                <a href={devLink} className="text-blue-600 hover:underline break-all" data-testid="forgot-dev-link">{devLink}</a>
              </div>
            )}
          </div>
        )}
        <p className="mt-6 text-sm text-gray-500 text-center">
          <Link to="/login" className="text-blue-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
