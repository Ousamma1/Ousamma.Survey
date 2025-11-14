# Security Hardening Sprint 019 - Quick Reference Guide

## Overview
This guide provides a quick reference for the security hardening sprint, highlighting critical vulnerabilities, current security measures, and recommended fixes.

---

## CRITICAL VULNERABILITIES (Immediate Action Required)

### 1. No Authentication on Main APIs
- **Location:** index.js, survey-service, analytics-service
- **Impact:** Anyone can access all surveys, responses, and data
- **Fix Timeline:** Week 1
- **Priority:** CRITICAL

### 2. Header-Based Authentication
- **Location:** services/admin-service/middleware/auth.js
- **Issue:** Uses `x-user-id` header (client-controlled)
- **Impact:** Anyone can claim to be any user
- **Fix Timeline:** Week 1
- **Priority:** CRITICAL

### 3. No Rate Limiting on Auth Endpoints
- **Impact:** Brute-force attacks possible
- **Fix Timeline:** Week 2
- **Priority:** CRITICAL

### 4. Unencrypted Service Communication
- **Services:** Internal HTTP (no TLS)
- **Databases:** No auth or encryption
- **Fix Timeline:** Week 5
- **Priority:** CRITICAL

### 5. Unsafe File Upload
- **Location:** index.js /api/context/upload
- **Issues:** No access control, weak validation
- **Fix Timeline:** Week 3
- **Priority:** HIGH

### 6. CORS Allows All Origins
- **Location:** All services
- **Impact:** XSS and credential theft
- **Fix Timeline:** Week 2
- **Priority:** HIGH

### 7. Exposed Secrets
- **Location:** .env.example, comments in code
- **Impact:** API keys visible
- **Fix Timeline:** Week 1
- **Priority:** HIGH

---

## CURRENT SECURITY MEASURES (Keep & Extend)

| Component | Status | Location |
|-----------|--------|----------|
| Password Hashing (bcryptjs) | ✓ Good | surveyor-service/models/Surveyor.js |
| Input Validation | ⚠️ Partial | express-validator in routes |
| Rate Limiting | ⚠️ Partial | WebSocket service only |
| Security Headers | ⚠️ Partial | Notification service only |
| JWT Implementation | ⚠️ Incomplete | WebSocket service only |
| Redis Caching | ✓ Good | services/shared/cache/ |
| Activity Logging | ✓ Good | Activity model |
| Account Lockout Fields | ⚠️ Not used | User model |

---

## IMPLEMENTATION PRIORITIES

### PHASE 1: Week 1-2 (Authentication & Basic Protection)
- [ ] Create JWT service module
- [ ] Implement login endpoint
- [ ] Add auth middleware to all services
- [ ] Fix Admin Service header auth
- [ ] Add rate limiting to auth endpoints
- [ ] Update CORS configuration
- [ ] Rotate all secrets in .env files

### PHASE 2: Week 3-4 (API & Input Protection)
- [ ] Extend express-validator usage
- [ ] Secure file upload endpoint
- [ ] Add rate limiting across services
- [ ] Implement input sanitization
- [ ] Add API request validation
- [ ] Deploy helmet across services

### PHASE 3: Week 5-6 (Data Protection)
- [ ] Setup TLS/HTTPS
- [ ] Implement field-level encryption
- [ ] Configure database encryption
- [ ] Implement centralized logging
- [ ] Add audit trail immutability

### PHASE 4: Week 7-8 (Monitoring & Hardening)
- [ ] Deploy API key management
- [ ] Implement intrusion detection
- [ ] Add security monitoring
- [ ] Perform penetration testing
- [ ] Document security architecture

---

## KEY FILES TO MODIFY

### Authentication
- [ ] `/surveyor-service/middleware/auth.js` - Implement real JWT validation
- [ ] `/services/admin-service/middleware/auth.js` - Replace header-based auth
- [ ] `index.js` - Add auth middleware to all routes
- [ ] All service index.js files - Add auth middleware

### Authorization
- [ ] Create `middleware/authorization.js` in each service
- [ ] Implement resource-level access control
- [ ] Add RBAC enforcement

### Input Validation
- [ ] `index.js` - Add validation to all POST/PUT endpoints
- [ ] `/surveyor-service/routes/*.js` - Extend validation
- [ ] All service routes - Add comprehensive validation

### Security Headers
- [ ] Deploy helmet in all services
- [ ] Configure CSP policies
- [ ] Add CSRF protection

### Environment Configuration
- [ ] Update `.env.example` files
- [ ] Add security configuration options
- [ ] Document all security settings

---

## CURRENT ENDPOINTS NEEDING PROTECTION

### Main API (Port 3000)
```javascript
// AI Endpoints - ALL UNPROTECTED
POST   /api/ai/chat
POST   /api/ai/generate-survey
POST   /api/ai/optimize-survey
POST   /api/ai/analyze-responses
POST   /api/ai/query-data
POST   /api/ai/identify-trends
POST   /api/ai/detect-anomalies
POST   /api/ai/generate-report
POST   /api/ai/enhance
POST   /api/ai/ab-test-suggestions

// Survey Endpoints - ALL UNPROTECTED
POST   /api/surveys/save
GET    /api/surveys/:surveyId
GET    /api/surveys
POST   /api/responses/save
GET    /api/responses/:surveyId

// File Upload - NEEDS PROTECTION
POST   /api/context/upload
GET    /api/context/files
DELETE /api/context/files/:filename
```

