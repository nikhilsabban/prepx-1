import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { githubLogin, linkedinLogin } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    
    const code = searchParams.get("code");
    const provider = searchParams.get("state") || searchParams.get("provider"); // For GitHub we might pass provider in state
    
    // We can also infer provider from URL if needed, but let's assume we pass it in 'state' during the OAuth redirect
    // If not, we could have separate routes like /auth/github/callback and /auth/linkedin/callback
    // For simplicity, let's look at a 'provider' query param or just guess if only one is implemented.
    
    // Actually, GitHub and LinkedIn both send 'code' and 'state'
    // Let's rely on 'state' being the provider name
    const actualProvider = provider || localStorage.getItem("oauth_provider");

    if (!code) {
      toast.error("Authentication failed. No code provided.");
      navigate("/login", { replace: true });
      return;
    }

    if (!actualProvider) {
      toast.error("Authentication failed. Unknown provider.");
      navigate("/login", { replace: true });
      return;
    }

    hasProcessed.current = true;

    const processLogin = async () => {
      try {
        let user;
        if (actualProvider === "github") {
          user = await githubLogin(code);
        } else if (actualProvider === "linkedin") {
          const redirectUri = window.location.origin + "/auth/callback";
          user = await linkedinLogin(code, redirectUri);
        } else {
          throw new Error("Invalid provider");
        }

        toast.success(`Successfully logged in with ${actualProvider.charAt(0).toUpperCase() + actualProvider.slice(1)}!`);
        if (user?.id) {
          navigate(`/${user.id}`, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Authentication failed");
        navigate("/login", { replace: true });
      }
    };

    processLogin();
  }, [searchParams, githubLogin, linkedinLogin, navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <Loader2 className="size-10 animate-spin text-[#2563EB] mb-4" />
      <h2 className="text-xl font-medium tracking-tight">Authenticating...</h2>
      <p className="text-zinc-500 mt-2 text-sm">Please wait while we complete your login.</p>
    </div>
  );
}
