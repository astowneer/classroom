const notificationService = require('../services/notification.service');

exports.list = async (req, res, next) => {
  try {
    const notifications = await notificationService.getForUser(req.user.id);
    res.json(notifications);
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    await notificationService.markRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};
