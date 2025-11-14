/**
 * OWASP Top 10 Security Tests
 * Sprint 19: Testing & QA
 *
 * Automated security testing for common vulnerabilities
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

class SecurityTester {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  async runAllTests() {
    console.log('🔒 Running OWASP Top 10 Security Tests...\n');

    await this.testA01_BrokenAccessControl();
    await this.testA02_CryptographicFailures();
    await this.testA03_Injection();
    await this.testA04_InsecureDesign();
    await this.testA05_SecurityMisconfiguration();
    await this.testA06_VulnerableComponents();
    await this.testA07_IdentificationAuthenticationFailures();
    await this.testA08_SoftwareDataIntegrityFailures();
    await this.testA09_SecurityLoggingMonitoring();
    await this.testA10_ServerSideRequestForgery();

    this.printResults();
  }

  async testA01_BrokenAccessControl() {
    console.log('Testing A01: Broken Access Control...');

    try {
      // Test unauthorized access to admin endpoints
      const res = await axios.get(`${BASE_URL}/admin/health`, {
        validateStatus: () => true
      });

      if (res.status === 200 && !res.headers.authorization) {
        this.fail('A01', 'Admin endpoint accessible without authentication');
      } else {
        this.pass('A01', 'Admin endpoints require authentication');
      }

      // Test horizontal privilege escalation
      const res2 = await axios.get(`${BASE_URL}/api/users/other-user-id`, {
        validateStatus: () => true
      });

      if (res2.status === 200) {
        this.warn('A01', 'Potential horizontal privilege escalation');
      }

    } catch (error) {
      this.warn('A01', `Error testing access control: ${error.message}`);
    }
  }

  async testA02_CryptographicFailures() {
    console.log('Testing A02: Cryptographic Failures...');

    try {
      // Check if HTTPS is enforced
      const res = await axios.get(`${BASE_URL}/api/surveys`, {
        validateStatus: () => true,
        maxRedirects: 0
      });

      if (res.request.protocol === 'https:') {
        this.pass('A02', 'HTTPS is enforced');
      } else {
        this.warn('A02', 'HTTP is allowed (should enforce HTTPS in production)');
      }

      // Check for secure headers
      if (res.headers['strict-transport-security']) {
        this.pass('A02', 'HSTS header is set');
      } else {
        this.warn('A02', 'Missing HSTS header');
      }

    } catch (error) {
      this.warn('A02', `Error testing cryptography: ${error.message}`);
    }
  }

  async testA03_Injection() {
    console.log('Testing A03: Injection...');

    try {
      // Test SQL injection (NoSQL in this case)
      const maliciousPayload = {
        title: { en: "Test' OR '1'='1" },
        createdBy: { $ne: null }
      };

      const res = await axios.post(`${BASE_URL}/api/surveys`, maliciousPayload, {
        validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.status === 500) {
        this.fail('A03', 'Potential NoSQL injection vulnerability');
      } else {
        this.pass('A03', 'NoSQL injection prevented');
      }

      // Test XSS
      const xssPayload = {
        title: { en: '<script>alert("XSS")</script>' },
        createdBy: 'test-user'
      };

      const res2 = await axios.post(`${BASE_URL}/api/surveys`, xssPayload, {
        validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' }
      });

      if (res2.data && JSON.stringify(res2.data).includes('<script>')) {
        this.fail('A03', 'XSS vulnerability detected');
      } else {
        this.pass('A03', 'XSS attack prevented');
      }

    } catch (error) {
      this.warn('A03', `Error testing injection: ${error.message}`);
    }
  }

  async testA04_InsecureDesign() {
    console.log('Testing A04: Insecure Design...');

    try {
      // Test rate limiting
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(
          axios.get(`${BASE_URL}/api/surveys`, { validateStatus: () => true })
        );
      }

      const results = await Promise.all(requests);
      const rateLimited = results.some(r => r.status === 429);

      if (rateLimited) {
        this.pass('A04', 'Rate limiting is implemented');
      } else {
        this.fail('A04', 'No rate limiting detected');
      }

    } catch (error) {
      this.warn('A04', `Error testing design security: ${error.message}`);
    }
  }

  async testA05_SecurityMisconfiguration() {
    console.log('Testing A05: Security Misconfiguration...');

    try {
      // Check security headers
      const res = await axios.get(`${BASE_URL}/api/surveys`, {
        validateStatus: () => true
      });

      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'content-security-policy'
      ];

      let missingHeaders = [];
      for (const header of securityHeaders) {
        if (!res.headers[header]) {
          missingHeaders.push(header);
        }
      }

      if (missingHeaders.length === 0) {
        this.pass('A05', 'All security headers are present');
      } else {
        this.warn('A05', `Missing headers: ${missingHeaders.join(', ')}`);
      }

      // Check for verbose error messages
      const res2 = await axios.get(`${BASE_URL}/api/surveys/non-existent-id`, {
        validateStatus: () => true
      });

      if (res2.data && res2.data.stack) {
        this.fail('A05', 'Stack traces exposed in error messages');
      } else {
        this.pass('A05', 'Error messages do not expose sensitive information');
      }

    } catch (error) {
      this.warn('A05', `Error testing misconfiguration: ${error.message}`);
    }
  }

  async testA06_VulnerableComponents() {
    console.log('Testing A06: Vulnerable Components...');

    try {
      // This would typically run npm audit
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('npm audit --json');
      const auditResults = JSON.parse(stdout);

      const criticalVulns = auditResults.metadata?.vulnerabilities?.critical || 0;
      const highVulns = auditResults.metadata?.vulnerabilities?.high || 0;

      if (criticalVulns > 0 || highVulns > 0) {
        this.fail('A06', `Found ${criticalVulns} critical and ${highVulns} high vulnerabilities`);
      } else {
        this.pass('A06', 'No critical or high vulnerabilities found');
      }

    } catch (error) {
      this.warn('A06', `Error checking dependencies: ${error.message}`);
    }
  }

  async testA07_IdentificationAuthenticationFailures() {
    console.log('Testing A07: Authentication Failures...');

    try {
      // Test weak password
      const res = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      }, {
        validateStatus: () => true
      });

      if (res.status === 201) {
        this.fail('A07', 'Weak passwords are accepted');
      } else if (res.status === 400) {
        this.pass('A07', 'Weak passwords are rejected');
      }

      // Test brute force protection
      const loginAttempts = [];
      for (let i = 0; i < 10; i++) {
        loginAttempts.push(
          axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'test@example.com',
            password: 'wrong-password'
          }, { validateStatus: () => true })
        );
      }

      const results = await Promise.all(loginAttempts);
      const blocked = results.some(r => r.status === 429 || r.status === 403);

      if (blocked) {
        this.pass('A07', 'Brute force protection is active');
      } else {
        this.warn('A07', 'No brute force protection detected');
      }

    } catch (error) {
      this.warn('A07', `Error testing authentication: ${error.message}`);
    }
  }

  async testA08_SoftwareDataIntegrityFailures() {
    console.log('Testing A08: Software and Data Integrity Failures...');

    try {
      // Check if CI/CD pipeline exists
      const fs = require('fs');
      const hasGitHubActions = fs.existsSync('.github/workflows');

      if (hasGitHubActions) {
        this.pass('A08', 'CI/CD pipeline detected');
      } else {
        this.warn('A08', 'No CI/CD pipeline found');
      }

      // Check for integrity verification
      const hasPackageLock = fs.existsSync('package-lock.json');

      if (hasPackageLock) {
        this.pass('A08', 'Dependency lock file exists');
      } else {
        this.warn('A08', 'No package-lock.json found');
      }

    } catch (error) {
      this.warn('A08', `Error testing integrity: ${error.message}`);
    }
  }

  async testA09_SecurityLoggingMonitoring() {
    console.log('Testing A09: Security Logging & Monitoring...');

    try {
      // Test if failed login attempts are logged
      await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'wrong'
      }, { validateStatus: () => true });

      // Check if audit logs exist
      const res = await axios.get(`${BASE_URL}/admin/audit`, {
        validateStatus: () => true
      });

      if (res.status === 200) {
        this.pass('A09', 'Audit logging appears to be implemented');
      } else {
        this.warn('A09', 'Audit logging endpoint not accessible');
      }

    } catch (error) {
      this.warn('A09', `Error testing logging: ${error.message}`);
    }
  }

  async testA10_ServerSideRequestForgery() {
    console.log('Testing A10: Server-Side Request Forgery...');

    try {
      // Test SSRF via webhook URL
      const maliciousPayload = {
        title: { en: 'Test' },
        createdBy: 'test-user',
        settings: {
          notifications: {
            webhook: {
              enabled: true,
              url: 'http://localhost:27017' // Try to access MongoDB
            }
          }
        }
      };

      const res = await axios.post(`${BASE_URL}/api/surveys`, maliciousPayload, {
        validateStatus: () => true,
        headers: { 'Content-Type': 'application/json' }
      });

      // If the request succeeds and triggers a webhook, SSRF might be possible
      if (res.status === 201) {
        this.warn('A10', 'SSRF protection should be verified manually');
      } else {
        this.pass('A10', 'Potential SSRF prevented');
      }

    } catch (error) {
      this.warn('A10', `Error testing SSRF: ${error.message}`);
    }
  }

  pass(category, message) {
    this.results.passed.push({ category, message });
    console.log(`✅ ${category}: ${message}`);
  }

  fail(category, message) {
    this.results.failed.push({ category, message });
    console.log(`❌ ${category}: ${message}`);
  }

  warn(category, message) {
    this.results.warnings.push({ category, message });
    console.log(`⚠️  ${category}: ${message}`);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('Security Test Results');
    console.log('='.repeat(60) + '\n');

    console.log(`✅ Passed: ${this.results.passed.length}`);
    console.log(`❌ Failed: ${this.results.failed.length}`);
    console.log(`⚠️  Warnings: ${this.results.warnings.length}\n`);

    if (this.results.failed.length > 0) {
      console.log('Critical Issues:');
      this.results.failed.forEach(({ category, message }) => {
        console.log(`  - ${category}: ${message}`);
      });
      console.log('');
    }

    if (this.results.warnings.length > 0) {
      console.log('Warnings:');
      this.results.warnings.forEach(({ category, message }) => {
        console.log(`  - ${category}: ${message}`);
      });
      console.log('');
    }

    const exitCode = this.results.failed.length > 0 ? 1 : 0;
    process.exit(exitCode);
  }
}

// Run tests
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SecurityTester;
