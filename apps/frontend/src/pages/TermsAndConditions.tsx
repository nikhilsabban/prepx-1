import React from "react";
import { Link } from "react-router";
import { FileText, ArrowLeft } from "lucide-react";

interface Section {
  title: string;
  items: string[];
}

const sections: Section[] = [
  {
    title: "Use of This Website",
    items: [
      "PrepX provides AI-powered placement preparation services, including resume preparation, coding practice, assessments, mock interviews, group discussions, and personalized recommendations.",
      "The content and services provided by PrepX are for educational and preparation purposes only and may be changed or updated without notice.",
      "We do not guarantee the accuracy, completeness, or suitability of any content, AI-generated feedback, recommendations, scores, or assessments for a particular purpose.",
      "AI-generated results may contain errors and should be reviewed by the user before being relied upon.",
      "Your use of the platform and its information is at your own risk.",
      "You are responsible for ensuring that the platform and its services meet your individual requirements.",
    ],
  },
  {
    title: "AI-Generated Content",
    items: [
      "PrepX may use AI to generate questions, feedback, recommendations, resume suggestions, interview analysis, and other preparation content.",
      "AI-generated content is intended to support learning and preparation and should not be considered professional, legal, financial, recruitment, or employment advice.",
      "AI-generated scores and recommendations do not guarantee interview selection, employment, salary, or placement.",
    ],
  },
  {
    title: "Copyright & Trademarks",
    items: [
      "This website and application contain content, software, designs, graphics, logos, layouts, and other materials owned by or licensed to PrepX.",
      "Reproduction, modification, distribution, or unauthorized use of PrepX content is prohibited except as permitted by applicable law or with prior written permission.",
      "All third-party trademarks appearing on the platform belong to their respective owners.",
    ],
  },
  {
    title: "Unauthorized Use & External Links",
    items: [
      "Unauthorized access, misuse, copying, scraping, reverse engineering, or interference with the platform may result in suspension, termination, or legal action.",
      "PrepX may contain links to third-party websites, coding platforms, learning resources, or other services.",
      "These links are provided for convenience, and PrepX does not control or guarantee the content, availability, or privacy practices of third-party websites.",
      "You may not create a link to PrepX from another website or document without prior written consent.",
    ],
  },
  {
    title: "Payments, Usage & Liability",
    items: [
      "Where paid services are offered, payments are processed through authorized payment gateways.",
      "PrepX is an educational and placement-preparation platform and does not guarantee any job, internship, salary, interview selection, or financial outcome.",
      "Users are responsible for their own preparation, decisions, and use of information provided by the platform.",
      "Except where required by applicable law, PrepX is not liable for any direct or indirect loss resulting from the use or inability to use the platform or its services.",
      "Refunds, cancellations, and subscription terms, where applicable, will be governed by the applicable Refund & Cancellation Policy.",
    ],
  },
  {
    title: "Account Responsibility",
    items: [
      "You are responsible for maintaining the confidentiality of your account credentials.",
      "You must provide accurate information and must not impersonate another person or create an account for fraudulent purposes.",
      "PrepX may suspend or terminate accounts that violate these Terms & Conditions or misuse the platform.",
    ],
  },
  {
    title: "Legal Jurisdiction",
    items: [
      "Your use of PrepX and any dispute arising from your use of the platform shall be subject to the applicable laws of India and the jurisdiction of the appropriate courts, unless otherwise required by applicable law.",
    ],
  },
];

export function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-blue-950/30 to-[#09090b]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-4xl px-6 py-16 relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            Back to PrepX
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <FileText className="size-5 text-white" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              Legal
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl leading-relaxed">
            Welcome to <span className="text-white font-semibold">PrepX</span>. By continuing to browse,
            register, or use this website and application, you agree to comply with and be bound by these
            Terms &amp; Conditions, which together with our{" "}
            <Link
              to="/privacy-policy"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Privacy Policy
            </Link>{" "}
            govern your use of the PrepX Service.
          </p>
          <p className="mt-5 text-sm text-zinc-500 leading-relaxed">
            The term <span className="text-zinc-300 font-medium">"PrepX"</span>,{" "}
            <span className="text-zinc-300 font-medium">"us"</span>,{" "}
            <span className="text-zinc-300 font-medium">"we"</span>, or{" "}
            <span className="text-zinc-300 font-medium">"our"</span> refers to the owner/operator of the
            platform. The term <span className="text-zinc-300 font-medium">"you"</span> refers to the user
            or viewer of the website or application.
          </p>
          <p className="mt-3 text-xs text-zinc-600">Last updated: September 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-14 space-y-10">
        {sections.map((section, si) => (
          <div key={si} className="space-y-4">
            <h2 className="text-xl font-bold text-white border-l-4 border-blue-500 pl-4">
              {section.title}
            </h2>
            <ul className="ml-4 space-y-3">
              {section.items.map((item, ii) => (
                <li key={ii} className="flex items-start gap-3 text-sm text-zinc-300 leading-relaxed">
                  <span className="mt-2 size-1.5 rounded-full bg-blue-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Acknowledgement box */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-8 space-y-3 mt-8">
          <h2 className="text-base font-bold text-white">Acknowledgement</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            By continuing to use the PrepX website or application, you acknowledge that you have read,
            understood, and agreed to these Terms &amp; Conditions and our{" "}
            <Link
              to="/privacy-policy"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default TermsAndConditions;
