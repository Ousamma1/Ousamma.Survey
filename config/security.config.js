/**
 * Security Configuration
 * Centralized security settings for the Ousamma Survey Platform
 */

module.exports = {
  // JWT Configuration
  jwt: {
    accessTokenSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    accessTokenExpiry: process.env.JWT_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    algorithm: 'HS256',
    issuer: 'ousamma-survey',
    audience: 'ousamma-survey-users'
  },

  // Password Policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    resetTokenExpiry: 3600000, // 1 hour
    saltRounds: 12
  },

  // Rate Limiting Configuration
  rateLimit: {
    // Global rate limit
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    },

    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 requests per windowMs
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many authentication attempts, please try again later.'
    },

    // Login endpoint
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      skipSuccessfulRequests: true,
      message: 'Too many login attempts, please try again later.'
    },

    // Registration endpoint
    register: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
      message: 'Too many registration attempts, please try again later.'
    },

    // Password reset
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
      message: 'Too many password reset attempts, please try again later.'
    },

    // File upload
    upload: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20,
      message: 'Too many file uploads, please try again later.'
    },

    // API endpoints
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: 'Too many API requests, please try again later.'
    },

    // Search/Query endpoints
    search: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30,
      message: 'Too many search requests, please try again later.'
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-Request-ID'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Rate-Limit-Remaining'],
    maxAge: 86400 // 24 hours
  },

  // Request Size Limits
  requestLimits: {
    json: '10mb',
    urlencoded: '10mb',
    text: '10mb',
    raw: '10mb',
    fileUpload: 50 * 1024 * 1024, // 50MB
    maxFiles: 10
  },

  // File Upload Security
  fileUpload: {
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain'
    ],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true'
  },

  // Session Configuration
  session: {
    timeout: 30 * 60 * 1000, // 30 minutes
    absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
    renewalThreshold: 5 * 60 * 1000, // 5 minutes
    cookieName: 'ousamma_session',
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieHttpOnly: true,
    cookieSameSite: 'strict',
    cookieMaxAge: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Encryption Configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 64,
    tagLength: 16,
    encryptionKey: process.env.ENCRYPTION_KEY || 'change-this-to-a-secure-random-key-in-production-min-32-chars',
    iterations: 100000,
    digest: 'sha512'
  },

  // API Key Configuration
  apiKey: {
    length: 32,
    prefix: 'osk_', // Ousamma Survey Key
    expiryDays: 365,
    rotationDays: 90,
    maxKeysPerUser: 10
  },

  // 2FA Configuration
  twoFactor: {
    enabled: process.env.TWO_FACTOR_ENABLED === 'true',
    issuer: 'Ousamma Survey',
    window: 2, // Allow 2 time steps before and after
    encoding: 'base32',
    algorithm: 'sha1',
    digits: 6,
    period: 30, // 30 seconds
    backupCodesCount: 10
  },

  // Security Headers (Helmet.js configuration)
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  },

  // Audit & Compliance
  audit: {
    enabled: true,
    logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
    retentionDays: 90,
    sensitiveFields: [
      'password',
      'token',
      'apiKey',
      'secret',
      'creditCard',
      'ssn',
      'bankAccount'
    ],
    events: {
      authentication: true,
      authorization: true,
      dataAccess: true,
      dataModification: true,
      configChanges: true,
      securityEvents: true
    }
  },

  // GDPR Configuration
  gdpr: {
    dataRetentionDays: 365 * 2, // 2 years
    inactiveDeletionDays: 365 * 3, // 3 years
    exportFormat: 'json',
    anonymizationEnabled: true,
    consentRequired: true,
    cookieConsent: true,
    rightToErasure: true,
    dataPortability: true
  },

  // Service-to-Service Security
  serviceSecurity: {
    requireApiKey: true,
    requireMutualTLS: process.env.REQUIRE_MTLS === 'true',
    trustedServices: [
      'surveyor-service',
      'survey-service',
      'project-service',
      'analytics-service',
      'admin-service',
      'geolocation-service',
      'websocket-service'
    ],
    serviceKeyPrefix: 'ossk_', // Ousamma Survey Service Key
    keyRotationDays: 30
  },

  // Security Monitoring
  monitoring: {
    enabled: true,
    alertThresholds: {
      failedLogins: 10,
      suspiciousActivity: 5,
      dataExfiltration: 1000, // MB
      apiAbuseRate: 500 // requests per minute
    },
    webhookUrl: process.env.SECURITY_WEBHOOK_URL,
    emailAlerts: process.env.SECURITY_ALERT_EMAIL
  },

  // IP Whitelisting/Blacklisting
  ipControl: {
    whitelistEnabled: process.env.IP_WHITELIST_ENABLED === 'true',
    whitelist: process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : [],
    blacklist: process.env.IP_BLACKLIST ? process.env.IP_BLACKLIST.split(',') : [],
    blockVPN: process.env.BLOCK_VPN === 'true',
    blockTor: process.env.BLOCK_TOR === 'true'
  }
};
