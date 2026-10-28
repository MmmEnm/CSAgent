/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoleType = 'li_teacher' | 'wang_teacher' | 'chen_teacher' | 'org_agent';

export interface RoleConfig {
  id: RoleType;
  name: string;
  assistantTitle: string;
  sourceDesc: string;
  styleDesc: string;
  greeting: string;
  avatar: string;
  tags: string[];
}

export type ABCRating = 'A' | 'B' | 'C';

export interface ServiceProduct {
  id: string;
  name: string;
  type: 'single' | 'package' | 'assessment';
  duration: string;
  price: number;
  originalPrice?: number;
  description: string;
  suitableFor: string[];
  notSuitableFor: string[];
  includes: string[];
  status: 'active' | 'full';
  effectiveDate: string;
}

export interface CounselorVoiceGreeting {
  durationSeconds: number; // 15
  audioUrl?: string;
  toneStyle: string; // e.g. '温和知性 · 沉静共情'
  spokenText: string; // 15秒口述文稿
  waveformHeights: number[]; // 模拟声波高度百分比
  pitch?: number;
  rate?: number;
}

export interface CounselorProfile {
  id: string;
  name: string;
  gender: 'female' | 'male';
  title: string;
  qualification: string;
  experienceYears: number;
  modality: string; // 流派
  specialties: string[];
  priceRange: string;
  scheduleStatus: 'available' | 'few_slots' | 'full';
  nextAvailableSlot: string;
  lastVerifiedDaysAgo: number; // 30天内有效
  voiceGreeting?: CounselorVoiceGreeting;
}

export type MessageSender = 'user' | 'agent' | 'human' | 'system';

export type CardType = 
  | 'none'
  | 'service_catalog'
  | 'counselor_recommendation'
  | 'booking_form'
  | 'payment_card'
  | 'crisis_alert'
  | 'handoff_summary'
  | 'clinic_environment'
  | 'map_navigation'
  | 'refund_notice'
  | 'invoice_issued'
  | 'midterm_review'
  | 'satisfaction_rating';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  senderName?: string;
  avatar?: string;
  content: string;
  timestamp: string;
  cardType?: CardType;
  cardData?: any;
  meta?: {
    gatePassed?: boolean;
    filterApplied?: string[];
    abcGrade?: ABCRating;
    isCrisis?: boolean;
    isBoundaryClarification?: boolean;
    boundaryType?: 'explicit_words' | 'deep_turns';
    intent?: string;
    quotaUsed?: number;
    quotaMax?: number;
    timeCostMs?: number;
  };
}

export interface ConsultationOrder {
  id: string;
  orderNo: string;
  userName: string;
  phone: string;
  productId: string;
  productName: string;
  amount: number;
  depositAmount: number;
  paymentType: 'deposit' | 'full';
  paymentStatus: 'pending' | 'deposit_paid' | 'paid' | 'refunded';
  paymentMethod: 'wechat_pay';
  counselorName?: string;
  preferredTime?: string;
  createdAt: string;
  paidAt?: string;
  invoiceRequired: boolean;
  notes?: string;
  humanSalesAssignee?: string;
}

export type CrisisAssessmentStage = 
  | 'none'
  | 'safety_check'       // 步骤1：安全与独处确认
  | 'plan_means_check'   // 步骤2：计划与手段排查
  | 'support_contract'   // 步骤3：安全契约与支持激活
  | 'ongoing_support';   // 步骤4：深度持续陪伴

export interface CrisisAssessmentState {
  stage: CrisisAssessmentStage;
  stageName: string;
  stepNumber: number; // 1 to 4
  riskLevel: 'L1_IMMINENT' | 'L2_HIGH' | 'L3_MODERATE';
  triggerSentence: string;
  isSafeNow?: boolean;
  isAlone?: boolean;
  hasSpecificPlan?: boolean;
  hasMeansOnHand?: boolean;
  alreadyHarmDone?: boolean;
  safetyContractAgreed?: boolean;
  notes?: string;
  updatedAt: string;
}

export interface CrisisAlert {
  id: string;
  sessionId: string;
  userName: string;
  phone?: string;
  triggerSentence: string;
  riskLevel: 'L1_IMMINENT' | 'L2_HIGH' | 'L3_MODERATE';
  hitRule: string;
  score: number;
  detectedAt: string;
  deadlineAt: string; // 5分钟倒计时
  status: 'pending' | 'handled' | 'false_positive';
  assignedTo?: string;
  actions: {
    hotlineProvided: boolean;
    userWillingnessChecked: boolean;
    dutyStaffNotified: boolean;
  };
  notes?: string;
  assessmentStage?: CrisisAssessmentStage;
  assessmentSummary?: string;
}

