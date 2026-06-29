import React from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/lib/usePageTitle";

export default function Terms() {
  usePageTitle("Terms of Service");
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← Home</Link>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-4 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: December 2025</p>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">1. Acceptance</h2>
          <p>By using GPSC Gujarat PYQ, you agree to these Terms. If you do not agree, please do not use the service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">2. Service Description</h2>
          <p>We provide GPSC (Gujarat Public Service Commission) previous year questions, mock tests, practice mode, and AI-generated explanations for educational preparation purposes only. We are not affiliated with GPSC or any government body.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">3. User Accounts</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>You must provide accurate information when creating an account</li>
            <li>You are responsible for keeping your password secure</li>
            <li>One account per person; no sharing of accounts</li>
            <li>We may suspend accounts that violate these Terms</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">4. Acceptable Use</h2>
          <p>You agree NOT to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Scrape, copy, or redistribute our question bank without permission</li>
            <li>Use automated tools to access the service</li>
            <li>Attempt to break, abuse, or circumvent the platform</li>
            <li>Post defamatory, illegal, or infringing content</li>
            <li>Misuse the AI features to generate harmful or off-topic content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">5. Content &amp; Accuracy</h2>
          <p>
            We make reasonable efforts to keep questions and answers accurate, but we make no warranty of correctness, completeness, or fitness for any specific exam. Always verify against official sources. We are not responsible for any exam outcome based on use of this platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">6. AI-Generated Content</h2>
          <p>Explanations and AI-generated practice questions are produced by third-party AI models (Google Gemini). They may contain errors. Use your judgment and cross-reference with authoritative sources.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">7. Intellectual Property</h2>
          <p>The platform, branding, and original content (including curated/seeded questions, AI prompts, design) are owned by us. Questions sourced from public GPSC papers remain in the public domain; explanations and curation are our intellectual property.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">8. Advertisements</h2>
          <p>The free service is supported by third-party advertisements (Google AdSense and similar). By using the free tier, you agree to be shown ads. Logged-in users currently see fewer or no ads.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">9. Termination</h2>
          <p>We may suspend or terminate your access at our discretion for violation of these Terms. You may delete your account at any time.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">10. Disclaimers &amp; Limitation of Liability</h2>
          <p>The service is provided &quot;AS IS&quot; without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from use of the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">11. Governing Law</h2>
          <p>These Terms are governed by the laws of India. Any disputes will be resolved in the courts of Gujarat, India.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">12. Changes</h2>
          <p>We may update these Terms. Continued use after updates means you accept the changes.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">13. Contact</h2>
          <p>Questions? Visit the <Link to="/contact" className="text-blue-600 hover:underline">Contact page</Link>.</p>
        </section>
      </div>
    </div>
  );
}
