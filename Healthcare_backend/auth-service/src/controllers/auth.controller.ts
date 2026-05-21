import { TryCatch } from "../utils/TryCatch.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import type { RequestHandler, Request, Response } from "express";
import { User } from "../model/user.model.js";
import jwt from "jsonwebtoken";

// Generate JWT Token
const generateToken = (id: any): string => {
  const secret = process.env.JWT_SECRET?.trim();
  console.log("[auth-service] secret length:", secret?.length);
  if (!secret) {
    throw new Error("JWT secret not found in environment variables");
  }
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  } as any);
};

// Register Controller
export const register2: RequestHandler = TryCatch(
  async (req: Request, res: Response) => {
    const { name, email, password, phone, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      throw new ErrorHandler(
        "Please provide all required fields (name, email, password, phone)",
        400
      );
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new ErrorHandler("Email already registered", 409);
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || "patient",
    });

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Get user without password
    const userWithoutPassword = user.toObject();
    delete (userWithoutPassword as any).password;

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: userWithoutPassword,
    });
  }
);

// Login Controller
export const login: RequestHandler = TryCatch(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new ErrorHandler("Please provide email and password", 400);
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new ErrorHandler("Invalid email or password", 401);
    }

    // Check password match
    const isPasswordMatch = await (user as any).matchPassword(password);

    if (!isPasswordMatch) {
      throw new ErrorHandler("Invalid email or password", 401);
    }

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Get user without password
    const userWithoutPassword = user.toObject();
    delete (userWithoutPassword as any).password;
   
    
    const userWithProfile = { ...userWithoutPassword};
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userWithProfile,
    });
  }
);

// Logout Controller
export const logout: RequestHandler = TryCatch(
  async (req: Request, res: Response) => {
    res.clearCookie("token");

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  }
);

// Get Current User
export const getMe: RequestHandler = TryCatch(
  async (req: Request, res: Response) => {
    const user = await User.findById((req as any).user?.id);

    if (!user) {
      throw new ErrorHandler("User not found", 404);
    }

    res.status(200).json({
      success: true,
      user,
    });
  }
);
