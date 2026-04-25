const authService = require('../services/auth.service');

// GET /api/auth/google?role=teacher  (default)
// GET /api/auth/google?role=student
exports.googleAuth = (req, res) => {
  const role = req.query.role === 'student' ? 'student' : 'teacher';
  const url = authService.getAuthUrl(role);
  res.redirect(url);
};

exports.googleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const role = state === 'student' ? 'student' : 'teacher';
    const { token, user } = await authService.handleCallback(code, role);
    res.json({ token, user });
  } catch (err) { next(err); }
};

exports.logout = (req, res) => {
  res.json({ success: true });
};

exports.me = async (req, res) => {
  res.json(req.user);
};