### Surveyor Service (Port 3001)
```javascript
// All require proper auth instead of dummy middleware
POST   /api/surveyors
GET    /api/surveyors
GET    /api/surveyors/:id
PUT    /api/surveyors/:id
DELETE /api/surveyors/:id
POST   /api/surveyors/:id/extend
POST   /api/surveyors/:id/reset-password
GET    /api/surveyors/:id/performance

// Assignments
POST   /api/assignments
GET    /api/assignments
GET    /api/assignments/:id
PUT    /api/assignments/:id

// Activities
POST   /api/activities
GET    /api/activities/:surveyorId
```

### Admin Service (Port 3007)
```javascript
// Replace header-based auth with JWT
GET    /admin/health
GET    /admin/services
GET    /admin/users
GET    /admin/audit
GET    /admin/settings
POST   /admin/backup
GET    /admin/stats
```

---

## DEVELOPMENT CHECKLIST

### Before Starting Implementation
- [ ] Review this security audit
- [ ] Create feature branches for each security component
- [ ] Setup security testing environment
- [ ] Document security design decisions
- [ ] Brief team on security requirements

### During Implementation
- [ ] Add security tests for each component
- [ ] Test authentication flows
- [ ] Test authorization rules
- [ ] Test rate limiting
- [ ] Verify no secrets are exposed
- [ ] Review all code changes

### Before Merging
- [ ] All security tests pass
- [ ] No credentials in code/comments
- [ ] Security headers present
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Error messages don't leak information

### Before Deployment
- [ ] Security review completed
- [ ] Penetration testing passed
- [ ] Configuration audit passed
- [ ] Secrets management verified
- [ ] TLS certificates ready
- [ ] Backup & disaster recovery tested

---

## TESTING COMMANDS

### Test Authentication
```bash
# Should be 401 Unauthorized
curl http://localhost:3000/api/surveys

# With fake token (should fail)
curl -H "Authorization: Bearer fake-token" \
  http://localhost:3000/api/surveys
```

### Test Rate Limiting
```bash
# Spam requests to trigger rate limit
for i in {1..150}; do
  curl http://localhost:3000/api/surveys
done
# Should return 429 Too Many Requests
```

### Test CORS
```bash
# Test from different origin
curl -H "Origin: http://attacker.com" \
  -H "Access-Control-Request-Method: GET" \
  http://localhost:3000/api/surveys
# Should NOT include Access-Control-Allow-Origin: *
```

### Test Input Validation
```bash
# SQL injection attempt
curl -X POST http://localhost:3000/api/surveyors \
  -d '{"name": "test", "email": "a\" OR \"1\"=\"1"}' \
  -H "Content-Type: application/json"
# Should reject with validation error

# File upload - malicious file
curl -F "file=@malware.exe" \
  http://localhost:3000/api/context/upload
# Should reject
```

---

## SECURITY CONFIGURATION TEMPLATE

### .env.security

```env
# Authentication
JWT_SECRET=<generate-strong-secret-256-chars>
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=<separate-secret>
JWT_REFRESH_EXPIRATION=7d
BCRYPT_ROUNDS=12

# CORS & Headers
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
CORS_CREDENTIALS=false
CSP_POLICY=default-src 'self'

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_KEY_GENERATOR=ip

# TLS/HTTPS
HTTPS_ENABLED=true
CERT_FILE=/etc/ssl/certs/cert.pem
KEY_FILE=/etc/ssl/private/key.pem

# Data Encryption
FIELD_ENCRYPTION_ENABLED=true
ENCRYPTION_KEY=<generate-key>

# Audit Logging
AUDIT_LOG_ENABLED=true
LOG_RETENTION_DAYS=365
LOG_ENCRYPTION=true

# Security Monitoring
SECURITY_ALERTS_ENABLED=true
ANOMALY_DETECTION=true
INTRUSION_DETECTION=true
```

---

## COMMON MISTAKES TO AVOID

1. ❌ Committing secrets to git
   ✓ Use .env files and .gitignore

2. ❌ Storing passwords in plaintext
   ✓ Always hash with bcryptjs (12+ rounds)

3. ❌ Exposing error details to clients
   ✓ Log internally, return generic errors

4. ❌ Trusting client-provided headers
   ✓ Always validate and sign tokens

5. ❌ Weak JWT secrets
   ✓ Use 256+ character random strings

6. ❌ No rate limiting
   ✓ Implement on all endpoints

7. ❌ Unencrypted sensitive data
   ✓ Encrypt PII fields, use TLS in transit

8. ❌ No input validation
   ✓ Validate all inputs, use whitelists

9. ❌ Missing security headers
   ✓ Deploy helmet, set CSP

10. ❌ No audit logging
    ✓ Log all security events

---

## USEFUL RESOURCES

### Security Libraries
- **helmet** - Security headers for Express
- **express-rate-limit** - Rate limiting
- **jsonwebtoken** - JWT implementation
- **bcryptjs** - Password hashing
- **joi** - Data validation
- **express-validator** - Form validation

### Security Standards
- OWASP Top 10
- NIST Cybersecurity Framework
- CIS Critical Security Controls

### Tools
- OWASP ZAP - Penetration testing
- Burp Suite - Web security testing
- npm audit - Dependency scanning
- Snyk - Vulnerability scanning

---

## CONTACT & ESCALATION

For security concerns during implementation:
1. Create a security issue (mark as confidential)
2. Contact security team lead
3. Do not commit vulnerable code
4. Do not discuss publicly until patched

---

**Document:** Sprint 019 Security Quick Reference  
**Version:** 1.0  
**Date:** November 14, 2025  
**Status:** Active - Use as primary reference during implementation

