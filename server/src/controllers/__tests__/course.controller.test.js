jest.mock('../../models');
jest.mock('../../services/classroom.service');

const { Course } = require('../../models');
const classroomService = require('../../services/classroom.service');
const ctrl = require('../course.controller');

const res = () => {
  const r = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r;
};

describe('course.controller', () => {
  describe('list', () => {
    it('returns courses for teacher', async () => {
      const courses = [{ id: 1 }];
      Course.findAll.mockResolvedValue(courses);
      const req = { user: { id: 5 } };
      const r = res();
      await ctrl.list(req, r, jest.fn());
      expect(Course.findAll).toHaveBeenCalledWith({ where: { teacherId: 5 } });
      expect(r.json).toHaveBeenCalledWith(courses);
    });

    it('calls next on error', async () => {
      const err = new Error('db');
      Course.findAll.mockRejectedValue(err);
      const next = jest.fn();
      await ctrl.list({ user: { id: 1 } }, res(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('syncFromClassroom', () => {
    it('returns synced courses', async () => {
      const courses = [{ id: 2 }];
      classroomService.syncCourses.mockResolvedValue(courses);
      const req = { user: { id: 1 } };
      const r = res();
      await ctrl.syncFromClassroom(req, r, jest.fn());
      expect(classroomService.syncCourses).toHaveBeenCalledWith(req.user);
      expect(r.json).toHaveBeenCalledWith(courses);
    });

    it('calls next on error', async () => {
      const err = new Error('sync fail');
      classroomService.syncCourses.mockRejectedValue(err);
      const next = jest.fn();
      await ctrl.syncFromClassroom({ user: {} }, res(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
