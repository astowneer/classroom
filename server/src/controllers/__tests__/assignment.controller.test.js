jest.mock('../../models');
jest.mock('../../services/classroom.service');
jest.mock('../../services/reference.service');

const { Assignment } = require('../../models');
const classroomService = require('../../services/classroom.service');
const referenceService = require('../../services/reference.service');
const ctrl = require('../assignment.controller');

const res = () => {
  const r = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r;
};

const mockAssignment = (overrides = {}) => ({
  id: 1,
  structureRequirements: [],
  update: jest.fn().mockResolvedValue(true),
  ...overrides,
});

describe('assignment.controller', () => {
  describe('list', () => {
    it('returns all assignments without filter', async () => {
      const items = [{ id: 1 }];
      Assignment.findAll.mockResolvedValue(items);
      const req = { query: {} };
      const r = res();
      await ctrl.list(req, r, jest.fn());
      expect(Assignment.findAll).toHaveBeenCalledWith({ where: {} });
      expect(r.json).toHaveBeenCalledWith(items);
    });

    it('filters by courseId', async () => {
      Assignment.findAll.mockResolvedValue([]);
      const req = { query: { courseId: '42' } };
      await ctrl.list(req, res(), jest.fn());
      expect(Assignment.findAll).toHaveBeenCalledWith({ where: { courseId: '42' } });
    });

    it('calls next on error', async () => {
      Assignment.findAll.mockRejectedValue(new Error('db'));
      const next = jest.fn();
      await ctrl.list({ query: {} }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns assignment', async () => {
      const a = mockAssignment();
      Assignment.findByPk.mockResolvedValue(a);
      const r = res();
      await ctrl.get({ params: { id: '1' } }, r, jest.fn());
      expect(r.json).toHaveBeenCalledWith(a);
    });

    it('returns 404 when not found', async () => {
      Assignment.findByPk.mockResolvedValue(null);
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.get({ params: { id: '99' } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
      expect(r.json).toHaveBeenCalledWith({ error: 'Not found' });
    });
  });

  describe('syncFromClassroom', () => {
    it('returns synced assignments', async () => {
      const items = [{ id: 1 }];
      classroomService.syncAssignments.mockResolvedValue(items);
      const req = { user: { id: 1 }, params: { courseId: '5' } };
      const r = res();
      await ctrl.syncFromClassroom(req, r, jest.fn());
      expect(r.json).toHaveBeenCalledWith(items);
    });
  });

  describe('updateStructureRequirements', () => {
    it('updates and returns assignment', async () => {
      const a = mockAssignment();
      Assignment.findByPk.mockResolvedValue(a);
      const req = { params: { id: '1' }, body: { sections: ['intro'] } };
      const r = res();
      await ctrl.updateStructureRequirements(req, r, jest.fn());
      expect(a.update).toHaveBeenCalledWith({ structureRequirements: ['intro'] });
      expect(r.json).toHaveBeenCalledWith(a);
    });

    it('returns 404 when not found', async () => {
      Assignment.findByPk.mockResolvedValue(null);
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.updateStructureRequirements({ params: { id: '99' }, body: {} }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateDescription', () => {
    it('updates description', async () => {
      const a = mockAssignment();
      Assignment.findByPk.mockResolvedValue(a);
      const req = { params: { id: '1' }, body: { description: 'new desc' } };
      const r = res();
      await ctrl.updateDescription(req, r, jest.fn());
      expect(a.update).toHaveBeenCalledWith({ description: 'new desc' });
    });

    it('returns 404 when not found', async () => {
      Assignment.findByPk.mockResolvedValue(null);
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.updateDescription({ params: { id: '1' }, body: {} }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateSettings', () => {
    it('updates minTextLength and description', async () => {
      const a = mockAssignment();
      Assignment.findByPk.mockResolvedValue(a);
      const req = { params: { id: '1' }, body: { minTextLength: '500', description: 'desc' } };
      const r = res();
      await ctrl.updateSettings(req, r, jest.fn());
      expect(a.update).toHaveBeenCalledWith({ minTextLength: 500, description: 'desc' });
    });

    it('returns 404 when not found', async () => {
      Assignment.findByPk.mockResolvedValue(null);
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.updateSettings({ params: { id: '1' }, body: {} }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateGrading', () => {
    it('updates gradingConfig', async () => {
      const a = mockAssignment();
      Assignment.findByPk.mockResolvedValue(a);
      const body = { maxScore: 100 };
      const req = { params: { id: '1' }, body };
      const r = res();
      await ctrl.updateGrading(req, r, jest.fn());
      expect(a.update).toHaveBeenCalledWith({ gradingConfig: body });
    });
  });

  describe('updateStopPhrases', () => {
    it('updates stopPhrases', async () => {
      const a = mockAssignment();
      Assignment.findByPk.mockResolvedValue(a);
      const req = { params: { id: '1' }, body: { phrases: ['bad'] } };
      const r = res();
      await ctrl.updateStopPhrases(req, r, jest.fn());
      expect(a.update).toHaveBeenCalledWith({ stopPhrases: ['bad'] });
    });

    it('defaults to empty array when phrases missing', async () => {
      const a = mockAssignment();
      Assignment.findByPk.mockResolvedValue(a);
      await ctrl.updateStopPhrases({ params: { id: '1' }, body: {} }, res(), jest.fn());
      expect(a.update).toHaveBeenCalledWith({ stopPhrases: [] });
    });
  });

  describe('updateExtractFields', () => {
    it('updates extractFields', async () => {
      const a = mockAssignment();
      Assignment.findByPk.mockResolvedValue(a);
      const req = { params: { id: '1' }, body: { fields: ['name'] } };
      const r = res();
      await ctrl.updateExtractFields(req, r, jest.fn());
      expect(a.update).toHaveBeenCalledWith({ extractFields: ['name'] });
    });
  });

  describe('uploadReference', () => {
    it('returns 400 when no file', async () => {
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.uploadReference({ params: { id: '1' }, body: {}, file: null }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(400);
      expect(r.json).toHaveBeenCalledWith({ error: 'PDF file required' });
    });

    it('returns 404 when assignment not found', async () => {
      Assignment.findByPk.mockResolvedValue(null);
      const r = res();
      r.status.mockReturnValue(r);
      await ctrl.uploadReference({ params: { id: '1' }, body: {}, file: { path: '/tmp/f.pdf' } }, r, jest.fn());
      expect(r.status).toHaveBeenCalledWith(404);
    });

    it('analyzes and updates assignment', async () => {
      const a = mockAssignment({ structureRequirements: [] });
      Assignment.findByPk.mockResolvedValue(a);
      referenceService.analyze.mockResolvedValue({
        minTextLength: 300,
        updatedSections: ['intro'],
        referenceText: 'text',
        totalChars: 300,
      });
      const req = { params: { id: '1' }, body: {}, file: { path: '/tmp/f.pdf' } };
      const r = res();
      await ctrl.uploadReference(req, r, jest.fn());
      expect(a.update).toHaveBeenCalledWith({ minTextLength: 300, structureRequirements: ['intro'], referenceText: 'text' });
      expect(r.json).toHaveBeenCalledWith({ minTextLength: 300, totalChars: 300, updatedSections: ['intro'] });
    });
  });
});
