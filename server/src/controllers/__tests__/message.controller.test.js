jest.mock('../../models');

const { Message, Submission, User } = require('../../models');
const ctrl = require('../message.controller');

const res = () => {
  const r = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r;
};

describe('message.controller', () => {
  describe('list', () => {
    it('returns messages for teacher', async () => {
      const msgs = [{ id: 1 }];
      Message.findAll.mockResolvedValue(msgs);
      Message.update = jest.fn().mockResolvedValue([1]);
      const req = { params: { submissionId: '1' }, user: { role: 'teacher', id: 1 } };
      const r = res();
      await ctrl.list(req, r, jest.fn());
      expect(r.json).toHaveBeenCalledWith(msgs);
    });

    it('returns 403 for student accessing another submission', async () => {
      Submission.findByPk.mockResolvedValue({ id: 1, studentId: 99 });
      const req = { params: { submissionId: '1' }, user: { role: 'student', id: 5 } };
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.list(req, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(403);
      expect(r.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    it('returns messages for student accessing own submission', async () => {
      Submission.findByPk.mockResolvedValue({ id: 1, studentId: 5 });
      const msgs = [{ id: 1 }];
      Message.findAll.mockResolvedValue(msgs);
      Message.update = jest.fn().mockResolvedValue([1]);
      const req = { params: { submissionId: '1' }, user: { role: 'student', id: 5 } };
      const r = res();
      await ctrl.list(req, r, jest.fn());
      expect(r.json).toHaveBeenCalledWith(msgs);
    });

    it('calls next on error', async () => {
      Message.findAll.mockRejectedValue(new Error('db'));
      Message.update = jest.fn().mockResolvedValue([0]);
      const next = jest.fn();
      await ctrl.list({ params: { submissionId: '1' }, user: { role: 'teacher', id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('returns 400 when text is empty', async () => {
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.send({ params: { submissionId: '1' }, body: { text: '  ' }, user: { role: 'teacher', id: 1 } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(400);
      expect(r.json).toHaveBeenCalledWith({ error: 'Text required' });
    });

    it('returns 404 when submission not found', async () => {
      Submission.findByPk.mockResolvedValue(null);
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.send({ params: { submissionId: '1' }, body: { text: 'hi' }, user: { role: 'teacher', id: 1 } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 for student sending to another submission', async () => {
      Submission.findByPk.mockResolvedValue({ id: 1, studentId: 99, assignmentId: 2 });
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.send({ params: { submissionId: '1' }, body: { text: 'hi' }, user: { role: 'student', id: 5 } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(403);
    });

    it('creates message and returns 201 for teacher', async () => {
      const sub = { id: 1, studentId: 5, assignmentId: 2, student: { id: 5 } };
      Submission.findByPk.mockResolvedValue(sub);
      const msg = { id: 10, text: 'hi' };
      Message.create = jest.fn().mockResolvedValue(msg);
      const fullMsg = { id: 10, text: 'hi', sender: { id: 1 } };
      Message.findByPk = jest.fn().mockResolvedValue(fullMsg);

      // Mock Notification inline require
      const models = require('../../models');
      models.Notification = { create: jest.fn().mockResolvedValue({}) };
      models.Assignment = {
        findByPk: jest.fn().mockResolvedValue({ course: { teacherId: 1 } }),
      };
      models.Course = {};

      const req = {
        params: { submissionId: '1' },
        body: { text: 'hi' },
        user: { role: 'teacher', id: 1, name: 'Teacher' },
      };
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.send(req, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(201);
      expect(r.json).toHaveBeenCalledWith(fullMsg);
    });

    it('calls next on error', async () => {
      Submission.findByPk.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.send({ params: { submissionId: '1' }, body: { text: 'hi' }, user: { role: 'teacher', id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('unreadCount', () => {
    it('returns unread counts', async () => {
      const counts = [{ submissionId: 1, count: '3' }];
      Message.findAll.mockResolvedValue(counts);
      const req = { user: { id: 1 } };
      const r = res();
      await ctrl.unreadCount(req, r, jest.fn());
      expect(r.json).toHaveBeenCalledWith(counts);
    });

    it('calls next on error', async () => {
      Message.findAll.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.unreadCount({ user: { id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
