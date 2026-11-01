import { Group } from '../models/Group.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';

export const createGroup = async (req, res, next) => {
  try {
    const { name, description, avatar, memberChatIds } = req.body;
    const currentUserId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required.',
      });
    }

    const memberIds = [currentUserId];

    // Look up any initial member Chat IDs
    if (Array.isArray(memberChatIds) && memberChatIds.length > 0) {
      const users = await User.find({
        chatId: { $in: memberChatIds.map((id) => id.toUpperCase().trim()) },
      }).select('_id');

      users.forEach((u) => {
        if (!memberIds.some((m) => m.toString() === u._id.toString())) {
          memberIds.push(u._id);
        }
      });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      avatar: avatar || '',
      creator: currentUserId,
      admins: [currentUserId],
      members: memberIds,
      unreadCounts: {
        [currentUserId.toString()]: 0,
      },
    });

    const populated = await Group.findById(group._id)
      .populate('creator', 'chatId displayName avatar')
      .populate('admins', 'chatId displayName avatar')
      .populate('members', 'chatId displayName avatar isOnline lastSeen bio');

    res.status(201).json({
      success: true,
      group: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserGroups = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const groups = await Group.find({
      members: currentUserId,
    })
      .populate('lastMessage')
      .populate('creator', 'chatId displayName avatar')
      .populate('admins', 'chatId displayName avatar')
      .populate('members', 'chatId displayName avatar isOnline lastSeen bio')
      .sort({ lastMessageAt: -1 });

    const formatted = groups.map((g) => {
      const unreadCount = g.unreadCounts?.get
        ? g.unreadCounts.get(currentUserId.toString()) || 0
        : g.unreadCounts?.[currentUserId.toString()] || 0;

      return {
        _id: g._id,
        name: g.name,
        avatar: g.avatar,
        description: g.description,
        creator: g.creator,
        admins: g.admins,
        membersCount: g.members.length,
        members: g.members,
        lastMessage: g.lastMessage,
        lastMessageAt: g.lastMessageAt,
        unreadCount,
        isGroup: true,
      };
    });

    res.status(200).json({
      success: true,
      groups: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroupDetails = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findOne({
      _id: groupId,
      members: req.user._id,
    })
      .populate('creator', 'chatId displayName avatar')
      .populate('admins', 'chatId displayName avatar')
      .populate('members', 'chatId displayName avatar isOnline lastSeen bio');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found or you are not a member.',
      });
    }

    res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    next(error);
  }
};

export const addMemberByChatId = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required.',
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Check if requester is admin
    const isAdmin = group.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can add members.' });
    }

    const targetUser = await User.findOne({ chatId: chatId.toUpperCase().trim() });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'No user found with this Chat ID.' });
    }

    if (group.members.some((m) => m.toString() === targetUser._id.toString())) {
      return res.status(400).json({ success: false, message: 'User is already a member of this group.' });
    }

    group.members.push(targetUser._id);
    await group.save();

    const populated = await Group.findById(groupId)
      .populate('creator', 'chatId displayName avatar')
      .populate('admins', 'chatId displayName avatar')
      .populate('members', 'chatId displayName avatar isOnline lastSeen bio');

    res.status(200).json({
      success: true,
      message: `${targetUser.displayName} added to the group!`,
      group: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { groupId, memberId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isAdmin = group.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can remove members.' });
    }

    group.members = group.members.filter((m) => m.toString() !== memberId);
    group.admins = group.admins.filter((a) => a.toString() !== memberId);
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Member removed from group.',
      groupId,
      memberId,
    });
  } catch (error) {
    next(error);
  }
};

export const leaveGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    group.members = group.members.filter((m) => m.toString() !== currentUserId.toString());
    group.admins = group.admins.filter((a) => a.toString() !== currentUserId.toString());

    // If creator leaves and there are other members, assign next member as admin
    if (group.creator.toString() === currentUserId.toString() && group.members.length > 0) {
      group.creator = group.members[0];
      if (!group.admins.includes(group.members[0])) {
        group.admins.push(group.members[0]);
      }
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: 'You left the group.',
      groupId,
    });
  } catch (error) {
    next(error);
  }
};
