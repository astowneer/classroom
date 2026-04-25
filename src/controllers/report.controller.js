const reportService = require('../services/report.service');
const { Report } = require('../models');

exports.get = async (req, res) => {
  const report = await Report.findOne({ where: { submissionId: req.params.submissionId } });
  if (!report) return res.status(404).json({ error: 'Not found' });
  res.json(report);
};

exports.download = async (req, res) => {
  const buffer = await reportService.generatePdf(req.params.submissionId);
  res.setHeader('Content-Type', 'application/pdf');
  res.send(buffer);
};
