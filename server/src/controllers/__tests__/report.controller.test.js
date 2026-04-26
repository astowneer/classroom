jest.mock('../../models');
jest.mock('../../services/report.service');

const { Report, Submission, User, Assignment } = require('../../models');
const reportService = require('../../services/report.service');
const ctrl = require('../report.controller');

const res = () => {
  const r = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  r.setHeader = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  return r;
};

describe('report.controller', () => {
  describe('get', () => {
    it('returns 403 for student accessing another submission', async () => {
      Submission.findByPk.mockResolvedValue({ id: 1, studentId: 99 });
      const req = { params: { submissionId: '1' }, user: { role: 'student', id: 5 } };
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.get(req, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(403);
      expect(r.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    it('returns 404 when report not found', async () => {
      Submission.findByPk.mockResolvedValue({ id: 1, studentId: 5 });
      Report.findOne.mockResolvedValue(null);
      // Mock Resubmission inside the controller (it's required inline)
      const models = require('../../models');
      models.Resubmission = { findOne: jest.fn().mockResolvedValue(null) };
      const req = { params: { submissionId: '1' }, user: { role: 'student', id: 5 } };
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.get(req, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
    });

    it('returns report for teacher', async () => {
      // Teacher always has access — Submission.findByPk not called for access check
      const mockReport = {
        dataValues: {},
        details: { plagiarismMatches: [] },
      };
      Report.findOne.mockResolvedValue(mockReport);
      const models = require('../../models');
      models.Resubmission = { findOne: jest.fn().mockResolvedValue(null) };
      const req = { params: { submissionId: '1' }, user: { role: 'teacher', id: 1 } };
      const r = res();
      await ctrl.get(req, r, jest.fn());
      expect(r.json).toHaveBeenCalledWith(mockReport);
    });

    it('calls next on error', async () => {
      Submission.findByPk.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.get({ params: { submissionId: '1' }, user: { role: 'student', id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('getByAssignment', () => {
    beforeEach(() => {
      Submission.findAll.mockClear();
    });

    it('returns table for teacher', async () => {
      const mockSubs = [
        {
          id: 1,
          student: { id: 5, name: 'Alice' },
          status: 'checked',
          submittedAt: new Date(),
          report: { plagiarismScore: 0.1, structurePassed: true, sentToStudent: false, grade: 90 },
        },
      ];
      Submission.findAll.mockResolvedValue(mockSubs);
      const models = require('../../models');
      models.Message = { findAll: jest.fn().mockResolvedValue([]) };
      const req = { params: { assignmentId: '3' }, user: { role: 'teacher', id: 1 } };
      const r = res();
      await ctrl.getByAssignment(req, r, jest.fn());
      expect(r.json).toHaveBeenCalled();
      const result = r.json.mock.calls[0][0];
      expect(result[0].submissionId).toBe(1);
      expect(result[0].plagiarismScore).toBe('10.0%');
    });

    it('filters by studentId for student role', async () => {
      Submission.findAll.mockResolvedValue([]);
      const models = require('../../models');
      models.Message = { findAll: jest.fn().mockResolvedValue([]) };
      const req = { params: { assignmentId: '3' }, user: { role: 'student', id: 7 } };
      await ctrl.getByAssignment(req, res(), jest.fn());
      const call = Submission.findAll.mock.calls[0][0];
      expect(call.where.studentId).toBe(7);
    });

    it('calls next on error', async () => {
      Submission.findAll.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.getByAssignment({ params: { assignmentId: '1' }, user: { role: 'teacher', id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('download', () => {
    it('returns 403 for unauthorized student', async () => {
      Submission.findByPk.mockResolvedValue({ id: 1, studentId: 99 });
      const req = { params: { submissionId: '1' }, user: { role: 'student', id: 5 } };
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.download(req, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(403);
    });

    it('sends pdf buffer for teacher', async () => {
      const buf = Buffer.from('pdf');
      reportService.generatePdf.mockResolvedValue(buf);
      const req = { params: { submissionId: '1' }, user: { role: 'teacher', id: 1 } };
      const r = res();
      await ctrl.download(req, r, jest.fn());
      expect(r.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(r.send).toHaveBeenCalledWith(buf);
    });

    it('calls next on error', async () => {
      reportService.generatePdf.mockRejectedValue(new Error('pdf fail'));
      const next = jest.fn();
      await ctrl.download({ params: { submissionId: '1' }, user: { role: 'teacher', id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
