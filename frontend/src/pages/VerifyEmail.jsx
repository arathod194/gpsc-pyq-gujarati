import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMsg("Invalid verification link");
      return;
    }
    api
      .post("/auth/verify", { token })
      .then(() => setStatus("success"))
      .catch((e) => {
        setStatus("error");
        setMsg(e?.response?.data?.detail || "Verification failed");
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 page-enter">
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Email verified!</h1>
            <p className="mt-2 text-sm text-gray-600 font-gujarati">તમારો account હવે સંપૂર્ણપણે active છે.</p>
            <Button className="mt-6 bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/dashboard")} data-testid="verify-go-dashboard">
              Go to Dashboard
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 mx-auto flex items-center justify-center">
              <XCircle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Verification failed</h1>
            <p className="mt-2 text-sm text-gray-600">{msg}</p>
            <Link to="/login" className="text-blue-600 hover:underline text-sm mt-4 inline-block">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}
