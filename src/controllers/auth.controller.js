const authService = require('../services/auth.service');

exports.googleAuth = (req, res) => {
  const url = authService.getAuthUrl();
  res.redirect(url);
};

exports.googleCallback = async (req, res) => {
  const { code } = req.query;
  const { token, user } = await authService.handleCallback(code);
  res.json({ token, user });
};

exports.logout = (req, res) => {
  res.json({ success: true });
};

exports.me = async (req, res) => {
  res.json(req.user);
};
