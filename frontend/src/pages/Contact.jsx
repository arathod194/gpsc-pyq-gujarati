import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";
import usePageTitle from "@/lib/usePageTitle";

export default function Contact() {
  usePageTitle("Contact");
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("All fields required");
      return;
    }
    setSending(true);
    try {
      await api.post("/contact", form);
      setSent(true);
      setForm({ name: "", email: "", message: "" });
      toast.success("Message sent — we'll reply within 48 hours");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send message. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← Home</Link>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-4 mb-3">Contact us</h1>
      <p className="text-gray-600 mb-8 font-gujarati">પ્રશ્નો, suggestions, bug reports — અમને જણાવો.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <Mail className="h-5 w-5 text-blue-600 mb-3" />
          <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
          <a href="mailto:hello@gpsctrack.com" className="text-sm font-medium text-gray-900 mt-1 inline-block hover:underline">hello@gpsctrack.com</a>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <MessageSquare className="h-5 w-5 text-amber-600 mb-3" />
          <p className="text-xs text-gray-500 uppercase tracking-wider">Support</p>
          <p className="text-sm font-medium text-gray-900 mt-1">Reply within 48h</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <Send className="h-5 w-5 text-emerald-600 mb-3" />
          <p className="text-xs text-gray-500 uppercase tracking-wider">For admins</p>
          <p className="text-sm font-medium text-gray-900 mt-1 font-gujarati">Content partnership</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Send us a message</h2>
        {sent ? (
          <div className="text-center py-8" data-testid="contact-success">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Send className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-gray-900 font-medium">Thanks — your message has been sent!</p>
            <p className="text-sm text-gray-500 mt-1">We&apos;ll get back to you within 48 hours.</p>
            <Button variant="outline" className="mt-5" onClick={() => setSent(false)} data-testid="contact-send-another">
              Send another message
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="contact-name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="contact-email" />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required data-testid="contact-message" />
            </div>
            <Button type="submit" disabled={sending} className="bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="contact-submit">
              <Send className="h-4 w-4 mr-1.5" /> {sending ? "Sending…" : "Send Message"}
            </Button>
          </form>
        )}
        <p className="text-xs text-gray-500 mt-4">
          We&apos;ll reply within 48 hours.
        </p>
      </div>
    </div>
  );
}
