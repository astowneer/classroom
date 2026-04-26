jest.mock('../../services/auth.service');

const authService = require('../../services/auth.service');
const ctrl = require('../auth.controller');

const res = () => {
  const r = {};
  r.json = jest.fn().mockReturnValue(r);
  r.redirect = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r;
};

describe('auth.controller', () => {
  describe('googleAuth', () => {
    it('redirects with teacher url by default', () => {
      authService.getAuthUrl.mockReturnValue('http://google.com/teacher');
      const req = { query: {} };
      const r = res();
      ctrl.googleAuth(req, r);
      expect(authService.getAuthUrl).toHaveBeenCalledWith('teacher');
      expect(r.redirect).toHaveBeenCalledWith('http://google.com/teacher');
    });

    it('redirects with student url when role=student', () => {
      authService.getAuthUrl.mockReturnValue('http://google.com/student');
      const req = { query: { role: 'student' } };
      const r = res();
      ctrl.googleAuth(req, r);
      expect(authService.getAuthUrl).toHaveBeenCalledWith('student');
    });
  });

  describe('googleCallback', () => {
    it('redirects to frontend with token', async () => {
      authService.handleCallback.mockResolvedValue({ token: 'abc123' });
      const req = { query: { code: 'code1', state: 'teacher' } };
      const r = res();
      await ctrl.googleCallback(req, r, jest.fn());
      expect(r.redirect).toHaveBeenCalledWith('http://localhost:5173/auth/callback?token=abc123');
    });

    it('calls next on error', async () => {
      const err = new Error('fail');
      authService.handleCallback.mockRejectedValue(err);
      const req = { query: { code: 'x', state: 'teacher' } };
      const next = jest.fn();
      await ctrl.googleCallback(req, res(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('logout', () => {
    it('returns success', () => {
      const r = res();
      ctrl.logout({}, r);
      expect(r.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('me', () => {
    it('returns req.user', async () => {
      const user = { id: 1, name: 'Test' };
      const r = res();
      await ctrl.me({ user }, r);
      expect(r.json).toHaveBeenCalledWith(user);
    });
  });
});
