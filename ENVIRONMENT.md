# Environment Configuration

## Single Source of Truth

This project follows a **single source of truth** pattern for environment configuration:

- **Root `.env`**: Primary environment file for local development
- **`.env.example`**: Template for local development setup
- **`env.production.example`**: Template for production deployment

## Environment Files

### Local Development
```bash
# Root directory
.env                    # ✅ Primary environment file (single source of truth)
.env.example           # ✅ Template for local setup

# Backend directory  
backend/.env           # ❌ REMOVED - Use root .env instead
```

### Production
```bash
env.production.example  # ✅ Template for production deployment
```

## Configuration Hierarchy

1. **Root `.env`** - Used by all services (backend, frontend, docker-compose)
2. **Environment variables** - Override .env values when set
3. **Default values** - Only for non-sensitive configuration

## JWT Secret Requirements

All JWT secrets must meet security requirements:
- **Minimum length**: 32 characters
- **No weak secrets**: Rejects common patterns like 'secret', 'password', etc.
- **Random generation recommended**: Use `openssl rand -hex 32`

### Current JWT Secrets by Environment

```bash
# Local Development (.env)
JWT_SECRET=development-jwt-secret-32-chars-minimum-for-local-development

# CI/CD (GitHub Actions)
JWT_SECRET=test-jwt-secret-for-e2e-tests-32-chars-minimum-length

# Production (env.production.example)
JWT_SECRET=your-super-secure-jwt-secret-key-must-be-at-least-32-characters-long
```

## Setup Instructions

### Local Development
1. Copy `.env.example` to `.env`
2. Update values as needed
3. JWT_SECRET is already set to a valid development value

### Production
1. Copy `env.production.example` to `.env` on your server
2. Generate a strong JWT secret: `openssl rand -hex 32`
3. Update all values with production settings

## Docker Compose Integration

Docker Compose reads from the root `.env` file automatically:
```yaml
environment:
  JWT_SECRET: ${JWT_SECRET}  # Reads from root .env
```

## Best Practices

1. **Never commit real secrets** to version control
2. **Use root .env** as single source of truth for local development
3. **Generate strong JWT secrets** for each environment
4. **Document environment requirements** in templates
5. **Validate configuration** at application startup

## Migration from Multiple .env Files

If you have multiple .env files:
1. Consolidate all variables into root `.env`
2. Remove duplicate files (like `backend/.env`)
3. Update any scripts that reference old locations
4. Test that all services can read from root `.env`

## Troubleshooting

### JWT_SECRET Errors
- `JWT_SECRET environment variable is required` → Set JWT_SECRET in root .env
- `JWT_SECRET must be at least 32 characters long` → Use longer secret
- `JWT_SECRET appears to be a weak or default secret` → Generate random secret

### Environment Not Loading
- Check that .env is in the root directory
- Verify docker-compose.yml references ${JWT_SECRET}
- Ensure no duplicate .env files override values
