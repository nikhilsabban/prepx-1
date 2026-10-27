import type { Request, Response, NextFunction } from "express";
import jwt, { type Secret } from "jsonwebtoken";
import { User, type IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
}

export async function protect(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        res.status(401).json({ message: "Not authorized, token missing" });
        return;
      }
      const secret: Secret = process.env.JWT_SECRET || "super_secret_jwt_key_ai_interviewer_2025";
      const decoded = jwt.verify(token, secret) as unknown as JwtPayload;

      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        res.status(401).json({ message: "User not found with this token" });
        return;
      }

      req.user = user;
      next();
      return;
    } catch (error: any) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        res.status(401).json({ message: "Invalid or expired session token. Please log in again." });
        return;
      }
      console.error("Auth Middleware error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token provided" });
    return;
  }
}

export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      if (token) {
        const secret: Secret = process.env.JWT_SECRET || "super_secret_jwt_key_ai_interviewer_2025";
        const decoded = jwt.verify(token, secret) as unknown as JwtPayload;
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          req.user = user;
        }
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }
  next();
}
