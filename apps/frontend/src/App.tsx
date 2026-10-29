import React, { Suspense } from "react";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router";

import { AuthProvider } from "./context/AuthContext";
import { GamificationProvider } from "./context/GamificationContext";
import { CelebrationModal } from "./components/gamification/CelebrationModal";
import { GamificationHubModal } from "./components/gamification/GamificationHubModal";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Form } from "./components/Form";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { SkeletonPage } from "./components/ui/skeleton";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Route-level code splitting to optimize initial bundle size & rendering speed
const Dashboard = React.lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Profile = React.lazy(() => import("./pages/Profile").then((m) => ({ default: m.Profile })));
const AIInterview = React.lazy(() => import("./pages/AIInterview").then((m) => ({ default: m.AIInterview })));
const Interview = React.lazy(() => import("./components/Interview").then((m) => ({ default: m.Interview })));
const Result = React.lazy(() => import("./components/Result").then((m) => ({ default: m.Result })));
const HistoryPage = React.lazy(() => import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const BookmarksPage = React.lazy(() => import("./pages/BookmarksPage").then((m) => ({ default: m.BookmarksPage })));
const ResumeAnalyzerPage = React.lazy(() => import("./pages/ResumeAnalyzerPage").then((m) => ({ default: m.ResumeAnalyzerPage })));
const CodingPlatformPage = React.lazy(() => import("./pages/coding/CodingPlatformPage").then((m) => ({ default: m.CodingPlatformPage })));
const GDHubPage = React.lazy(() => import("./pages/gd/GDHubPage").then((m) => ({ default: m.GDHubPage })));
const GDRoomPage = React.lazy(() => import("./pages/gd/GDRoomPage").then((m) => ({ default: m.GDRoomPage })));
const GDResultPage = React.lazy(() => import("./pages/gd/GDResultPage").then((m) => ({ default: m.GDResultPage })));
const AboutUs = React.lazy(() => import("./pages/AboutUs").then((m) => ({ default: m.AboutUs })));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })));
const TermsAndConditions = React.lazy(() => import("./pages/TermsAndConditions").then((m) => ({ default: m.TermsAndConditions })));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const VerifyEmailPage = React.lazy(() => import("./pages/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage })));
const VerifyEmailPendingPage = React.lazy(() => import("./pages/VerifyEmailPendingPage").then((m) => ({ default: m.VerifyEmailPendingPage })));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback").then((m) => ({ default: m.AuthCallback })));
const FeaturePlaceholder = React.lazy(() => import("./pages/FeaturePlaceholder").then((m) => ({ default: m.FeaturePlaceholder })));

import { useLocation } from "react-router";

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [pathname]);
  return null;
}

export function App() {
  const appContent = (
    <AuthProvider>
      <GamificationProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">

            <Navbar />
            <div className="flex-1">
              <Suspense fallback={<SkeletonPage />}>
                <Routes>
                  <Route path="/" element={<Form />} />
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/verify-email-pending" element={<VerifyEmailPendingPage />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsAndConditions />} />
                  <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                  <Route path="/terms-of-service" element={<TermsAndConditions />} />
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
                        <CodingPlatformPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/coding/*"
                    element={
                      <ProtectedRoute>
                        <CodingPlatformPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/coding"
                    element={
                      <ProtectedRoute>
                        <CodingPlatformPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/coding/*"
                    element={
                      <ProtectedRoute>
                        <CodingPlatformPage />
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
                    path="/resume"
                    element={
                      <ProtectedRoute>
                        <ResumeAnalyzerPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/resume-analyzer"
                    element={
                      <ProtectedRoute>
                        <ResumeAnalyzerPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <HistoryPage />
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
                    path="/bookmarks"
                    element={
                      <ProtectedRoute>
                        <BookmarksPage />
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
                  <Route
                    path="/gd"
                    element={
                      <ProtectedRoute>
                        <GDHubPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/gd/*"
                    element={
                      <ProtectedRoute>
                        <GDHubPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/group-discussion"
                    element={
                      <ProtectedRoute>
                        <GDHubPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/group-discussion"
                    element={
                      <ProtectedRoute>
                        <GDHubPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/group-discussion/result/:sessionId"
                    element={
                      <ProtectedRoute>
                        <GDResultPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/group-discussion/result/:sessionId"
                    element={
                      <ProtectedRoute>
                        <GDResultPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/group-discussion/:sessionId"
                    element={
                      <ProtectedRoute>
                        <GDRoomPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/:userId/group-discussion/:sessionId"
                    element={
                      <ProtectedRoute>
                        <GDRoomPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </div>
            <Footer />
            <ToastContainer
              position="top-right"
              autoClose={2000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
            <CelebrationModal />
            <GamificationHubModal />
          </div>
        </BrowserRouter>
      </GamificationProvider>
    </AuthProvider>
  );

  return appContent;
}

export default App;

