import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    callType: {
      type: String,
      enum: ['video', 'audio'],
      default: 'audio',
    },
    status: {
      type: String,
      enum: ['completed', 'missed', 'declined', 'busy', 'failed'],
      required: true,
    },
    duration: {
      type: Number,
      default: 0, // in seconds
    },
  },
  {
    timestamps: true,
  }
);

callLogSchema.index({ caller: 1, createdAt: -1 });
callLogSchema.index({ recipient: 1, createdAt: -1 });

export const CallLog = mongoose.model('CallLog', callLogSchema);
