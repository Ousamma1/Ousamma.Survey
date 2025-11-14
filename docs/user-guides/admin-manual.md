# Administrator User Manual

Complete guide for system administrators of the Ousamma Survey System.

## Table of Contents
- [Getting Started](#getting-started)
- [User Management](#user-management)
- [System Configuration](#system-configuration)
- [Surveyor Management](#surveyor-management)
- [Analytics Dashboard](#analytics-dashboard)
- [System Monitoring](#system-monitoring)
- [Backup & Recovery](#backup--recovery)
- [Security Management](#security-management)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Login

1. **Access the Admin Panel**
   - Navigate to: `http://your-domain.com/admin-surveyors.html`
   - Or: `http://localhost:3000/admin-surveyors.html` (development)

2. **Login Credentials**
   - Use your administrator email and password
   - Enable 2FA for enhanced security (recommended)

3. **Dashboard Overview**
   - Total surveys created
   - Active surveyors
   - Response statistics
   - System health indicators

### Admin Interface Layout

```
┌─────────────────────────────────────────┐
│         Header & Navigation             │
├─────────────┬───────────────────────────┤
│             │                           │
│  Sidebar    │    Main Content Area      │
│  Menu       │                           │
│             │    - Dashboard            │
│  - Dashboard│    - Tables               │
│  - Users    │    - Forms                │
│  - Surveys  │    - Charts               │
│  - Analytics│                           │
│  - Settings │                           │
│             │                           │
└─────────────┴───────────────────────────┘
```

---

## User Management

### Creating Users

1. **Navigate to Users Section**
   - Click "Users" in the sidebar
   - Click "Add New User" button

2. **Fill User Details**
   ```
   Name: John Doe
   Email: john@company.com
   Role: [Admin | Manager | Surveyor | Analyst]
   Region: Dubai
   Department: Sales
   ```

3. **Set Permissions**
   - ☑ Can create surveys
   - ☑ Can view analytics
   - ☑ Can export data
   - ☐ Can manage users
   - ☑ Can assign surveyors

4. **Send Invitation**
   - Email with login credentials sent automatically
   - Temporary password generated
   - User must change password on first login

### User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, settings |
| **Manager** | Create surveys, view analytics, manage surveyors |
| **Surveyor** | Collect responses, view assigned surveys |
| **Analyst** | View analytics, export data, generate reports |

### Managing Existing Users

#### Edit User
1. Click user in the list
2. Modify details
3. Click "Save Changes"

#### Deactivate User
1. Select user
2. Click "Deactivate"
3. Confirm action
4. User cannot login but data is preserved

#### Reset Password
1. Select user
2. Click "Reset Password"
3. Choose method:
   - Send reset link via email
   - Generate temporary password
   - Set custom password

#### Bulk Operations
- Select multiple users (checkbox)
- Choose action: Activate, Deactivate, Delete, Export
- Confirm operation

---

## System Configuration

### General Settings

**Access:** Settings > General

```
System Name: Ousamma Survey System
Company Name: Your Company Name
Support Email: support@company.com
Default Language: English
Time Zone: UTC+4 (Dubai)
Date Format: DD/MM/YYYY
Currency: AED
```

### Email Configuration

**Access:** Settings > Email

```
SMTP Settings:
├── Host: smtp.gmail.com
├── Port: 587
├── Security: TLS
├── Username: noreply@company.com
└── Password: ••••••••••••

Email Templates:
├── Survey Invitation
├── Response Confirmation
├── Password Reset
└── Weekly Report
```

**Test Email Configuration:**
1. Click "Send Test Email"
2. Enter recipient email
3. Verify receipt

### SMS Configuration

**Access:** Settings > SMS

```
Provider: Twilio
Account SID: AC••••••••••••
Auth Token: ••••••••••••
From Number: +971501234567
```

**Supported Providers:**
- Twilio
- AWS SNS
- Vonage (Nexmo)

### AI Services Configuration

**Access:** Settings > AI Services

```
OpenAI:
├── API Key: sk-••••••••••••
├── Model: gpt-4
└── Max Tokens: 2000

Anthropic Claude:
├── API Key: sk-ant-••••••••••••
└── Model: claude-3-opus

Google Gemini:
├── API Key: AI••••••••••••
└── Model: gemini-pro
```

### File Upload Settings

```
Max File Size: 10 MB
Allowed Types: PDF, DOCX, XLSX, JPG, PNG
Upload Directory: /app/uploads
Virus Scanning: Enabled
```

### Security Settings

**Access:** Settings > Security

```
Session:
├── Timeout: 15 minutes
├── Remember Me: 7 days
└── Concurrent Sessions: 3

Password Policy:
├── Minimum Length: 8 characters
├── Require Uppercase: Yes
├── Require Numbers: Yes
├── Require Special Characters: Yes
├── Password Expiry: 90 days
└── Password History: 5

Two-Factor Authentication:
├── Enforcement: Optional (Recommended for Admins)
├── Method: TOTP (Google Authenticator)
└── Backup Codes: 10

Rate Limiting:
├── General: 100 req/15min
├── Auth: 5 req/15min
└── API: 1000 req/hour
```

---

## Surveyor Management

### Adding Surveyors

1. **Navigate to Surveyors**
   - Click "Surveyors" in sidebar
   - View all active surveyors

2. **Create New Surveyor**
   ```
   Full Name: Ahmed Al Maktoum
   Email: ahmed@company.com
   Phone: +971501234567
   Employee ID: EMP001
   Region: Dubai
   Territory: Downtown, Marina, JBR
   Status: Active
   Expiry Date: 2024-12-31
   ```

3. **Assign Surveys**
   - Select surveys to assign
   - Set quotas (optional)
   - Set deadlines

### Bulk Import Surveyors

1. **Prepare CSV File**
   ```csv
   name,email,phone,employeeId,region,password
   John Doe,john@example.com,+971501111111,EMP001,Dubai,Pass123!
   Jane Smith,jane@example.com,+971502222222,EMP002,Abu Dhabi,Pass456!
   ```

2. **Import Process**
   - Click "Import Surveyors"
   - Upload CSV file
   - Map columns (auto-detected)
   - Review preview
   - Click "Import"

3. **Import Results**
   - Success count
   - Failed rows (with reasons)
   - Download error report

### Surveyor Dashboard

**Real-time Metrics:**
```
┌─────────────────────────────────────────┐
│  Active Surveyors: 45                   │
│  Total Responses Today: 237             │
│  Average per Surveyor: 5.3              │
│  Top Performer: Ahmed (23 responses)    │
└─────────────────────────────────────────┘
```

**Surveyor Performance Table:**

| Surveyor | Assigned | Completed | Pending | Success Rate |
|----------|----------|-----------|---------|--------------|
| Ahmed Al Maktoum | 50 | 48 | 2 | 96% |
| Fatima Hassan | 40 | 35 | 5 | 87.5% |
| Mohammed Ali | 45 | 42 | 3 | 93.3% |

### Managing Surveyor Access

**Extend Expiry:**
1. Select surveyor
2. Click "Extend Access"
3. Choose new expiry date
4. Surveyor receives notification

**Suspend Surveyor:**
1. Select surveyor
2. Click "Suspend"
3. Provide reason
4. Confirm action
- Login disabled immediately
- Existing sessions terminated

**Reactivate Surveyor:**
1. Filter by "Suspended"
2. Select surveyor
3. Click "Reactivate"
4. Access restored

### Surveyor Activity Tracking

**View Activities:**
- Login/logout times
- Surveys accessed
- Responses submitted
- GPS locations
- Time per survey

**Export Activity Report:**
1. Select date range
2. Choose surveyor(s)
3. Select format (PDF, Excel)
4. Download report

---

## Analytics Dashboard

### Overview Dashboard

**Access:** Dashboard (Home)

**Key Metrics:**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│Total Surveys │Total Response│Active Survey.│Completion Rt.│
│     127      │    15,432    │      23      │    87.3%     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Charts & Visualizations:**
1. **Response Trend** (Line chart)
   - Daily/Weekly/Monthly responses
   - Compare multiple surveys

2. **Survey Status** (Pie chart)
   - Draft: 15%
   - Active: 60%
   - Closed: 20%
   - Archived: 5%

3. **Geographic Distribution** (Map)
   - Response locations
   - Heat map overlay
   - Filter by region

4. **Top Performing Surveys** (Bar chart)
   - By response count
   - By completion rate
   - By average time

### Survey-Specific Analytics

**Access:** Analytics > Select Survey

**Response Statistics:**
```
Total Responses: 1,547
Completed: 1,352 (87.4%)
In Progress: 195 (12.6%)

Average Time: 4m 15s
Median Time: 3m 45s
Fastest: 1m 20s
Slowest: 15m 30s

Peak Hours:
  9:00 AM - 11:00 AM: 342 responses
  2:00 PM - 4:00 PM: 289 responses
```

**Question Analytics:**

For each question, view:
- Response distribution
- Average rating
- Most common answer
- Skip rate
- Time spent

**Example - Rating Question:**
```
Q: How satisfied are you with our service?

Distribution:
★★★★★ (5) ████████████████████ 45% (678)
★★★★☆ (4) ██████████████ 34% (521)
★★★☆☆ (3) ████ 13% (198)
★★☆☆☆ (2) ██ 6% (98)
★☆☆☆☆ (1) █ 3% (52)

Average: 4.2 / 5.0
Net Promoter Score (NPS): 42
```

**Example - Multiple Choice:**
```
Q: Which features do you use most? (Select all)

Mobile App      ██████████████████ 72% (1,113)
Web Portal      ████████████ 58% (897)
Email Reports   ████████ 41% (634)
SMS Alerts      ████ 23% (355)
API Access      ██ 12% (185)
```

### Advanced Analytics

**Correlation Analysis:**
- Find relationships between answers
- Example: "Customers who rated service 5★ also rated product quality highly"

**Sentiment Analysis:**
- AI-powered text analysis
- Positive/Negative/Neutral categorization
- Word clouds

**Trend Detection:**
- Identify patterns over time
- Seasonal variations
- Anomaly detection

### Exporting Analytics

**Export Options:**
1. **PDF Report**
   - Executive summary
   - All charts and graphs
   - Formatted for printing

2. **Excel Workbook**
   - Raw data
   - Pivot tables
   - Charts

3. **CSV Data**
   - Response-level data
   - Question-level aggregations

4. **PowerPoint Presentation**
   - Key findings
   - Visual charts
   - Ready to present

**Custom Reports:**
1. Click "Create Custom Report"
2. Select metrics and dimensions
3. Choose visualization types
4. Save template for reuse
5. Schedule automatic generation

---

## System Monitoring

### Health Dashboard

**Access:** Admin > System Health

**Service Status:**
```
┌─────────────────────┬─────────┬──────────┐
│ Service             │ Status  │ Response │
├─────────────────────┼─────────┼──────────┤
│ API Gateway         │ ✓ OK    │ 45ms     │
│ Survey Service      │ ✓ OK    │ 32ms     │
│ Analytics Service   │ ✓ OK    │ 67ms     │
│ Surveyor Service    │ ✓ OK    │ 28ms     │
│ Notification Svc    │ ✓ OK    │ 51ms     │
│ MongoDB             │ ✓ OK    │ 15ms     │
│ Redis               │ ✓ OK    │ 2ms      │
│ Kafka               │ ✓ OK    │ 8ms      │
└─────────────────────┴─────────┴──────────┘
```

**Resource Usage:**
```
CPU: ████████░░░░░░░░░░ 42%
Memory: ██████████████░░░░░░ 68% (5.4 GB / 8 GB)
Disk: ████████░░░░░░░░░░░░ 35% (35 GB / 100 GB)
Network: ↑ 2.3 MB/s  ↓ 1.8 MB/s
```

**Performance Metrics:**
- Average Response Time: 125ms
- 95th Percentile: 450ms
- 99th Percentile: 890ms
- Error Rate: 0.02%

### Alerts & Notifications

**Configure Alerts:**
```
Alert Type: High CPU Usage
Threshold: > 80% for 5 minutes
Notify: admin@company.com, ops@company.com
Actions: Send email, SMS, Slack notification
```

**Common Alerts:**
- Service down
- High error rate
- Slow response times
- Disk space low
- Database connection issues
- Failed backups

### Logs & Audit Trail

**System Logs:**
```
[2024-01-15 10:30:45] INFO  - User john@company.com logged in
[2024-01-15 10:32:12] INFO  - Survey "Retail-Q1" created
[2024-01-15 10:35:20] WARN  - High response time on Analytics Service (850ms)
[2024-01-15 10:40:33] ERROR - Failed to send email notification (SMTP timeout)
[2024-01-15 10:41:05] INFO  - Email notification retry successful
```

**Audit Logs:**
- All user actions tracked
- 365-day retention
- Export capabilities
- Compliance reporting

**Search & Filter Logs:**
1. Select log type
2. Choose date range
3. Filter by user, action, or service
4. Search keywords
5. Export results

---

## Backup & Recovery

### Automated Backups

**Backup Schedule:**
```
Daily Backups: 02:00 AM (UTC)
Weekly Full Backup: Sunday 02:00 AM
Monthly Archive: 1st of month
Retention: 30 days (daily), 90 days (weekly), 1 year (monthly)
```

**What's Backed Up:**
- MongoDB databases
- Redis cache (optional)
- Uploaded files
- Configuration files
- Logs (last 30 days)

### Manual Backup

1. **Navigate to Backup Section**
   - Admin > Backup & Recovery

2. **Create Backup**
   - Click "Create Backup Now"
   - Choose backup type:
     - Full System Backup
     - Database Only
     - Files Only
   - Add description
   - Confirm

3. **Backup Progress**
   - Real-time progress bar
   - Estimated time remaining
   - Backup size

4. **Download Backup**
   - Click backup in list
   - Click "Download"
   - Store securely off-site

### Restore from Backup

**⚠️ Warning:** Restore will overwrite current data. Proceed with caution.

1. **Prepare for Restore**
   - Create current backup first
   - Notify all users (system will be unavailable)
   - Stop all surveyors

2. **Restore Process**
   - Admin > Backup & Recovery
   - Select backup to restore
   - Click "Restore"
   - Verify backup details
   - Type "RESTORE" to confirm
   - Monitor progress

3. **Post-Restore**
   - Verify data integrity
   - Test critical functions
   - Notify users system is available

### Disaster Recovery

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 1 hour (with daily backups)

**Emergency Contacts:**
- Primary: ops@company.com
- Secondary: admin@company.com
- Phone: +971-50-123-4567

---

## Security Management

### Security Dashboard

**Access:** Admin > Security

**Security Score:** 92/100 ✓ Excellent

**Security Checklist:**
- ✓ SSL/TLS enabled
- ✓ 2FA enabled for admins
- ✓ Strong password policy
- ✓ Regular backups
- ✓ Up-to-date software
- ✓ Firewall configured
- ✓ Intrusion detection active
- ⚠ Some users without 2FA

### Access Control

**IP Whitelist:**
```
Allowed IPs:
  192.168.1.0/24 (Office Network)
  203.0.113.5 (VPN)
  198.51.100.10 (Remote Office)

Blocked IPs:
  203.0.113.50 (Suspicious activity)
  198.51.100.25 (Failed login attempts)
```

**API Keys Management:**
1. View all active API keys
2. Revoke compromised keys
3. Set expiration dates
4. Monitor usage

### Security Monitoring

**Failed Login Attempts:**
```
Last 24 hours: 12
  8 - Wrong password
  3 - Invalid email
  1 - Account suspended

Top IPs:
  203.0.113.45 - 5 attempts
  198.51.100.30 - 3 attempts
```

**Unusual Activity Alerts:**
- Multiple logins from different locations
- Large data exports
- Bulk user changes
- After-hours access

### GDPR Compliance

**Data Subject Requests:**
1. **Right to Access**
   - User requests their data
   - Admin exports user data package
   - Delivered within 30 days

2. **Right to Erasure**
   - User requests deletion
   - Admin reviews request
   - Confirms deletion
   - Data removed from backups within 90 days

3. **Data Portability**
   - Export user data in JSON/CSV
   - Machine-readable format

**Compliance Reports:**
- Data processing activities
- Consent records
- Data breach incidents
- Third-party processors

---

## Troubleshooting

### Common Issues

#### Users Cannot Login

**Symptoms:**
- "Invalid credentials" error
- Account locked

**Solutions:**
1. Verify email is correct
2. Check account status (active/suspended)
3. Reset password
4. Check 2FA settings
5. Review firewall/IP restrictions

#### Surveys Not Loading

**Symptoms:**
- Blank page
- Loading spinner indefinitely
- Error messages

**Solutions:**
1. Check browser console for errors
2. Clear browser cache
3. Verify survey is published
4. Check permissions
5. Review server logs

#### Analytics Not Updating

**Symptoms:**
- Stale data
- Missing responses

**Solutions:**
1. Check Analytics Consumer service status
2. Verify Kafka is running
3. Review analytics service logs
4. Manually trigger analytics update
5. Check Redis cache

#### Email Notifications Not Sending

**Symptoms:**
- No emails received
- Failed notification status

**Solutions:**
1. Test SMTP connection
2. Verify email settings
3. Check spam folders
4. Review notification logs
5. Verify email templates

#### Slow Performance

**Symptoms:**
- Pages load slowly
- API timeouts

**Solutions:**
1. Check system resources (CPU, memory)
2. Review database indexes
3. Clear Redis cache
4. Restart services
5. Scale services if needed

### Getting Support

**Documentation:**
- User guides: `/docs/user-guides/`
- API docs: `/docs/api/`
- Video tutorials: Available in system

**Contact Support:**
- Email: support@ousamma.com
- Phone: +971-50-123-4567 (9 AM - 6 PM GST)
- Live Chat: Available in admin panel
- Submit ticket: Admin > Help > Submit Ticket

**Emergency Support:**
- Critical issues: emergency@ousamma.com
- 24/7 hotline: +971-50-999-9999

---

## Best Practices

### Security
1. ✓ Enable 2FA for all admin accounts
2. ✓ Regularly review user access
3. ✓ Monitor failed login attempts
4. ✓ Keep software updated
5. ✓ Use strong, unique passwords
6. ✓ Restrict API access with keys
7. ✓ Regular security audits

### Performance
1. ✓ Monitor system resources
2. ✓ Archive old surveys
3. ✓ Clean up test data
4. ✓ Optimize database queries
5. ✓ Use caching effectively
6. ✓ Schedule heavy operations off-peak

### Data Management
1. ✓ Regular backups (automated)
2. ✓ Test restore procedures
3. ✓ Off-site backup storage
4. ✓ Data retention policies
5. ✓ GDPR compliance
6. ✓ Audit trail maintenance

### User Management
1. ✓ Principle of least privilege
2. ✓ Regular access reviews
3. ✓ Deactivate unused accounts
4. ✓ Strong password policies
5. ✓ User training programs

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Global search |
| `Ctrl + N` | New survey |
| `Ctrl + S` | Save changes |
| `Ctrl + E` | Export data |
| `Ctrl + H` | Help documentation |
| `Alt + D` | Dashboard |
| `Alt + U` | Users |
| `Alt + S` | Surveys |
| `Alt + A` | Analytics |

---

**Admin Manual Version**: 1.0
**Last Updated**: 2025-11-14
**For support**: admin-support@ousamma.com
