import type { Express, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// JWT secret - should be in environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d"; // 7 days

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
      userRole?: string;
    }
  }
}

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1),
});

// Generate JWT token (include role)
export function generateToken(userId: string, email: string, role?: string): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
export function verifyToken(token: string): { userId: string; email: string; role?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role?: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  
  // 1. Standard bcrypt compare
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    try {
      const match = await bcrypt.compare(password, hash);
      if (match) return true;
      // Case-insensitive bcrypt attempt
      const matchUpper = await bcrypt.compare(password.toUpperCase(), hash);
      if (matchUpper) return true;
    } catch (e) {
      // ignore
    }
  }

  // 2. Direct string comparison (uppercase & lowercase)
  if (password.trim() === hash.trim() || password.trim().toUpperCase() === hash.trim().toUpperCase()) {
    return true;
  }

  // 3. Fallback bcrypt for un-prefixed hashes
  try {
    return await bcrypt.compare(password, hash);
  } catch (e) {
    return false;
  }
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // Get user from database
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    // Attach user to request
    req.userId = decoded.userId;
    req.user = user;
    req.userRole = user.role || decoded.role || 'student';

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Register endpoint handler
export async function registerHandler(req: any, res: any) {
  try {
    const body = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(body.email);
    
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);

    // Create user
    const user = await storage.upsertUser({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName || null,
      passwordHash: hashedPassword,
    } as any);

    // Generate token (include role)
    const token = generateToken(user.id, user.email!, user.role || 'student');

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user and token
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Registration error:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
}

// Login endpoint handler
export async function loginHandler(req: any, res: any) {
  try {
    const body = loginSchema.parse(req.body);
    const identifier = (body.identifier || body.email || '').trim();
    if (!identifier) {
      return res.status(400).json({ message: "Email or Roll Number is required" });
    }
    const resolveEmailFromRoll = (value: string) => `${value}@students.local`;

    let user: User | undefined;
    
    // 1. Direct match on full identifier/email
    user = await storage.getUserByEmail(identifier);

    // 1b. Direct match by Roll Number
    if (!user) {
      user = await storage.getUserByRollNumber(identifier);
    }
    
    // 2. If not found and contains '@', try username prefix before '@'
    if (!user && identifier.includes("@")) {
      const usernamePrefix = identifier.split("@")[0].trim();
      if (usernamePrefix) {
        user = await storage.getUserByEmail(usernamePrefix);
        if (!user) {
          user = await storage.getUserByEmail(`${usernamePrefix}@interviewai.com`);
        }
        if (!user) {
          user = await storage.getUserByRollNumber(usernamePrefix);
        }
      }
    }

    // 3. If not found and doesn't contain '@', try common domain suffixes
    if (!user && !identifier.includes("@")) {
      user = await storage.getUserByEmail(`${identifier}@interviewai.com`);
      if (!user) {
        const sanitizedRoll = identifier.replace(/\s+/g, "");
        user = await storage.getUserByEmail(`${sanitizedRoll}@students.local`);
      }
    }

    // 4. Fuzzy fallback across all users
    if (!user) {
      const prefix = identifier.split("@")[0].toLowerCase().trim();
      const allUsers = await storage.getAllUsers();
      user = allUsers.find(u => 
        u.email.toLowerCase() === identifier.toLowerCase() ||
        u.rollNumber?.toLowerCase() === prefix ||
        u.email.toLowerCase().startsWith(prefix + "@") ||
        u.firstName?.toLowerCase() === prefix
      );
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const userWithPassword = user as any;
    if (!userWithPassword.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await comparePassword(body.password, userWithPassword.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate token (include role)
    const token = generateToken(user.id, user.email!, user.role || 'student');

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user and token
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login" });
  }
}

// Logout endpoint handler
export async function logoutHandler(req: any, res: any) {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
  res.json({ message: "Logged out successfully" });
}

// Role-based middleware
export const isAdmin: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const role = req.userRole || req.user?.role;
  if (role !== 'admin') {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  
  next();
};

export const isStudent: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const role = req.userRole || req.user?.role;
  if (role !== 'student') {
    return res.status(403).json({ message: "Forbidden - Student access required" });
  }
  
  next();
};

export const hasRole = (roles: string[]): RequestHandler => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const role = req.userRole || req.user?.role;
    if (!roles.includes(role)) {
      return res.status(403).json({ 
        message: `Forbidden - Required role: ${roles.join(' or ')}` 
      });
    }
    
    next();
  };
};

