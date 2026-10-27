import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useGamification } from "../context/GamificationContext";
import { Button } from "./ui/button";
import { LogOut, User, BookOpenCheck, History, Bookmark, ArrowLeft, Menu, X, Sparkles, LayoutDashboard, FileText, Users, Trophy, Flame } from "lucide-react";
import { toast } from "react-toastify";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openHub, xp, levelNumber } = useGamification();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Automatically close dropdown and mobile menu whenever route changes or user auth changes (login/logout)
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, user?.id, isAuthenticated]);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Show back arrow on all inner/protected pages except the user's own dashboard
  const noBackArrowPaths = ["/login", "/signup", "/auth/callback"];
  const isDashboard = user ? location.pathname === `/${user.id}` : false;
  const showBackArrow =
    isAuthenticated &&
    !isDashboard &&
    !noBackArrowPaths.includes(location.pathname) &&
    !location.pathname.startsWith("/forgot-password") &&
    !location.pathname.startsWith("/reset-password");

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    toast.success("Signed out successfully");
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-xl">
      <div className={`mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 ${user ? "pl-4 md:pl-6" : ""}`}>
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          {showBackArrow && (
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 p-2 transition text-zinc-300 hover:text-white cursor-pointer active:scale-95"
              aria-label="Go Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <Link to={user ? `/${user.id}` : "/"} className="flex items-center gap-2.5 transition hover:opacity-90">
            <div className="flex size-8 md:size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 text-white font-black text-sm md:text-base shadow-lg shadow-indigo-500/20">
              AI
            </div>
            <span className="text-white font-extrabold text-lg md:text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              prepX
            </span>
          </Link>
        </div>

        {/* Navigation Links for Unauthenticated Landing */}
        {!isAuthenticated && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/" className={`transition-colors ${location.pathname === "/" ? "text-white font-semibold" : "text-zinc-400 hover:text-white"}`}>Home</Link>
            <Link to="/about" className={`transition-colors ${location.pathname === "/about" ? "text-white font-semibold" : "text-zinc-400 hover:text-white"}`}>About Us</Link>
            <a href="/#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="/#interview-types" className="text-zinc-400 hover:text-white transition-colors">Interview Modes</a>
          </nav>
        )}

        {/* Authenticated Quick Bar for Desktop */}
        {isAuthenticated && user && (
          <nav className="hidden lg:flex items-center gap-1 bg-zinc-950/60 border border-zinc-800/80 rounded-full px-3 py-1 text-xs font-medium text-zinc-400">
            <Link to={`/${user.id}`} className={`px-3 py-1.5 rounded-full transition-all ${location.pathname === `/${user.id}` ? "bg-indigo-600 text-white font-semibold" : "hover:text-white hover:bg-zinc-900"}`}>
              Dashboard
            </Link>
            <Link to="/ai-interview" className={`px-3 py-1.5 rounded-full transition-all ${location.pathname === "/ai-interview" ? "bg-indigo-600 text-white font-semibold" : "hover:text-white hover:bg-zinc-900"}`}>
              Mock Interview
            </Link>
            <Link to="/group-discussion" className={`px-3 py-1.5 rounded-full transition-all ${location.pathname.includes("/group-discussion") ? "bg-indigo-600 text-white font-semibold" : "hover:text-white hover:bg-zinc-900"}`}>
              Group Discussion
            </Link>
            <Link to={`/${user.id}/coding`} className={`px-3 py-1.5 rounded-full transition-all ${location.pathname.includes("/coding") ? "bg-indigo-600 text-white font-semibold" : "hover:text-white hover:bg-zinc-900"}`}>
              Coding
            </Link>
            <Link to={`/${user.id}/resume`} className={`px-3 py-1.5 rounded-full transition-all ${location.pathname.includes("/resume") ? "bg-indigo-600 text-white font-semibold" : "hover:text-white hover:bg-zinc-900"}`}>
              Resume Review
            </Link>
          </nav>
        )}

        {/* Right Auth Actions */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user && (
            <button
              onClick={() => openHub("overview")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-950/80 via-purple-950/70 to-zinc-900 border border-indigo-500/30 text-xs font-semibold text-indigo-200 hover:border-indigo-400 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm shadow-indigo-500/20"
              title="PrepX Gamification Hub: XP, Quests, Badges & Leaderboard"
            >
              <Trophy className="size-3.5 text-amber-400" />
              <span className="font-bold text-white">L{levelNumber}</span>
              <span className="hidden sm:inline text-indigo-300 font-mono text-[11px]">{xp} XP</span>
            </button>
          )}

          {isAuthenticated && user ? (
            <div className="relative flex items-center gap-2">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="flex size-9 md:size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-xs md:text-sm ring-2 ring-indigo-500/30 hover:ring-indigo-400 hover:ring-offset-2 hover:ring-offset-[#09090b] transition-all focus:outline-none cursor-pointer shadow-lg shadow-indigo-500/20"
                aria-label="User Account Menu"
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.fullName}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
                )}
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-zinc-800 bg-[#0c0c0e]/95 backdrop-blur-xl shadow-2xl shadow-black/80 overflow-hidden z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/40">
                      <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          openHub("overview");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-amber-300 hover:text-amber-200 hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
                      >
                        <Trophy className="size-4 text-amber-400" />
                        <span>Gamification & Rewards</span>
                      </button>
                      <Link onClick={() => setDropdownOpen(false)} to={`/${user.id}`} className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                        <LayoutDashboard className="size-4 text-indigo-400" />
                        Dashboard
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to="/ai-interview" className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                        <Sparkles className="size-4 text-purple-400" />
                        Start Mock Interview
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to="/group-discussion" className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                        <Users className="size-4 text-pink-400" />
                        Group Discussion
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to={`/${user.id}/coding`} className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                        <BookOpenCheck className="size-4 text-blue-400" />
                        Coding Practice
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to={`/${user.id}/resume`} className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                        <FileText className="size-4 text-emerald-400" />
                        Resume Review
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to={`/${user.id}/history`} className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                        <History className="size-4 text-cyan-400" />
                        Interview History
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to={`/${user.id}/bookmarks`} className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                        <Bookmark className="size-4 text-amber-400" />
                        Saved Bookmarks
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors">
                        <User className="size-4 text-zinc-400" />
                        Profile & Settings
                      </Link>
                    </div>
                    <div className="py-1 border-t border-zinc-800/80 bg-zinc-950/40">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer">
                        <LogOut className="size-4 stroke-[1.75]" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                onClick={() => navigate("/login")}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold rounded-xl px-3 sm:px-4 h-9 text-xs sm:text-sm transition-all cursor-pointer"
              >
                Sign in
              </Button>
              <Button
                onClick={() => navigate("/signup")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-3 sm:px-4 h-9 text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Sign up
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-zinc-800 bg-[#09090b]/98 backdrop-blur-2xl px-5 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-4.5rem)] overflow-y-auto">
          {!isAuthenticated ? (
            <div className="space-y-1">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-zinc-300 hover:text-white py-2.5 border-b border-zinc-800/50">Home</Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-zinc-300 hover:text-white py-2.5 border-b border-zinc-800/50">About Us</Link>
              <a href="/#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-zinc-300 hover:text-white py-2.5 border-b border-zinc-800/50">Features</a>
              <a href="/#interview-types" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-zinc-300 hover:text-white py-2.5">Interview Modes</a>
            </div>
          ) : user && (
            <div className="space-y-1 py-1">
              <Link to={`/${user.id}`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-zinc-200 py-2.5 border-b border-zinc-800/50">
                <LayoutDashboard className="size-4 text-indigo-400" /> Dashboard
              </Link>
              <Link to="/ai-interview" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-zinc-200 py-2.5 border-b border-zinc-800/50">
                <Sparkles className="size-4 text-purple-400" /> Mock Interview
              </Link>
              <Link to="/group-discussion" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-zinc-200 py-2.5 border-b border-zinc-800/50">
                <Users className="size-4 text-pink-400" /> Group Discussion
              </Link>
              <Link to={`/${user.id}/coding`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-zinc-200 py-2.5 border-b border-zinc-800/50">
                <BookOpenCheck className="size-4 text-blue-400" /> Coding Practice
              </Link>
              <Link to={`/${user.id}/resume`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-zinc-200 py-2.5 border-b border-zinc-800/50">
                <FileText className="size-4 text-emerald-400" /> Resume Review
              </Link>
              <Link to={`/${user.id}/history`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-zinc-200 py-2.5 border-b border-zinc-800/50">
                <History className="size-4 text-cyan-400" /> Interview History
              </Link>
              <Link to={`/${user.id}/bookmarks`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-zinc-200 py-2.5 border-b border-zinc-800/50">
                <Bookmark className="size-4 text-amber-400" /> Saved Bookmarks
              </Link>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-sm font-medium text-zinc-200 py-2.5 border-b border-zinc-800/50">
                <User className="size-4 text-zinc-400" /> Profile & Settings
              </Link>
              <button 
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }} 
                className="w-full flex items-center gap-3 text-sm font-medium text-rose-400 hover:text-rose-300 py-2.5 text-left cursor-pointer"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

