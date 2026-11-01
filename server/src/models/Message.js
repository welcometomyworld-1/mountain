import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: false,
      index: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: false,
      index: true,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'call_log'],
      default: 'text',
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    media: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      thumbnailUrl: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
      mimeType: { type: String, default: '' },
      fileName: { type: String, default: '' },
      duration: { type: Number, default: 0 }, // audio or video duration in seconds
    },
    isViewOnce: {
      type: Boolean,
      default: false,
    },
    viewedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    replyTo: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
      senderName: {
        type: String,
      },
      snippet: {
        type: String,
      },
      messageType: {
        type: String,
        default: 'text',
      },
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ group: 1, createdAt: 1 });
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ content: 'text' }); // Text search index

export const Message = mongoose.model('Message', messageSchema);
