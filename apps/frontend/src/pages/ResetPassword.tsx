import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { resetPassword } from "../services/authService";

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!token) {
      toast.error("Invalid reset token");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(token, password);
      toast.success(response.message || "Password successfully reset!");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center pt-24 pb-20 px-6 min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Create New Password
          </h1>
          <p className="text-[#A3A3A3]">
            Please enter your new password below.
          </p>
        </div>

        <div className="bg-[#111] border border-white/5 p-8 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-white">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                placeholder="••••••••"
                className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-medium text-white">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                placeholder="••••••••"
                className="bg-black border border-white/10 text-white focus-visible:ring-2 focus-visible:ring-[#2563EB] h-10 px-3 placeholder:text-zinc-500 rounded-md"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-medium h-11 rounded-lg mt-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : "Save New Password"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[#A3A3A3]">
            <Link to="/login" className="text-[#2563EB] hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
