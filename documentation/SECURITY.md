# Security Documentation

## JWT Security

### Overview
This application uses JSON Web Tokens (JWT) for authentication. The JWT implementation has been hardened to prevent common security vulnerabilities.

### Security Improvements

#### 1. Removed Hardcoded Fallback Secrets
**Issue**: Previous implementation had hardcoded fallback secrets (`'fallback-secret'`) that could allow token forgery if `JWT_SECRET` environment variable was not set.

**Solution**: Removed all fallback secrets. The application now fails securely if `JWT_SECRET` is not properly configured.

**Files Changed**:
- `src/config/jwt.config.ts` - New secure JWT configuration module
- `src/services/user.service.ts` - Updated to use secure JWT config
- `src/middleware/auth.middleware.ts` - Updated to use secure JWT config
- `src/services/websocket.service.ts` - Updated to use secure JWT config

#### 2. JWT Secret Validation
The application now validates JWT secrets to ensure they meet security requirements:

- **Minimum Length**: JWT secret must be at least 32 characters long
- **Weak Secret Detection**: Rejects common weak secrets like:
  - `secret`
  - `jwt-secret`
  - `your-super-secret-jwt-key-change-this-in-production`
  - `fallback-secret`
  - `password`
  - `123456`
  - And other common weak patterns

#### 3. Secure Configuration
- **No Default Values**: Application fails to start if JWT_SECRET is not set
- **Strong Requirements**: Enforces minimum security standards
- **Clear Error Messages**: Provides helpful guidance when configuration is incorrect

### Configuration

#### Environment Variables
```bash
# Required: Strong JWT secret (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-must-be-at-least-32-characters-long-change-this-in-production
```

#### Generating a Strong JWT Secret
```bash
# Generate a random 64-character secret
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### JWT Configuration
- **Algorithm**: HS256 (HMAC SHA-256)
- **Expiration**: 7 days
- **Payload**: Contains `userId` and `email`

### Testing
Comprehensive unit tests ensure JWT security:
- Tests for missing JWT_SECRET
- Tests for weak/short secrets
- Tests for proper secret validation
- Tests for JWT generation and verification

### Best Practices
1. **Never commit JWT secrets** to version control
2. **Use environment variables** for all secrets
3. **Generate strong, random secrets** (minimum 32 characters)
4. **Rotate secrets regularly** in production
5. **Monitor for weak secrets** in CI/CD pipelines

### Migration Notes
If upgrading from a previous version:
1. Ensure `JWT_SECRET` environment variable is set
2. Use a strong, random secret (minimum 32 characters)
3. Remove any hardcoded secrets from your configuration
4. Test authentication flows after upgrade

### Error Messages
- `JWT_SECRET environment variable is required` - Set the JWT_SECRET environment variable
- `JWT_SECRET must be at least 32 characters long` - Use a longer secret
- `JWT_SECRET appears to be a weak or default secret` - Use a strong, random secret
