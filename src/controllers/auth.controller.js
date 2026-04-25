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
    const { token } = await authService.handleCallback(code, role);
    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
  } catch (err) { next(err); }
};

exports.logout = (req, res) => {
  res.json({ success: true });
};

exports.me = async (req, res) => {
  res.json(req.user);
};
