# Client CSRF Integration Guide

## 🔒 Overview

Both frontend (React) and mobile (React Native) applications have been updated to support CSRF protection using the double-submit cookie pattern. This integration provides automatic token management with minimal impact on existing code.

## 🌐 Frontend Integration (React)

### Files Added/Modified

**New Files:**
- `frontend/src/services/csrf.ts` - CSRF service with token management
- `frontend/src/hooks/useCSRF.ts` - React hooks for CSRF operations
- `frontend/src/contexts/CSRFContext.tsx` - Global CSRF state management

**Modified Files:**
- `frontend/src/services/api-client.ts` - Added automatic CSRF token inclusion
- `frontend/src/App.tsx` - Added CSRFProvider to app structure

### Key Features

**Automatic Token Management:**
- Tokens are automatically fetched and cached
- Automatic retry on token expiration
- Smart caching with 23-hour duration
- Proactive refresh every 22 hours

**Seamless Integration:**
- All API calls automatically include CSRF tokens
- No changes required to existing API calls
- Graceful fallback when CSRF is disabled
- Error handling with automatic retry

**React Hooks:**
```typescript
// Basic CSRF hook
const { token, isLoading, error, isEnabled } = useCSRF();

// Required CSRF hook (throws if token unavailable)
const token = useRequiredCSRF();

// Manual operations
const { getToken, refreshToken, clearToken } = useCSRFOperations();
```

### Usage Examples

**Automatic (Recommended):**
```typescript
// No changes needed - tokens are added automatically
const response = await apiClient.post('/api/users', userData);
```

**Manual Token Access:**
```typescript
import { getCSRFToken } from '../services/csrf';

const token = await getCSRFToken();
// Use token manually if needed
```

**Component Integration:**
```typescript
import { useCSRF } from '../hooks/useCSRF';

const MyComponent = () => {
  const { token, isLoading, error, refreshToken } = useCSRF();
  
  if (error) {
    return <div>CSRF Error: {error}</div>;
  }
  
  return <div>CSRF Status: {token ? 'Protected' : 'Disabled'}</div>;
};
```

## 📱 Mobile Integration (React Native)

### Files Added/Modified

**New Files:**
- `mobile/src/services/csrf.ts` - CSRF service with AsyncStorage persistence
- `mobile/src/hooks/useCSRF.ts` - React Native hooks for CSRF operations
- `mobile/src/contexts/CSRFContext.tsx` - Global CSRF state management

**Modified Files:**
- `mobile/src/services/api-client.ts` - Added automatic CSRF token inclusion
- `mobile/App.tsx` - Added CSRFProvider to app structure

### Key Features

**Persistent Token Storage:**
- Tokens stored in AsyncStorage across app sessions
- Automatic token validation on app startup
- Token refresh when app becomes active
- Secure token cleanup on logout

**Mobile-Specific Optimizations:**
- App state change handling (background/foreground)
- Network-aware token fetching
- Efficient caching to reduce API calls
- Battery-friendly refresh intervals

**React Native Hooks:**
```typescript
// Basic CSRF hook
const { token, isLoading, error, initialize } = useCSRF();

// Required CSRF hook
const token = useRequiredCSRF();

// Manual operations
const { getToken, refreshToken, clearToken, initialize } = useCSRFOperations();
```

### Usage Examples

**Automatic (Recommended):**
```typescript
// No changes needed - tokens are added automatically
const response = await apiClient.post('/users', userData);
```

**Manual Initialization:**
```typescript
import { initializeCSRF } from '../services/csrf';

// Initialize in app startup
useEffect(() => {
  initializeCSRF();
}, []);
```

**Component Integration:**
```typescript
import { useCSRF } from '../hooks/useCSRF';

const MyScreen = () => {
  const { token, isLoading, error, refreshToken } = useCSRF();
  
  if (error) {
    return <Text>CSRF Error: {error}</Text>;
  }
  
  return <Text>CSRF Status: {token ? 'Protected' : 'Disabled'}</Text>;
};
```

## 🔧 Configuration

### Environment Variables

Both applications automatically detect CSRF status from the server. No additional configuration is required.

### Server Integration

The applications work with the server's `DISABLE_CSRF_VALIDATION` flag:

- **When `DISABLE_CSRF_VALIDATION=true`**: Tokens are not required, apps work normally
- **When `DISABLE_CSRF_VALIDATION=false`**: Tokens are required and automatically included

## 🚀 Deployment Strategy

### Phase 1: Deploy Client Updates ✅ READY
1. **Frontend**: Deploy updated React application
2. **Mobile**: Deploy updated React Native application
3. **Verification**: Test all operations work with `DISABLE_CSRF_VALIDATION=true`

### Phase 2: Enable CSRF Protection
1. **Server**: Set `DISABLE_CSRF_VALIDATION=false`
2. **Testing**: Verify all operations work with CSRF tokens
3. **Monitoring**: Watch for any CSRF-related errors

### Phase 3: Production Rollout
1. **Gradual**: Enable CSRF protection in staging first
2. **Monitor**: Check logs for any issues
3. **Full**: Enable in production when confident

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm test
```

### Mobile Testing
```bash
cd mobile
npm test
```

### Manual Testing Checklist
- [ ] Login/signup works (CSRF excluded)
- [ ] Create operations work (families, tasks, etc.)
- [ ] Update operations work (profile, settings, etc.)
- [ ] Delete operations work (tasks, members, etc.)
- [ ] Token refresh works automatically
- [ ] Error handling works for invalid tokens

## 🔍 Troubleshooting

### Common Issues

**1. "CSRF token required" errors:**
- Check that `withCredentials: true` is set (frontend)
- Verify cookies are being sent with requests
- Ensure CSRF service is initialized

**2. Token not being included:**
- Check request method (only POST, PUT, PATCH, DELETE)
- Verify URL is not an auth endpoint
- Check console for CSRF service errors

**3. Mobile token persistence issues:**
- Clear AsyncStorage: `AsyncStorage.clear()`
- Restart app to reinitialize CSRF service
- Check device storage permissions

### Debug Information

**Frontend Console:**
```javascript
// Check CSRF status
console.log('CSRF Token:', await getCSRFToken());

// Check service state
import { csrfService } from './services/csrf';
console.log('CSRF Enabled:', await csrfService.isCSRFEnabled());
```

**Mobile Console:**
```javascript
// Check CSRF status
import { csrfService } from './services/csrf';
console.log('Cached Token:', csrfService.getCachedToken());
console.log('CSRF Enabled:', await csrfService.isCSRFEnabled());
```

## ✅ Benefits

1. **Automatic Protection**: CSRF tokens handled transparently
2. **Zero Code Changes**: Existing API calls work unchanged
3. **Smart Caching**: Efficient token management
4. **Error Recovery**: Automatic retry on token expiration
5. **Mobile Optimized**: Persistent storage and app state handling
6. **Graceful Degradation**: Works when CSRF is disabled

The integration provides robust CSRF protection while maintaining excellent developer experience and application performance.