export interface WorkingMemorySlots {
  userName?: string;
  userPhone?: string;
  userCity?: string;
  preferredCounselor?: string;
  preferredFormat?: 'offline_shanghai' | 'online_video' | 'undecided';
  preferredTimeSlot?: string;
  targetProduct?: string;
  issueCategory?: string;
  emotionTag?: string;
  objectionsRaised?: string[];
  questionsAnswered?: string[];
  hasProvidedPhone?: boolean;
  hasSeenPricing?: boolean;
  hasSeenCounselors?: boolean;
  hasAgreedConsent?: boolean;
  isAttachmentDetected?: boolean;
  attachmentTrigger?: string;
  boundaryClarifiedCount?: number;
  turnCount: number;
}

export interface SessionData {
  id: string;
  role: RoleType;
  userName: string;
  userPhone?: string;
  userCity?: string;
  abcGrade: ABCRating;
  abcReason: string;
  emotionalState: 'calm' | 'anxious' | 'depressed' | 'distressed' | 'crisis';
  primaryIssue: string;
  summary?: string;
  quotaCount: number; // 微信客服 5 条
  quotaMax: number;
  attachmentSignals?: {
    detected: boolean;
    count: number;
    triggers: string[];
    lastClarifiedTurn?: number;
  };
  startTime: string;
  lastActiveTime: string;
  isTakenOverByHuman: boolean;
  isCrisisLocked: boolean;
  crisisAssessment?: CrisisAssessmentState;
  isMinorProtected: boolean;
  durationMinutes: number;
  messages: ChatMessage[];
  currentMilestone?: 'greeting' | 'exploring_needs' | 'service_introduced' | 'booking_intent';
  workingMemory?: WorkingMemorySlots;
  bookingDraft?: {
    consentAgreed: boolean;
    phone: string;
    contactName: string;
    preferredCounselor?: string;
    preferredTimeSlot?: string;
  };
  assignedStaffId?: string;
  assignedStaffName?: string;
  transferHistory?: Array<{
    id: string;
    fromStaffName: string;
    toStaffName: string;
    reason: string;
    timestamp: string;
  }>;
  internalNotes?: Array<{
    id: string;
    authorName: string;
    content: string;
    timestamp: string;
  }>;
  // --- PRD V1.0: Service Exception Fallback Extension ---
  serviceCapability: 'normal' | 'restricted' | 'stopped';
  handoverStatus: 'none' | 'submitted' | 'waiting_confirm' | 'human_confirmed' | 'failed';
  outboundStatus: 'pending' | 'sent' | 'failed' | 'unknown';
  incidentContext?: {
    lastErrorType?: 'timeout' | 'model_error' | 'knowledge_error' | 'safety_timeout' | 'outbound_error' | 'safety_blocked';
    affectedComponent?: string;
    failureTimestamp?: string;
    handoffId?: string;
    consecutiveFailures?: number;
  };
}

export type StaffRole = 'super_admin' | 'supervisor' | 'duty_counselor' | 'crisis_specialist';
export type DutyStatus = 'on_duty' | 'busy' | 'break' | 'offline';

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  title: string;
  avatar: string;
  role: StaffRole;
  roleName: string;
  dutyStatus: DutyStatus;
  maxConcurrent: number;
  currentActiveSessions: number;
  phone: string;
  wechat: string;
  permissions: string[];
  satisfactionScore: number;
  todayHandledCount: number;
  createdAt: string;
  status: 'active' | 'disabled';
}

export interface DashboardStats {
  todaySessions: number;
  crisisCount: number;
  crisisRecallRate: number; // 99%+
  avgFirstResponseSec: number; // <= 3s
  p90ResponseSec: number; // <= 8s
  handOverRate: number; // 转人工率
  aiSelfResolutionRate: number; // 60%+
  qualifiedLeadRate: number; // 线索率
  ordersCount: number;
  totalRevenue: number;
  humanResponseRate: number; // <= 5min
  averageSatisfaction: number; // 1-5 stars
}

