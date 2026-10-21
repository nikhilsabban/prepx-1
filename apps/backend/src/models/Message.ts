import mongoose, { Document, Schema } from "mongoose";

export type MessageType = "User" | "Assistant";

export interface IMessage extends Document {
  interviewId: mongoose.Types.ObjectId;
  type: MessageType;
  message: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["User", "Assistant"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

export const Message = mongoose.model<IMessage>("Message", MessageSchema);
