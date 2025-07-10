# CSRF Protection Hotfix Guide

## 🚨 Issue: Operations Broken After CSRF Implementation

After implementing CSRF protection, modify/delete operations are failing because client applications aren't sending CSRF tokens yet.

## 🔧 Immediate Hotfix Solution

### Feature Flag Added: `DISABLE_CSRF_VALIDATION`

A feature flag has been added to temporarily disable CSRF validation while client applications are updated.

### Environment Configuration

**Development (.env):**
```bash
# Temporarily disable CSRF validation while clients are being updated
DISABLE_CSRF_VALIDATION=true
```

**Production (.env.example):**
```bash
# Set to 'true' to temporarily disable CSRF validation during client migration
DISABLE_CSRF_VALIDATION=false
```

**Docker (docker-compose.yml):**
```yaml
environment:
  DISABLE_CSRF_VALIDATION: ${DISABLE_CSRF_VALIDATION:-false}
```

## 🔄 Migration Strategy

### Phase 1: Hotfix (Immediate) ✅ DONE
- [x] Add feature flag to disable CSRF validation
- [x] Set `DISABLE_CSRF_VALIDATION=true` in development
- [x] Keep CSRF token generation active (for testing)
- [x] All operations work normally

### Phase 2: Client Integration (Next Steps)
1. **Update Frontend Applications**
   ```javascript
   // Get CSRF token before state-changing requests
   const response = await fetch('/api/csrf/token', { credentials: 'include' });
   const { csrfToken } = await response.json();
   
   // Include token in requests
   fetch('/api/users', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-CSRF-Token': csrfToken
     },
     credentials: 'include',
     body: JSON.stringify(data)
   });
   ```

2. **Update Mobile Applications**
   ```javascript
   // Manual token management for React Native
   const { csrfToken } = await fetch('/api/csrf/token').then(r => r.json());
   await AsyncStorage.setItem('csrfToken', csrfToken);
   ```

3. **Test All Operations**
   - Create, update, delete operations
   - Form submissions
   - API calls from different clients

### Phase 3: Enable CSRF Protection (Final)
1. Set `DISABLE_CSRF_VALIDATION=false` in all environments
2. Test thoroughly
3. Monitor for any missed endpoints
4. Remove feature flag (optional, can keep for future migrations)

## 🧪 Testing the Hotfix

### Verify Operations Work
```bash
# Test that operations work with flag enabled
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
# Should work without CSRF token
```

### Verify CSRF Endpoint Still Works
```bash
# CSRF token generation should still work
curl -i http://localhost:3001/api/csrf/token
# Should return token and set cookie
```

### Verify Flag Disables Validation
```bash
# With DISABLE_CSRF_VALIDATION=true, this should work:
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'
```

## 🔒 Security Considerations

### During Migration
- ⚠️ **CSRF protection is temporarily disabled**
- ⚠️ **Applications are vulnerable to CSRF attacks**
- ⚠️ **Complete client integration as quickly as possible**

### Best Practices
1. **Minimize migration time** - Update clients quickly
2. **Test thoroughly** - Ensure all operations work with CSRF tokens
3. **Monitor logs** - Watch for any CSRF-related errors
4. **Staged rollout** - Enable CSRF protection gradually if needed

## 📋 Deployment Steps

### Immediate Deployment (Hotfix)
1. **Deploy with feature flag enabled:**
   ```bash
   DISABLE_CSRF_VALIDATION=true
   ```

2. **Verify all operations work**

3. **Begin client integration work**

### Client Integration Deployment
1. **Update client applications** with CSRF token handling
2. **Test in staging** with `DISABLE_CSRF_VALIDATION=false`
3. **Deploy clients** to production
4. **Enable CSRF protection** by setting `DISABLE_CSRF_VALIDATION=false`

## 🚀 Quick Commands

### Enable Hotfix (Disable CSRF)
```bash
# In .env file
echo "DISABLE_CSRF_VALIDATION=true" >> .env

# Restart application
docker-compose restart backend
```

### Enable CSRF Protection (After Client Updates)
```bash
# In .env file
sed -i 's/DISABLE_CSRF_VALIDATION=true/DISABLE_CSRF_VALIDATION=false/' .env

# Restart application
docker-compose restart backend
```

## ✅ Status

- ✅ **Hotfix implemented** - Feature flag added
- ✅ **Operations restored** - All modify/delete operations work
- ✅ **CSRF infrastructure ready** - Token generation still active
- ⏳ **Client integration needed** - Next phase
- ⏳ **CSRF protection activation** - Final phase

This hotfix provides immediate relief while maintaining the CSRF infrastructure for proper security implementation.
