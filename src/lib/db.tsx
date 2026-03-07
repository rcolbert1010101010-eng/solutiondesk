import { Issue, Status, Severity, Resolution } from '../types';

const STORAGE_KEY = 'resolution_desk_issues';

const defaultIssues: Issue[] = [
  {
    id: 'ISS-001',
    title: 'VPN connection dropping intermittently for remote users',
    description: 'Multiple remote employees are reporting that their VPN connections drop every 30-45 minutes, forcing them to reconnect. This is impacting productivity across the sales and engineering teams.',
    systemAffected: 'Network / VPN',
    severity: 'High',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen'
  },
  {
    id: 'ISS-002',
    title: 'Email delivery failures to external domains',
    description: 'Outbound emails to Gmail and Yahoo addresses are bouncing with a 550 error. Internal email works fine. Approximately 200 emails have failed in the last 6 hours.',
    systemAffected: 'Email / Exchange',
    severity: 'Critical',
    status: 'Open',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb'
  },
  {
    id: 'ISS-003',
    title: 'Active Directory password reset portal returning 503',
    description: 'The self-service password reset portal is returning a 503 Service Unavailable error. Users who forget their passwords cannot reset them without calling the helpdesk.',
    systemAffected: 'Active Directory / Identity',
    severity: 'High',
    status: 'Open',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ISS-004',
    title: 'Microsoft 365 licenses not provisioning for new hires',
    description: 'New employee accounts created in the last 48 hours have not received Microsoft 365 license assignments. They cannot access Outlook, Teams, or SharePoint.',
    systemAffected: 'Microsoft 365 / Licensing',
    severity: 'Medium',
    status: 'Investigating',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen'
  },
  {
    id: 'ISS-005',
    title: 'ERP system slow performance during month-end close',
    description: 'The SAP ERP system is running significantly slower than normal during the month-end financial close process. Report generation is taking 10x longer than usual.',
    systemAffected: 'ERP / SAP',
    severity: 'High',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Park',
    resolution: 'Identified and killed runaway background jobs that were consuming all available database connections. Increased connection pool size and scheduled maintenance window to add index optimizations.',
    resolutionData: {
      rootCause: 'Runaway background batch jobs consuming all database connection pool slots, causing query queuing and timeouts across the entire ERP system.',
      stepsTaken: '1. Identified high CPU processes in SAP transaction SM50.\n2. Killed 14 runaway background jobs via SM37.\n3. Temporarily increased DB connection pool from 50 to 150.\n4. Coordinated with DBA team to add missing indexes on BSEG table.\n5. Restarted affected application servers in rolling fashion.',
      finalResolution: 'System performance restored to normal within 2 hours. Month-end close completed successfully. Permanent fix applied via index optimization and job scheduling changes.',
      preventionNotes: 'Implemented job scheduling limits to prevent more than 10 concurrent background jobs. Added monitoring alert for connection pool utilization above 80%.',
      resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-006',
    title: 'Customer portal login failures after SSL certificate renewal',
    description: 'Customers are unable to log into the self-service portal. The login page loads but submitting credentials results in a blank page. Issue started immediately after scheduled SSL certificate renewal.',
    systemAffected: 'Web / Customer Portal',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Lisa Torres',
    resolution: 'New SSL certificate had a mismatched intermediate chain. Replaced with correct chain bundle and restarted nginx. Portal fully restored.',
    resolutionData: {
      rootCause: 'The renewed SSL certificate was installed without the correct intermediate CA chain bundle, causing browsers to reject the certificate silently and breaking the authentication POST request.',
      stepsTaken: '1. Confirmed SSL chain issue using openssl s_client command.\n2. Obtained correct intermediate bundle from DigiCert support portal.\n3. Updated nginx ssl_certificate_chain directive.\n4. Tested on staging environment first.\n5. Deployed to production and performed zero-downtime nginx reload.\n6. Verified login flow from 3 different browsers and mobile.',
      finalResolution: 'Portal login fully restored within 45 minutes of diagnosis. Zero customer data was at risk. Affected approximately 340 customers during the 3-hour outage window.',
      preventionNotes: 'Created SSL renewal checklist that includes chain validation step. Added automated SSL chain verification to monthly monitoring script. Set calendar reminder 30 days before next renewal.',
      resolvedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-007',
    title: 'Network printer fleet offline after VLAN reconfiguration',
    description: 'All 23 network printers across floors 3-7 went offline following a planned VLAN reconfiguration last night. Users cannot print and the printer management console shows all devices as unreachable.',
    systemAffected: 'Printing / Hardware',
    severity: 'Medium',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'David Kim',
    resolution: 'DHCP scope for the new printer VLAN was not created. Created scope 192.168.40.0/24, printers obtained new IPs and came online. Updated print server port configurations.',
    resolutionData: {
      rootCause: 'The DHCP server was not updated with a new scope for the printer VLAN (VLAN 40) during the reconfiguration, leaving all printers unable to obtain IP addresses via DHCP.',
      stepsTaken: '1. Pinged printer management IPs — all timed out confirming no IP assignment.\n2. Checked DHCP server scopes — confirmed VLAN 40 scope was missing.\n3. Created new DHCP scope 192.168.40.0/24 with correct gateway and DNS.\n4. Power cycled 5 printers to test — all obtained IPs successfully.\n5. Updated 23 print server ports with new IP addresses.\n6. Verified test prints from each floor.',
      finalResolution: 'All 23 printers back online within 90 minutes. Print services fully restored. No hardware damage or data loss.',
      preventionNotes: 'Updated VLAN reconfiguration runbook to include DHCP scope verification as a mandatory pre-flight check. Added printer connectivity to post-change validation checklist.',
      resolvedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-008',
    title: 'Backup jobs failing silently for 3 weeks',
    description: 'Discovered that nightly backup jobs for the finance file server have been completing with exit code 0 but producing corrupt archive files. The issue went undetected because the monitoring only checked exit codes.',
    systemAffected: 'Backup / Storage',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Marcus Webb',
    resolution: 'A disk controller firmware bug was causing silent write errors. Updated firmware, replaced two suspect drives, ran full verified backup. Implemented integrity checking on all future backup jobs.',
    resolutionData: {
      rootCause: 'A known firmware bug in the LSI RAID controller (firmware v3.220.75) caused write operations to report success while silently skipping sectors on drives approaching wear threshold, producing corrupt archives.',
      stepsTaken: '1. Attempted restore test — confirmed archives were corrupt.\n2. Identified 2 drives with high reallocated sector counts via SMART data.\n3. Cross-referenced controller firmware version with vendor advisory — confirmed affected version.\n4. Scheduled emergency maintenance window.\n5. Updated controller firmware to v3.460.100.\n6. Replaced 2 degraded drives with new 4TB SAS drives.\n7. Rebuilt RAID array (12 hours).\n8. Ran first full backup with integrity verification enabled.\n9. Successfully tested restore of 50 random files.',
      finalResolution: 'Backup integrity restored. All future backups include SHA256 checksum verification. Escalated to management regarding the 3-week gap — determined no data was permanently lost as source files were intact.',
      preventionNotes: 'Implemented weekly restore test automation. Added backup integrity verification (not just exit codes) to monitoring. Set up SMART monitoring alerts for drive health. Created firmware advisory review process.',
      resolvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-009',
    title: 'Two-factor authentication codes rejected for all users',
    description: 'All users attempting to log into corporate systems are having their 2FA TOTP codes rejected. This is affecting 100% of staff and has completely blocked access to all corporate applications.',
    systemAffected: 'Security / Firewall',
    severity: 'Critical',
    status: 'Resolved',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Sarah Chen',
    resolution: 'NTP server had drifted 4 minutes out of sync causing all TOTP codes to be invalid. Resynced NTP on authentication server. All logins restored immediately.',
    resolutionData: {
      rootCause: 'The NTP daemon on the primary authentication server had crashed 6 hours prior, causing system time to drift 4 minutes and 12 seconds, invalidating all time-based TOTP codes which have a 30-second window.',
      stepsTaken: '1. Confirmed issue was system-wide, not user-specific.\n2. Checked auth server logs — saw timestamp discrepancies.\n3. Ran "date" command on auth server — confirmed 4:12 time drift.\n4. Checked ntpd service — found it crashed with OOM error.\n5. Force-synced time: ntpdate -u pool.ntp.org.\n6. Restarted ntpd service.\n7. Verified time sync within 0.1 seconds.\n8. Tested 2FA login — immediately successful.',
      finalResolution: 'All 2FA logins restored within 8 minutes of diagnosis. Total outage duration was approximately 6 hours during overnight period, minimizing business impact.',
      preventionNotes: 'Added NTP daemon health check to monitoring with PagerDuty alert. Configured ntpd to restart automatically on failure. Added secondary NTP server as fallback. Added time drift monitoring alert (threshold: >10 seconds).',
      resolvedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'ISS-010',
    title: 'Database query performance degradation on reporting module',
    description: 'The reporting module is timing out for any report covering more than 30 days of data. Queries that previously ran in 2 seconds are now taking over 5 minutes.',
    systemAffected: 'Database / SQL',
    severity: 'High',
    status: 'Closed',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'James Park',
    resolution: 'Statistics on the Orders and OrderItems tables had not been updated in 8 months due to a misconfigured maintenance job. Rebuilt all indexes and updated statistics. Query time returned to baseline.',
    resolutionData: {
      rootCause: 'SQL Server query optimizer was using outdated table statistics (8 months old) to generate execution plans, causing full table scans on a 47-million row Orders table instead of using available indexes.',
      stepsTaken: '1. Captured slow query using SQL Server Profiler.\n2. Ran EXPLAIN/execution plan — showed full table scan on Orders (47M rows).\n3. Checked index fragmentation — found 94% fragmentation on clustered index.\n4. Checked statistics last updated date — confirmed 8 months stale.\n5. Investigated maintenance job — found SQL Agent job had been disabled during a server migration.\n6. Ran UPDATE STATISTICS on Orders and OrderItems tables.\n7. Rebuilt fragmented indexes during low-traffic window.\n8. Re-enabled and tested maintenance job.',
      finalResolution: 'Query performance restored to 1.8 seconds average. Reporting module fully functional. Root cause of disabled maintenance job addressed.',
      preventionNotes: 'Re-enabled weekly index maintenance and statistics update jobs. Added SQL Agent job health monitoring. Created monthly DBA checklist for database health review.',
      resolvedAt: new Date(Date.now() - 43 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

function loadIssues(): Issue[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultIssues));
  return defaultIssues;
}

function saveIssues(issues: Issue[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

export function getAllIssues(): Issue[] {
  return loadIssues();
}

export function getIssueById(id: string): Issue | undefined {
  return loadIssues().find(i => i.id === id);
}

export function createIssue(data: Omit<Issue, 'id' | 'createdAt'>): Issue {
  const issues = loadIssues();
  const newId = `ISS-${String(issues.length + 1).padStart(3, '0')}`;
  const newIssue: Issue = {
    ...data,
    id: newId,
    createdAt: new Date().toISOString()
  };
  issues.unshift(newIssue);
  saveIssues(issues);
  return newIssue;
}

export function updateIssue(id: string, data: Partial<Issue>): Issue | undefined {
  const issues = loadIssues();
  const idx = issues.findIndex(i => i.id === id);
  if (idx === -1) return undefined;
  issues[idx] = { ...issues[idx], ...data };
  saveIssues(issues);
  return issues[idx];
}

export function deleteIssue(id: string): boolean {
  const issues = loadIssues();
  const filtered = issues.filter(i => i.id !== id);
  if (filtered.length === issues.length) return false;
  saveIssues(filtered);
  return true;
}

export function getResolvedIssues(): Issue[] {
  return loadIssues().filter(i => i.status === 'Resolved' || i.status === 'Closed');
}
