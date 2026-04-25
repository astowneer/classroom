const cron = require('node-cron');
const { User } = require('../models');
const syncService = require('../services/sync.service');

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('[Cron] Starting scheduled sync...');
  const teachers = await User.findAll({ where: { role: 'teacher' } });

  for (const teacher of teachers) {
    if (!teacher.refreshToken) continue; // skip teachers who never logged in
    await syncService.syncAll(teacher);
  }
});

console.log('[Cron] Sync job scheduled (every 30 minutes)');
