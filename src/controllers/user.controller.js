const { User, Submission } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { role } = req.query;
    const where = role ? { role } : {};
    const users = await User.findAll({ where, attributes: ['id', 'name', 'email', 'role', 'googleId'] });
    res.json(users);
  } catch (err) { next(err); }
};

// PATCH /api/users/:id/name  { "name": "Дробідько Владислав Анатолійович" }
exports.updateName = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ name: req.body.name });
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) { next(err); }
};
