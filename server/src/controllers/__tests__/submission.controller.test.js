jest.mock('../../models');
jest.mock('../../services/classroom.service');
jest.mock('../../services/check.service');
jest.mock('../../services/notification.service');
jest.mock('../../services/pdf.service');
jest.mock('../../services/plagiarism.service');
jest.mock('../../services/structure.service');
jest.mock('../../services/report.service');
// @xenova/transformers uses ESM — mock it to avoid parse errors
jest.mock('@xenova/transformers', () => ({ pipeline: jest.fn() }), { virtual: true });

const { Submission, Assignment, Report, PlagiarismResult } = require('../../models');
const classroomService = require('../../services/classroom.service');
const checkService = require('../../services/check.service');
const notificationService = require('../../services/notification.service');
const ctrl = require('../submission.controller');

const res = () => {
  const r = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  r.setHeader = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  return r;
};

describe('submission.controller', () => {
  describe('list', () => {
    beforeEach(() => {
      Submission.findAll.mockClear();
    });

    it('returns submissions for teacher', async () => {
      const items = [{ id: 1 }];
      Submission.findAll.mockResolvedValue(items);
      const req = { query: {}, user: { role: 'teacher', id: 1 } };
      const r = res();
      await ctrl.list(req, r, jest.fn());
      expect(r.json).toHaveBeenCalledWith(items);
    });

    it('filters by studentId for student role', async () => {
      Submission.findAll.mockResolvedValue([]);
      const req = { query: {}, user: { role: 'student', id: 7 } };
      await ctrl.list(req, res(), jest.fn());
      const call = Submission.findAll.mock.calls[0][0];
      expect(call.where.studentId).toBe(7);
    });

    it('filters by assignmentId and status', async () => {
      Submission.findAll.mockResolvedValue([]);
      const req = { query: { assignmentId: '3', status: 'checked' }, user: { role: 'teacher', id: 1 } };
      await ctrl.list(req, res(), jest.fn());
      const call = Submission.findAll.mock.calls[0][0];
      expect(call.where.assignmentId).toBe('3');
      expect(call.where.status).toBe('checked');
    });

    it('calls next on error', async () => {
      Submission.findAll.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.list({ query: {}, user: { role: 'teacher', id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('syncFromClassroom', () => {
    it('returns synced submissions', async () => {
      const items = [{ id: 1 }];
      classroomService.syncSubmissions.mockResolvedValue(items);
      const req = { user: { id: 1 }, params: { assignmentId: '5' } };
      const r = res();
      await ctrl.syncFromClassroom(req, r, jest.fn());
      expect(classroomService.syncSubmissions).toHaveBeenCalledWith(req.user, '5');
      expect(r.json).toHaveBeenCalledWith(items);
    });

    it('calls next on error', async () => {
      classroomService.syncSubmissions.mockRejectedValue(new Error('fail'));
      const next = jest.fn();
      await ctrl.syncFromClassroom({ user: {}, params: { assignmentId: '1' } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('runChecks', () => {
    it('returns check results', async () => {
      const results = [{ submissionId: 1 }];
      checkService.runAll.mockResolvedValue(results);
      const req = { params: { assignmentId: '3' }, user: { id: 1 } };
      const r = res();
      await ctrl.runChecks(req, r, jest.fn());
      expect(checkService.runAll).toHaveBeenCalledWith('3', req.user);
      expect(r.json).toHaveBeenCalledWith(results);
    });

    it('calls next on error', async () => {
      checkService.runAll.mockRejectedValue(new Error('check fail'));
      const next = jest.fn();
      await ctrl.runChecks({ params: { assignmentId: '1' }, user: {} }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('notifyStudent', () => {
    it('notifies and returns success', async () => {
      notificationService.notifyStudent.mockResolvedValue();
      const req = { params: { id: '10' }, body: { message: 'hello' }, user: { id: 1 } };
      const r = res();
      await ctrl.notifyStudent(req, r, jest.fn());
      expect(notificationService.notifyStudent).toHaveBeenCalledWith('10', 'hello', req.user);
      expect(r.json).toHaveBeenCalledWith({ success: true });
    });

    it('calls next on error', async () => {
      notificationService.notifyStudent.mockRejectedValue(new Error('fail'));
      const next = jest.fn();
      await ctrl.notifyStudent({ params: { id: '1' }, body: {}, user: {} }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('downloadFile', () => {
    it('returns 404 when submission not found', async () => {
      Submission.findByPk.mockResolvedValue(null);
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.downloadFile({ params: { id: '1' }, user: { role: 'teacher', id: 1 } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when student accesses another student submission', async () => {
      Submission.findByPk.mockResolvedValue({ id: 1, studentId: 99, localFilePath: null, fileUrl: null });
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.downloadFile({ params: { id: '1' }, user: { role: 'student', id: 5 } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(403);
      expect(r.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    it('returns 404 when no file url and no local path', async () => {
      Submission.findByPk.mockResolvedValue({ id: 1, studentId: 5, localFilePath: null, fileUrl: null });
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.downloadFile({ params: { id: '1' }, user: { role: 'student', id: 5 } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
      expect(r.json).toHaveBeenCalledWith({ error: 'No file' });
    });
  });
});
