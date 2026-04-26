jest.mock('../../services/notification.service');

const notificationService = require('../../services/notification.service');
const ctrl = require('../notification.controller');

const res = () => {
  const r = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r;
};

describe('notification.controller', () => {
  describe('list', () => {
    it('returns notifications for user', async () => {
      const items = [{ id: 1, message: 'hello' }];
      notificationService.getForUser.mockResolvedValue(items);
      const req = { user: { id: 3 } };
      const r = res();
      await ctrl.list(req, r, jest.fn());
      expect(notificationService.getForUser).toHaveBeenCalledWith(3);
      expect(r.json).toHaveBeenCalledWith(items);
    });

    it('calls next on error', async () => {
      notificationService.getForUser.mockRejectedValue(new Error('fail'));
      const next = jest.fn();
      await ctrl.list({ user: { id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('markRead', () => {
    it('marks notification as read', async () => {
      notificationService.markRead.mockResolvedValue();
      const req = { params: { id: '5' }, user: { id: 3 } };
      const r = res();
      await ctrl.markRead(req, r, jest.fn());
      expect(notificationService.markRead).toHaveBeenCalledWith('5', 3);
      expect(r.json).toHaveBeenCalledWith({ success: true });
    });

    it('calls next on error', async () => {
      notificationService.markRead.mockRejectedValue(new Error('fail'));
      const next = jest.fn();
      await ctrl.markRead({ params: { id: '1' }, user: { id: 1 } }, res(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
