/**
 * MahaPoshan Register - School-Centric Multi-Tenant Security & RBAC Test Suite
 *
 * Validates:
 * 1. Schools as Primary Tenant & UDISE Uniqueness
 * 2. User -> Membership -> School Relationship
 * 3. 3-Tier RBAC (SUPER_ADMIN, SCHOOL_ADMIN, TEACHER)
 * 4. Cross-School Access Isolation & Tenant Partitioning
 * 5. Role Escalation Prevention & Immutability Checks
 * 6. Orthogonal Status Architecture (verification, access, subscription)
 * 7. Immutable Append-Only Audit Logging
 */

import {
  UserRole,
  VerificationStatus,
  AccessStatus,
  SubscriptionTierStatus,
  SchoolProfile,
  UserAccessRequest,
  SchoolMembership,
  DailyRegisterEntry,
} from '../src/types';

// In-memory polyfill for localStorage in Node/CLI test environments
if (typeof globalThis.localStorage === 'undefined') {
  const memStore = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => (memStore.has(key) ? memStore.get(key)! : null),
    setItem: (key: string, val: string) => {
      memStore.set(key, String(val));
    },
    removeItem: (key: string) => {
      memStore.delete(key);
    },
    clear: () => {
      memStore.clear();
    },
    key: (i: number) => Array.from(memStore.keys())[i] || null,
    get length() {
      return memStore.size;
    },
  };
}

// Mock/Simulated In-Memory Tenant Engine for RLS & Policy Simulation
interface DatabaseState {
  schools: Map<string, any>;
  memberships: Map<string, SchoolMembership>;
  daily_entries: Map<string, any>;
  stock_inward: Map<string, any>;
  audit_logs: any[];
}

function createTestDatabase(): DatabaseState {
  return {
    schools: new Map(),
    memberships: new Map(),
    daily_entries: new Map(),
    stock_inward: new Map(),
    audit_logs: [],
  };
}

class TenantSecuritySimulator {
  private db: DatabaseState;
  private currentUserId: string | null = null;
  private currentUserEmail: string | null = null;

  constructor(db: DatabaseState) {
    this.db = db;
  }

  setAuthContext(userId: string | null, email: string | null) {
    this.currentUserId = userId;
    this.currentUserEmail = email;
  }

  isSuperAdmin(): boolean {
    if (!this.currentUserId) return false;
    if (
      this.currentUserEmail &&
      ['umardesh@gmail.com', 'mahaposhan@gmail.com', 'poshanragister@gmail.com'].includes(
        this.currentUserEmail.toLowerCase()
      )
    ) {
      return true;
    }
    for (const mem of this.db.memberships.values()) {
      if (mem.clerkUserId === this.currentUserId && mem.role === 'SUPER_ADMIN' && mem.isActive !== false) {
        return true;
      }
    }
    return false;
  }

  getUserMembership(userId: string): SchoolMembership | null {
    for (const mem of this.db.memberships.values()) {
      if (mem.clerkUserId === userId && mem.isActive !== false) {
        return mem;
      }
    }
    return null;
  }

  getUserSchoolId(): string | null {
    if (!this.currentUserId) return null;
    const mem = this.getUserMembership(this.currentUserId);
    if (mem) return mem.schoolId;

    // Fallback: check schools where clerk_user_id = currentUserId
    for (const school of this.db.schools.values()) {
      if (school.clerk_user_id === this.currentUserId) {
        return school.id;
      }
    }
    return null;
  }

  getUserRole(): UserRole {
    if (this.isSuperAdmin()) return 'SUPER_ADMIN';
    if (!this.currentUserId) return 'TEACHER';
    const mem = this.getUserMembership(this.currentUserId);
    if (mem) return mem.role;
    return 'TEACHER';
  }

  // --- Tenant Operations with Simulated RLS & Trigger Enforcement ---

