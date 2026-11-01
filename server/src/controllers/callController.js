import { CallLog } from '../models/CallLog.js';

export const getCallLogs = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const logs = await CallLog.find({
      $or: [{ caller: currentUserId }, { recipient: currentUserId }],
    })
      .populate('caller', 'chatId displayName avatar')
      .populate('recipient', 'chatId displayName avatar')
      .sort({ createdAt: -1 })
      .limit(60);

    // Format logs with direction (incoming, outgoing, missed)
    const formatted = logs.map((log) => {
      const isOutgoing = log.caller._id.toString() === currentUserId.toString();
      const peer = isOutgoing ? log.recipient : log.caller;

      return {
        _id: log._id,
        peer,
        isOutgoing,
        callType: log.callType,
        status: log.status,
        duration: log.duration,
        createdAt: log.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      calls: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const createCallLog = async (req, res, next) => {
  try {
    const { recipientId, callType, status, duration } = req.body;

    const log = await CallLog.create({
      caller: req.user._id,
      recipient: recipientId,
      callType: callType || 'audio',
      status: status || 'completed',
      duration: duration || 0,
    });

    const populated = await CallLog.findById(log._id)
      .populate('caller', 'chatId displayName avatar')
      .populate('recipient', 'chatId displayName avatar');

    res.status(201).json({
      success: true,
      callLog: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const clearCallLogs = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    await CallLog.deleteMany({
      $or: [{ caller: currentUserId }, { recipient: currentUserId }],
    });

    res.status(200).json({
      success: true,
      message: 'Call history cleared.',
    });
  } catch (error) {
    next(error);
  }
};
