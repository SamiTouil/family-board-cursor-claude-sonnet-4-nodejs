# CSRF Protection Implementation

## Overview

This application implements **Cross-Site Request Forgery (CSRF) protection** using the **Double-Submit Cookie Pattern**. This approach provides robust protection against CSRF attacks without requiring server-side session storage, making it ideal for stateless JWT-based authentication systems.

## How It Works

### Double-Submit Cookie Pattern

1. **Token Generation**: Server generates a cryptographically secure random token
2. **Cookie Setting**: Token is set as a cookie (`__Host-csrf-token`)
3. **Client Submission**: Client must submit the same token in both:
   - The cookie (automatically sent by browser)
   - A request header (`X-CSRF-Token`) or body field (`_csrf`)
4. **Server Validation**: Server validates that both tokens match

### Security Principles

- **Same-Origin Policy**: Attackers cannot read cookies from other domains
- **Cookie Security**: Attackers cannot set cookies for other domains
- **Double Verification**: Both cookie and submitted token must match
- **Cryptographic Strength**: Tokens are generated using `crypto.randomBytes()`

## Implementation Details

### Middleware Components

#### `generateCSRFToken`
- Generates new CSRF tokens or reuses existing ones
- Sets secure cookies with appropriate flags
- Makes token available to request handlers

#### `validateCSRFToken`
- Validates CSRF tokens on state-changing requests (POST, PUT, DELETE, PATCH)
- Skips validation for safe methods (GET, HEAD, OPTIONS)
- Skips validation for specific endpoints (health checks, auth)

#### `csrfProtection`
- Combined middleware that both generates and validates tokens
- Convenient for routes that need both functionalities

### Cookie Configuration

```javascript
{
  httpOnly: false,        // Must be readable by JavaScript
  secure: true,          // HTTPS only in production
  sameSite: 'strict',    // Strict same-site policy
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
}
```

### Token Specifications

- **Length**: 32 bytes (64 hex characters)
- **Generation**: `crypto.randomBytes(32).toString('hex')`
- **Cookie Name**: `__Host-csrf-token` (secure prefix)
- **Header Name**: `X-CSRF-Token`
- **Body Field**: `_csrf`

## API Endpoints

### Get CSRF Token
```
GET /api/csrf/token
```

**Response:**
```json
{
  "success": true,
  "csrfToken": "a1b2c3d4e5f6..."
}
```

**Cookie Set:**
```
Set-Cookie: __Host-csrf-token=a1b2c3d4e5f6...; Path=/; SameSite=Strict; Secure
```

### Refresh Token
```
GET /api/csrf/token?refreshCSRF=true
```

Forces generation of a new token even if one exists.

## Client Integration

### Frontend (React/JavaScript)

```javascript
// Get CSRF token
const getCSRFToken = async () => {
  const response = await fetch('/api/csrf/token', {
    credentials: 'include' // Include cookies
  });
  const data = await response.json();
  return data.csrfToken;
};

// Make protected request
const makeProtectedRequest = async (url, data) => {
  const csrfToken = await getCSRFToken();
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(data)
  });
};
```

### Mobile (React Native)

```javascript
// Note: React Native doesn't support cookies automatically
// You'll need to manage tokens manually or use a cookie library

import CookieManager from '@react-native-cookies/cookies';

const getCSRFToken = async () => {
  const response = await fetch('/api/csrf/token');
  const data = await response.json();
  
  // Store token for later use
  await AsyncStorage.setItem('csrfToken', data.csrfToken);
  
  return data.csrfToken;
};
```

## Protected Routes

The following routes require CSRF protection:

- `/api/users/*` - User management
- `/api/families/*` - Family operations
- `/api/tasks/*` - Task operations
- All day template routes
- All week template routes
- All schedule routes

### Excluded Routes

These routes skip CSRF validation:

- `GET`, `HEAD`, `OPTIONS` requests (safe methods)
- `/api/health` - Health checks
- `/api/auth/login` - Initial authentication
- `/api/auth/signup` - User registration

## Error Responses

### Missing Token
```json
{
  "success": false,
  "message": "CSRF token is required for this request",
  "code": "CSRF_TOKEN_REQUIRED"
}
```

### Invalid Token
```json
{
  "success": false,
  "message": "Invalid CSRF token",
  "code": "CSRF_TOKEN_INVALID"
}
```

## Security Considerations

### Strengths
- ✅ No server-side session storage required
- ✅ Works with stateless JWT authentication
- ✅ Cryptographically secure token generation
- ✅ Constant-time token comparison
- ✅ Secure cookie configuration
- ✅ Comprehensive validation logic

### Limitations
- ⚠️ Requires JavaScript to be enabled
- ⚠️ Tokens must be managed by client applications
- ⚠️ Additional complexity for mobile applications

### Best Practices
1. Always use HTTPS in production
2. Implement proper error handling on client side
3. Refresh tokens periodically
4. Monitor for CSRF attack attempts
5. Keep token expiration reasonable (24 hours)

## Testing

Comprehensive test coverage includes:
- Unit tests for all middleware functions
- Integration tests for complete request flows
- Edge cases and error conditions
- Token generation and validation
- Cookie handling and security

Run tests:
```bash
npm test -- csrf
```

## Troubleshooting

### Common Issues

1. **"CSRF token required" errors**
   - Ensure client includes both cookie and header/body token
   - Check that cookies are enabled and being sent

2. **"Invalid CSRF token" errors**
   - Verify token hasn't expired
   - Check for token corruption during transmission
   - Ensure proper encoding/decoding

3. **Cookies not being set**
   - Verify CORS configuration allows credentials
   - Check domain and path settings
   - Ensure HTTPS in production for secure cookies
