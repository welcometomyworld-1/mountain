import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const contactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  nickname: {
    type: String,
    trim: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    chatId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [2, 'Display name must be at least 2 characters'],
      maxlength: [40, 'Display name cannot exceed 40 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: 'Available on PrivateID',
      maxlength: [120, 'Bio cannot exceed 120 characters'],
    },
    securityQuestion: {
      type: String,
      required: [true, 'Security question is required for account recovery'],
    },
    securityAnswer: {
      type: String,
      required: [true, 'Security answer is required for account recovery'],
    },
    contacts: [contactSchema],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone',
      },
      onlineStatus: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone',
      },
      lastSeen: {
        type: String,
        enum: ['everyone', 'contacts', 'nobody'],
        default: 'everyone',
      },
      readReceipts: {
        type: Boolean,
        default: true,
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    bannedReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password and security answer
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified('securityAnswer')) {
    const salt = await bcrypt.genSalt(10);
    // Lowercase and trim answer for resilient matching
    this.securityAnswer = await bcrypt.hash(this.securityAnswer.toLowerCase().trim(), salt);
  }
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Compare security answer
userSchema.methods.compareSecurityAnswer = async function (candidateAnswer) {
  return bcrypt.compare(candidateAnswer.toLowerCase().trim(), this.securityAnswer);
};

// Return sanitized user object
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.securityAnswer;
  return obj;
};

export const User = mongoose.model('User', userSchema);
