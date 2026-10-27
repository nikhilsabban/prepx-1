import type { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * High-performance, zero-dependency in-memory sliding window rate limiter
 * Protects server resources and prevents single-user request bursts from degrading concurrency.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const ipMap = new Map<string, RateLimitRecord>();

  // Periodically clean up expired records every 60 seconds to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipMap.entries()) {
      if (now > record.resetTime) {
        ipMap.delete(key);
      }
    }
  }, 60000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown-client";

    const now = Date.now();
    const record = ipMap.get(ip);

    if (!record || now > record.resetTime) {
      ipMap.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      res.setHeader("X-RateLimit-Limit", options.maxRequests);
      res.setHeader("X-RateLimit-Remaining", options.maxRequests - 1);
      return next();
    }

    if (record.count >= options.maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSec);
      res.status(429).json({
        success: false,
        message: options.message || `Too many requests from this client. Please slow down and try again in ${retryAfterSec} seconds.`,
      });
      return;
    }

    record.count++;
    res.setHeader("X-RateLimit-Limit", options.maxRequests);
    res.setHeader("X-RateLimit-Remaining", options.maxRequests - record.count);
    next();
  };
}
