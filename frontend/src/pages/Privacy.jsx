import React from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/lib/usePageTitle";

export default function Privacy() {
  usePageTitle("Privacy Policy");
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 page-enter">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← Home</Link>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-4 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: December 2025</p>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">1. Introduction</h2>
          <p>
            GPSC Track (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates this website to help GPSC aspirants
            practice previous year questions. This Privacy Policy explains what data we collect, how we use it, and your rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><b>Account data</b> — name, email, hashed password (when you sign up)</li>
            <li><b>Usage data</b> — practice attempts, mock test scores, bookmarks, daily streaks</li>
            <li><b>Technical data</b> — browser, device, IP (for security and analytics)</li>
            <li><b>Cookies</b> — JWT auth token in <code>localStorage</code>, session preferences</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">3. How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide the service — practice, mock tests, progress tracking</li>
            <li>Send transactional emails (verification, password reset)</li>
            <li>Improve the platform via aggregated analytics</li>
            <li>Generate AI explanations using Google Gemini (your question text is sent to Google; we do not include your identity)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">4. Third-Party Services</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><b>Google AdSense</b> — serves contextual ads. Google may set cookies. See <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google&apos;s ad policies</a>.</li>
            <li><b>Google Gemini</b> — AI explanations (Google&apos;s privacy policy applies to data sent to Gemini)</li>
            <li><b>Resend</b> — transactional email delivery</li>
            <li><b>MongoDB</b> — data storage</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">5. Cookies &amp; AdSense</h2>
          <p>
            Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to this website or other websites. Google&apos;s use of advertising cookies enables it and its partners to serve ads based on your visit to our site and/or other sites on the Internet. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google&apos;s Ads Settings</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">6. Data Retention &amp; Your Rights</h2>
          <p>We retain your data while your account is active. You may request deletion at any time by emailing us. You have the right to access, correct, or delete your data.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">7. Children</h2>
          <p>This service is intended for users 13 years or older. We do not knowingly collect data from children under 13.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">8. Changes</h2>
          <p>We may update this policy. The &quot;last updated&quot; date will reflect changes. Continued use after updates means acceptance.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-2">9. Contact</h2>
          <p>Questions about this policy? Visit our <Link to="/contact" className="text-blue-600 hover:underline">Contact page</Link>.</p>
        </section>
      </div>
    </div>
  );
}
