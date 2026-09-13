import React from "react";
import { Link, useLocation } from "react-router";
import { Youtube, Twitter, Linkedin, MessageSquare } from "lucide-react";

const aiFeatures = [
  "AI Technical Interviews",
  "System Design Practice",
  "Resume Analyze & ATS Optimization",
  "Behavioral & HR Prep",
  "Real-time Voice Feedback",
  "Mock Coding Challenges",
];

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Login / Sign up", to: "/login" },
  { label: "Terms & Conditions", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy-policy" },
];

const socials = [
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: MessageSquare, href: "#", label: "Discord" },
];

export function Footer() {
  const location = useLocation();
  // Hide footer during active interview session
  if (location.pathname.startsWith("/interview/")) return null;
  return (
    <footer className="relative bg-[#09090b] border-t border-zinc-900 overflow-hidden">
      {/* Big PREPX watermark */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 select-none pointer-events-none"
        aria-hidden
      >
        <span
          className="text-[clamp(80px,18vw,200px)] font-black tracking-tighter"
          style={{
            color: "transparent",
            WebkitTextStroke: "1px rgba(99,102,241,0.12)",
            lineHeight: 1,
          }}
        >
          PREPX
        </span>
      </div>

      {/* Main footer content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-14 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">

          {/* Brand column */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs shadow-md shadow-indigo-500/20">
                AI
              </div>
              <span className="text-white font-bold text-base tracking-tight">prepX</span>
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              Master technical and behavioral interviews with real-time AI feedback, instant resume analysis, and realistic mock interview simulations.
            </p>
            {/* Socials */}
            <div className="flex items-center gap-3 pt-1">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                >
                  <Icon className="size-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* AI Platform Features */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">
              AI Features
            </h4>
            <ul className="space-y-2.5">
              {aiFeatures.map((feature) => (
                <li key={feature}>
                  <span className="text-sm text-zinc-500 hover:text-white transition-colors cursor-default">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links + copyright */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">
              prepX
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-4 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-zinc-600">
          <p>© {new Date().getFullYear()} prepX. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
            <Link to="/privacy-policy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
