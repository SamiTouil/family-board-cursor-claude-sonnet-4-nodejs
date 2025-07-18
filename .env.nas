# NAS Environment Configuration

# Database (local PostgreSQL)
DB_PASSWORD=your-secure-password-here
DATABASE_URL=postgresql://postgres:your-secure-password-here@postgres:5432/familyboard

# Security (use the same JWT secret from production)
JWT_SECRET=your-existing-jwt-secret-from-production

# Application
NODE_ENV=production
DISABLE_CSRF_VALIDATION=true

# Frontend API URL (will update after setting up DNS)
VITE_API_URL=https://mabt.eu

# SSL
SSL_EMAIL=your-email@example.com