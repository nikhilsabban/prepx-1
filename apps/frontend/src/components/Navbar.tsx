import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { LogOut, User, BookOpenCheck, History, Bookmark, ArrowLeft, Menu, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-[#09090b]/95 backdrop-blur-md">
      <div className={`mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 ${user ? "pl-20 md:pl-24" : ""}`}>
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          {showBackArrow && (
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center justify-center rounded-full hover:bg-zinc-800 p-1.5 transition text-zinc-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <Link to={user ? `/${user.id}` : "/"} className="flex items-center gap-2.5 transition hover:opacity-80">
            <div className="flex size-8 md:size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-base md:text-lg shadow-lg shadow-indigo-500/20">
              AI
            </div>
            <span className="text-white font-bold text-lg md:text-xl tracking-tight">prepX</span>
          </Link>
        </div>

        {/* Center / Nav Links (Only show on unauthenticated landing pages) */}
        {!isAuthenticated && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/" className="text-zinc-400 hover:text-white transition-colors">Home</Link>
            <Link to="/about" className="text-zinc-400 hover:text-white transition-colors">About Us</Link>
            <a href="/#features" className="text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="/#interview-types" className="text-zinc-400 hover:text-white transition-colors">Interview Types</a>
          </nav>
        )}

        {/* Right Auth Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative flex items-center gap-2">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)} 
                className="flex size-9 md:size-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-xs md:text-sm hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 hover:ring-offset-[#09090b] transition-all focus:outline-none cursor-pointer"
              >
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.fullName} className="size-full rounded-full object-cover" />
                ) : (
                  user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
                )}
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-xl shadow-black/50 overflow-hidden z-50 py-1">
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-sm font-bold text-white tracking-wide">{user.fullName}</p>
                    </div>
                    <div className="py-1">
                      <Link onClick={() => setDropdownOpen(false)} to="/ai-interview" className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-zinc-900 transition-colors">
                        <Sparkles className="size-4 stroke-[1.5]" />
                        AI Interview
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors">
                        <User className="size-4 stroke-[1.5]" />
                        Profile
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to={`/${user.id}/coding`} className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors">
                        <BookOpenCheck className="size-4 stroke-[1.5]" />
                        Coding Platform
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to={`/${user.id}/history`} className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors">
                        <History className="size-4 stroke-[1.5]" />
                        Video History
                      </Link>
                      <Link onClick={() => setDropdownOpen(false)} to={`/${user.id}/bookmarks`} className="flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors">
                        <Bookmark className="size-4 stroke-[1.5]" />
                        Bookmarks
                      </Link>
                    </div>
                    <div className="py-1 border-t border-zinc-800">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs md:text-sm font-medium text-red-400 hover:text-red-300 hover:bg-zinc-900 transition-colors cursor-pointer">
                        <LogOut className="size-4 stroke-[1.5]" />
                        Log out
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
                className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-lg px-3.5 sm:px-5 h-9 text-xs sm:text-sm cursor-pointer"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate("/signup")}
                className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold rounded-lg px-3.5 sm:px-5 h-9 text-xs sm:text-sm cursor-pointer"
              >
                Join now
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          {!isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && !isAuthenticated && (
        <div className="md:hidden border-b border-zinc-800 bg-[#09090b] px-6 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 hover:text-white py-1.5"
          >
            Home
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 hover:text-white py-1.5"
          >
            About Us
          </Link>
          <a
            href="/#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 hover:text-white py-1.5"
          >
            Features
          </a>
          <a
            href="/#interview-types"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm text-zinc-300 hover:text-white py-1.5"
          >
            Interview Types
          </a>
        </div>
      )}
    </header>
  );
}
