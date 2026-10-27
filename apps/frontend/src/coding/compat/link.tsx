import React from "react";
import { Link as RouterLink, useLocation } from "react-router";

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  children?: React.ReactNode;
}

export default function Link({ href, replace, children, className, ...props }: LinkProps) {
  const location = useLocation();
  const userPrefixMatch = location.pathname.match(/^(\/[a-f0-9]{24})\/coding/);
  const userPrefix = userPrefixMatch ? userPrefixMatch[1] : "";
  const basePrefix = `${userPrefix}/coding`;

  let to = href;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return <a href={href} className={className} {...props}>{children}</a>;
  }
  if (href.startsWith("/dashboard") || href.startsWith("/login") || href.startsWith("/settings")) {
    to = userPrefix ? `${userPrefix}${href}` : href;
  } else if (href.startsWith("/coding")) {
    to = userPrefix ? `${userPrefix}${href}` : href;
  } else if (href.startsWith("?")) {
    to = `${location.pathname}${href}`;
  } else if (href.startsWith("/?")) {
    to = `${basePrefix}${href.substring(1)}`;
  } else if (href === "/" || href === "") {
    to = basePrefix;
  } else if (href.startsWith("/")) {
    to = `${basePrefix}${href}`;
  } else {
    to = `${basePrefix}/${href}`;
  }

  return (
    <RouterLink to={to} replace={replace} className={className} {...props}>
      {children}
    </RouterLink>
  );
}