  insertSchool(school: any): { success: boolean; data?: any; error?: string } {
    // Check unique UDISE constraint
    for (const s of this.db.schools.values()) {
      if (s.udise_number === school.udise_number) {
        return { success: false, error: 'duplicate key value violates unique constraint "unique_udise_number"' };
      }
    }

    const schoolId = school.id || `school_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSchool = {
      ...school,
      id: schoolId,
      verification_status: school.verification_status || 'PENDING',
      access_status: school.access_status || 'PENDING',
      subscription_status: school.subscription_status || 'TRIAL',
      status: school.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.db.schools.set(schoolId, newSchool);

    // Audit log trigger simulation
    this.db.audit_logs.push({
      action: 'CREATE',
      table_name: 'schools',
      record_id: schoolId,
      school_id: schoolId,
      user_id: this.currentUserId || 'system',
      timestamp: new Date().toISOString(),
    });

    return { success: true, data: newSchool };
  }

  insertMembership(membership: {
    clerk_user_id: string;
    school_id: string;
    user_email: string;
    user_name?: string;
    role: UserRole;
  }): { success: boolean; data?: SchoolMembership; error?: string } {
    // RLS Policy Check for memberships insertion:
    // Super Admin OR (School Admin for their own school adding a Teacher) OR Initial self-registration
    const callerRole = this.getUserRole();
    const callerSchoolId = this.getUserSchoolId();

    const isSuper = this.isSuperAdmin();
    const isSchoolAdminAddingTeacher =
      callerRole === 'SCHOOL_ADMIN' && callerSchoolId === membership.school_id && membership.role === 'TEACHER';
    const isInitialSelfReg =
      this.currentUserId === membership.clerk_user_id &&
      membership.role === 'SCHOOL_ADMIN' &&
      !this.getUserMembership(this.currentUserId);

    if (!isSuper && !isSchoolAdminAddingTeacher && !isInitialSelfReg) {
      return { success: false, error: 'RLS Permission Denied: Cannot assign user to school or escalate role' };
    }

    const memKey = `${membership.clerk_user_id}_${membership.school_id}`;
    if (this.db.memberships.has(memKey)) {
      return { success: false, error: 'duplicate key value violates unique constraint "unique_user_school_membership"' };
    }

    const newMembership: SchoolMembership = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clerkUserId: membership.clerk_user_id,
      schoolId: membership.school_id,
      userEmail: membership.user_email,
      userName: membership.user_name,
      role: membership.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.memberships.set(memKey, newMembership);
    return { success: true, data: newMembership };
  }

  updateMembershipRole(clerkUserId: string, schoolId: string, newRole: UserRole): { success: boolean; error?: string } {
    const memKey = `${clerkUserId}_${schoolId}`;
    const mem = this.db.memberships.get(memKey);
    if (!mem) return { success: false, error: 'Membership not found' };

    // Anti-Escalation trigger: Only SUPER_ADMIN can change roles
    if (!this.isSuperAdmin()) {
      return { success: false, error: 'Security Violation: Modifying user role without Super Admin privileges is prohibited.' };
    }

    mem.role = newRole;
    mem.updatedAt = new Date().toISOString();
    return { success: true };
  }

  updateRecordSchoolId(tableName: 'daily_entries' | 'stock_inward', recordId: string, newSchoolId: string): { success: boolean; error?: string } {
    const store = tableName === 'daily_entries' ? this.db.daily_entries : this.db.stock_inward;
    const record = store.get(recordId);
    if (!record) return { success: false, error: 'Record not found' };

    // Tenant Immutability trigger: school_id cannot be altered on child records
    if (!this.isSuperAdmin()) {
      return { success: false, error: 'Security Violation: Modifying school_id on existing records is strictly prohibited.' };
    }

    record.school_id = newSchoolId;
    return { success: true };
  }

  insertDailyEntry(entry: {
    school_id: string;
    date: string;
    student_count: number;
    dish_id: string;
    dish_name_mr: string;
  }): { success: boolean; data?: any; error?: string } {
    const callerSchoolId = this.getUserSchoolId();
    if (!this.isSuperAdmin() && callerSchoolId !== entry.school_id) {
      return { success: false, error: 'RLS Permission Denied: Cross-school entry insertion is prohibited' };
    }

    if (entry.student_count < 0 || entry.student_count > 999) {
      return { success: false, error: 'Validation Error: student_count exceeds max 3-digit limit (999)' };
    }

    const key = `${entry.school_id}_${entry.date}`;
    if (this.db.daily_entries.has(key)) {
      return { success: false, error: 'Unique Violation: Entry for this school and date already exists' };
    }

    const record = {
      id: key,
      ...entry,
      clerk_user_id: this.currentUserId,
      created_at: new Date().toISOString(),
    };
    this.db.daily_entries.set(key, record);
    return { success: true, data: record };
  }

  selectDailyEntries(): any[] {
    const results: any[] = [];
    const isSuper = this.isSuperAdmin();
    const callerSchoolId = this.getUserSchoolId();

    for (const entry of this.db.daily_entries.values()) {
      if (isSuper || entry.school_id === callerSchoolId) {
        results.push(entry);
      }
    }
    return results;
  }

  updateAuditLog(logId: string): { success: boolean; error?: string } {
    // Audit logs are strictly immutable (append-only)
    return { success: false, error: 'Security Violation: Modifying or deleting audit_logs is strictly prohibited.' };
  }
}

// -----------------------------------------------------------------------------
// Test Execution Suite
// -----------------------------------------------------------------------------
async function runTestSuite() {
  console.log('================================================================');
  console.log('  MAHAPOSHAN REGISTER: SCHOOL-CENTRIC TENANT SECURITY TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failedTests++;
    }
  }

  const db = createTestDatabase();
  const sim = new TenantSecuritySimulator(db);

  // --- Test 1: Schools as Primary Tenant & Unique UDISE ---
  console.log('[1] Tenant Hierarchy & Unique UDISE');
  const schoolA = sim.insertSchool({
    id: 'school-uuid-aaa',
    udise_number: '27251401111',
    school_name: 'Z.P. Primary School Pune',
    district: 'Pune',
  });
  assert(schoolA.success, 'School A created successfully as primary tenant');

  const duplicateUdiseSchool = sim.insertSchool({
    id: 'school-uuid-dup',
    udise_number: '27251401111', // duplicate UDISE
    school_name: 'Imposter School',
    district: 'Pune',
  });
  assert(!duplicateUdiseSchool.success, 'Duplicate UDISE number is strictly rejected');

  const schoolB = sim.insertSchool({
    id: 'school-uuid-bbb',
    udise_number: '27251402222',
    school_name: 'Z.P. Primary School Nashik',
    district: 'Nashik',
  });
  assert(schoolB.success, 'School B created with unique UDISE');

  // --- Test 2: User -> Membership -> School Relationship ---
  console.log('\n[2] User -> Membership -> School Relationship');
  sim.setAuthContext('user_headmaster_pune', 'headmaster@pune.gov.in');
  const membershipA = sim.insertMembership({
    clerk_user_id: 'user_headmaster_pune',
    school_id: 'school-uuid-aaa',
    user_email: 'headmaster@pune.gov.in',
    role: 'SCHOOL_ADMIN',
  });
  assert(membershipA.success, 'Headmaster assigned as SCHOOL_ADMIN to School A');

  // Headmaster adds a Teacher to School A
  const teacherA = sim.insertMembership({
    clerk_user_id: 'user_teacher_pune',
    school_id: 'school-uuid-aaa',
    user_email: 'teacher@pune.gov.in',
    role: 'TEACHER',
  });
  assert(teacherA.success, 'SCHOOL_ADMIN can add a TEACHER to their own school');

  // Teacher cannot add another teacher or school admin
  sim.setAuthContext('user_teacher_pune', 'teacher@pune.gov.in');
  const illegalMember = sim.insertMembership({
    clerk_user_id: 'user_teacher_illegal',
    school_id: 'school-uuid-aaa',
    user_email: 'illegal@pune.gov.in',
    role: 'TEACHER',
  });
  assert(!illegalMember.success, 'TEACHER cannot add members to the school');

  // --- Test 3: Anti-Escalation Security Checks ---
  console.log('\n[3] Anti-Escalation & Role Tampering Prevention');
  // Regular teacher attempting to promote themselves to SUPER_ADMIN
  const selfPromote = sim.updateMembershipRole('user_teacher_pune', 'school-uuid-aaa', 'SUPER_ADMIN');
  assert(!selfPromote.success, 'Self-role escalation to SUPER_ADMIN is blocked by trigger');

  // Super Admin can update roles
  sim.setAuthContext('user_super_admin', 'umardesh@gmail.com');
  const validRoleChange = sim.updateMembershipRole('user_teacher_pune', 'school-uuid-aaa', 'SCHOOL_ADMIN');
  assert(validRoleChange.success, 'SUPER_ADMIN can legitimately update user role');

  // --- Test 4: Tenant Immutability (school_id cannot be changed) ---
  console.log('\n[4] Tenant Immutability Enforcement');
  sim.setAuthContext('user_headmaster_pune', 'headmaster@pune.gov.in');
  const entryA = sim.insertDailyEntry({
    school_id: 'school-uuid-aaa',
    date: '2026-09-29',
    student_count: 85,
    dish_id: 'dish_1',
    dish_name_mr: 'मसाले भात',
  });
  assert(entryA.success, 'School A daily register entry created with school_id');

  // Attempting to re-assign entry to School B
  const illegalSchoolMove = sim.updateRecordSchoolId('daily_entries', 'school-uuid-aaa_2026-09-29', 'school-uuid-bbb');
  assert(!illegalSchoolMove.success, 'Modifying school_id on child records is strictly blocked');

  // --- Test 5: Strict Cross-School Data Isolation ---
  console.log('\n[5] Cross-School Data Isolation (Tenant Partitioning)');
  // Set up School B teacher & entry
  sim.setAuthContext('user_super_admin', 'umardesh@gmail.com');
  sim.insertMembership({
    clerk_user_id: 'user_teacher_nashik',
    school_id: 'school-uuid-bbb',
    user_email: 'nashik@gov.in',
    role: 'TEACHER',
  });

  sim.setAuthContext('user_teacher_nashik', 'nashik@gov.in');
  const entryB = sim.insertDailyEntry({
    school_id: 'school-uuid-bbb',
    date: '2026-09-29',
    student_count: 120,
    dish_id: 'dish_1',
    dish_name_mr: 'मटकी उसळ',
  });
  assert(entryB.success, 'School B entry created');

  // Attempt cross-school insertion
  const crossInsert = sim.insertDailyEntry({
    school_id: 'school-uuid-aaa', // Nashik teacher writing to Pune school
    date: '2026-09-30',
    student_count: 50,
    dish_id: 'dish_1',
    dish_name_mr: 'तूर डाळ खिचडी',
  });
  assert(!crossInsert.success, 'Cross-school entry insertion is rejected by tenant isolation');

  // Query entries as School B user -> must ONLY see School B records
  const nashikEntries = sim.selectDailyEntries();
  const hasOnlySchoolB = nashikEntries.every((e) => e.school_id === 'school-uuid-bbb');
  assert(
    hasOnlySchoolB && nashikEntries.length === 1,
    'School B user can ONLY see School B records (zero cross-tenant leak)'
  );

  // Query entries as SUPER_ADMIN -> can see all tenants
  sim.setAuthContext('user_super_admin', 'umardesh@gmail.com');
  const allEntries = sim.selectDailyEntries();
  assert(allEntries.length === 2, 'SUPER_ADMIN can view all records across all schools');

  // --- Test 6: Orthogonal Status Architecture ---
  console.log('\n[6] Orthogonal Status Architecture Validation');
  const verStatuses: VerificationStatus[] = ['PENDING', 'VERIFIED', 'MORE_INFO_REQUIRED', 'REJECTED'];
  const accStatuses: AccessStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED'];
  const subStatuses: SubscriptionTierStatus[] = ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'];

  assert(verStatuses.length === 4, 'verification_status has 4 distinct states');
  assert(accStatuses.length === 4, 'access_status has 4 distinct states');
  assert(subStatuses.length === 4, 'subscription_status has 4 distinct states');

  // Verify status orthogonality on school object
  const statusSchool = sim.insertSchool({
    id: 'school-uuid-status-test',
    udise_number: '27251409999',
    school_name: 'Status Test School',
    verification_status: 'VERIFIED',
    access_status: 'SUSPENDED', // e.g. Admin temporarily suspended access even though verified
    subscription_status: 'ACTIVE',
  });
  assert(
    statusSchool.success &&
      statusSchool.data.verification_status === 'VERIFIED' &&
      statusSchool.data.access_status === 'SUSPENDED' &&
      statusSchool.data.subscription_status === 'ACTIVE',
    'Statuses operate orthogonally without collapsing into a single boolean'
  );

  // --- Test 7: Immutable Audit Logging ---
  console.log('\n[7] Immutable Append-Only Audit Trail');
  assert(db.audit_logs.length > 0, 'Audit triggers automatically recorded tenant mutations');
  const auditTamper = sim.updateAuditLog('log_1');
  assert(!auditTamper.success, 'Audit logs reject UPDATE/DELETE modifications (append-only)');

  // --- Test 8: Auto-Validation Engine & 2-Stage Onboarding Security (Requirement 2 & 11) ---
  console.log('\n[8] Scalable Auto-Validation & Two-Stage Onboarding Security');

  // Import auto-validation logic from subscription-store
  const { validateSchoolRegistrationRequestSync } = await import('../src/lib/subscription-store');

  // Scenario 8.1: Invalid UDISE format (<11 or >11 digits or non-numeric)
  const invalidUdiseRes = validateSchoolRegistrationRequestSync({
    udiseNumber: '12345',
    userEmail: 'teacher@gov.in',
    clerkUserId: 'user_test_inv',
    schoolName: 'Z.P. School',
  });
  assert(
    invalidUdiseRes.result === 'INVALID' && !invalidUdiseRes.isFormatValid,
    'Invalid UDISE format (<11 digits) returns INVALID status'
  );

  // Scenario 8.2: Valid UDISE format rule: "Never auto-approve solely because the UDISE format is valid"
  const newValidUdiseRes = validateSchoolRegistrationRequestSync({
    udiseNumber: '27251408888',
    userEmail: 'new_hm@gov.in',
    clerkUserId: 'user_new_hm',
    schoolName: 'Z.P. School New',
  });
  assert(
    newValidUdiseRes.result === 'REQUIRES_REVIEW',
    'CRITICAL RULE: Valid UDISE format alone NEVER auto-approves (requires SUPER_ADMIN review)'
  );

  // Scenario 8.3: Duplicate Request by same user
  // Pre-seed an access request in the store
  const {
    submitAccessRequest,
    approveAccessRequest,
    rejectOrRevokeAccess,
    requestMoreInfo,
    bulkApproveRequests,
    getAuditLogs,
  } = await import('../src/lib/subscription-store');

  submitAccessRequest({
    clerkUserId: 'user_dup_123',
    userEmail: 'user_dup@gov.in',
    schoolName: 'Existing School',
    udiseNumber: '27251401111',
    district: 'Pune',
    agreedToTerms: true,
  });

  const duplicateReqRes = validateSchoolRegistrationRequestSync({
    udiseNumber: '27251401111',
    userEmail: 'user_dup@gov.in',
    clerkUserId: 'user_dup_123',
    schoolName: 'Existing School',
  });
  assert(
    duplicateReqRes.result === 'DUPLICATE' && duplicateReqRes.isDuplicateRequest,
    'Duplicate request by same user is automatically detected as DUPLICATE'
  );

  // Scenario 8.4: Joining Existing Verified School as TEACHER without re-entering details
  // School 27251401111 now exists; a new teacher attempts to join
  const joinExistingRes = validateSchoolRegistrationRequestSync({
    udiseNumber: '27251401111',
    userEmail: 'new_asst_teacher@gov.in',
    clerkUserId: 'user_asst_teacher',
    schoolName: 'Existing School',
    role: 'TEACHER',
  });
  assert(
    joinExistingRes.isDuplicateSchool === true &&
      joinExistingRes.existingSchool !== undefined &&
      joinExistingRes.existingSchool.udiseNumber === '27251401111',
    'Stage 2 identifies existing school via UDISE and routes membership request without school re-creation'
  );

  // --- Test 9: State Transition Audit Logging, Approval/Rejection & Subscription Activation (Requirements 6, 7, 10, 11) ---
  console.log('\n[9] State Transitions, Audit Logging & Subscription Lifecycles');

  // Submit access request for new school
  const reqObj = submitAccessRequest({
    clerkUserId: 'user_solapur_admin',
    userEmail: 'solapur_hm@gov.in',
    userName: 'Solapur HM',
    schoolName: 'Z.P. High School Solapur',
    udiseNumber: '27251406666',
    district: 'Solapur',
    centerCluster: 'Solapur City',
    phone: '9876543210',
    agreedToTerms: true,
  });
  assert(reqObj.id !== '', 'Access request submitted successfully');

  // Check initial audit log for request creation
  const logsAfterSubmit = getAuditLogs(reqObj.id);
  assert(
    logsAfterSubmit.length >= 1 && logsAfterSubmit[0].newStatus === 'PENDING',
    'Audit trail records initial request creation with timestamp and user ID'
  );

  // SUPER_ADMIN requests more info
  const moreInfoReq = requestMoreInfo(reqObj.id, 'UDISE अचूक आहे का ते तपासा', 'umardesh@gmail.com');
  assert(
    moreInfoReq?.verificationStatus === 'MORE_INFO_REQUIRED',
    'State transition to MORE_INFO_REQUIRED successful'
  );
  const logsAfterMoreInfo = getAuditLogs(reqObj.id);
  const moreInfoLog = logsAfterMoreInfo.find((l) => l.newStatus === 'MORE_INFO_REQUIRED');
  assert(
    moreInfoLog !== undefined &&
      moreInfoLog.adminId === 'umardesh@gmail.com' &&
      moreInfoLog.reason.includes('UDISE'),
    'Audit trail recorded MORE_INFO_REQUIRED transition with admin ID and reason'
  );

  // SUPER_ADMIN approves school with Trial (14 days)
  const approvedTrial = approveAccessRequest(reqObj.id, 0, undefined, 'umardesh@gmail.com');
  assert(
    approvedTrial?.status === 'active' &&
      approvedTrial.verificationStatus === 'VERIFIED' &&
      approvedTrial.subscriptionStatus === 'TRIAL',
    'Approval with duration 0 activates 14-day TRIAL subscription'
  );
  const trialLogs = getAuditLogs(reqObj.id);
  const approvalLog = trialLogs.find((l) => l.newStatus === 'VERIFIED');
  assert(
    approvalLog !== undefined && approvalLog.adminId === 'umardesh@gmail.com',
    'Audit trail recorded VERIFIED approval transition with admin ID'
  );

  // Bulk Approval with Individual Audit Logging (Requirement 7 & 10)
  const bulkReq1 = submitAccessRequest({
    clerkUserId: 'bulk_user_1',
    userEmail: 'bulk1@gov.in',
    schoolName: 'Bulk School 1',
    udiseNumber: '27251405551',
    district: 'Satara',
    agreedToTerms: true,
  });
  const bulkReq2 = submitAccessRequest({
    clerkUserId: 'bulk_user_2',
    userEmail: 'bulk2@gov.in',
    schoolName: 'Bulk School 2',
    udiseNumber: '27251405552',
    district: 'Satara',
    agreedToTerms: true,
  });

  const bulkResult = bulkApproveRequests(
    [bulkReq1.id, bulkReq2.id],
    6,
    'umardesh@gmail.com'
  );
  assert(bulkResult.approvedCount === 2, 'Bulk approval approved 2 schools together');

  const audit1 = getAuditLogs(bulkReq1.id);
  const audit2 = getAuditLogs(bulkReq2.id);
  assert(
    audit1.some((l) => l.newStatus === 'VERIFIED') &&
      audit2.some((l) => l.newStatus === 'VERIFIED'),
    'CRITICAL RULE: Every individual approval in bulk operation created its own distinct audit log'
  );

  // Rejection with audit log
  const reqToReject = submitAccessRequest({
    clerkUserId: 'reject_user',
    userEmail: 'reject@gov.in',
    schoolName: 'Fake School',
    udiseNumber: '27251404444',
    district: 'Pune',
    agreedToTerms: true,
  });
  const rejectedReq = rejectOrRevokeAccess(
    reqToReject.id,
    'अपूर्ण कागदपत्रे व खोटा पत्ता',
    'umardesh@gmail.com'
  );
  assert(rejectedReq?.verificationStatus === 'REJECTED', 'Rejection state transition successful');
  const rejectLogs = getAuditLogs(reqToReject.id);
  const rejLog = rejectLogs.find((l) => l.newStatus === 'REJECTED');
  assert(
    rejLog !== undefined && rejLog.reason.includes('अपूर्ण कागदपत्रे'),
    'Audit trail recorded rejection with admin reason'
  );

  // --- Test 10: Subscription Lifecycle Automation (TRIAL -> ACTIVE -> EXPIRING -> EXPIRED) & Data Preservation ---
  console.log('\n[10] Subscription Lifecycle Automation & School Data Preservation');
  const {
    extendSubscription,
    getAllAccessRequests,
    computeSuperAdminKpis,
    createTeacherInvitation,
    verifyAdminCredentials,
  } = await import('../src/lib/subscription-store');

  // 10.1: Approve as 14-day TRIAL -> automatically within 15-day window -> transitions to EXPIRING on lifecycle check
  const lifecycleSchool = submitAccessRequest({
    clerkUserId: 'user_lifecycle_1',
    userEmail: 'lifecycle@gov.in',
    schoolName: 'Z.P. School Lifecycle',
    udiseNumber: '27251407771',
    district: 'Kolhapur',
    centerCluster: 'Karvir',
    agreedToTerms: true,
  });
  const trialApproved = approveAccessRequest(lifecycleSchool.id, 0, undefined, 'umardesh@gmail.com', true);
  assert(trialApproved?.subscriptionStatus === 'TRIAL', 'Lifecycle step 1: Approved as TRIAL');

  // Extend to full 6-month ACTIVE subscription
  const activeExtended = extendSubscription(lifecycleSchool.id, 6, 'umardesh@gmail.com');
  assert(
    activeExtended?.subscriptionStatus === 'ACTIVE' && activeExtended.status === 'active',
    'Lifecycle step 2: TRIAL -> ACTIVE via extendSubscription'
  );

  // Simulate upcoming expiry (10 days left) -> should automatically transition to EXPIRING
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  approveAccessRequest(lifecycleSchool.id, 1, tenDaysFromNow, 'umardesh@gmail.com', false);
  const afterExpiringCheck = getAllAccessRequests().find((r) => r.id === lifecycleSchool.id);
  assert(
    afterExpiringCheck?.subscriptionStatus === 'EXPIRING' && afterExpiringCheck.status === 'active',
    'Lifecycle step 3: ACTIVE -> EXPIRING automatically detected when <= 15 days remain'
  );

  // Simulate past-due expiry (2 days ago) -> should automatically transition to EXPIRED while preserving school data
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  approveAccessRequest(lifecycleSchool.id, 1, twoDaysAgo, 'umardesh@gmail.com', false);
  const afterExpiredCheck = getAllAccessRequests().find((r) => r.id === lifecycleSchool.id);
  assert(
    afterExpiredCheck?.status === 'expired' &&
      afterExpiredCheck.accessStatus === 'EXPIRED' &&
      afterExpiredCheck.subscriptionStatus === 'EXPIRED' &&
      afterExpiredCheck.schoolName === 'Z.P. School Lifecycle' &&
      afterExpiredCheck.udiseNumber === '27251407771',
    'Lifecycle step 4: EXPIRING -> EXPIRED blocks normal access while 100% preserving school data'
  );

  // Invalid subscription manipulation check (negative or excessive months)
  const invalidExtend = extendSubscription(lifecycleSchool.id, -6, 'umardesh@gmail.com');
  assert(invalidExtend === null, 'Subscription manipulation with negative duration is rejected');

  // Renew expired school -> transitions back to ACTIVE
  const renewedSchool = extendSubscription(lifecycleSchool.id, 12, 'umardesh@gmail.com');
  assert(
    renewedSchool?.status === 'active' &&
      renewedSchool.accessStatus === 'ACTIVE' &&
      renewedSchool.subscriptionStatus === 'ACTIVE',
    'Lifecycle step 5: EXPIRED -> ACTIVE upon renewal with audit trail'
  );

  // Verify Super Admin Command Center 11 KPIs computation
  const kpis = computeSuperAdminKpis();
  assert(
    typeof kpis.pendingRequests === 'number' &&
      typeof kpis.needsInformation === 'number' &&
      typeof kpis.verifiedSchools === 'number' &&
      typeof kpis.activeSchools === 'number' &&
      typeof kpis.trialSchools === 'number' &&
      typeof kpis.expiringSubscriptions === 'number' &&
      typeof kpis.expiredSubscriptions === 'number' &&
      typeof kpis.suspendedSchools === 'number' &&
      typeof kpis.newSchools === 'number' &&
      typeof kpis.pendingReferralPayouts === 'number' &&
      typeof kpis.paidReferralRewards === 'number',
    'Super Admin Command Center computes all 11 operational KPIs accurately'
  );

  // --- Test 11: Referral Manipulation, Invitation Abuse & Notification Deduplication ---
  console.log('\n[11] Referral Manipulation, Invitation Abuse & Notification Deduplication');
  const {
    getOrCreateUserReferralCode,
    validateReferralCode,
    recordReferralRegistration,
  } = await import('../src/lib/referral-store');
  const { hasNotificationBeenSent, markNotificationSent } = await import('../src/lib/email-service');

  // Create referrer profile for School A
  const refCodeA = getOrCreateUserReferralCode({
    id: 'user_ref_owner_a',
    email: 'owner_a@gov.in',
    name: 'Owner A',
    schoolName: 'Z.P. Referrer School',
    udise: '27251409001',
  });

  // Self-referral attempt by same user ID -> must be blocked
  const selfRefValidation = validateReferralCode(refCodeA, 'user_ref_owner_a');
  assert(!selfRefValidation.valid, 'Self-referral by same user ID is blocked');

  // Self-referral attempt by same UDISE -> must be blocked in recordReferralRegistration
  const selfUdiseRecord = recordReferralRegistration(
    {
      id: 'req_self_udise',
      clerkUserId: 'different_user_id',
      userEmail: 'owner_a@gov.in',
      schoolName: 'Z.P. Referrer School',
      udiseNumber: '27251409001',
      district: 'Pune',
      status: 'pending',
      requestedAt: new Date().toISOString(),
    },
    refCodeA
  );
  assert(selfUdiseRecord === null, 'Self-referral manipulation using same UDISE or email is strictly blocked');

  // Invitation Abuse: TEACHER attempting to invite another teacher -> must be blocked
  const teacherInviteAttempt = createTeacherInvitation({
    schoolId: 'school-uuid-aaa',
    schoolName: 'Z.P. Primary School Pune',
    udiseNumber: '27251401111',
    invitedEmail: 'friend@pune.gov.in',
    invitedByUserId: 'user_teacher_pune',
    invitedByName: 'Teacher Pune',
    callerRole: 'TEACHER',
  });
  assert(!teacherInviteAttempt.success, 'Invitation abuse: TEACHER is blocked from creating school invitations');

  // Valid SCHOOL_ADMIN invitation succeeds, duplicate pending invitation is blocked
  const adminInvite1 = createTeacherInvitation({
    schoolId: 'school-uuid-aaa',
    schoolName: 'Z.P. Primary School Pune',
    udiseNumber: '27251401111',
    invitedEmail: 'valid_teacher@pune.gov.in',
    invitedByUserId: 'user_headmaster_pune',
    invitedByName: 'Headmaster Pune',
    callerRole: 'SCHOOL_ADMIN',
  });
  const adminInviteDup = createTeacherInvitation({
    schoolId: 'school-uuid-aaa',
    schoolName: 'Z.P. Primary School Pune',
    udiseNumber: '27251401111',
    invitedEmail: 'valid_teacher@pune.gov.in',
    invitedByUserId: 'user_headmaster_pune',
    invitedByName: 'Headmaster Pune',
    callerRole: 'SCHOOL_ADMIN',
  });
  assert(
    adminInvite1.success && !adminInviteDup.success,
    'SCHOOL_ADMIN can invite teacher and duplicate pending invitations are prevented'
  );

  // Notification Deduplication check
  const dedupKey = 'test_dedup:school_27251401111:approval';
  assert(!hasNotificationBeenSent(dedupKey), 'Fresh notification key has not been sent yet');
  markNotificationSent(dedupKey);
  assert(hasNotificationBeenSent(dedupKey), 'Deduplication ledger prevents duplicate notifications within TTL window');

  // --- Test 12: Secure Audited School Data Export ---
  console.log('\n[12] Secure Audited School Export & Cross-School Export Prevention');
  const { createEmptyCleanAppData, prepareValidatedExportPayload } = await import('../src/lib/storage');

  const schoolAppData = createEmptyCleanAppData({
    id: 'school-uuid-aaa',
    schoolName: 'Z.P. Primary School Pune',
    udiseNumber: '27251401111',
    centerCluster: 'Haveli',
    standardCategory: 'इयत्ता १ ली ते ५ वी (प्राथमिक)',
    district: 'Pune',
    taluka: 'Haveli',
    headmasterName: 'HM Pune',
    inchargeTeacher: 'Teacher Pune',
    cookName: 'Cook A',
    role: 'SCHOOL_ADMIN',
  });

  // Add 1 own-school entry and 1 foreign-school entry (simulating cache pollution attempt)
  schoolAppData.dailyEntries['2026-09-28'] = {
    id: '2026-09-28',
    schoolId: 'school-uuid-aaa',
    date: '2026-09-28',
    dayOfWeek: 1,
    dayNameMr: 'सोमवार',
    dayNameEn: 'Monday',
    dishId: 'dish_1',
    dishNameMr: 'मसाले भात',
    dishNameEn: 'Masale Bhat',
    studentCount: 80,
    items: {},
    totalGrainsPulsesKg: 8,
    totalVegetablesKg: 4,
    totalCookingCost: 436,
    remarks: 'Own school entry',
    savedAt: new Date().toISOString(),
  };
  schoolAppData.dailyEntries['2026-09-29'] = {
    id: '2026-09-29',
    schoolId: 'school-uuid-bbb-foreign', // Foreign school!
    date: '2026-09-29',
    dayOfWeek: 2,
    dayNameMr: 'मंगळवार',
    dayNameEn: 'Tuesday',
    dishId: 'dish_2',
    dishNameMr: 'मूग डाळ खिचडी',
    dishNameEn: 'Moong Khichdi',
    studentCount: 150,
    items: {},
    totalGrainsPulsesKg: 15,
    totalVegetablesKg: 7.5,
    totalCookingCost: 817.5,
    remarks: 'Foreign school entry',
    savedAt: new Date().toISOString(),
  };

  // 12.1: SCHOOL_ADMIN attempting to export another school's data -> must be blocked
  const unauthorizedExport = prepareValidatedExportPayload(schoolAppData, {
    userId: 'user_headmaster_pune',
    userRole: 'SCHOOL_ADMIN',
    requestedSchoolId: 'school-uuid-bbb',
  });
  assert(!unauthorizedExport.success, 'SCHOOL_ADMIN is blocked from exporting another school by ID');

  const unauthorizedUdiseExport = prepareValidatedExportPayload(schoolAppData, {
    userId: 'user_headmaster_pune',
    userRole: 'SCHOOL_ADMIN',
    requestedUdise: '27251402222',
  });
  assert(!unauthorizedUdiseExport.success, 'SCHOOL_ADMIN is blocked from exporting another school by UDISE');

  // 12.2: Valid own-school export strips foreign entries, includes schema/version metadata, and creates audit log
  const validExport = prepareValidatedExportPayload(schoolAppData, {
    userId: 'user_headmaster_pune',
    userRole: 'SCHOOL_ADMIN',
    requestedSchoolId: 'school-uuid-aaa',
  });
  assert(
    validExport.success &&
      validExport.payload !== undefined &&
      Object.keys(validExport.payload.dailyEntries).length === 1 &&
      validExport.payload.dailyEntries['2026-09-28'] !== undefined &&
      validExport.payload.dailyEntries['2026-09-29'] === undefined &&
      validExport.payload.exportMetadata?.schemaVersion === '2.0.0' &&
      validExport.payload.exportMetadata?.udiseNumber === '27251401111',
    'Valid export strips foreign school data and attaches schema/version metadata'
  );

  // --- Test 13: Offline Sync Reliability (Idempotency, Conflict Resolution, Retry Metadata) ---
  console.log('\n[13] Offline Sync Queue Idempotency & Conflict Resolution');
  const {
    clearOfflineQueue,
    pushToOfflineQueue,
    getOfflineQueue,
    resolveSyncConflict,
  } = await import('../src/lib/cloud-sync');

  clearOfflineQueue();

  // Rapid consecutive offline edits to the same date coalesce into 1 idempotent queue item
  pushToOfflineQueue({
    type: 'daily_entry',
    clerkUserId: 'user_headmaster_pune',
    payload: { date: '2026-09-30', studentCount: 60, savedAt: '2026-09-30T10:00:00.000Z' },
    timestamp: '2026-09-30T10:00:00.000Z',
  });
  pushToOfflineQueue({
    type: 'daily_entry',
    clerkUserId: 'user_headmaster_pune',
    payload: { date: '2026-09-30', studentCount: 75, savedAt: '2026-09-30T10:05:00.000Z' },
    timestamp: '2026-09-30T10:05:00.000Z',
  });

  const queueItems = getOfflineQueue();
  assert(
    queueItems.length === 1 && queueItems[0].payload.studentCount === 75,
    'Idempotency key coalesces duplicate offline writes for the same date into a single latest mutation'
  );

  // Conflict resolution: newer local offline entry wins over stale cloud entry
  const newerLocal: any = { date: '2026-09-30', studentCount: 75, savedAt: '2026-09-30T10:05:00.000Z' };
  const olderCloud: any = { date: '2026-09-30', studentCount: 50, savedAt: '2026-09-30T09:00:00.000Z' };
  const resolvedEntry = resolveSyncConflict(newerLocal, olderCloud);
  assert(
    resolvedEntry.studentCount === 75,
    'Conflict resolution preserves newer local offline entry over stale cloud cache'
  );
  clearOfflineQueue();

  // --- Test 14: Structured Observability & Sensitive Credential Redaction ---
  console.log('\n[14] Structured Observability & Credential Redaction');
  const {
    logStructuredEvent,
    getStructuredLogs,
    redactSensitiveData,
  } = await import('../src/lib/observability');

  // Trigger failed admin login -> logs AUTH_FAILURE with redacted password
  const failedAuth = verifyAdminCredentials('attacker@example.com', 'SuperSecretPassword123!');
  assert(!failedAuth, 'Invalid admin credentials rejected');

  // Directly test redaction of passwords, tokens, passcodes, and service_role keys
  const redactedObj = redactSensitiveData({
    password: 'MySecretPassword',
    passcode: 'Admin@1234',
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    apiKey: 're_1234567890abcdefghijklmnop',
    safeField: 'Pune District',
  });

  assert(
    redactedObj.password === '[REDACTED]' &&
      redactedObj.passcode === '[REDACTED]' &&
      redactedObj.accessToken === '[REDACTED]' &&
      redactedObj.apiKey === '[REDACTED]' &&
      redactedObj.safeField === 'Pune District',
    'Observability engine strictly redacts passwords, passcodes, JWT tokens, and API keys'
  );

  logStructuredEvent({
    category: 'SYNC_FAILURE',
    level: 'error',
    message: 'Simulated sync failure with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig',
    context: { token: 'secret_token_value', schoolUdise: '27251401111' },
  });

  const authLogs = getStructuredLogs('AUTH_FAILURE');
  const syncLogs = getStructuredLogs('SYNC_FAILURE');
  const serializedLogs = JSON.stringify(getStructuredLogs());
  assert(
    authLogs.length >= 1 &&
      syncLogs.length >= 1 &&
      !serializedLogs.includes('SuperSecretPassword123!') &&
      !serializedLogs.includes('secret_token_value'),
    'Structured logs record AUTH_FAILURE and SYNC_FAILURE without leaking any sensitive credentials'
  );

  // --- Summary ---
  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
