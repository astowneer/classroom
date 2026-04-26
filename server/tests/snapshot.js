/**
 * Integration snapshot test — shows real JSONB structure from DB.
 * Run: cd /Users/astowner/agent/server && node tests/snapshot.js
 *
 * NOT a jest test — runs directly against real DB to inspect data shapes.
 */

require('dotenv').config();
const { sequelize, Report, Submission, User, Assignment, PlagiarismResult } = require('../src/models');

async function inspect() {
  await sequelize.authenticate();

  // ── Report.details structure ──────────────────────────────────────────────
  const report = await Report.findOne({
    where: { details: { [require('sequelize').Op.ne]: null } },
    order: [['updatedAt', 'DESC']],
    raw: true,
  });

  if (report) {
    console.log('\n=== Report JSONB columns ===');
    console.log('\n--- details.structureResult ---');
    console.log(JSON.stringify(report.details?.structureResult, null, 2));

    console.log('\n--- details.plagiarismMatches[0] (first match) ---');
    const pm = report.details?.plagiarismMatches?.[0];
    if (pm) {
      console.log(JSON.stringify({
        sourceSubmissionId: pm.sourceSubmissionId,
        similarity: pm.similarity,
        matchCount: pm.matchCount,
        firstMatch: pm.matches?.[0] ? {
          textA: pm.matches[0].textA?.slice(0, 80),
          textB: pm.matches[0].textB?.slice(0, 80),
          wordCount: pm.matches[0].wordCount,
          inA: pm.matches[0].inA,
          inB: pm.matches[0].inB,
        } : null,
      }, null, 2));
    } else {
      console.log('(no plagiarism matches)');
    }

    console.log('\n--- details.completenessResult ---');
    console.log(JSON.stringify(report.details?.completenessResult, null, 2));

    console.log('\n--- details.grammarResult (summary) ---');
    const gr = report.details?.grammarResult;
    console.log(gr ? JSON.stringify({ errorCount: gr.errorCount, firstError: gr.errors?.[0] }, null, 2) : null);

    console.log('\n--- grade ---');
    console.log(JSON.stringify(report.grade, null, 2));

    console.log('\n--- extractedFields ---');
    console.log(JSON.stringify(report.extractedFields, null, 2));
  }

  // ── PlagiarismResult structure ────────────────────────────────────────────
  const pr = await PlagiarismResult.findOne({ order: [['updatedAt', 'DESC']], raw: true });
  if (pr) {
    console.log('\n=== PlagiarismResult JSONB columns ===');
    console.log('similarity:', pr.similarity);
    console.log('matches count:', pr.matches?.length);
    console.log('matches[0]:', JSON.stringify(pr.matches?.[0] ? {
      textA: pr.matches[0].textA?.slice(0, 60),
      textB: pr.matches[0].textB?.slice(0, 60),
      wordCount: pr.matches[0].wordCount,
      inA: pr.matches[0].inA,
      inB: pr.matches[0].inB,
    } : null, null, 2));
  }

  // ── Submission JSONB columns ──────────────────────────────────────────────
  const sub = await Submission.findOne({
    where: { structureResult: { [require('sequelize').Op.ne]: null } },
    raw: true,
  });
  if (sub) {
    console.log('\n=== Submission JSONB columns ===');
    console.log('structureResult:', JSON.stringify(sub.structureResult, null, 2));
  }

  await sequelize.close();
}

inspect().catch(err => { console.error(err); process.exit(1); });
