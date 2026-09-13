import React, { Suspense } from "react";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router";

import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Form } from "./components/Form";
import { Interview } from "./components/Interview";
import { Result } from "./components/Result";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Profile } from "./pages/Profile";
import { Dashboard } from "./pages/Dashboard";
import { FeaturePlaceholder } from "./pages/FeaturePlaceholder";
import { AuthCallback } from "./pages/AuthCallback";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsAndConditions } from "./pages/TermsAndConditions";
import { AIInterview } from "./pages/AIInterview";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";

import { HistoryPage } from "./pages/HistoryPage";
import { AboutUs } from "./pages/AboutUs";
import { SkeletonPage } from "./components/ui/skeleton";
import { ResumeAnalyzerPage } from "./pages/ResumeAnalyzerPage";

import { BookmarksPage } from "./pages/BookmarksPage";
import { CodingDashboardPage } from "./modules/coding/pages/CodingDashboardPage";
import { ProblemListPage } from "./modules/coding/pages/ProblemListPage";
import { ProblemDetailPage } from "./modules/coding/pages/ProblemDetailPage";
import { LeaderboardPage } from "./modules/coding/pages/LeaderboardPage";

export function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasGoogleClientId = !!googleClientId && googleClientId !== "MOCK_CLIENT_ID";

  const appContent = (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">

            <Navbar />
            <div className="flex-1">
              <Suspense fallback={<SkeletonPage />}>
                <Routes>
                  <Route path="/" element={<Form />} />
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsAndConditions />} />
                  <Route
                    path="/ai-interview"
                    element={
                      <ProtectedRoute>
                        <AIInterview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/interview/:interviewId"
                    element={
                      <ProtectedRoute>
                        <Interview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/result/:interviewId"
                    element={
                      <ProtectedRoute>
                        <Result />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coding"
                    element={
                      <ProtectedRoute>
                        <CodingDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coding/problems"
                    element={
                      <ProtectedRoute>
                        <ProblemListPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coding/problem/:slug"
                    element={
                      <ProtectedRoute>
                        <ProblemDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coding/leaderboard"
                    element={
                      <ProtectedRoute>
                        <LeaderboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/coding"
                    element={
                      <ProtectedRoute>
                        <CodingDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/resume"
                    element={
                      <ProtectedRoute>
                        <ResumeAnalyzerPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/history"
                    element={
                      <ProtectedRoute>
                        <HistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/bookmarks"
                    element={
                      <ProtectedRoute>
                        <BookmarksPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </div>
            <Footer />
            <Toaster richColors position="top-right" theme="dark" />
          </div>
        </BrowserRouter>
      </AuthProvider>
  );


  if (hasGoogleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        {appContent}
      </GoogleOAuthProvider>
    );
  }

  return appContent;
}

export default App;

