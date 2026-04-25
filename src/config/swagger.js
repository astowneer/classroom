const swaggerJsdoc = require('swagger-jsdoc');

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Student Work Checker API',
      version: '1.0.0',
      description: 'API для перевірки студентських робіт на запозичення та відповідність структурі',
    },
    servers: [{ url: 'http://localhost:3000/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Course: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            googleCourseId: { type: 'string' },
            name: { type: 'string' },
            teacherId: { type: 'integer' },
          },
        },
        Assignment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            googleAssignmentId: { type: 'string' },
            title: { type: 'string' },
            courseId: { type: 'integer' },
            structureRequirements: { type: 'array', items: { type: 'object' } },
          },
        },
        Submission: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            googleSubmissionId: { type: 'string' },
            assignmentId: { type: 'integer' },
            studentId: { type: 'integer' },
            fileUrl: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'text_extracted', 'checked', 'failed'] },
            submittedAt: { type: 'string', format: 'date-time' },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            submissionId: { type: 'integer' },
            plagiarismScore: { type: 'number' },
            structurePassed: { type: 'boolean' },
            details: { type: 'object' },
            sentToStudent: { type: 'boolean' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            submissionId: { type: 'integer' },
            message: { type: 'string' },
            read: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
});
