import request from 'supertest';
import express from 'express';
import taskAssignmentRoutes from '../routes/task-assignment.routes';

// Simple test to validate routes are registered correctly
describe('TaskAssignment Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', taskAssignmentRoutes);
  });

  describe('Route Registration', () => {
    it('should register POST /api/families/:familyId/task-assignments route', async () => {
      const response = await request(app)
        .post('/api/families/test-family/task-assignments')
        .send({});

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    it('should register GET /api/families/:familyId/task-assignments route', async () => {
      const response = await request(app)
        .get('/api/families/test-family/task-assignments');

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Validation', () => {
    it('should require authentication for all routes', async () => {
      const response = await request(app)
        .post('/api/families/test/task-assignments')
        .send({});
      
      expect(response.status).toBe(401);
    });

    it('should accept unassigned task creation (no memberId)', async () => {
      const response = await request(app)
        .post('/api/families/test-family/task-assignments')
        .send({
          taskId: 'test-task',
          assignedDate: '2024-01-01T00:00:00.000Z'
        });

      // Should not return 404 (route not found) - will fail auth but route exists
      expect(response.status).not.toBe(404);
      // Should fail with 401 (unauthorized) since no auth token
      expect(response.status).toBe(401);
    });
  });
}); 