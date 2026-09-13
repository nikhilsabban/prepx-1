import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username?: string;
  fullName: string;
  email: string;
  password: string;
  college?: string;
  branch?: string;
  degree?: string;
  graduationYear?: string;
  cgpa?: string;
  profilePicture?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  phoneNumber?: string;
  xp?: number;
  streakDays?: number;
  lastActiveDate?: Date;
  badges?: string[];
  mobileSessionToken?: string;
  desktopSessionToken?: string;
  authProvider?: string;
  providerId?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  emailOtpToken?: string;
  emailOtpExpire?: Date;
  phoneOtpToken?: string;
  phoneOtpExpire?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
      match: [/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots, and hyphens"],
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github", "linkedin"],
      default: "local",
    },
    providerId: {
      type: String,
      default: "",
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailOtpToken: String,
    emailOtpExpire: Date,
    phoneOtpToken: String,
    phoneOtpExpire: Date,
    college: {
      type: String,
      default: "",
      trim: true,
    },
    branch: {
      type: String,
      default: "",
      trim: true,
    },
    degree: {
      type: String,
      default: "",
      trim: true,
    },
    graduationYear: {
      type: String,
      default: "",
      trim: true,
    },
    cgpa: {
      type: String,
      default: "",
      trim: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    linkedinUrl: {
      type: String,
      default: "",
    },
    githubUrl: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    xp: {
      type: Number,
      default: 0,
    },
    streakDays: {
      type: Number,
      default: 1,
    },
    lastActiveDate: {
      type: Date,
      default: Date.now,
    },
    badges: {
      type: [String],
      default: ["On Fire!"],
    },
    mobileSessionToken: {
      type: String,
      default: "",
    },
    desktopSessionToken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Method to return user info without password
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

export const User = mongoose.model<IUser>("User", UserSchema);
