jest.mock('../../models');

const { User, Submission, Assignment } = require('../../models');
const ctrl = require('../user.controller');

const res = () => {
  const r = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r;
};

describe('user.controller', () => {
  describe('list', () => {
    it('returns all users without filter', async () => {
      const users = [{ id: 1 }];
      User.findAll.mockResolvedValue(users);
      const req = { query: {} };
      const r = res();
      await ctrl.list(req, r, jest.fn());
      expect(User.findAll).toHaveBeenCalledWith({ where: {}, attributes: ['id', 'name', 'email', 'role', 'googleId'] });
      expect(r.json).toHaveBeenCalledWith(users);
    });

    it('filters by role', async () => {
      User.findAll.mockResolvedValue([]);
      await ctrl.list({ query: { role: 'student' } }, res(), jest.fn());
      expect(User.findAll).toHaveBeenCalledWith({ where: { role: 'student' }, attributes: ['id', 'name', 'email', 'role', 'googleId'] });
    });

    it('calls next on error', async () => {
      User.findAll.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.list({ query: {} }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('listByCourse', () => {
    it('returns deduplicated students', async () => {
      const student = { id: 5, name: 'Alice' };
      Submission.findAll.mockResolvedValue([
        { studentId: 5, student },
        { studentId: 5, student }, // duplicate
      ]);
      const req = { params: { courseId: '1' } };
      const r = res();
      await ctrl.listByCourse(req, r, jest.fn());
      const result = r.json.mock.calls[0][0];
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(student);
    });

    it('calls next on error', async () => {
      Submission.findAll.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.listByCourse({ params: { courseId: '1' } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('updateName', () => {
    it('updates and returns user', async () => {
      const user = { id: 1, name: 'Old', email: 'a@b.com', update: jest.fn().mockResolvedValue(true) };
      User.findByPk.mockResolvedValue(user);
      const req = { params: { id: '1' }, body: { name: 'New Name' } };
      const r = res();
      await ctrl.updateName(req, r, jest.fn());
      expect(user.update).toHaveBeenCalledWith({ name: 'New Name' });
      expect(r.json).toHaveBeenCalledWith({ id: user.id, name: user.name, email: user.email });
    });

    it('returns 404 when user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.updateName({ params: { id: '99' }, body: { name: 'X' } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
      expect(r.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('calls next on error', async () => {
      User.findByPk.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.updateName({ params: { id: '1' }, body: {} }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