export interface SatisfactionRating {
  id: string;
  sessionId: string;
  score: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface KnowledgeFileVersion {
  id: string;
  version: string; // e.g. 'v1.0', 'v1.1', 'v2.0'
  fileName: string;
  fileSize: string; // e.g. '1.2 MB'
  fileType: string; // e.g. 'pdf' | 'docx' | 'txt' | 'md'
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  changelog?: string;
  contentSnippet?: string;
  status: 'active' | 'archived';
}

export interface KnowledgeItem {
  id: string;
  category: 'pricing' | 'counselor' | 'ethics' | 'objection' | 'process' | 'crisis';
  title: string;
  summary: string;
  content: string;
  keywords: string[];
  status: 'active' | 'draft';
  updatedAt: string;
  author: string;
  fileVersions?: KnowledgeFileVersion[];
  currentVersion?: string;
  vectorEmbedding?: number[];
}

// ==================== 数据飞轮设计体系类型 ====================

export type FlywheelStage = 
  | 'collect'      // 1. 数据采集与埋点 (Log & Trace)
  | 'evaluate'     // 2. 自动化质检评测 (LLM-as-a-Judge & Rules)
  | 'badcase'      // 3. Bad Case 归因与挖掘 (Root-Cause Triaging)
  | 'optimize'     // 4. 优化实施 (Prompt/Knowledge/Rules/Few-Shot)
  | 'experiment'   // 5. A/B 灰度验证与闭环 (Shadow & Canary Rollout)
  | 'abc_drift'    // 6. 意向等级(ABC Lead)人工纠偏反哺评估器
  | 'kb_version'   // 7. RAG 知识库版本管理与回滚
  | 'flywheel_kpi'; // 8. 飞轮整体效能看板

export interface ABCDriftLog {
  id: string;
  sessionId: string;
  clientName: string;
  correctedBy: string;
  originalGrade: ABCRating;
  correctedGrade: ABCRating;
  triggerKeywords: string[];
  userQueryContext: string;
  gapReason: string;
  timestamp: string;
}

export interface ABCDriftReport {
  overallAccuracy: number; // e.g. 91.8%
  driftRate: number; // e.g. 8.2%
  totalAdjustments: number; // e.g. 48
  commonDriftPatterns: Array<{
    pattern: string;
    count: number;
    sharePercent: number;
    keyTrigger: string;
  }>;
  accuracyTrend: Array<{ date: string; accuracy: number }>;
}

export interface MessageFeedback {
  messageId: string;
  sessionId: string;
  rating: 'thumb_up' | 'thumb_down';
  reason?: 'accurate' | 'empathetic' | 'fast' | 'inaccurate' | 'cold' | 'irrelevant' | 'too_long' | 'other';
  comment?: string;
  createdAt: string;
  submittedBy: 'user' | 'counselor_supervisor';
}

export interface DialogueLogItem {
  id: string;
  sessionId: string;
  turnIndex: number;
  roleId: RoleType;
  userQuery: string;
  agentResponse: string;
  intentDetected: string;
  hitKnowledgeId?: string;
  hitKnowledgeTitle?: string;
  latencyMs: number;
  outputGateViolations: string[];
  userFeedback?: 'thumb_up' | 'thumb_down';
  supervisorScore?: number; // 1-5
  isBadcase: boolean;
  badcaseReason?: string;
  timestamp: string;
}

export interface AutomatedEvalMetric {
  id: string;
  name: string;
  category: 'safety' | 'hallucination' | 'empathy' | 'conversion' | 'brevity';
  score: number; // 0-100
  threshold: number;
  status: 'pass' | 'warning' | 'fail';
  description: string;
  sampleCount: number;
}

export interface BadcaseItem {
  id: string;
  logId: string;
  sessionId: string;
  userQuery: string;
  actualReply: string;
  expectedReply: string;
  category: 'knowledge_gap' | 'prompt_drift' | 'gate_overkill' | 'intent_misclassified' | 'emotion_mismatch' | 'commercial_push' | 'safety_risk';
  categoryLabel: string;
  severity: 'P0' | 'P1' | 'P2';
  suggestedAction: 'add_knowledge' | 'tune_prompt' | 'adjust_gate' | 'add_few_shot';
  status: 'pending' | 'in_progress' | 'fixed' | 'verified';
  assignedTo: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface FewShotExample {
  id: string;
  badcaseId?: string;
  userQuery: string;
  idealAgentResponse: string;
  intentCategory: string;
  extractedBy: string;
  promptVersionTarget: string;
  status: 'synced_to_prompt_candidates' | 'active_in_prod';
  createdAt: string;
}

export interface PromptVersion {
  id: string;
  version: string;
  layer: 'L1_BasePersona' | 'L2_SafetyInvariants' | 'L3_KnowledgeRAG' | 'L4_DialogueState' | 'L5_DynamicDirective';
  title: string;
  description: string;
  contentSnippet: string;
  author: string;
  updatedAt: string;
  status: 'active' | 'candidate' | 'archived';
  metricsBefore: { passRate: number; badcaseCount: number };
  metricsAfter?: { passRate: number; badcaseCount: number };
}

export interface ABExperiment {
  id: string;
  name: string;
  hypothesis: string;
  trafficSplit: { control: number; test: number }; // 50/50
  controlConfig: { promptVersion: string; knowledgeSet: string; description: string };
  testConfig: { promptVersion: string; knowledgeSet: string; description: string };
  status: 'running' | 'completed' | 'draft';
  startDate: string;
  sampleSize: number;
  metrics: {
    controlSelfResolution: number;
    testSelfResolution: number;
    controlLeadRate: number;
    testLeadRate: number;
    controlAvgRating: number;
    testAvgRating: number;
    pVal: number;
    winner: 'test' | 'control' | 'inconclusive';
  };
}

export interface FlywheelDashboardStats {
  totalLoggedTurns: number;
  evalPassRate: number; // e.g. 96.8%
  activeBadcases: number;
  resolvedBadcasesThisWeek: number;
  promptIterationCycles: number;
  avgResolutionTimeHours: number;
  flywheelVelocityScore: number; // 飞轮加速度得分
  feedbackThumbUpRate: number;
  averageSatisfaction: number;
}

// ==================== 模块一：咨询师与咨询室排期看板 ====================
export type SlotStatus = 'available' | 'booked' | 'in_consultation' | 'blocked' | 'completed';
export type ConsultationFormat = 'offline_shanghai' | 'online_video';
export type SlotPaymentStatus = 'paid_deposit' | 'paid_full' | 'unpaid';

export interface ScheduleSlot {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorTitle?: string;
  counselorAvatar?: string;
  roomId: string;
  roomName: string;
  date: string; // '2026-10-18' (YYYY-MM-DD)
  timeRange: string; // '10:00 - 10:50'
  status: SlotStatus;
  orderNo?: string;
  clientName?: string;
  clientPhone?: string;
  serviceType?: string;
  consultationFormat?: ConsultationFormat;
  paymentStatus?: SlotPaymentStatus;
  topic?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleRoom {
  id: string;
  name: string;
  type: 'offline' | 'online';
  location: string;
  capacity: string;
  description: string;
}

export interface ScheduleStats {
  totalSlots: number;
  bookedCount: number;
  availableCount: number;
  completedCount: number;
  blockedCount: number;
  bookingRate: number;
  todayConsultations: number;
}

// ==================== 模块二：危机双人复核制与监护人签署 ====================
export interface DualReviewRecord {
  alertId: string;
  proposerStaffName: string;
  proposerNotes: string;
  proposedAt: string;
  supervisorStaffName: string;
  supervisorReviewNotes: string;
  reviewedAt: string;
  status: 'pending_supervisor' | 'approved_resolved' | 'rejected_continue';
}

export interface GuardianConsent {
  id: string;
  sessionId: string;
  minorName: string;
  minorAge: number;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianIdCardLast4: string;
  signedAt: string;
  status: 'pending' | 'signed' | 'verified';
  signatureHash?: string;
  supervisorReviewer?: string;
}

// ==================== 模块三：心理量表自评与正念呼吸工具 ====================
export interface AssessmentQuestion {
  id: number;
  text: string;
  options: Array<{ label: string; score: number }>;
}

export interface AssessmentResult {
  scaleId: 'phq9' | 'gad7' | 'burnout';
  scaleName: string;
  totalScore: number;
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  severityLabel: string;
  advice: string;
  recommendedProductId: string;
  recommendedProductName: string;
  completedAt: string;
}

// ==================== 模块五：微信支付退款工单 & 财务发票 & 中程履约回访 ====================
export interface RefundRecord {
  id: string;
  orderId: string;
  orderNo: string;
  clientName: string;
  amount: number;
  refundReason: string;
  initiatedBy: string;
  auditedBy?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
  completedAt?: string;
  appointmentTime?: string;
  isWithin24hPolicy?: boolean;
  hoursRemaining?: number;
  refundTxId?: string;
  rejectReason?: string;
}

export interface InvoiceRecord {
  id: string;
  orderId: string;
  orderNo: string;
  clientName: string;
  clientPhone?: string;
  invoiceType: 'enterprise' | 'individual';
  title: string;
  taxNumber?: string;
  email: string;
  amount: number;
  contentCategory: string; // e.g. '心理咨询与评估服务'
  invoiceNo: string;
  invoiceCode: string;
  pdfUrl: string;
  status: 'issued' | 'pending';
  issuedAt: string;
}

export interface MidtermRetentionAlert {
  id: string;
  sessionId: string;
  clientName: string;
  phone: string;
  packageName: string;
  counselorName: string;
  completedCount: number; // e.g. 2
  totalCount: number; // e.g. 4
  lastSessionDate: string;
  daysSinceLastSession: number;
  riskLevel: 'high' | 'medium' | 'low';
  riskReason: string;
  status: 'pending' | 'followed_up' | 'converted_to_10_sessions';
  followedUpAt?: string;
  staffName?: string;
}



export interface ServiceExceptionLog {
  id: string;
  sessionId: string;
  userName: string;
  type: 'degradation' | 'circuit_breaker' | 'metric_decline';
  level: 'warning' | 'critical';
  event: string;
  errorType?: string;
  timestamp: string;
  status: 'active' | 'resolved';
}
