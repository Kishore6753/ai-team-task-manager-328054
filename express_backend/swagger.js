const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Team Task Manager API',
      version: '1.0.0',
      description: 'Task/project management with real-time notifications, file attachments, RBAC, and AI endpoints.',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'User authentication' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Tasks', description: 'Task management' },
      { name: 'Comments', description: 'Task comments' },
      { name: 'Attachments', description: 'File attachments' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'AI', description: 'AI-powered helpers' }
    ]
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
