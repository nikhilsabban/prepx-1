import { useNavigate, useLocation, useSearchParams as useRouterSearchParams, useParams } from "react-router";

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const userPrefixMatch = location.pathname.match(/^(\/[a-f0-9]{24})\/coding/);
  const userPrefix = userPrefixMatch ? userPrefixMatch[1] : "";
  const basePrefix = `${userPrefix}/coding`;

  const resolveTo = (url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/dashboard") || url.startsWith("/login") || url.startsWith("/settings")) {
      return userPrefix ? `${userPrefix}${url}` : url;
    }
    if (url.startsWith("/coding")) {
      return userPrefix ? `${userPrefix}${url}` : url;
    }
    if (url.startsWith("?")) {
      return `${location.pathname}${url}`;
    }
    if (url.startsWith("/?")) {
      return `${basePrefix}${url.substring(1)}`;
    }
    if (url === "/" || url === "") {
      return basePrefix;
    }
    if (url.startsWith("/")) {
      return `${basePrefix}${url}`;
    }
    return `${basePrefix}/${url}`;
  };

  return {
    push: (url: string) => navigate(resolveTo(url)),
    replace: (url: string) => navigate(resolveTo(url), { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
    prefetch: () => {},
  };
}

export function usePathname(): string {
  const location = useLocation();
  const sub = location.pathname.replace(/^(\/[a-f0-9]{24})?\/coding/, "");
  return sub.startsWith("/") ? sub : `/${sub}`;
}

export function useSearchParams(): URLSearchParams {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}

export { useParams };

export function notFound() {
  return null;
}
