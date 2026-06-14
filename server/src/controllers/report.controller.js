const reportService = require("../services/report.service");
const { Report, Submission, User, Assignment } = require("../models");

// Teacher sees all, student sees only their own
async function canAccess(submissionId, user) {
  if (user.role === "teacher") return true;
  const submission = await Submission.findByPk(submissionId);
  return submission && submission.studentId === user.id;
}

exports.get = async (req, res, next) => {
  try {
    if (!(await canAccess(req.params.submissionId, req.user))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const report = await Report.findOne({
      where: { submissionId: req.params.submissionId },
      include: [{
        model: Submission, as: 'submission',
        include: [
          { model: User, as: 'student', attributes: ['id', 'name', 'email', 'variant'] },
          { model: Assignment, as: 'assignment', attributes: ['id', 'title', 'stopPhrases'] },
        ],
        attributes: { exclude: [] }, // include all fields including originalText
      }],
    });
    if (!report) return res.status(404).json({ error: "Not found" });

    // Load latest resubmission if exists
    const { Resubmission } = require("../models");
    const latestResub = await Resubmission.findOne({
      where: { submissionId: req.params.submissionId },
      order: [["createdAt", "DESC"]],
    });
    if (latestResub) report.dataValues.latestResubmission = latestResub;

    // Enrich plagiarism matches with source student info
    const plagiarismMatches = report.details?.plagiarismMatches || [];
    if (plagiarismMatches.length) {
      const sourceIds = [
        ...new Set(plagiarismMatches.map((m) => m.sourceSubmissionId)),
      ];
      const sources = await Submission.findAll({
        where: { id: sourceIds },
        include: [
          { model: User, as: "student", attributes: ["id", "name", "email"] },
        ],
        attributes: ["id"],
      });
      const sourceMap = Object.fromEntries(
        sources.map((s) => [s.id, s.student]),
      );
      report.dataValues.details = {
        ...report.details,
        plagiarismMatches: plagiarismMatches.map((m) => ({
          ...m,
          studentName:
            sourceMap[m.sourceSubmissionId]?.name ||
            sourceMap[m.sourceSubmissionId]?.email ||
            `#${m.sourceSubmissionId}`,
          studentId: sourceMap[m.sourceSubmissionId]?.id,
        })),
      };
    }

    res.json(report);
  } catch (err) {
    next(err);
  }
};

exports.getByAssignment = async (req, res, next) => {
  try {
    const where = { assignmentId: req.params.assignmentId };
    if (req.user.role === "student") where.studentId = req.user.id;

    const submissions = await Submission.findAll({
      where,
      include: [
        { model: User, as: "student", attributes: ["id", "name", "email"] },
        {
          model: Report,
          as: "report",
          attributes: [
            "plagiarismScore",
            "structurePassed",
            "sentToStudent",
            "grade",
          ],
        },
      ],
      group: ["Submission.id", "student.id", "report.id"],
    });

    // Get unread message counts for each submission
    const { Message } = require("../models");
    const { Op, fn, col } = require("sequelize");
    const unreadRows = await Message.findAll({
      where: {
        submissionId: submissions.map((s) => s.id),
        read: false,
        senderId: { [Op.ne]: req.user.id },
      },
      attributes: ["submissionId", [fn("COUNT", col("id")), "count"]],
      group: ["submissionId"],
      raw: true,
    });
    const unreadMap = Object.fromEntries(
      unreadRows.map((r) => [r.submissionId, parseInt(r.count)]),
    );

    const table = submissions.map((s) => ({
      submissionId: s.id,
      student: s.student,
      status: s.status,
      submittedAt: s.submittedAt,
      plagiarismScore: s.report
        ? (s.report.plagiarismScore * 100).toFixed(1) + "%"
        : null,
      structurePassed: s.report?.structurePassed ?? null,
      sentToStudent: s.report?.sentToStudent ?? false,
      grade: s.report?.grade ?? null,
      unreadMessages: unreadMap[s.id] || 0,
    }));

    res.json(table);
  } catch (err) {
    next(err);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const where = { assignmentId: req.params.assignmentId };
    if (req.user.role === "student") where.studentId = req.user.id;

    const submissions = await Submission.findAll({
      where,
      include: [
        { model: User, as: "student", attributes: ["id", "name", "email"] },
        { model: Report, as: "report" },
      ],
      group: ["Submission.id", "student.id", "report.id"],
    });

    const filtered = submissions.filter((s) => {
      const r = s.report;
      if (!r) return false;
      if (r.plagiarismScore && r.plagiarismScore > 0) return true;
      if (r.structurePassed && r.structurePassed === false) return true;
      return false;
    });

    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Результати");

    sheet.columns = [
      { header: "Студент", key: "student", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Дата здачі", key: "submittedAt", width: 18 },
      { header: "Запозичення %", key: "plagiarism", width: 16 },
      { header: "Структура %", key: "structure", width: 14 },
      { header: "Повнота %", key: "completeness", width: 14 },
      { header: "Граматика", key: "grammar", width: 12 },
      { header: "Оцінка", key: "grade", width: 10 },
      { header: "Макс. оцінка", key: "maxGrade", width: 12 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };

    for (const s of filtered) {
      const r = s.report;
      const details = r?.details || {};
      const plagScore =
        r?.plagiarismScore != null
          ? +(r.plagiarismScore * 100).toFixed(1)
          : null;
      const structScore =
        details.structureResult?.score ?? (r?.structurePassed ? 100 : 0);
      const completeness =
        details.completenessResult?.score != null
          ? +(details.completenessResult.score * 100).toFixed(1)
          : null;
      const grammarErrors = details.grammarResult?.errorCount ?? null;

      const row = sheet.addRow({
        student: s.student?.name || "—",
        email: s.student?.email || "—",
        submittedAt: s.submittedAt
          ? new Date(s.submittedAt).toLocaleDateString("uk-UA")
          : "—",
        plagiarism: plagScore,
        structure: structScore,
        completeness,
        grammar: grammarErrors,
        grade: r?.grade?.total ?? null,
        maxGrade: r?.grade?.maxTotal ?? null,
      });

      // Color plagiarism cell
      if (plagScore != null) {
        const cell = row.getCell("plagiarism");
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: plagScore > 30 ? "FFFFC7CE" : "FFC6EFCE" },
        };
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="results-${req.params.assignmentId}.xlsx"`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.download = async (req, res, next) => {
  try {
    if (!(await canAccess(req.params.submissionId, req.user))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const buffer = await reportService.generatePdf(req.params.submissionId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${req.params.submissionId}.pdf"`,
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};
