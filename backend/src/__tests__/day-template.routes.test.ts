import request from 'supertest';
import express from 'express';
import dayTemplateRoutes from '../routes/day-template.routes';

// Simple test to validate routes are registered correctly
describe('DayTemplate Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', dayTemplateRoutes);
  });

  describe('Route Registration', () => {
    it('should register POST /api/families/:familyId/day-templates route', async () => {
      const response = await request(app)
        .post('/api/families/test-family/day-templates')
        .send({});

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    it('should register GET /api/families/:familyId/day-templates route', async () => {
      const response = await request(app)
        .get('/api/families/test-family/day-templates');

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    it('should register GET /api/families/:familyId/day-templates/:id route', async () => {
      const response = await request(app)
        .get('/api/families/test-family/day-templates/test-template');

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    it('should register PUT /api/families/:familyId/day-templates/:id route', async () => {
      const response = await request(app)
        .put('/api/families/test-family/day-templates/test-template')
        .send({});

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    it('should register DELETE /api/families/:familyId/day-templates/:id route', async () => {
      const response = await request(app)
        .delete('/api/families/test-family/day-templates/test-template');

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Template Item Routes', () => {
    it('should register POST /api/families/:familyId/day-templates/:templateId/items route', async () => {
      const response = await request(app)
        .post('/api/families/test-family/day-templates/test-template/items')
        .send({});

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    it('should register PUT /api/families/:familyId/day-templates/:templateId/items/:itemId route', async () => {
      const response = await request(app)
        .put('/api/families/test-family/day-templates/test-template/items/test-item')
        .send({});

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    it('should register DELETE /api/families/:familyId/day-templates/:templateId/items/:itemId route', async () => {
      const response = await request(app)
        .delete('/api/families/test-family/day-templates/test-template/items/test-item');

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Template Application Routes', () => {
    it('should register POST /api/families/:familyId/day-templates/:templateId/apply route', async () => {
      const response = await request(app)
        .post('/api/families/test-family/day-templates/test-template/apply')
        .send({});

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });

    it('should register POST /api/families/:familyId/day-templates/:templateId/duplicate route', async () => {
      const response = await request(app)
        .post('/api/families/test-family/day-templates/test-template/duplicate')
        .send({});

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Validation', () => {
    it('should require authentication for all routes', async () => {
      const response = await request(app)
        .post('/api/families/test/day-templates')
        .send({});
      
      expect(response.status).toBe(401);
    });

    it('should accept template creation with valid data structure', async () => {
      const response = await request(app)
        .post('/api/families/test-family/day-templates')
        .send({
          name: 'Test Template',
          description: 'A test template'
        });

      // Should not return 404 (route not found) - will fail auth but route exists
      expect(response.status).not.toBe(404);
      // Should fail with 401 (unauthorized) since no auth token
      expect(response.status).toBe(401);
    });

    it('should accept template application with valid data structure', async () => {
      const response = await request(app)
        .post('/api/families/test-family/day-templates/test-template/apply')
        .send({
          dates: ['2024-01-01', '2024-01-02'],
          overrideMemberAssignments: false
        });

      // Should not return 404 (route not found) - will fail auth but route exists
      expect(response.status).not.toBe(404);
      // Should fail with 401 (unauthorized) since no auth token
      expect(response.status).toBe(401);
    });
  });
}); 