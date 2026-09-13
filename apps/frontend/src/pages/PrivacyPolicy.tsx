import React from "react";
import { Link } from "react-router";
import { Shield, ArrowLeft } from "lucide-react";

interface Definition { term: string; def: string; }
interface Subsection {
  subtitle?: string;
  prose?: string;
  list?: string[];
  content?: Definition[];
}
interface Section { title: string; subsections: Subsection[]; }

const sections: Section[] = [
  {
    title: "Interpretation and Definitions",
    subsections: [
      {
        subtitle: "Definitions",
        content: [
          { term: "You", def: "means the individual using the PrepX Service." },
          { term: "Company", def: "means PrepX." },
          { term: "Account", def: "means a unique account created to access the Service." },
          { term: "Website", def: "refers to the PrepX website and application." },
          { term: "Service", def: "refers to the PrepX platform." },
          { term: "Service Provider", def: "means third parties that process data on behalf of PrepX." },
          { term: "Personal Data", def: "means information that identifies or relates to an individual." },
          { term: "Cookies", def: "are small files stored on your device." },
          { term: "Usage Data", def: "means information collected automatically when you use the Service." },
        ],
      },
    ],
  },
  {
    title: "Collecting and Using Your Personal Data",
    subsections: [
      {
        subtitle: "Personal Data",
        prose: "While using PrepX, we may collect:",
        list: [
          "First name and last name",
          "Email address",
          "Phone number",
          "College and academic information",
          "Skills and career preferences",
          "Resume and project information",
          "Coding and assessment data",
          "Interview and group discussion responses",
        ],
      },
      {
        subtitle: "Usage Data",
        prose:
          "Usage Data may include IP address, browser/device information, pages visited, session duration, and diagnostic information.",
      },
      {
        subtitle: "Tracking Technologies and Cookies",
        prose: "We may use cookies and similar technologies for:",
        list: [
          "Authentication and security",
          "Remembering preferences",
          "Improving website functionality",
          "Analyzing platform usage",
        ],
      },
    ],
  },
  {
    title: "Use of Your Personal Data",
    subsections: [
      {
        prose: "PrepX may use your information to:",
        list: [
          "Create and manage your account",
          "Provide placement preparation services",
          "Analyze resumes and provide ATS feedback",
          "Conduct coding tests and assessments",
          "Provide AI-powered interview and GD feedback",
          "Generate personalized learning recommendations",
          "Improve platform performance and services",
          "Send account, security, and service-related notifications",
        ],
      },
    ],
  },
  {
    title: "Retention of Personal Data",
    subsections: [
      {
        prose:
          "We retain personal data only for as long as necessary to provide our services, maintain security, meet legal requirements, and improve the platform.",
      },
    ],
  },
  {
    title: "Transfer of Personal Data",
    subsections: [
      {
        prose:
          "Your information may be processed or stored on servers located outside your region through our service providers. We take reasonable measures to protect your information during such transfers.",
      },
    ],
  },
  {
    title: "Disclosure of Personal Data",
    subsections: [
      {
        prose: "We may disclose personal data:",
        list: [
          "To service providers supporting PrepX",
          "To comply with legal obligations",
          "To prevent fraud, misuse, or security threats",
          "During a merger, acquisition, or business transfer",
          "To protect the rights and safety of PrepX and its users",
        ],
      },
    ],
  },
  {
    title: "Security of Personal Data",
    subsections: [
      {
        prose:
          "We use reasonable technical and organizational measures to protect your personal data. However, no internet-based system is completely secure.",
      },
    ],
  },
  {
    title: "AI Processing",
    subsections: [
      {
        prose:
          "PrepX may use AI to analyze resumes, coding performance, interview responses, GD performance, and other preparation data to provide personalized feedback and recommendations.",
      },
      {
        prose:
          "AI-generated results are intended for educational and preparation purposes and do not guarantee employment or placement.",
      },
    ],
  },
  {
    title: "Children's Privacy",
    subsections: [
      {
        prose:
          "PrepX is intended for students and users who are legally permitted to use the Service. If we become aware of unauthorized collection of a child's personal data, we will take reasonable steps to delete it.",
      },
    ],
  },
  {
    title: "Links to Other Websites",
    subsections: [
      {
        prose:
          "PrepX may contain links to third-party websites. We are not responsible for their privacy practices or content. Users should review their respective Privacy Policies.",
      },
    ],
  },
  {
    title: "Changes to This Privacy Policy",
    subsections: [
      {
        prose:
          "We may update this Privacy Policy from time to time. Changes become effective when posted on this page. Users are advised to review this policy periodically.",
      },
    ],
  },
];

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-indigo-950/30 to-[#09090b]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-4xl px-6 py-16 relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            Back to PrepX
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Shield className="size-5 text-white" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              Legal
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl leading-relaxed">
            This Privacy Policy describes how PrepX collects, uses, and protects your information when you
            use our Service. By using PrepX, you agree to the collection and use of information in
            accordance with this Privacy Policy.
          </p>
          <p className="mt-4 text-xs text-zinc-500">Last updated: September 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-14 space-y-12">
        {sections.map((section, si) => (
          <div key={si} className="space-y-5">
            <h2 className="text-xl font-bold text-white border-l-4 border-indigo-500 pl-4">
              {section.title}
            </h2>
            {section.subsections.map((sub, ssi) => (
              <div key={ssi} className="ml-4 space-y-3">
                {sub.subtitle && (
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
                    {sub.subtitle}
                  </h3>
                )}
                {sub.prose && (
                  <p className="text-zinc-300 text-sm leading-relaxed">{sub.prose}</p>
                )}
                {/* Definitions grid */}
                {sub.content && (
                  <div className="grid gap-2 mt-3">
                    {sub.content.map((item, ii) => (
                      <div
                        key={ii}
                        className="flex gap-3 rounded-lg bg-zinc-900/60 border border-zinc-800 px-4 py-3"
                      >
                        <span className="text-sm font-semibold text-indigo-300 min-w-[130px] shrink-0">
                          {item.term}
                        </span>
                        <span className="text-sm text-zinc-400">{item.def}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Bullet list */}
                {sub.list && (
                  <ul className="space-y-2 mt-2">
                    {sub.list.map((item, li) => (
                      <li key={li} className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <span className="mt-1.5 size-1.5 rounded-full bg-indigo-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Contact */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-8 space-y-3">
          <h2 className="text-xl font-bold text-white">Contact Us</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            For questions or concerns regarding this Privacy Policy, please contact:
          </p>
          <div className="mt-4 space-y-1">
            <p className="text-sm font-semibold text-white">PrepX Support</p>
            <a
              href="mailto:aixprepx@gmail.com"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
            >
              aixprepx@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
