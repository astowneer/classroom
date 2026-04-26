const { Message, Submission, User } = require('../models');

// GET /messages/:submissionId — get chat for a submission
exports.list = async (req, res, next) => {
  try {
    const { submissionId } = req.params;

    // Access check: teacher sees all, student sees only their own
    if (req.user.role === 'student') {
      const sub = await Submission.findByPk(submissionId);
      if (!sub || sub.studentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await Message.findAll({
      where: { submissionId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'ASC']],
    });

    // Mark unread messages as read for current user
    await Message.update(
      { read: true },
      { where: { submissionId, read: false, senderId: { [require('sequelize').Op.ne]: req.user.id } } }
    );

    res.json(messages);
  } catch (err) { next(err); }
};

// POST /messages/:submissionId — send message
exports.send = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

    const sub = await Submission.findByPk(submissionId, {
      include: [{ model: User, as: 'student' }],
    });
    if (!sub) return res.status(404).json({ error: 'Not found' });

    if (req.user.role === 'student' && sub.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const message = await Message.create({ submissionId, senderId: req.user.id, text: text.trim() });

    // Notify the other party
    const { Notification } = require('../models');
    const recipientId = req.user.role === 'student'
      ? (await require('../models').Assignment.findByPk(sub.assignmentId, {
          include: [{ model: require('../models').Course, as: 'course' }],
        })).course.teacherId
      : sub.studentId;

    await Notification.create({
      userId: recipientId,
      submissionId,
      message: `Нове повідомлення до роботи #${submissionId} від ${req.user.name || req.user.email}: "${text.trim().slice(0, 60)}${text.length > 60 ? '...' : ''}"`,
    });

    const full = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }],
    });
    res.status(201).json(full);
  } catch (err) { next(err); }
};

// GET /messages/unread — count unread messages per submission for teacher
exports.unreadCount = async (req, res, next) => {
  try {
    const { Op, fn, col, literal } = require('sequelize');
    const counts = await Message.findAll({
      where: { read: false, senderId: { [Op.ne]: req.user.id } },
      attributes: ['submissionId', [fn('COUNT', col('id')), 'count']],
      group: ['submissionId'],
      raw: true,
    });
    res.json(counts);
  } catch (err) { next(err); }
};
