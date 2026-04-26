const { Message, Submission, User } = require('../models');

// GET /messages/:submissionId — get chat for a submission
exports.list = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { Course, Assignment } = require('../models');

    const sub = await Submission.findByPk(submissionId, {
      include: [{ model: Assignment, as: 'assignment', include: [{ model: Course, as: 'course' }] }],
    });
    if (!sub) return res.status(404).json({ error: 'Not found' });

    if (req.user.role === 'student') {
      // Student can only see their own submission's chat
      if (sub.studentId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    } else {
      // Teacher can only see chats for submissions in their own courses
      if (sub.assignment?.course?.teacherId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const messages = await Message.findAll({
      where: { submissionId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'ASC']],
    });

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

    if (req.user.role === 'teacher') {
      const { Course, Assignment } = require('../models');
      const assignment = await Assignment.findByPk(sub.assignmentId, {
        include: [{ model: Course, as: 'course' }],
      });
      if (assignment?.course?.teacherId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
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

// GET /messages/unread — count unread messages per submission
exports.unreadCount = async (req, res, next) => {
  try {
    const { Op, fn, col } = require('sequelize');

    // For teachers: only submissions from their courses
    // For students: only their own submissions
    let submissionIds;
    if (req.user.role === 'teacher') {
      const { Course, Assignment } = require('../models');
      const courses = await Course.findAll({ where: { teacherId: req.user.id }, attributes: ['id'] });
      const courseIds = courses.map(c => c.id);
      const assignments = await Assignment.findAll({ where: { courseId: courseIds }, attributes: ['id'] });
      const assignmentIds = assignments.map(a => a.id);
      const subs = await Submission.findAll({ where: { assignmentId: assignmentIds }, attributes: ['id'] });
      submissionIds = subs.map(s => s.id);
    } else {
      const subs = await Submission.findAll({ where: { studentId: req.user.id }, attributes: ['id'] });
      submissionIds = subs.map(s => s.id);
    }

    if (!submissionIds.length) return res.json([]);

    const counts = await Message.findAll({
      where: {
        submissionId: submissionIds,
        read: false,
        senderId: { [Op.ne]: req.user.id },
      },
      attributes: ['submissionId', [fn('COUNT', col('id')), 'count']],
      group: ['submissionId'],
      raw: true,
    });
    res.json(counts);
  } catch (err) { next(err); }
};
