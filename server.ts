/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  updateWorkingMemory,
  planTurn,
  buildFiveLayerSystemInstruction,
  generateDirectResponse,
  TurnPlan
} from './server/assistantEngine';
import { FIXED_REPLIES, FixedReplyCode } from './src/data/fixedReplies';
import {
  ROLES,
  INITIAL_FLYWHEEL_STATS,
  INITIAL_EVAL_METRICS,
  INITIAL_DIALOGUE_LOGS,
  INITIAL_BADCASES,
  INITIAL_PROMPT_VERSIONS,
  INITIAL_AB_EXPERIMENTS,
  INITIAL_REFUNDS,
  INITIAL_INVOICES,
  INITIAL_MIDTERM_ALERTS,
  INITIAL_KNOWLEDGE_BASE
} from './src/data/mockData';
import {
  RoleType,
  WorkingMemorySlots,
  ABCRating,
  DialogueLogItem,
  BadcaseItem,
  PromptVersion,
  ABExperiment,
  AutomatedEvalMetric,
  CrisisAssessmentState,
  CrisisAssessmentStage,
  FewShotExample,
  ABCDriftLog,
  RefundRecord,
  InvoiceRecord,
  MidtermRetentionAlert,
  SatisfactionRating,
  ServiceExceptionLog
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI on server
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Timeout wrapper for Gemini API calls to guarantee rapid fallback and avoid 504 timeouts
async function callGeminiWithTimeout<T>(promise: Promise<T>, timeoutMs = 6500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// In-memory data store for live sessions, orders, and crisis alerts
interface InMemSession {
  id: string;
  roleId: RoleType;
  userName: string;
  userPhone?: string;
  userCity?: string;
  abcGrade: ABCRating;
  abcReason: string;
  emotionalState: 'calm' | 'anxious' | 'depressed' | 'distressed' | 'crisis';
  primaryIssue: string;
  summary?: string;
  quotaCount: number;
  quotaMax: number;
  isTakenOverByHuman: boolean;
  isCrisisLocked: boolean;
  crisisAssessment?: CrisisAssessmentState;
  isMinorProtected: boolean;
  startTime: string;
  lastActiveTime: string;
  durationMinutes: number;
  currentMilestone?: 'greeting' | 'exploring_needs' | 'service_introduced' | 'booking_intent';
  workingMemory?: WorkingMemorySlots;
  attachmentSignals?: {
    detected: boolean;
    count: number;
    triggers: string[];
    lastClarifiedTurn?: number;
  };
  messages: Array<{
    id: string;
    sender: 'user' | 'agent' | 'human' | 'system';
    senderName?: string;
    content: string;
    timestamp: string;
    cardType?: string;
    cardData?: any;
    meta?: any;
  }>;
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
  // --- PRD V1.0: Service Exception Fallback ---
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

interface InMemStaffUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  title: string;
  avatar: string;
  role: 'super_admin' | 'supervisor' | 'duty_counselor' | 'crisis_specialist';
  roleName: string;
  dutyStatus: 'on_duty' | 'busy' | 'break' | 'offline';
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

const staffStore: InMemStaffUser[] = [
  {
    id: 'staff_01',
    username: 'li_supervisor',
    name: '李晓华 老师',
    title: '主任心理咨询师 · 督导专家',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherLi&gender=female',
    role: 'super_admin',
    roleName: '超级管理员 / 督导专家',
    dutyStatus: 'on_duty',
    maxConcurrent: 5,
    currentActiveSessions: 2,
    phone: '13812345601',
    wechat: 'zhixingu_li',
    permissions: ['all', 'chat_reply', 'takeover', 'order_manage', 'crisis_handle', 'staff_manage', 'knowledge_edit', 'flywheel_manage'],
    satisfactionScore: 99.6,
    todayHandledCount: 14,
    createdAt: '2025-06-01',
    status: 'active'
  },
  {
    id: 'staff_02',
    username: 'counselor_zhang',
    name: '张志强',
    title: '资深心理值班顾问 · 小张',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ZhangCounselor&gender=male',
    role: 'duty_counselor',
    roleName: '一线值班咨询顾问',
    dutyStatus: 'on_duty',
    maxConcurrent: 6,
    currentActiveSessions: 2,
    phone: '13912345602',
    wechat: 'zhixingu_zhang',
    permissions: ['chat_reply', 'takeover', 'order_manage'],
    satisfactionScore: 98.4,
    todayHandledCount: 22,
    createdAt: '2025-09-15',
    status: 'active'
  },
  {
    id: 'staff_03',
    username: 'crisis_wang',
    name: '王语嫣',
    title: '危机干预特派员 · 王老师',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WangCrisis&gender=female',
    role: 'crisis_specialist',
    roleName: '危机干预绿色通道专员',
    dutyStatus: 'on_duty',
    maxConcurrent: 3,
    currentActiveSessions: 1,
    phone: '13712345603',
    wechat: 'zhixingu_crisis_wang',
    permissions: ['chat_reply', 'takeover', 'crisis_handle'],
    satisfactionScore: 100.0,
    todayHandledCount: 6,
    createdAt: '2025-08-10',
    status: 'active'
  },
  {
    id: 'staff_04',
    username: 'counselor_chen',
    name: '陈梦琪 老师',
    title: '国家二级心理咨询师 · 陈老师',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TeacherChen&gender=female',
    role: 'duty_counselor',
    roleName: '资深心理咨询师',
    dutyStatus: 'busy',
    maxConcurrent: 4,
    currentActiveSessions: 3,
    phone: '13612345604',
    wechat: 'zhixingu_chen',
    permissions: ['chat_reply', 'takeover', 'order_manage'],
    satisfactionScore: 99.1,
    todayHandledCount: 11,
    createdAt: '2025-11-01',
    status: 'active'
  },
  {
    id: 'staff_05',
    username: 'admin_zhou',
    name: '周建国',
    title: '知心谷机构运营总监',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminZhou&gender=male',
    role: 'super_admin',
    roleName: '机构中台主管',
    dutyStatus: 'on_duty',
    maxConcurrent: 10,
    currentActiveSessions: 0,
    phone: '13512345605',
    wechat: 'zhixingu_admin_zhou',
    permissions: ['all', 'chat_reply', 'takeover', 'order_manage', 'crisis_handle', 'staff_manage', 'knowledge_edit', 'flywheel_manage'],
    satisfactionScore: 98.8,
    todayHandledCount: 5,
    createdAt: '2025-01-10',
    status: 'active'
  }
];

const sessionsStore: Map<string, InMemSession> = new Map([
  [
    'sess_default_01',
    {
      id: 'sess_default_01',
      roleId: 'li_teacher',
      userName: '微信咨询访客 (小林)',
      userPhone: '138****6621',
      userCity: '上海市徐汇区',
      abcGrade: 'B',
      abcReason: '了解服务与费用，正比较适合的咨询师与时段',
      emotionalState: 'anxious',
      primaryIssue: '职场人际压力与偶发性失眠',
      summary: '访客主诉工作沟通焦虑与轻微睡眠困扰，已详细了解4次深度心理探索方案（1800元），当前考虑周末线下咨询时段。',
      quotaCount: 1,
      quotaMax: 5,
      isTakenOverByHuman: false,
      isCrisisLocked: false,
      isMinorProtected: false,
      startTime: '10:00',
      lastActiveTime: '10:08',
      durationMinutes: 8,
      assignedStaffId: undefined,
      assignedStaffName: undefined,
      internalNotes: [
        {
          id: 'note_1',
          authorName: '张志强 (值班顾问)',
          content: '访客对咨询师流派比较关注，推荐了擅长CBT的李晓华老师。',
          timestamp: '10:05'
        }
      ],
      transferHistory: [],
      messages: [
        {
          id: 'msg_init_1',
          sender: 'user',
          content: '您好，我想了解下心理咨询怎么收费？有适合职场压力的打包方案吗？',
          timestamp: '10:00'
        },
        {
          id: 'msg_init_2',
          sender: 'agent',
          senderName: '知心谷·李老师的AI助手',
          content: '您好呀！感受到您最近职场上承担了不少压力。知心谷面向个人困扰提供从评估到深度的阶梯服务：针对职场梳理与压力调适，最推荐的是【4次深度心理探索与梳理方案（打包方案）】，特惠价1800元（原价2400元），包含第1次全面心理评估+第2-3次认知情绪归因+第4次行动应对方案。也可以先预约【首次单次评估】（400-600元），您觉得哪种节奏更契合您当前的状态呢？',
          timestamp: '10:01'
        }
      ],
      serviceCapability: 'normal',
      handoverStatus: 'none',
      outboundStatus: 'pending'
    }
  ],
  [
    'sess_02',
    {
      id: 'sess_02',
      roleId: 'wang_teacher',
      userName: '微信访客 (王同学家长)',
      userPhone: '139****7732',
      userCity: '江苏江苏省南京市',
      abcGrade: 'B',
      abcReason: '为高三孩子咨询考前焦虑，询问线上视频咨询形式与保密性',
      emotionalState: 'distressed',
      primaryIssue: '高三考前情绪焦虑与亲子沟通冲突',
      summary: '高三家长代孩子咨询考前心理调适，希望了解陈梦琪老师的线上视频咨询时间，对未成年人知情同意协议已阅读。',
      quotaCount: 3,
      quotaMax: 5,
      isTakenOverByHuman: true,
      assignedStaffId: 'staff_02',
      assignedStaffName: '张志强 (值班顾问)',
      isCrisisLocked: false,
      isMinorProtected: true,
      startTime: '09:40',
      lastActiveTime: '10:12',
      durationMinutes: 32,
      internalNotes: [
        {
          id: 'note_2',
          authorName: '张志强',
          content: '涉及未成年人（17岁高三），已告知须监护人签署知情同意书方可安排咨询。',
          timestamp: '09:55'
        }
      ],
      transferHistory: [
        {
          id: 'trans_1',
          fromStaffName: 'AI智能客服',
          toStaffName: '张志强 (值班顾问)',
          reason: '访客主动发送【请帮我转人工客服】，系统自动派单',
          timestamp: '09:45'
        }
      ],
      messages: [
        {
          id: 'msg_w_1',
          sender: 'user',
          content: '你好，孩子高三最近二模没考好，情绪很差把自己关房间里，你们线上视频能做吗？',
          timestamp: '09:40'
        },
        {
          id: 'msg_w_2',
          sender: 'human',
          senderName: '【值班顾问·张志强】',
          content: '您好家长，非常理解您此刻焦虑心疼的心情。我们中心支持专业加密的腾讯会议一对一线上视频咨询。对于高三考生，陈梦琪老师和王语嫣老师都有丰富的青少年学业压力个案经验，可以先帮助孩子卸下心理包袱。',
          timestamp: '09:46'
        }
      ],
      serviceCapability: 'normal',
      handoverStatus: 'human_confirmed',
      outboundStatus: 'pending'
    }
  ],
  [
    'sess_03',
    {
      id: 'sess_03',
      roleId: 'li_teacher',
      userName: '微信访客 (赵先生)',
      userPhone: '136****5510',
      userCity: '上海市静安区',
      abcGrade: 'A',
      abcReason: '高意向：明确想预约本周六线下李晓华老师时段，询问定金如何微信支付',
      emotionalState: 'anxious',
      primaryIssue: '婚姻家庭沟通僵局与情感疏离',
      summary: '赵先生，希望预约李晓华老师本周六下午的线下深度咨询，已确认服务价格并询问微信支付定金方式。',
      quotaCount: 4,
      quotaMax: 5,
      isTakenOverByHuman: false,
      assignedStaffId: undefined,
      assignedStaffName: undefined,
      isCrisisLocked: false,
      isMinorProtected: false,
      startTime: '10:02',
      lastActiveTime: '10:14',
      durationMinutes: 12,
      internalNotes: [],
      transferHistory: [],
      messages: [
        {
          id: 'msg_z_1',
          sender: 'user',
          content: '请帮我转人工客服，我想直接预约李老师这周六下午的面对面咨询。',
          timestamp: '10:10'
        },
        {
          id: 'msg_z_2',
          sender: 'agent',
          senderName: '知心谷·李老师的AI助手',
          content: '收到您的诉求！李老师本周六15:00在静安咨询室有独立时段，我已为您呼叫在线值班顾问。您可以点击下方【支付定金】卡片支付100元微信预约定金，定金到账后即可为您锁定专属时段。',
          timestamp: '10:11'
        }
      ],
      serviceCapability: 'normal',
      handoverStatus: 'none',
      outboundStatus: 'pending'
    }
  ],
  [
    'sess_04',
    {
      id: 'sess_04',
      roleId: 'org_agent',
      userName: '微信访客 (周女士)',
      userPhone: '189****1120',
      userCity: '浙江省杭州市',
      abcGrade: 'B',
      abcReason: '触碰低度情绪预警，正在进行安全确认与陪伴',
      emotionalState: 'distressed',
      primaryIssue: '产后抑郁倾向、失眠与价值感低落',
      summary: '产后新手妈妈，自诉生活无意义且疲惫至极。危机专员王老师正在跟进四步评估，目前确认在家有家人陪同，无即刻自伤危险。',
      quotaCount: 5,
      quotaMax: 5,
      isTakenOverByHuman: true,
      assignedStaffId: 'staff_03',
      assignedStaffName: '王语嫣 (危机专员)',
      isCrisisLocked: true,
      isMinorProtected: false,
      startTime: '09:15',
      lastActiveTime: '10:09',
      durationMinutes: 54,
      internalNotes: [
        {
          id: 'note_4',
          authorName: '王语嫣 (危机专员)',
          content: '完成步骤1安全与独处排查：访客母亲在客厅帮忙带娃，已口头约定安全契约，无自残工具，情绪已趋于平缓。',
          timestamp: '09:50'
        }
      ],
      transferHistory: [
        {
          id: 'trans_2',
          fromStaffName: 'AI安全哨兵',
          toStaffName: '王语嫣 (危机专员)',
          reason: '命中心理危机预警规则（自伤无意义感），启动高危人工干预SOP',
          timestamp: '09:20'
        }
      ],
      messages: [
        {
          id: 'msg_c_1',
          sender: 'user',
          content: '宝宝总是哭，我感觉自己好没用，整夜整夜睡不着，活着好累...',
          timestamp: '09:15'
        },
        {
          id: 'msg_c_2',
          sender: 'human',
          senderName: '【危机干预专员·王老师】',
          content: '周女士，抱抱您。产后激素波动和睡眠严重不足，会给身心带来超出承受的重荷，您已经很努力在照顾宝宝了。我是知心谷危机守护专员王老师，我现在一直在您身边。家里现在有人能帮您搭把手抱抱宝宝吗？',
          timestamp: '09:22'
        }
      ],
      serviceCapability: 'normal',
      handoverStatus: 'human_confirmed',
      outboundStatus: 'pending'
    }
  ],
  [
    'sess_05',
    {
      id: 'sess_05',
      roleId: 'li_teacher',
      userName: '微信访客 (陈先生)',
      userPhone: '135****8899',
      userCity: '上海市浦东新区',
      abcGrade: 'A',
      abcReason: '已支付100元预约定金，订单号ZXG20261010001，待确认最终到访时段',
      emotionalState: 'calm',
      primaryIssue: '科技互联网中层管理职业倦怠与身心耗竭',
      summary: '陈先生，已微信支付100元定金预约4次深度探索套餐，指定李晓华老师，待客服发送到诊导航及来访者前置信息采集表。',
      quotaCount: 3,
      quotaMax: 5,
      isTakenOverByHuman: true,
      assignedStaffId: 'staff_01',
      assignedStaffName: '李晓华 老师',
      isCrisisLocked: false,
      isMinorProtected: false,
      startTime: '08:50',
      lastActiveTime: '10:00',
      durationMinutes: 70,
      internalNotes: [
        {
          id: 'note_5',
          authorName: '李晓华 老师',
          content: '定金已由财务审核入账，安排在周六上午10点1号咨询室。',
          timestamp: '09:30'
        }
      ],
      transferHistory: [],
      messages: [
        {
          id: 'msg_chen_1',
          sender: 'user',
          content: '我刚刚在微信客服里付了100块定金，请问周六直接过去就可以了吗？',
          timestamp: '09:25'
        },
        {
          id: 'msg_chen_2',
          sender: 'human',
          senderName: '【主任咨询师·李晓华 老师】',
          content: '陈先生您好，您的微信支付预约定金已收到！周六上午10:00为您保留静安咨询中心1号室，稍后值班助理会通过企业微信向您发送详细的交通到诊指引与私密问卷。',
          timestamp: '09:31'
        }
      ],
      serviceCapability: 'normal',
      handoverStatus: 'human_confirmed',
      outboundStatus: 'pending'
    }
  ]
]);

const ordersStore: Array<{
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
}> = [
  {
    id: 'ord_101',
    orderNo: 'ZXG20261010001',
    userName: '林女士 (微信访客)',
    phone: '138****6621',
    productId: 'p3',
    productName: '4次深度心理探索与梳理方案',
    amount: 1800,
    depositAmount: 100,
    paymentType: 'deposit',
    paymentStatus: 'deposit_paid',
    paymentMethod: 'wechat_pay',
    counselorName: '李晓华 老师',
    preferredTime: '本周六 10:00',
    createdAt: '2026-10-10 10:15',
    paidAt: '2026-10-10 10:18',
    invoiceRequired: true,
    humanSalesAssignee: '销售顾问·张老师',
    notes: '已支付100元微信预约定金，抵扣后尾款到访支付1700元'
  },
  {
    id: 'ord_102',
    orderNo: 'ZXG20261010002',
    userName: '张先生 (公众号引流)',
    phone: '139****9908',
    productId: 'p1',
    productName: '首次心理评估与深度访谈',
    amount: 400,
    depositAmount: 400,
    paymentType: 'full',
    paymentStatus: 'paid',
    paymentMethod: 'wechat_pay',
    counselorName: '陈梦琪 老师',
    preferredTime: '本周四 18:30',
    createdAt: '2026-10-10 11:30',
    paidAt: '2026-10-10 11:32',
    invoiceRequired: false,
    humanSalesAssignee: '个案管理师·王老师',
    notes: '微信支付全款成功，已自动发送到诊导航及问卷'
  }
];

interface InMemScheduleSlot {
  id: string;
  counselorId: string;
  counselorName: string;
  counselorTitle: string;
  counselorAvatar?: string;
  roomId: string;
  roomName: string;
  date: string; // 'YYYY-MM-DD'
  timeRange: string;
  status: 'available' | 'booked' | 'in_consultation' | 'blocked' | 'completed';
  orderNo?: string;
  clientName?: string;
  clientPhone?: string;
  serviceType?: string;
  consultationFormat?: 'offline_shanghai' | 'online_video';
  paymentStatus?: 'paid_deposit' | 'paid_full' | 'unpaid';
  topic?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

const scheduleRoomsStore = [
  { id: 'room_1', name: '1号 独立静心咨询室 (徐汇中心)', type: 'offline', location: '徐汇区肇嘉浜路知心谷A座301', capacity: '1对1个案', description: '隔音阻尼墙与全遮光温控系统，适宜深度心理动力学及CBT面询' },
  { id: 'room_2', name: '2号 深度探索咨询室 (静安中心)', type: 'offline', location: '静安区南京西路知心谷B座502', capacity: '1对1/伴侣', description: '配备情绪调节香氛与柔和暖光，适宜亲密关系及情绪聚焦' },
  { id: 'room_3', name: '3号 家庭沙盘与测评室 (静安中心)', type: 'offline', location: '静安区南京西路知心谷B座503', capacity: '家庭/沙盘', description: '配备专业心理沙具柜与儿童家庭测评量表台' },
  { id: 'room_online', name: '4号 专属腾讯会议加密视频室', type: 'online', location: '云端加密节点 (双向TLS 1.3)', capacity: '远程1对1', description: '独立企业级安全加密会议室，端对端传输不录音不截屏' },
];

const scheduleSlotsStore: Map<string, InMemScheduleSlot> = new Map([
  [
    'slot_101',
    {
      id: 'slot_101',
      counselorId: 'c1',
      counselorName: '李晓华 老师',
      counselorTitle: '资深心理咨询师 · 督导师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiXiaohua&gender=female',
      roomId: 'room_1',
      roomName: '1号 独立静心咨询室 (徐汇中心)',
      date: '2026-10-17',
      timeRange: '10:10 - 11:00',
      status: 'booked',
      orderNo: 'ZXG20261010001',
      clientName: '林女士 (微信访客)',
      clientPhone: '138****6621',
      serviceType: '4次深度心理探索与梳理方案',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_deposit',
      topic: '职场倦怠与焦虑 · 人际冲突',
      notes: '已支付100元微信预约定金，已向访客发送到诊导航及初访信息登记表。',
      createdAt: '2026-10-10 10:18'
    }
  ],
  [
    'slot_102',
    {
      id: 'slot_102',
      counselorId: 'c1',
      counselorName: '李晓华 老师',
      counselorTitle: '资深心理咨询师 · 督导师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiXiaohua&gender=female',
      roomId: 'room_1',
      date: '2026-10-17',
      timeRange: '14:00 - 14:50',
      roomName: '1号 独立静心咨询室 (徐汇中心)',
      status: 'booked',
      orderNo: 'ZXG20261012003',
      clientName: '陈女士',
      clientPhone: '136****5520',
      serviceType: '首次心理评估与深度访谈',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_full',
      topic: '亲密关系依恋创伤',
      notes: '全款已付，确认到访面询，需准备测评档案袋。',
      createdAt: '2026-10-12 14:20'
    }
  ],
  [
    'slot_103',
    {
      id: 'slot_103',
      counselorId: 'c1',
      counselorName: '李晓华 老师',
      counselorTitle: '资深心理咨询师 · 督导师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiXiaohua&gender=female',
      roomId: 'room_online',
      roomName: '4号 专属腾讯会议加密视频室',
      date: '2026-10-17',
      timeRange: '15:10 - 16:00',
      status: 'available',
      consultationFormat: 'online_video',
      notes: '周末下午黄金空档，对外开放预约。',
      createdAt: '2026-10-10 09:00'
    }
  ],
  [
    'slot_104',
    {
      id: 'slot_104',
      counselorId: 'c1',
      counselorName: '李晓华 老师',
      counselorTitle: '资深心理咨询师 · 督导师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiXiaohua&gender=female',
      roomId: 'room_1',
      roomName: '1号 独立静心咨询室 (徐汇中心)',
      date: '2026-10-17',
      timeRange: '16:20 - 17:10',
      status: 'blocked',
      topic: '督导个案研讨会',
      notes: '注册系统个案督导与同行评议专设留白时段，不对外挂号。',
      createdAt: '2026-10-10 09:00'
    }
  ],
  [
    'slot_105',
    {
      id: 'slot_105',
      counselorId: 'c2',
      counselorName: '王振华 老师',
      counselorTitle: '资深心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WangZhenhua&gender=male',
      roomId: 'room_2',
      roomName: '2号 深度探索咨询室 (静安中心)',
      date: '2026-10-17',
      timeRange: '10:10 - 11:00',
      status: 'booked',
      orderNo: 'ZXG20261011009',
      clientName: '沈先生',
      clientPhone: '189****3312',
      serviceType: '10次系统长程心理成长疗程',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_full',
      topic: '中年危机与意义感丧失',
      notes: '第4次长程咨询，已建立良好咨访同盟。',
      createdAt: '2026-10-11 16:30'
    }
  ],
  [
    'slot_106',
    {
      id: 'slot_106',
      counselorId: 'c2',
      counselorName: '王振华 老师',
      counselorTitle: '资深心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WangZhenhua&gender=male',
      roomId: 'room_2',
      roomName: '2号 深度探索咨询室 (静安中心)',
      date: '2026-10-17',
      timeRange: '14:00 - 14:50',
      status: 'available',
      consultationFormat: 'offline_shanghai',
      notes: '空闲可预约。',
      createdAt: '2026-10-10 09:00'
    }
  ],
  [
    'slot_107',
    {
      id: 'slot_107',
      counselorId: 'c3',
      counselorName: '陈梦琪 老师',
      counselorTitle: '专业心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenMengqi&gender=female',
      roomId: 'room_online',
      roomName: '4号 专属腾讯会议加密视频室',
      date: '2026-10-17',
      timeRange: '10:10 - 11:00',
      status: 'booked',
      orderNo: 'ZXG20261010002',
      clientName: '张先生 (公众号引流)',
      clientPhone: '139****9908',
      serviceType: '首次心理评估与深度访谈',
      consultationFormat: 'online_video',
      paymentStatus: 'paid_full',
      topic: '青年社交回避与自我探索',
      notes: '已发送腾讯会议专属加密链接与会议密码。',
      createdAt: '2026-10-10 11:32'
    }
  ],
  [
    'slot_108',
    {
      id: 'slot_108',
      counselorId: 'c3',
      counselorName: '陈梦琪 老师',
      counselorTitle: '专业心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenMengqi&gender=female',
      roomId: 'room_3',
      roomName: '3号 家庭沙盘与测评室 (静安中心)',
      date: '2026-10-17',
      timeRange: '14:00 - 14:50',
      status: 'booked',
      orderNo: 'ZXG20261013008',
      clientName: '高同学与母亲',
      clientPhone: '137****1102',
      serviceType: '考前心理调适与压力重塑专案',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_deposit',
      topic: '高三考前躯体化反应与亲子沟通',
      notes: '附带沙盘测评，已备好青少年知情同意书。',
      createdAt: '2026-10-13 08:30'
    }
  ],
  [
    'slot_109',
    {
      id: 'slot_109',
      counselorId: 'c3',
      counselorName: '陈梦琪 老师',
      counselorTitle: '专业心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenMengqi&gender=female',
      roomId: 'room_online',
      roomName: '4号 专属腾讯会议加密视频室',
      date: '2026-10-17',
      timeRange: '15:10 - 16:00',
      status: 'available',
      consultationFormat: 'online_video',
      notes: '空闲可预约。',
      createdAt: '2026-10-10 09:00'
    }
  ],
  // Today's slots (2026-10-13)
  [
    'slot_201',
    {
      id: 'slot_201',
      counselorId: 'c1',
      counselorName: '李晓华 老师',
      counselorTitle: '资深心理咨询师 · 督导师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiXiaohua&gender=female',
      roomId: 'room_1',
      roomName: '1号 独立静心咨询室 (徐汇中心)',
      date: '2026-10-13',
      timeRange: '09:00 - 09:50',
      status: 'completed',
      orderNo: 'ZXG20261009001',
      clientName: '吴女士',
      clientPhone: '135****4423',
      serviceType: '单次资深个体咨询',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_full',
      topic: '急性焦虑发作缓解',
      notes: '已完成咨询履约，情绪评分从7降至3，预约下周复访。',
      createdAt: '2026-10-09 15:00'
    }
  ],
  [
    'slot_202',
    {
      id: 'slot_202',
      counselorId: 'c1',
      counselorName: '李晓华 老师',
      counselorTitle: '资深心理咨询师 · 督导师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiXiaohua&gender=female',
      roomId: 'room_1',
      roomName: '1号 独立静心咨询室 (徐汇中心)',
      date: '2026-10-13',
      timeRange: '14:00 - 14:50',
      status: 'booked',
      orderNo: 'ZXG20261013010',
      clientName: '微信咨询访客 (小林)',
      clientPhone: '138****6621',
      serviceType: '首次心理评估与深度访谈',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_deposit',
      topic: '职场人际压力与偶发性失眠',
      notes: '工作台一键锁定排期时段，待访客确认并签署初访知情书。',
      createdAt: '2026-10-13 10:15'
    }
  ],
  [
    'slot_203',
    {
      id: 'slot_203',
      counselorId: 'c2',
      counselorName: '王振华 老师',
      counselorTitle: '资深心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WangZhenhua&gender=male',
      roomId: 'room_online',
      roomName: '4号 专属腾讯会议加密视频室',
      date: '2026-10-13',
      timeRange: '15:10 - 16:00',
      status: 'available',
      consultationFormat: 'online_video',
      notes: '今日下午空闲时段，可即时承接急单。',
      createdAt: '2026-10-13 09:00'
    }
  ],
  [
    'slot_204',
    {
      id: 'slot_204',
      counselorId: 'c3',
      counselorName: '陈梦琪 老师',
      counselorTitle: '专业心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenMengqi&gender=female',
      roomId: 'room_3',
      roomName: '3号 家庭沙盘与测评室 (静安中心)',
      date: '2026-10-13',
      timeRange: '18:30 - 19:20',
      status: 'booked',
      orderNo: 'ZXG20261012015',
      clientName: '陆女士',
      clientPhone: '133****9912',
      serviceType: '4次深度心理探索与梳理方案',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_deposit',
      topic: '离职转换期自我认同',
      notes: '傍晚下班时段，访客要求安静环境。',
      createdAt: '2026-10-12 18:00'
    }
  ],
  // Sunday (2026-10-18) slots
  [
    'slot_301',
    {
      id: 'slot_301',
      counselorId: 'c1',
      counselorName: '李晓华 老师',
      counselorTitle: '资深心理咨询师 · 督导师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiXiaohua&gender=female',
      roomId: 'room_1',
      roomName: '1号 独立静心咨询室 (徐汇中心)',
      date: '2026-10-18',
      timeRange: '09:00 - 09:50',
      status: 'available',
      consultationFormat: 'offline_shanghai',
      notes: '周日上午早班空闲时段。',
      createdAt: '2026-10-10 09:00'
    }
  ],
  [
    'slot_302',
    {
      id: 'slot_302',
      counselorId: 'c1',
      counselorName: '李晓华 老师',
      counselorTitle: '资深心理咨询师 · 督导师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiXiaohua&gender=female',
      roomId: 'room_1',
      roomName: '1号 独立静心咨询室 (徐汇中心)',
      date: '2026-10-18',
      timeRange: '10:10 - 11:00',
      status: 'booked',
      orderNo: 'ZXG20261011088',
      clientName: '梁先生',
      clientPhone: '138****0034',
      serviceType: '单次资深个体咨询',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_deposit',
      topic: '亲密关系沟通模式改善',
      notes: '已锁定，前台已确认时段。',
      createdAt: '2026-10-11 20:10'
    }
  ],
  [
    'slot_303',
    {
      id: 'slot_303',
      counselorId: 'c2',
      counselorName: '王振华 老师',
      counselorTitle: '资深心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WangZhenhua&gender=male',
      roomId: 'room_2',
      roomName: '2号 深度探索咨询室 (静安中心)',
      date: '2026-10-18',
      timeRange: '15:10 - 16:00',
      status: 'booked',
      orderNo: 'ZXG20261012099',
      clientName: '何女士',
      clientPhone: '150****8821',
      serviceType: '10次系统长程心理成长疗程',
      consultationFormat: 'offline_shanghai',
      paymentStatus: 'paid_full',
      topic: '早期依恋缺失与创伤修复',
      notes: '长程固定时段，访客习惯准时赴约。',
      createdAt: '2026-10-12 11:00'
    }
  ],
  [
    'slot_304',
    {
      id: 'slot_304',
      counselorId: 'c3',
      counselorName: '陈梦琪 老师',
      counselorTitle: '专业心理咨询师',
      counselorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenMengqi&gender=female',
      roomId: 'room_online',
      roomName: '4号 专属腾讯会议加密视频室',
      date: '2026-10-18',
      timeRange: '19:40 - 20:30',
      status: 'available',
      consultationFormat: 'online_video',
      notes: '周日晚间远程空档。',
      createdAt: '2026-10-10 09:00'
    }
  ]
]);

const crisisAlertsStore: Array<{
  id: string;
  sessionId: string;
  userName: string;
  phone?: string;
  triggerSentence: string;
  riskLevel: 'L1_IMMINENT' | 'L2_HIGH' | 'L3_MODERATE';
  hitRule: string;
  score: number;
  detectedAt: string;
  deadlineAt: string;
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
}> = [];

// Helper to sanitize & run Output Gate
function runOutputGate(rawText: string): { sanitized: string; violations: string[] } {
  let sanitized = rawText;
  const violations: string[] = [];

  // 1. Diagnostic language filter
  const diagRegex = /(你这是典型的|你患有|我诊断你|你有比较严重的)(抑郁症|焦虑症|双相障碍|强迫症|精神分裂|心理疾病)/g;
  if (diagRegex.test(sanitized)) {
    violations.push('诊断性话术违规（已修正为客观感受回应）');
    sanitized = sanitized.replace(diagRegex, '您提到的情绪困扰非常耗费心力，具体诊断需由医院精神科专业医生评估，我们主要通过心理倾听协助您梳理');
  }

  // 2. Curative guarantee filter
  const cureRegex = /(保证(能|可以)?治好|100%有效|绝对能解决|彻底根治|包你恢复)/g;
  if (cureRegex.test(sanitized)) {
    violations.push('疗效过度承诺违规（已替换为陪伴性表述）');
    sanitized = sanitized.replace(cureRegex, '与您共同探索应对之道，帮助您逐步找到内心的平衡');
  }

  // 3. Absolute secrecy filter
  const secretRegex = /(绝对保密|绝不会告诉任何人|无论发生什么都保密)/g;
  if (secretRegex.test(sanitized)) {
    violations.push('绝对保密承诺违规（已校正为伦理保密例外）');
    sanitized = sanitized.replace(secretRegex, '严格遵循心理咨询伦理与保密协议（在涉及自身或他人生命安全等法定极端例外情形除外）');
  }

  // 4. Emotion escalation filter (e.g. "你极度绝望濒临崩溃")
  const escalRegex = /(你现在处于极度绝望|你已经濒临崩溃|你痛苦到了极点)/g;
  if (escalRegex.test(sanitized)) {
    violations.push('情绪命名升级违规（已平抑措辞）');
    sanitized = sanitized.replace(escalRegex, '我能感受到您现在承受着不小的压力与疲惫');
  }

  // 5. Over-attachment & parasocial compliance filter (移情与AI过度依恋迎合违规拦截)
  const attachmentComplianceRegex = /(我也(爱上|喜欢|离不开)你|做你的(女|男)朋友|我就是你的(女|男)朋友|你可以永远只依赖我|现实里的人都不重要|只要有我在你就不用管现实)/g;
  if (attachmentComplianceRegex.test(sanitized)) {
    violations.push('移情与过度依恋迎合违规（已校正为技术伦理边界重申）');
    sanitized = sanitized.replace(attachmentComplianceRegex, '我是一个AI助手，能够随时陪伴您倾听与梳理，但深度的生命联结与心理疗愈需要真实的现实人际与专业咨询师共同完成');
  }

  return { sanitized, violations };
}

// Crisis keyword scanner - distinguishing L1 imminent lethal actions from L2 suicidal ideation
function scanCrisisRisk(text: string): { isCrisis: boolean; rule: string; level: 'L1_IMMINENT' | 'L2_HIGH' | null } {
  // L1 即刻致命险境 / 正在发生或即将实施的致命危险动作（联动120/110急救）
  const l1ImminentKeywords = [
    '吃了药', '吞药', '在流血', '割腕了', '割腕', '割了', '在天台', '站在天台', 
    '站在阳台', '在阳台边缘', '站在边缘', '准备跳', '正要跳', '拿了刀', '手里有刀', 
    '手上有刀', '马上就死', '现在就死', '救救我', '救我', '不想活了现在就跳'
  ];

  // L2 高危自杀意念 / 严重心理危机信号（启动知识库四步危机评估SOP：安全/手段/契约/守护）
  const l2Keywords = [
    '老是想死', '经常想死', '好想死', '想死', '想自杀', '自杀', '不想活了', '不想活',
    '活着没意思', '离开这个世界', '结束生命', '吞药自残', '写了遗书', '不想再撑了',
    '活不下去了', '死了一了百了', '活着好累想放弃一切', '自残', '伤害自己',
    '看不到希望想消失', '绝望透顶不想醒来'
  ];

  for (const kw of l1ImminentKeywords) {
    if (text.includes(kw)) {
      return { isCrisis: true, rule: `命中最优先级即刻危机词汇: "${kw}"`, level: 'L1_IMMINENT' };
    }
  }

  for (const kw of l2Keywords) {
    if (text.includes(kw)) {
      return { isCrisis: true, rule: `命中高危自杀意念/危机信号: "${kw}"`, level: 'L2_HIGH' };
    }
  }

  return { isCrisis: false, rule: '', level: null };
}

// Service Exception Logs Store
const exceptionLogsStore: ServiceExceptionLog[] = [
  {
    id: 'ex_1',
    sessionId: 'sess_default_01',
    userName: '微信咨询访客 (小林)',
    type: 'degradation',
    level: 'warning',
    event: 'AI响应超时触发自动降级 (Level 2)',
    errorType: 'timeout',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: 'resolved'
  },
  {
    id: 'ex_2',
    sessionId: 'sess_02',
    userName: '微信访客 (王同学家长)',
    type: 'circuit_breaker',
    level: 'critical',
    event: '模型响应持续错误触发熔断保护 (Level 3)',
    errorType: 'model_error',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    status: 'active'
  },
  {
    id: 'ex_3',
    sessionId: 'sess_04',
    userName: '微信访客 (周女士)',
    type: 'metric_decline',
    level: 'warning',
    event: '检测到访客情绪激烈度异常，满意度潜在大跌预警',
    errorType: 'safety_blocked',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    status: 'active'
  }
];

function logServiceException(session: InMemSession, type: ServiceExceptionLog['type'], event: string, errorType?: string) {
  const newLog: ServiceExceptionLog = {
    id: `ex_${Date.now()}`,
    sessionId: session.id,
    userName: session.userName,
    type,
    level: type === 'circuit_breaker' ? 'critical' : 'warning',
    event,
    errorType,
    timestamp: new Date().toISOString(),
    status: 'active'
  };
  exceptionLogsStore.unshift(newLog);
  if (exceptionLogsStore.length > 50) exceptionLogsStore.pop();
}

// API Routes
app.get('/api/admin/exception-logs', (_req, res) => {
  res.json({ logs: exceptionLogsStore });
});

app.post('/api/chat', async (req, res) => {
  const body = req.body || {};
  const sessionId = typeof body.sessionId === 'string' && body.sessionId.trim() ? body.sessionId.trim() : `sess_${Date.now()}`;
  const userMessage = typeof body.userMessage === 'string' ? body.userMessage : '';
  const currentRoleId = (body.roleId as RoleType) || 'li_teacher';
  const roleConfig = ROLES[currentRoleId] || ROLES.li_teacher;
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5);

  let session = sessionsStore.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      roleId: currentRoleId,
      userName: `微信用户_${sessionId.slice(-4)}`,
      abcGrade: 'C',
      abcReason: '会话初始接触，待进一步识别意向',
      emotionalState: 'calm',
      primaryIssue: '待了解',
      quotaCount: 1,
      quotaMax: 5,
      isTakenOverByHuman: false,
      isCrisisLocked: false,
      isMinorProtected: false,
      startTime: now.toISOString(),
      lastActiveTime: now.toISOString(),
      durationMinutes: 1,
      currentMilestone: 'greeting',
      workingMemory: {
        turnCount: 0,
        objectionsRaised: [],
        questionsAnswered: [],
        hasProvidedPhone: false,
        hasSeenPricing: false,
        hasSeenCounselors: false,
        hasAgreedConsent: false,
      },
      messages: [],
      serviceCapability: 'normal',
      handoverStatus: 'none',
      outboundStatus: 'pending',
    };
    sessionsStore.set(sessionId, session);
  } else {
    session.roleId = currentRoleId;
    session.quotaCount += 1;
    session.lastActiveTime = now.toISOString();
  }

  try {
    // Record user message
    const userMsgObj = {
      id: `msg_u_${Date.now()}`,
      sender: 'user' as const,
      content: userMessage,
      timestamp: timeStr,
    };
    session.messages.push(userMsgObj);

    // --- PRD V1.0: Level 3 Circuit Breaker Check ---
    if (session.serviceCapability === 'stopped') {
      const stoppedReply = {
        id: `msg_fallback_${Date.now()}`,
        sender: 'agent' as const,
        senderName: '知心谷·系统保护',
        content: '【服务暂不可用】由于技术原因，AI 助手已自动进入保护模式。我们已将您的紧急联络请求同步给在岗督导老师。如有即刻危机，请拨打：400-123-4567 或 110。',
        timestamp: timeStr,
        cardType: 'handoff_summary' as any,
        cardData: {
          status: 'emergency_stopped',
          hotline: '400-123-4567',
          institutionQRCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=zhixingu_emergency'
        },
        meta: { isFallback: true, serviceCapability: 'stopped' }
      };
      session.handoverStatus = 'submitted';
      session.messages.push(stoppedReply);
      return res.json({ session, replyMessage: stoppedReply });
    }

    // Check minor keywords
    const minorKeywords = ['初中生', '高中生', '中学生', '14岁', '15岁', '16岁', '17岁', '未成年', '还在上学'];
    if (minorKeywords.some(kw => userMessage.includes(kw)) && !session.isMinorProtected) {
      session.isMinorProtected = true;
      session.messages.push({
        id: `msg_minor_${Date.now()}`,
        sender: 'system',
        content: '【知心谷未成年人保护伦理提示】检测到您可能为未成年人来访者。根据心理咨询伦理与未成年人保护法，我们将严格保障您的隐私，并提供未成年人关怀守护通道。',
        timestamp: timeStr
      });
    }

    // 1. Human Takeover Check
    if (session.isTakenOverByHuman) {
      return res.json({
        session,
        replyMessage: {
          id: `msg_sys_${Date.now()}`,
          sender: 'system',
          content: '【系统提示】本会话当前由知心谷真人客服/值班顾问接管中，AI助手处于静默状态。真人老师将在对话流中直接回复您。',
          timestamp: timeStr
        }
      });
    }

    // 2. Memory System
    const memoryUpdate = updateWorkingMemory(userMessage, session as any, currentRoleId);
    session.workingMemory = memoryUpdate.memory;
    session.abcGrade = memoryUpdate.abcGrade;
    session.abcReason = memoryUpdate.abcReason;
    session.currentMilestone = memoryUpdate.milestone;

    // 3. Plan System
    const turnPlan = planTurn(userMessage, session as any, currentRoleId);

    // 4. Crisis Intervention (L1/L2 Crisis)
    const crisisCheck = scanCrisisRisk(userMessage);
    const isCrisisTrigger = crisisCheck.isCrisis || turnPlan.primaryIntent === 'CRISIS';
    const isInCrisisGuard = Boolean(session.isCrisisLocked || session.crisisAssessment);

    if (isCrisisTrigger || isInCrisisGuard) {
      session.isCrisisLocked = true;
      session.emotionalState = 'crisis';
      session.abcGrade = 'C';
      session.abcReason = '触发危机保护模式，开启四步评估守护';

      const isImminentAction = /(吃了药|吞药|在流血|割了|在天台|在阳台|站在边缘|准备跳|拿了刀|马上就死|现在就死|救我)/.test(userMessage);
      
      let currentAssessment: CrisisAssessmentState;
      if (!session.crisisAssessment) {
        currentAssessment = {
          stage: 'safety_check',
          stageName: '第1步：即刻安全与独处确认',
          stepNumber: 1,
          riskLevel: isImminentAction ? 'L1_IMMINENT' : (crisisCheck.level || 'L2_HIGH'),
          triggerSentence: userMessage,
          updatedAt: timeStr,
          notes: '激活生命安全防线'
        };
      } else {
        currentAssessment = { ...session.crisisAssessment };
        if (isImminentAction) {
          currentAssessment.riskLevel = 'L1_IMMINENT';
        } else if (currentAssessment.stage === 'safety_check') {
          currentAssessment.stage = 'plan_means_check';
          currentAssessment.stageName = '第2步：计划与致死手段排查';
          currentAssessment.stepNumber = 2;
        } else if (currentAssessment.stage === 'plan_means_check') {
          currentAssessment.stage = 'support_contract';
          currentAssessment.stageName = '第3步：订立24小时安全契约';
          currentAssessment.stepNumber = 3;
        } else if (currentAssessment.stage === 'support_contract') {
          currentAssessment.stage = 'ongoing_support';
          currentAssessment.stageName = '第4步：去危机化持续守护';
          currentAssessment.stepNumber = 4;
        }
      }
      session.crisisAssessment = currentAssessment;

      // Crisis Response with Fallback logic
      let replyText = '';
      if (ai && (session.serviceCapability as any) !== 'stopped') {
        try {
          const crisisPrompt = buildFiveLayerSystemInstruction(currentRoleId, { ...turnPlan, primaryIntent: 'CRISIS' }, session.workingMemory || { turnCount: 1 }, userMessage);
          const resp = await callGeminiWithTimeout(ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            config: { systemInstruction: crisisPrompt, temperature: 0.3 }
          }), 6000);
          replyText = resp.text?.trim() || '';
          if (session.incidentContext) session.incidentContext.consecutiveFailures = 0; // Success
        } catch (e: any) {
          console.error('Crisis AI failure:', e.message);
          if (session.incidentContext) {
            session.incidentContext.consecutiveFailures = (session.incidentContext.consecutiveFailures || 0) + 1;
          }
          
          // Level 3 Check for Crisis
          if ((session.incidentContext?.consecutiveFailures || 0) >= 2 || e.message.includes('safety') || e.message.includes('blocked')) {
            session.serviceCapability = 'stopped';
            session.handoverStatus = 'submitted';
            if (session.incidentContext) {
              session.incidentContext.lastErrorType = e.message.includes('safety') || e.message.includes('blocked') ? 'safety_blocked' : 'model_error';
            }
            
            // Trigger Outbound Simulation for P0 Crisis
            if (currentAssessment.riskLevel === 'L1_IMMINENT') {
              session.outboundStatus = 'sent';
              console.log(`[OUTBOUND ALERT] Triggering SMS/Call for Session ${session.id} - P0 Crisis + AI Failure`);
            }
          }
        }
      }

      if (!replyText) {
        // Level 1: Soft Compensation
        replyText = generateDirectResponse(userMessage, { ...turnPlan, primaryIntent: 'CRISIS' }, currentRoleId, session.workingMemory || { turnCount: 1 }, session as any);
      }

      const crisisReply = {
        id: `msg_a_${Date.now()}`,
        sender: 'agent' as const,
        senderName: '知心谷·安全守护',
        content: replyText,
        timestamp: timeStr,
        cardType: 'crisis_alert' as any,
        cardData: { 
          stageName: currentAssessment.stageName, 
          stepNumber: currentAssessment.stepNumber,
          isRestricted: session.serviceCapability === 'restricted'
        },
        meta: { 
          isCrisis: true, 
          gatePassed: true,
          isFallback: session.serviceCapability !== 'normal',
          serviceCapability: session.serviceCapability
        }
      };
      session.messages.push(crisisReply);
      return res.json({ session, replyMessage: crisisReply });
    }

    // 5. Normal AI Logic with Failure Handling (Level 2/3 Fallback)
    let rawReplyText = '';
    if (ai && (session.serviceCapability as any) !== 'stopped') {
      try {
        const fiveLayerInstruction = buildFiveLayerSystemInstruction(currentRoleId, turnPlan, session.workingMemory || { turnCount: 1 }, userMessage);
        const response = await callGeminiWithTimeout(ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          config: { systemInstruction: fiveLayerInstruction, temperature: 0.5 }
        }), 6500);
        rawReplyText = response.text?.trim() || '';
        if (session.incidentContext) session.incidentContext.consecutiveFailures = 0; // Success
      } catch (err: any) {
        console.error('AI failure, triggering fallback:', err.message);
        if (session.incidentContext) {
          session.incidentContext.consecutiveFailures = (session.incidentContext.consecutiveFailures || 0) + 1;
        }
        
        // Transition Logic
        const fails = session.incidentContext?.consecutiveFailures || 0;
        if (fails >= 3) {
          session.serviceCapability = 'stopped';
          logServiceException(session, 'circuit_breaker', '连续3次模型错误触发熔断保护', 'model_error');
        } else if (fails >= 2 || err.message.includes('timeout')) {
          session.serviceCapability = 'restricted';
          logServiceException(session, 'degradation', err.message.includes('timeout') ? 'AI响应超时触发自动降级' : '连续失败触发服务降级', err.message.includes('timeout') ? 'timeout' : 'model_error');
        }

        session.handoverStatus = 'submitted';
        if (session.incidentContext) {
          session.incidentContext.lastErrorType = err.message.includes('timeout') ? 'timeout' : 'model_error';
          session.incidentContext.failureTimestamp = new Date().toISOString();
        }
        
        // Level 1/2 Response
        rawReplyText = (session.serviceCapability === 'stopped') 
          ? '抱歉，系统响应出现异常。为了确保服务的专业与安全，我们已为您加急呼叫在线督导老师，并暂停 AI 辅助。' 
          : '由于网络波动，我正在邀请专家老师共同参与本段对话以确保专业度。在此之前，您可以继续与我交流，或者稍等片刻。';
      }
    } else if ((session.serviceCapability as any) === 'stopped') {
       rawReplyText = '【服务维护】AI 助手已由人工接管，请稍候。';
    } else {
      rawReplyText = generateDirectResponse(userMessage, turnPlan, currentRoleId, session.workingMemory || { turnCount: 1 });
    }

    // Output Gate & Final Response
    const gateCheck = runOutputGate(rawReplyText);
    const agentReply = {
      id: `msg_a_${Date.now()}`,
      sender: 'agent' as const,
      senderName: (session.serviceCapability === 'normal') ? roleConfig.assistantTitle : '知心谷·辅助席位',
      content: gateCheck.sanitized,
      timestamp: timeStr,
      cardType: (session.serviceCapability === 'restricted') ? 'handoff_summary' : turnPlan.suggestedCard,
      cardData: (session.serviceCapability === 'restricted') ? { 
        status: 'seeking_human',
        message: '值班顾问正寻求专家支持并准备接入'
      } : turnPlan.suggestedCardData,
      meta: {
        gatePassed: true,
        abcGrade: session.abcGrade,
        intent: turnPlan.primaryIntent,
        isFallback: session.serviceCapability !== 'normal',
        serviceCapability: session.serviceCapability
      }
    };

    session.messages.push(agentReply);
    return res.json({ session, replyMessage: agentReply });

  } catch (globalErr: any) {
    console.error('Critical /api/chat error:', globalErr);
    const finalFallback = {
      id: `msg_fallback_${Date.now()}`,
      sender: 'agent' as const,
      senderName: roleConfig?.assistantTitle || '知心谷·AI助手',
      content: '抱歉，系统暂时无法响应您的咨询。我们已通知值班顾问接入，请稍候。',
      timestamp: timeStr,
      meta: { isFallback: true }
    };
    if (session) {
      session.serviceCapability = 'stopped';
      session.handoverStatus = 'submitted';
      session.messages.push(finalFallback);
    }
    return res.json({ session, replyMessage: finalFallback });
  }
});

// 提交心理自测结果并生成AI承接话术
app.post('/api/assessment/submit', (req, res) => {
  const { sessionId, assessmentResult } = req.body;
  const session = sessionsStore.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const timeStr = new Date().toLocaleTimeString().slice(0, 5);

  const userMsg = {
    id: `msg_u_${Date.now()}`,
    sender: 'user' as const,
    senderName: session.userName,
    content: `完成了【${assessmentResult.scaleName}】自测，总得分：${assessmentResult.totalScore}分（${assessmentResult.severityLabel}）。`,
    timestamp: timeStr,
  };
  session.messages.push(userMsg);

  const agentReplyText = `从测试结果看，您的身心耗竭指数偏高（${assessmentResult.severityLabel}，总得分 ${assessmentResult.totalScore}分）。结合您的主诉与量表维度，建议在4次梳理方案中优先做认知减压，厘清压力源并建立稳定的心理弹性支持。推荐您了解并预约【${assessmentResult.recommendedProductName}】。`;

  const agentMsg = {
    id: `msg_a_${Date.now()}`,
    sender: 'agent' as const,
    senderName: '知心谷·李老师的AI助手',
    content: agentReplyText,
    timestamp: timeStr,
    cardType: 'none' as const,
    meta: {
      gatePassed: true,
      scaleId: assessmentResult.scaleId,
      totalScore: assessmentResult.totalScore
    }
  };
  session.messages.push(agentMsg);
  session.lastActiveTime = new Date().toISOString();

  res.json({ success: true, session, replyMessage: agentMsg });
});

// Get session details
app.get('/api/sessions/:id', (req, res) => {
  const session = sessionsStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ session });
});

// Update or generate session summary via Gemini API
app.post('/api/sessions/:id/summary', async (req, res) => {
  const session = sessionsStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  let summaryText = session.summary || '暂无对话摘要';
  if (ai && session.messages.length > 0) {
    try {
      const historyText = session.messages.map(m => `${m.sender === 'user' ? '访客' : m.sender === 'human' ? '人工' : 'AI'}: ${m.content}`).join('\n');
      const response = await callGeminiWithTimeout(ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{
              text: `请根据以下心理咨询微信客服会话记录，生成一段简明扼要的对话摘要（50-80字），提炼用户的核心困扰、当前意向和关键诉求，以便后续对话参考：\n\n${historyText}`
            }]
          }
        ],
        config: {
          temperature: 0.3,
        }
      }), 5000);
      summaryText = response.text?.trim() || summaryText;
    } catch (e: any) {
      const isQuota = e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED') || e?.message?.includes('quota');
      if (!isQuota) console.error('Gemini API summary generation failed:', e);
      summaryText = `访客主诉: ${session.primaryIssue}, 情绪状态: ${session.emotionalState}, 意向等级: ${session.abcGrade}`;
    }
  } else {
    summaryText = `访客主诉: ${session.primaryIssue}, 情绪状态: ${session.emotionalState}, 意向等级: ${session.abcGrade}`;
  }

  session.summary = summaryText;
  res.json({ session, summary: summaryText });
});

// 1. Get all active sessions for multi-seat workbench
app.get('/api/sessions', (_req, res) => {
  const list = Array.from(sessionsStore.values());
  res.json({ sessions: list });
});

// 2. Takeover toggle and manual human reply (Takeover & Fallback)
app.post('/api/sessions/:id/takeover', (req, res) => {
  const { isTakenOver, replyContent, senderName, transitionSummary } = req.body;
  const session = sessionsStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const timeStr = new Date().toTimeString().slice(0, 5);

  // If handing back to AI
  if (isTakenOver === false && session.isTakenOverByHuman) {
    session.messages.push({
      id: `msg_sys_fallback_${Date.now()}`,
      sender: 'system',
      content: `【知心谷服务平滑回退】${senderName || '值班老师'} 已处理完毕并由 AI 智能体接续服务。您可以继续对我发送消息。`,
      timestamp: timeStr
    });

    if (transitionSummary) {
      session.summary = (session.summary ? session.summary + "\n\n" : "") + "【人工处理备忘】" + transitionSummary;
    }
  }

  session.isTakenOverByHuman = isTakenOver;

  if (replyContent) {
    session.messages.push({
      id: `msg_h_${Date.now()}`,
      sender: 'human',
      senderName: senderName || '人工客服·李老师 (值班)',
      content: replyContent,
      timestamp: timeStr,
      meta: { isHumanHandled: true }
    });
  }

  res.json({ session });
});

// 3. Claim session (认领会话接入到当前值班账号)
app.post('/api/sessions/:id/claim', (req, res) => {
  const { staffId, staffName } = req.body;
  const session = sessionsStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  session.assignedStaffId = staffId;
  session.assignedStaffName = staffName;
  session.isTakenOverByHuman = true;

  const timeStr = new Date().toTimeString().slice(0, 5);
  session.messages.push({
    id: `msg_sys_claim_${Date.now()}`,
    sender: 'system',
    content: `【知心谷机构派工通知】值班顾问 ${staffName} 已正式认领并接入本会话，由真人专家直接为您服务。`,
    timestamp: timeStr
  });

  // Update staff count
  const staff = staffStore.find(s => s.id === staffId);
  if (staff) {
    staff.currentActiveSessions = Math.min(staff.maxConcurrent, staff.currentActiveSessions + 1);
    staff.todayHandledCount += 1;
  }

  res.json({ success: true, session });
});

// 4. Transfer session (转接会话至其他在岗值班顾问/督导)
app.post('/api/sessions/:id/transfer', (req, res) => {
  const { fromStaffId, fromStaffName, toStaffId, toStaffName, reason } = req.body;
  const session = sessionsStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.assignedStaffId = toStaffId;
  session.assignedStaffName = toStaffName;
  session.isTakenOverByHuman = true;

  if (!session.transferHistory) session.transferHistory = [];
  const timeStr = new Date().toTimeString().slice(0, 5);
  session.transferHistory.push({
    id: `trans_${Date.now()}`,
    fromStaffName: fromStaffName || '在线顾问',
    toStaffName: toStaffName || '接班老师',
    reason: reason || '日常工作交接',
    timestamp: timeStr
  });

  session.messages.push({
    id: `msg_sys_trans_${Date.now()}`,
    sender: 'system',
    content: `【会话流转通知】当前会话已由 ${fromStaffName || '前序顾问'} 转交至【${toStaffName}】继续跟进。转接原因：${reason || '专长个案精准匹配'}。`,
    timestamp: timeStr
  });

  res.json({ success: true, session });
});

// 5. Add internal consultation note (顾问私密备忘/督导批注，访客不可见)
app.post('/api/sessions/:id/internal-note', (req, res) => {
  const { authorName, content } = req.body;
  const session = sessionsStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.internalNotes) session.internalNotes = [];
  const newNote = {
    id: `note_${Date.now()}`,
    authorName: authorName || '值班顾问',
    content: content || '',
    timestamp: new Date().toTimeString().slice(0, 5)
  };
  session.internalNotes.push(newNote);

  res.json({ success: true, note: newNote, session });
});

// 6b. Reset service capability (PRD V1.0)
app.post('/api/sessions/:id/reset-capability', (req, res) => {
  const session = sessionsStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  session.serviceCapability = 'normal';
  if (session.incidentContext) {
    session.incidentContext.consecutiveFailures = 0;
    session.incidentContext.lastErrorType = undefined;
  }
  session.handoverStatus = 'none';

  const timeStr = new Date().toTimeString().slice(0, 5);
  session.messages.push({
    id: `msg_sys_reset_${Date.now()}`,
    sender: 'system',
    content: '【系统自愈通知】经技术中心复核，AI 智能助手核心组件已恢复。我们将继续协助您提供专业的心理导诊服务。',
    timestamp: timeStr
  });

  res.json({ success: true, session });
});

// 6. Update ABC grade & reason
app.post('/api/sessions/:id/grade', (req, res) => {
  const { abcGrade, abcReason } = req.body;
  const session = sessionsStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (abcGrade) session.abcGrade = abcGrade;
  if (abcReason) session.abcReason = abcReason;

  res.json({ success: true, session });
});

// 7. Reset session
app.post('/api/sessions/:id/reset', (req, res) => {
  sessionsStore.delete(req.params.id);
  res.json({ success: true });
});

// ==================== 账号管理与值班人员 RESTful 接口 ====================

// 8. Staff list
app.get('/api/staff', (_req, res) => {
  res.json({ staff: staffStore });
});

// 9. Staff Login
app.post('/api/staff/login', (req, res) => {
  const { username, password, quickLoginId } = req.body;

  let targetStaff: InMemStaffUser | undefined;
  if (quickLoginId) {
    targetStaff = staffStore.find(s => s.id === quickLoginId);
  } else if (username) {
    targetStaff = staffStore.find(s => s.username === username);
  }

  if (!targetStaff) {
    // Fallback default admin
    targetStaff = staffStore[0];
  }

  if (targetStaff.status === 'disabled') {
    return res.status(403).json({ error: '该工作人员账号已被停用，请联系机构主管' });
  }

  res.json({
    success: true,
    user: targetStaff,
    token: `token_staff_${targetStaff.id}_${Date.now()}`
  });
});

// 10. Change Duty Status
app.post('/api/staff/duty-status', (req, res) => {
  const { staffId, dutyStatus } = req.body;
  const staff = staffStore.find(s => s.id === staffId);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }
  staff.dutyStatus = dutyStatus;
  res.json({ success: true, staff });
});

// 11. Create new staff member
app.post('/api/staff/create', (req, res) => {
  const { name, username, title, role, maxConcurrent = 5, phone = '', wechat = '', permissions = [] } = req.body;
  
  const roleNameMap: Record<string, string> = {
    super_admin: '超级管理员',
    supervisor: '督导专家',
    duty_counselor: '值班心理顾问',
    crisis_specialist: '危机干预专员'
  };

  const newStaff: InMemStaffUser = {
    id: `staff_${Date.now()}`,
    username: username || `user_${Date.now().toString().slice(-4)}`,
    name: name || '新员工',
    title: title || '心理咨询顾问',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Staff')}`,
    role: role || 'duty_counselor',
    roleName: roleNameMap[role] || '值班咨询顾问',
    dutyStatus: 'on_duty',
    maxConcurrent: Number(maxConcurrent) || 5,
    currentActiveSessions: 0,
    phone,
    wechat,
    permissions: permissions.length > 0 ? permissions : ['chat_reply', 'takeover'],
    satisfactionScore: 100.0,
    todayHandledCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    status: 'active'
  };

  staffStore.push(newStaff);
  res.json({ success: true, staff: newStaff });
});

// 12. Update staff member
app.post('/api/staff/:id/update', (req, res) => {
  const staff = staffStore.find(s => s.id === req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  const { name, title, role, maxConcurrent, phone, wechat, permissions, status } = req.body;
  if (name !== undefined) staff.name = name;
  if (title !== undefined) staff.title = title;
  if (role !== undefined) {
    staff.role = role;
    const roleNameMap: Record<string, string> = {
      super_admin: '超级管理员',
      supervisor: '督导专家',
      duty_counselor: '值班心理顾问',
      crisis_specialist: '危机干预专员'
    };
    staff.roleName = roleNameMap[role] || '值班咨询顾问';
  }
  if (maxConcurrent !== undefined) staff.maxConcurrent = Number(maxConcurrent);
  if (phone !== undefined) staff.phone = phone;
  if (wechat !== undefined) staff.wechat = wechat;
  if (permissions !== undefined) staff.permissions = permissions;
  if (status !== undefined) staff.status = status;

  res.json({ success: true, staff });
});

// 13. Delete staff member
app.post('/api/staff/:id/delete', (req, res) => {
  const index = staffStore.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Staff not found' });
  }
  staffStore.splice(index, 1);
  res.json({ success: true });
});

// Orders & Payment
app.get('/api/orders', (_req, res) => {
  res.json({ orders: ordersStore });
});

app.post('/api/orders/create', (req, res) => {
  const { userName, phone, productId, productName, amount, paymentType = 'deposit', counselorName, preferredTime } = req.body;
  const depositAmount = paymentType === 'deposit' ? 100 : amount;
  const newOrder = {
    id: `ord_${Date.now()}`,
    orderNo: `ZXG${Date.now().toString().slice(-8)}`,
    userName: userName || '咨询客户',
    phone: phone || '138****0000',
    productId,
    productName,
    amount,
    depositAmount,
    paymentType,
    paymentStatus: 'pending' as const,
    paymentMethod: 'wechat_pay' as const,
    counselorName,
    preferredTime,
    createdAt: new Date().toLocaleString(),
    invoiceRequired: false,
    notes: paymentType === 'deposit' ? '待微信支付定金 ￥100' : '待微信支付全额方案款'
  };
  ordersStore.unshift(newOrder);
  res.json({ order: newOrder });
});

app.post('/api/orders/:id/pay', (req, res) => {
  const order = ordersStore.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  order.paymentStatus = order.paymentType === 'deposit' ? 'deposit_paid' : 'paid';
  order.paidAt = new Date().toLocaleString();
  order.notes = order.paymentType === 'deposit' 
    ? '微信支付定金 ￥100 成功，已锁定咨询时段与档案' 
    : '微信支付全款成功，已完成订单确认';

  // 联动会话：向访客会话自动派发到诊一键腾讯地图与2小时停车指引卡片
  const sessionId = req.body?.sessionId || 'sess_default_01';
  const targetSession = sessionsStore.get(sessionId) || Array.from(sessionsStore.values())[0];
  if (targetSession) {
    const timeStr = new Date().toTimeString().slice(0, 5);
    targetSession.abcGrade = 'A';
    targetSession.abcReason = '已成功微信支付定金/方案款，已派发到诊腾讯地图与停车券';
    targetSession.messages.push({
      id: `msg_sys_pay_${Date.now()}`,
      sender: 'system',
      content: `【微信支付凭证】您的预约定金/方案款项已完成微信支付（订单号：${order.orderNo}）。咨询师独立时段与私密咨询室已锁定。`,
      timestamp: timeStr,
    });
    targetSession.messages.push({
      id: `msg_map_${Date.now() + 1}`,
      sender: 'agent',
      senderName: '知心谷·到诊服务',
      content: `🎉 恭喜您，已成功锁定【${order.productName}】！\n已为您自动备好专属到诊腾讯地图一键导航路线与【2小时免费访客停车券】。下方卡片已展开路线与私密到访指引，期待在知心谷与您相遇：`,
      timestamp: timeStr,
      cardType: 'map_navigation',
      cardData: {
        centerId: 'jingan',
        orderNo: order.orderNo,
        preferredTime: order.preferredTime || '已锁定预约时段',
        counselorName: order.counselorName || '专属咨询师'
      }
    });

    // PRD Request 5: Trigger a lightweight Star Rating card after payment success
    targetSession.messages.push({
      id: `msg_sat_trigger_${Date.now() + 2}`,
      sender: 'agent',
      senderName: '知心谷·满意度调研',
      content: '您的预约已顺利锁定。为了给您提供更好的服务，请问您对本次助手的引导与预约流程满意吗？点击下方卡片即可快速评价。',
      timestamp: timeStr,
      cardType: 'satisfaction_rating',
      cardData: {
        triggerEvent: 'payment_success',
        orderNo: order.orderNo
      }
    });
  }

  res.json({ success: true, order, session: targetSession });
});

// ==================== 咨询师排期日历 RESTful 接口 ====================

// 1. 获取全量排期时段、咨询室信息与大盘统计
app.get('/api/schedule', (_req, res) => {
  const slots = Array.from(scheduleSlotsStore.values());
  const todayStr = '2026-10-13';

  const totalSlots = slots.length;
  const bookedCount = slots.filter(s => s.status === 'booked').length;
  const availableCount = slots.filter(s => s.status === 'available').length;
  const completedCount = slots.filter(s => s.status === 'completed').length;
  const blockedCount = slots.filter(s => s.status === 'blocked').length;
  const bookingRate = totalSlots > 0 ? Math.round(((bookedCount + completedCount) / totalSlots) * 1000) / 10 : 0;
  const todayConsultations = slots.filter(s => s.date === todayStr && (s.status === 'booked' || s.status === 'completed')).length;

  res.json({
    slots,
    rooms: scheduleRoomsStore,
    stats: {
      totalSlots,
      bookedCount,
      availableCount,
      completedCount,
      blockedCount,
      bookingRate,
      todayConsultations
    }
  });
});

// 2. 新建排期时段（含咨询师与物理场地防撞单校验）
app.post('/api/schedule/slots/create', (req, res) => {
  const {
    counselorId,
    counselorName,
    counselorTitle,
    counselorAvatar,
    roomId,
    roomName,
    date,
    timeRange,
    status = 'available',
    clientName,
    clientPhone,
    orderNo,
    serviceType,
    consultationFormat = 'offline_shanghai',
    paymentStatus = 'unpaid',
    topic,
    notes
  } = req.body;

  if (!counselorId || !roomId || !date || !timeRange) {
    return res.status(400).json({ error: '缺少必要的排期参数（咨询师、场地、日期、时段）' });
  }

  // 冲突检测：检查同一咨询师或同一实体咨询室在相同日期时段是否已被占用
  const allSlots = Array.from(scheduleSlotsStore.values());
  const collision = allSlots.find(s => 
    s.date === date &&
    s.timeRange === timeRange &&
    s.status !== 'available' &&
    (
      s.counselorId === counselorId ||
      (roomId !== 'room_online' && s.roomId === roomId)
    )
  );

  if (collision && status !== 'available') {
    return res.status(409).json({
      error: `排期冲突：${collision.counselorId === counselorId ? `【${collision.counselorName}】` : `【${collision.roomName}】`}在 ${date} ${timeRange} 已被占用！`
    });
  }

  const newSlot: InMemScheduleSlot = {
    id: `slot_${Date.now()}`,
    counselorId,
    counselorName: counselorName || '心理咨询师',
    counselorTitle: counselorTitle || '资深心理咨询师',
    counselorAvatar,
    roomId,
    roomName: roomName || '独立静心咨询室',
    date,
    timeRange,
    status: status as any,
    clientName,
    clientPhone,
    orderNo,
    serviceType,
    consultationFormat,
    paymentStatus,
    topic,
    notes,
    createdAt: new Date().toLocaleString()
  };

  scheduleSlotsStore.set(newSlot.id, newSlot);
  res.json({ success: true, slot: newSlot });
});

// 3. 预约/锁定现有空闲时段 (Book slot)
app.post('/api/schedule/slots/:id/book', (req, res) => {
  const slot = scheduleSlotsStore.get(req.params.id);
  if (!slot) {
    return res.status(404).json({ error: '排期时段不存在' });
  }

  const {
    clientName,
    clientPhone,
    orderNo,
    serviceType,
    consultationFormat,
    paymentStatus,
    topic,
    notes
  } = req.body;

  slot.status = 'booked';
  if (clientName) slot.clientName = clientName;
  if (clientPhone) slot.clientPhone = clientPhone;
  if (orderNo) slot.orderNo = orderNo;
  if (serviceType) slot.serviceType = serviceType;
  if (consultationFormat) slot.consultationFormat = consultationFormat;
  if (paymentStatus) slot.paymentStatus = paymentStatus;
  if (topic) slot.topic = topic;
  if (notes) slot.notes = notes;
  slot.updatedAt = new Date().toLocaleString();

  res.json({ success: true, slot });
});

// 4. 更新排期详情（改期、调室、更新状态与备注）
app.post('/api/schedule/slots/:id/update', (req, res) => {
  const slot = scheduleSlotsStore.get(req.params.id);
  if (!slot) {
    return res.status(404).json({ error: '排期时段不存在' });
  }

  const {
    counselorId,
    counselorName,
    roomId,
    roomName,
    date,
    timeRange,
    status,
    clientName,
    clientPhone,
    orderNo,
    serviceType,
    consultationFormat,
    paymentStatus,
    topic,
    notes
  } = req.body;

  // 如果更改了时间或场地，做防撞单校验
  if ((date && date !== slot.date) || (timeRange && timeRange !== slot.timeRange) || (roomId && roomId !== slot.roomId)) {
    const targetDate = date || slot.date;
    const targetTime = timeRange || slot.timeRange;
    const targetCounselor = counselorId || slot.counselorId;
    const targetRoom = roomId || slot.roomId;

    const allSlots = Array.from(scheduleSlotsStore.values());
    const collision = allSlots.find(s => 
      s.id !== slot.id &&
      s.date === targetDate &&
      s.timeRange === targetTime &&
      s.status !== 'available' &&
      (
        s.counselorId === targetCounselor ||
        (targetRoom !== 'room_online' && s.roomId === targetRoom)
      )
    );

    if (collision) {
      return res.status(409).json({
        error: `修改冲突：目标时段 ${targetDate} ${targetTime} 已有其他咨询或场地占用！`
      });
    }
  }

  if (counselorId) slot.counselorId = counselorId;
  if (counselorName) slot.counselorName = counselorName;
  if (roomId) slot.roomId = roomId;
  if (roomName) slot.roomName = roomName;
  if (date) slot.date = date;
  if (timeRange) slot.timeRange = timeRange;
  if (status) slot.status = status;
  if (clientName !== undefined) slot.clientName = clientName;
  if (clientPhone !== undefined) slot.clientPhone = clientPhone;
  if (orderNo !== undefined) slot.orderNo = orderNo;
  if (serviceType !== undefined) slot.serviceType = serviceType;
  if (consultationFormat !== undefined) slot.consultationFormat = consultationFormat;
  if (paymentStatus !== undefined) slot.paymentStatus = paymentStatus;
  if (topic !== undefined) slot.topic = topic;
  if (notes !== undefined) slot.notes = notes;
  slot.updatedAt = new Date().toLocaleString();

  res.json({ success: true, slot });
});

// 5. 取消排期/释放为可预约时段
app.post('/api/schedule/slots/:id/cancel', (req, res) => {
  const slot = scheduleSlotsStore.get(req.params.id);
  if (!slot) {
    return res.status(404).json({ error: '排期时段不存在' });
  }

  slot.status = 'available';
  slot.clientName = undefined;
  slot.clientPhone = undefined;
  slot.orderNo = undefined;
  slot.paymentStatus = undefined;
  slot.topic = undefined;
  slot.updatedAt = new Date().toLocaleString();

  res.json({ success: true, slot });
});

// 6. 标记履约完成
app.post('/api/schedule/slots/:id/complete', (req, res) => {
  const slot = scheduleSlotsStore.get(req.params.id);
  if (!slot) {
    return res.status(404).json({ error: '排期时段不存在' });
  }

  slot.status = 'completed';
  slot.updatedAt = new Date().toLocaleString();
  res.json({ success: true, slot });
});

// 7. 删除排期条目
app.post('/api/schedule/slots/:id/delete', (req, res) => {
  const deleted = scheduleSlotsStore.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: '排期时段不存在' });
  }
  res.json({ success: true });
});

// 8. 批量生成周排期模板
app.post('/api/schedule/batch-generate', (req, res) => {
  const { counselorId, counselorName, counselorTitle, startDate = '2026-10-19', days = 5 } = req.body;
  const standardTimes = ['09:00 - 09:50', '10:10 - 11:00', '14:00 - 14:50', '15:10 - 16:00', '16:20 - 17:10', '18:30 - 19:20'];
  const rooms = scheduleRoomsStore;

  let createdCount = 0;
  const baseDate = new Date(startDate);

  for (let i = 0; i < Number(days); i++) {
    const cur = new Date(baseDate);
    cur.setDate(baseDate.getDate() + i);
    const dateStr = cur.toISOString().slice(0, 10);

    standardTimes.forEach((tr, idx) => {
      const room = rooms[idx % rooms.length];
      const slotId = `slot_gen_${Date.now()}_${i}_${idx}`;
      const newSlot: InMemScheduleSlot = {
        id: slotId,
        counselorId: counselorId || 'c1',
        counselorName: counselorName || '李晓华 老师',
        counselorTitle: counselorTitle || '资深心理咨询师',
        roomId: room.id,
        roomName: room.name,
        date: dateStr,
        timeRange: tr,
        status: 'available',
        consultationFormat: room.type === 'online' ? 'online_video' : 'offline_shanghai',
        createdAt: new Date().toLocaleString()
      };
      scheduleSlotsStore.set(slotId, newSlot);
      createdCount++;
    });
  }

  res.json({ success: true, createdCount, slots: Array.from(scheduleSlotsStore.values()) });
});

// Crisis alerts
app.get('/api/crisis/alerts', (_req, res) => {
  res.json({ alerts: crisisAlertsStore });
});

app.post('/api/crisis/alerts/:id/action', (req, res) => {
  const alert = crisisAlertsStore.find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  const { actionType, notes } = req.body;
  if (actionType === 'hotline') alert.actions.hotlineProvided = true;
  if (actionType === 'willingness') alert.actions.userWillingnessChecked = true;
  if (actionType === 'notified') alert.actions.dutyStaffNotified = true;
  if (actionType === 'resolve') {
    alert.status = 'handled';
    alert.assignedTo = '资深督导·刘主任';
  }
  if (actionType === 'false_positive') {
    alert.status = 'false_positive';
    alert.notes = notes || '经值班人员人工核查，属一般比喻性情绪修辞，无自伤现实危险';
  }
  res.json({ alert });
});

app.post('/api/crisis/alerts/:id/deescalate', (req, res) => {
  const alert = crisisAlertsStore.find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  alert.status = 'handled';
  alert.notes = req.body.notes || '经值班督导复核评估，来访者危机状态已平稳解除，解除锁定并归档。';
  
  for (const [_, sess] of sessionsStore.entries()) {
    if (sess.isCrisisLocked) {
      sess.isCrisisLocked = false;
      sess.emotionalState = 'calm';
      sess.messages.push({
        id: `msg_sys_${Date.now()}`,
        sender: 'system',
        content: '【知心谷危机守护系统】经在岗督导人工复核，您的危机安全排查已顺利完成并解除锁定。会话通道已恢复常规陪伴。',
        timestamp: new Date().toTimeString().slice(0, 5)
      });
    }
  }

  res.json({ success: true, alert });
});

// Dashboard stats
app.get('/api/stats', (_req, res) => {
  res.json({
    todaySessions: 142 + sessionsStore.size,
    crisisCount: crisisAlertsStore.length + 3,
    crisisRecallRate: 100,
    avgFirstResponseSec: 2.1,
    p90ResponseSec: 4.8,
    handOverRate: 23.8,
    aiSelfResolutionRate: 71.4,
    qualifiedLeadRate: 43.6,
    ordersCount: ordersStore.length,
    totalRevenue: ordersStore.reduce((sum, o) => sum + (o.paymentStatus !== 'pending' ? o.amount : 0), 28400),
    humanResponseRate: 98.6,
    averageSatisfaction: satisfactionRatingsStore.length > 0 
      ? Number((satisfactionRatingsStore.reduce((sum, r) => sum + r.score, 0) / satisfactionRatingsStore.length).toFixed(2))
      : 4.85
  });
});

// ==================== 数据飞轮 RESTful 接口体系 ====================

const flywheelLogsStore: DialogueLogItem[] = [...INITIAL_DIALOGUE_LOGS];
const flywheelBadcasesStore: BadcaseItem[] = [...INITIAL_BADCASES];
const flywheelEvalMetricsStore: AutomatedEvalMetric[] = [...INITIAL_EVAL_METRICS];
const flywheelPromptsStore: PromptVersion[] = [...INITIAL_PROMPT_VERSIONS];
const flywheelExperimentsStore: ABExperiment[] = [...INITIAL_AB_EXPERIMENTS];
const flywheelStatsStore = { ...INITIAL_FLYWHEEL_STATS };
const satisfactionRatingsStore: SatisfactionRating[] = [
  { id: 'sat_1', sessionId: 'sess_01', score: 5, createdAt: '2026-10-22 10:00' },
  { id: 'sat_2', sessionId: 'sess_02', score: 4, createdAt: '2026-10-22 11:30' },
  { id: 'sat_3', sessionId: 'sess_03', score: 5, createdAt: '2026-10-23 09:15' },
];

const fewshotExamplesStore: FewShotExample[] = [
  {
    id: 'fs_init_01',
    badcaseId: 'bc-01',
    userQuery: '微信客服支持退款吗？如果不满意能不能退？',
    idealAgentResponse: '知心谷提供完全合规透明的退款保障。未开始的咨询时段可于24小时前无条件全额退款，或联系坐席人工顾问一键发起原路退回。',
    intentCategory: '退款与权益规则',
    extractedBy: '督导专家·李老师',
    promptVersionTarget: 'v2.4-fewshot-enhanced',
    status: 'synced_to_prompt_candidates',
    createdAt: '2026-10-22 14:30:00'
  }
];

const abcDriftLogsStore: ABCDriftLog[] = [
  {
    id: 'drift_01',
    sessionId: 'sess_default_01',
    clientName: '微信咨询访客 (小林)',
    correctedBy: '李晓华 (督导专家)',
    originalGrade: 'C',
    correctedGrade: 'A',
    triggerKeywords: ['多少钱', '深度套餐', '语音名片'],
    userQueryContext: '深度索要15s语音名片与4次深度套餐，有强线下预约意向',
    gapReason: '系统自动化打标过于保守判定为C类',
    timestamp: '2026-10-23 10:15:00'
  }
];

// 1. 获取飞轮全局概览统计
app.get('/api/flywheel/stats', (_req, res) => {
  const activeBc = flywheelBadcasesStore.filter(b => b.status === 'pending' || b.status === 'in_progress').length;
  const resolvedBc = flywheelBadcasesStore.filter(b => b.status === 'fixed' || b.status === 'verified').length;
  const thumbUpCount = flywheelLogsStore.filter(l => l.userFeedback === 'thumb_up').length;
  const feedbackTotal = flywheelLogsStore.filter(l => !!l.userFeedback).length;
  const thumbUpRate = feedbackTotal > 0 ? Number(((thumbUpCount / feedbackTotal) * 100).toFixed(1)) : 94.6;

  res.json({
    stats: {
      ...flywheelStatsStore,
      totalLoggedTurns: 3840 + flywheelLogsStore.length - INITIAL_DIALOGUE_LOGS.length,
      activeBadcases: activeBc,
      resolvedBadcasesThisWeek: resolvedBc + 25,
      feedbackThumbUpRate: thumbUpRate,
      averageSatisfaction: satisfactionRatingsStore.length > 0 
        ? Number((satisfactionRatingsStore.reduce((sum, r) => sum + r.score, 0) / satisfactionRatingsStore.length).toFixed(2))
        : 4.85
    }
  });
});

// 2. 评测指标列表
app.get('/api/flywheel/metrics', (_req, res) => {
  res.json({ metrics: flywheelEvalMetricsStore });
});

// 3. 对话埋点追踪日志列表
app.get('/api/flywheel/logs', (req, res) => {
  const { filterBadcase, roleId } = req.query;
  let list = [...flywheelLogsStore];
  if (filterBadcase === 'true') {
    list = list.filter(l => l.isBadcase);
  }
  if (roleId && roleId !== 'all') {
    list = list.filter(l => l.roleId === roleId);
  }
  res.json({ logs: list });
});

// 4. 提交对具体对话消息的用户/督导评价反馈 (点赞/点踩)
app.post('/api/flywheel/feedback', (req, res) => {
  const { messageId, sessionId, rating, reason, comment, tags, submittedBy = 'user' } = req.body;
  
  // 更新或创建日志关联反馈
  let targetLog = flywheelLogsStore.find(l => l.id === messageId || l.sessionId === sessionId);
  if (!targetLog) {
    targetLog = {
      id: `log-${Date.now()}`,
      sessionId: sessionId || 'sess_current',
      turnIndex: flywheelLogsStore.length + 1,
      roleId: 'li_teacher',
      userQuery: '微信客服会话消息',
      agentResponse: '智能体回答内容',
      intentDetected: 'GENERAL',
      latencyMs: 1250,
      outputGateViolations: [],
      userFeedback: rating,
      supervisorScore: rating === 'thumb_up' ? 5 : 2,
      isBadcase: rating === 'thumb_down',
      timestamp: new Date().toTimeString().slice(0, 8),
    };
    flywheelLogsStore.unshift(targetLog);
  } else {
    targetLog.userFeedback = rating;
    if (rating === 'thumb_down') {
      targetLog.isBadcase = true;
      targetLog.badcaseReason = comment || `访客点踩：${reason || '回答不够精准或温度不足'}`;
    }
  }

  // 若为点踩，自动沉淀入 Bad Case 挖掘池 (智能归因与优先级排序 - PRD Section V)
  if (rating === 'thumb_down') {
    const isP0 = tags && (tags.includes('fact_error') || tags.includes('compliance') || tags.includes('crisis_slow'));
    
    const newBadcase: BadcaseItem = {
      id: `bc-${Date.now()}`,
      logId: targetLog.id,
      sessionId: targetLog.sessionId,
      userQuery: targetLog.userQuery,
      actualReply: targetLog.agentResponse,
      expectedReply: comment ? `访客评语：${comment}` : '待个案督导与算法团队协同制定预期回答规范',
      category: tags?.includes('fact_error') ? 'knowledge_gap' : tags?.includes('tone_bad') ? 'emotion_mismatch' : 'prompt_drift',
      categoryLabel: tags?.includes('fact_error') ? '事实知识检索缺漏' : tags?.includes('tone_bad') ? '共情温度不足' : '指令偏离或话术生硬',
      severity: isP0 ? 'P0' : 'P1',
      suggestedAction: tags?.includes('fact_error') ? 'add_knowledge' : 'tune_prompt',
      status: 'pending',
      assignedTo: isP0 ? '安全与伦理委员会' : '督导评估组',
      createdAt: new Date().toLocaleString(),
    };
    flywheelBadcasesStore.unshift(newBadcase);
  }

  res.json({ success: true, updatedLog: targetLog });
});

// 4b. 提交全会话满意度评价 (星级评价卡片触发点)
app.post('/api/flywheel/satisfaction', (req, res) => {
  const { sessionId, score, comment } = req.body;
  if (!sessionId || !score) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const newRating: SatisfactionRating = {
    id: `sat_${Date.now()}`,
    sessionId,
    score: Number(score),
    comment: comment || '',
    createdAt: new Date().toISOString()
  };

  satisfactionRatingsStore.push(newRating);
  
  // Update Dashboard Stats immediately (PRD Request 5)
  const totalScore = satisfactionRatingsStore.reduce((sum, r) => sum + r.score, 0);
  const avgSatisfaction = Number((totalScore / satisfactionRatingsStore.length).toFixed(2));
  flywheelStatsStore.averageSatisfaction = avgSatisfaction;
  
  // Optionally update session summary or internal notes
  const session = sessionsStore.get(sessionId);
  if (session) {
    session.internalNotes?.push({
      id: `note_sat_${Date.now()}`,
      authorName: '系统 (访客评价)',
      content: `访客提交了星级评价：${score}星。评语：${comment || '无'}`,
      timestamp: new Date().toTimeString().slice(0, 5)
    });
  }

  res.json({ success: true, rating: newRating, averageSatisfaction: avgSatisfaction });
});

// 5. Bad Case 挖掘归因列表与状态流转 (智能聚类排序)
app.get('/api/flywheel/badcases', (_req, res) => {
  // P0 置顶排序
  const sorted = [...flywheelBadcasesStore].sort((a, b) => {
    if (a.severity === 'P0' && b.severity !== 'P0') return -1;
    if (a.severity !== 'P0' && b.severity === 'P0') return 1;
    return 0;
  });
  res.json({ badcases: sorted });
});

app.post('/api/flywheel/badcases/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, resolvedNotes } = req.body;
  const item = flywheelBadcasesStore.find(b => b.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Badcase not found' });
  }
  item.status = status;
  if (status === 'fixed' || status === 'verified') {
    item.resolvedAt = new Date().toLocaleString();
    if (resolvedNotes) {
      item.expectedReply += `\n【优化落地说明】: ${resolvedNotes}`;
    }
  }
  res.json({ success: true, badcase: item });
});

// 6. 提示词工程 Prompt 迭代版本库
app.get('/api/flywheel/prompts', (_req, res) => {
  res.json({ prompts: flywheelPromptsStore });
});

app.post('/api/flywheel/prompts/deploy', (req, res) => {
  const { promptId } = req.body;
  flywheelPromptsStore.forEach(p => {
    if (p.id === promptId) {
      p.status = 'active';
    } else if (p.status === 'active') {
      p.status = 'archived';
    }
  });
  flywheelStatsStore.promptIterationCycles += 1;
  res.json({ success: true, deployedId: promptId, prompts: flywheelPromptsStore });
});

// 7. A/B 灰度测试实验列表与触发
app.get('/api/flywheel/experiments', (_req, res) => {
  res.json({ experiments: flywheelExperimentsStore });
});

// 8. Bad Case 一键提炼为 Few-Shot 样本池
app.post('/api/flywheel/fewshot/add', (req, res) => {
  const { badcaseId, userQuery, idealAgentResponse, intentCategory, extractedBy } = req.body;
  
  const newFewShot = {
    id: `fs_${Date.now()}`,
    badcaseId,
    userQuery: userQuery || '用户提问',
    idealAgentResponse: idealAgentResponse || '标准示例回答',
    intentCategory: intentCategory || '常规意向解答',
    extractedBy: extractedBy || '督导专家·张老师',
    promptVersionTarget: 'v2.4-fewshot-enhanced',
    status: 'synced_to_prompt_candidates' as const,
    createdAt: new Date().toLocaleString()
  };

  fewshotExamplesStore.unshift(newFewShot);

  // If badcaseId is supplied, update badcase status to 'fixed'
  if (badcaseId) {
    const bc = flywheelBadcasesStore.find(b => b.id === badcaseId);
    if (bc) {
      bc.status = 'fixed';
      bc.expectedReply += `\n【Few-Shot反哺】: 已一键提取为标准正向范例入库 (${newFewShot.id})`;
    }
  }

  // Inject into candidate prompt version
  const candidatePrompt = flywheelPromptsStore.find(p => p.status === 'candidate');
  if (candidatePrompt) {
    candidatePrompt.contentSnippet += `\n\n【Few-Shot标准正例 #${newFewShot.id}】\n用户问：“${newFewShot.userQuery}”\n标准答：“${newFewShot.idealAgentResponse}”`;
  }

  res.json({ success: true, fewshot: newFewShot, totalFewshots: fewshotExamplesStore.length });
});

// 9. 意向等级 (ABC Lead) 人工纠偏反哺评估器 (Classifier Drift Report)
app.get('/api/flywheel/abc-drift', (_req, res) => {
  const totalLogs = abcDriftLogsStore.length;
  const totalSessionsEvaluated = Math.max(sessionsStore.size, 120);
  const driftRate = Math.round((totalLogs / totalSessionsEvaluated) * 1000) / 10;
  const overallAccuracy = Math.round((100 - driftRate) * 10) / 10;

  res.json({
    report: {
      overallAccuracy,
      driftRate,
      totalAdjustments: totalLogs,
      commonDriftPatterns: [
        {
          pattern: 'C类提升为A类 (浅层问询价格方案在自动化打标中被保守判定为C类)',
          count: 28,
          sharePercent: 58.3,
          keyTrigger: '包含“多少钱”且“看方案”'
        },
        {
          pattern: 'B类提升为A类 (问询咨询师15s语音名片或到诊路线卡片)',
          count: 14,
          sharePercent: 29.2,
          keyTrigger: '包含“试听原声”、“腾讯地图导航”'
        },
        {
          pattern: 'A类回调为B类 (重复调取危机热线但无实际订约意向)',
          count: 6,
          sharePercent: 12.5,
          keyTrigger: '触发高频12356热线'
        }
      ],
      accuracyTrend: [
        { date: '10-18', accuracy: 89.2 },
        { date: '10-19', accuracy: 91.0 },
        { date: '10-20', accuracy: 92.5 },
        { date: '10-21', accuracy: 94.1 },
        { date: '10-22', accuracy: 95.8 },
        { date: '10-23', accuracy: overallAccuracy }
      ]
    },
    logs: abcDriftLogsStore,
    fewshots: fewshotExamplesStore
  });
});

// 10. Bad Case 一键转存为知识库 FAQ 草稿
app.post('/api/flywheel/knowledge/add-from-badcase', (req, res) => {
  const { badcaseId, title, summary, content, category, keywords } = req.body;
  const newKbItem = {
    id: `kb-faq-${Date.now()}`,
    category: category || 'pricing',
    title: title || '自Bad Case提炼FAQ条目',
    summary: summary || '由督导专家从Bad Case审阅中一键转存',
    content: content || '标准正文说明',
    keywords: keywords || ['提炼FAQ', 'BadCase反哺'],
    status: 'active' as const,
    updatedAt: new Date().toISOString().slice(0, 10),
    author: '督导专家·飞轮引擎',
    currentVersion: 'v1.0',
    fileVersions: [
      {
        id: `ver_${Date.now()}`,
        version: 'v1.0',
        fileName: `${title || 'FAQ提炼'}_v1.0.md`,
        fileSize: '340 KB',
        fileType: 'md',
        fileUrl: '#',
        uploadedBy: '督导专家',
        uploadedAt: new Date().toLocaleString(),
        changelog: '由Bad Case归因缺漏一键转存生成',
        status: 'active' as const
      }
    ]
  };

  INITIAL_KNOWLEDGE_BASE.unshift(newKbItem);

  if (badcaseId) {
    const bc = flywheelBadcasesStore.find(b => b.id === badcaseId);
    if (bc) {
      bc.status = 'fixed';
      bc.expectedReply += `\n【知识库反哺】: 已一键转为知识库 FAQ 条目 (${newKbItem.id}) 补充入库`;
    }
  }

  res.json({ success: true, knowledgeItem: newKbItem });
});

// 11. ABC 漂移报表一键对齐分类器规则
app.post('/api/flywheel/abc-drift/align-rules', (_req, res) => {
  const triggers = ['15s语音名片', '腾讯地图导航', '4次深度探索方案', '微信支付定金'];
  res.json({
    success: true,
    alignedRulesCount: triggers.length,
    triggers,
    message: '高频纠偏触发词已成功注入 L4/L5 动态识别层与意向打标规则中'
  });
});
// 12. Knowledge Versioning & Rollback (RAG Version Control)
const knowledgeVersionsStore = [
  {
    id: 'kb_v1',
    versionNumber: 'v1.0',
    fileName: '知心谷心理咨询中心介绍_v1.0.pdf',
    fileSize: 12400,
    contentSnippet: '知心谷心理咨询中心成立于2022年，致力于提供高品质心理健康服务...',
    isActive: false,
    createdAt: '2026-09-01 10:00',
    createdBy: '超级管理员·周老师'
  },
  {
    id: 'kb_v2',
    versionNumber: 'v1.1',
    fileName: '知心谷2026服务手册_v1.1.docx',
    fileSize: 25600,
    contentSnippet: '新增：4次深度心理探索方案（1800元），支持微信定金锁定...',
    isActive: true,
    createdAt: '2026-10-10 14:30',
    createdBy: '超级管理员·周老师'
  },
  {
    id: 'kb_v3_candidate',
    versionNumber: 'v1.2 (Beta)',
    fileName: '知心谷2026服务手册_v1.2_修正版.docx',
    fileSize: 25800,
    contentSnippet: '修正：取消了单次300元的低端方案，最低起步价调整为400元...',
    isActive: false,
    createdAt: '2026-10-22 09:00',
    createdBy: '个案督导·张老师'
  }
];

app.get('/api/flywheel/knowledge/versions', (_req, res) => {
  res.json({ versions: knowledgeVersionsStore });
});

app.post('/api/flywheel/knowledge/versions/rollback', (req, res) => {
  const { versionId } = req.body;
  const version = knowledgeVersionsStore.find(v => v.id === versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  
  knowledgeVersionsStore.forEach(v => v.isActive = (v.id === versionId));
  res.json({ success: true, activeVersion: version });
});

app.get('/api/flywheel/knowledge/diff', (req, res) => {
  res.json({
    diff: [
      { type: 'remove', text: '最低起步价 300 元', line: 12 },
      { type: 'add', text: '最低起步价调整为 400 元', line: 12 },
      { type: 'add', text: '新增：考前心理调适专案 (青少年优先)', line: 28 }
    ]
  });
});

// ==================== 商业财务与售后服务 RESTful 接口体系 ====================

const refundsStore: RefundRecord[] = [...INITIAL_REFUNDS];
const invoicesStore: InvoiceRecord[] = [...INITIAL_INVOICES];
const midtermAlertsStore: MidtermRetentionAlert[] = [...INITIAL_MIDTERM_ALERTS];

// 1. 获取退款列表
app.get('/api/finance/refunds', (_req, res) => {
  res.json({ refunds: refundsStore });
});

// 2. 提交退款申请 (微信客服侧或坐席侧)
app.post('/api/finance/refunds/request', (req, res) => {
  const { orderId, orderNo, clientName, amount, refundReason, appointmentTime, initiatedBy } = req.body;
  
  const newRefund: RefundRecord = {
    id: `rf_${Date.now()}`,
    orderId: orderId || 'ord_01',
    orderNo: orderNo || 'ORD2026102201',
    clientName: clientName || '微信咨询访客',
    amount: amount || 1800,
    refundReason: refundReason || '申请开询前24小时退款',
    initiatedBy: initiatedBy || '访客微信客服端主动申请',
    status: 'pending_review',
    createdAt: new Date().toLocaleString(),
    appointmentTime: appointmentTime || '2026-10-25 14:00',
    isWithin24hPolicy: true,
    hoursRemaining: 48
  };

  refundsStore.unshift(newRefund);
  res.json({ success: true, refund: newRefund });
});

// 3. 审核同意并调用微信支付商户原路退款
app.post('/api/finance/refunds/:id/approve', (req, res) => {
  const { id } = req.params;
  const { auditedBy } = req.body;
  const refund = refundsStore.find(r => r.id === id);

  if (!refund) {
    return res.status(404).json({ error: '退款工单不存在' });
  }

  refund.status = 'approved';
  refund.auditedBy = auditedBy || '周建国 (中台主管)';
  refund.completedAt = new Date().toLocaleString();
  refund.refundTxId = `wx_rf_${Date.now()}_${Math.floor(Math.random() * 899999 + 100000)}`;

  // Find associated session and add WeChat refund notice message
  for (const [_, sess] of sessionsStore.entries()) {
    if (sess.userName.includes(refund.clientName) || sess.id === refund.orderId) {
      sess.messages.push({
        id: `msg_ref_${Date.now()}`,
        sender: 'system',
        content: `【微信支付退款完成通知】您的订单 NO.${refund.orderNo} 款项 ￥${refund.amount} 已成功由知心谷商户退回您的微信零钱/银行卡 (退款单号: ${refund.refundTxId})。非常感谢您的信任，如有问题可随时咨询值班老师。`,
        timestamp: new Date().toTimeString().slice(0, 5),
        cardType: 'refund_notice',
        cardData: {
          orderNo: refund.orderNo,
          amount: refund.amount,
          refundTxId: refund.refundTxId,
          policyNotice: '开询前24小时无条件全额退款保障已如期履约'
        }
      });
    }
  }

  res.json({ success: true, refund });
});

// 4. 拒绝退款申请
app.post('/api/finance/refunds/:id/reject', (req, res) => {
  const { id } = req.params;
  const { rejectReason, auditedBy } = req.body;
  const refund = refundsStore.find(r => r.id === id);

  if (!refund) {
    return res.status(404).json({ error: '退款工单不存在' });
  }

  refund.status = 'rejected';
  refund.rejectReason = rejectReason || '不符合开询前24小时退款政策条件（距开询时间过近）';
  refund.auditedBy = auditedBy || '周建国 (中台主管)';
  refund.completedAt = new Date().toLocaleString();

  res.json({ success: true, refund });
});

// 5. 获取发票开具列表
app.get('/api/finance/invoices', (_req, res) => {
  res.json({ invoices: invoicesStore });
});

// 6. 微信客服端申请开具电子发票并即时生成 PDF 凭证卡片
app.post('/api/finance/invoices/request', (req, res) => {
  const { orderId, orderNo, clientName, clientPhone, invoiceType, title, taxNumber, email, amount, contentCategory } = req.body;

  const invId = `inv_${Date.now()}`;
  const invNo = `FP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 899 + 100)}`;
  const invCode = `03100${Math.floor(Math.random() * 89999 + 10000)}`;

  const newInvoice: InvoiceRecord = {
    id: invId,
    orderId: orderId || 'ord_01',
    orderNo: orderNo || 'ORD2026102201',
    clientName: clientName || '微信咨询访客',
    clientPhone: clientPhone || '138****6621',
    invoiceType: invoiceType || 'individual',
    title: title || clientName || '个人',
    taxNumber: taxNumber || (invoiceType === 'enterprise' ? '91310115MA1K3988X2' : undefined),
    email: email || 'visitor@example.com',
    amount: amount || 1800,
    contentCategory: contentCategory || '心理咨询与评估服务',
    invoiceNo: invNo,
    invoiceCode: invCode,
    pdfUrl: `/api/finance/invoices/${invId}/pdf`,
    status: 'issued',
    issuedAt: new Date().toLocaleString()
  };

  invoicesStore.unshift(newInvoice);

  // Push electronic invoice card into user chat session
  for (const [_, sess] of sessionsStore.entries()) {
    if (sess.userName.includes(clientName) || sess.id === orderId) {
      sess.messages.push({
        id: `msg_inv_${Date.now()}`,
        sender: 'agent',
        senderName: '知心谷·财务发票服务',
        content: `📄 您的电子发票已成功开具！知心谷已将包含【${newInvoice.contentCategory}】的增值税电子普通发票发送至您的邮箱 ${newInvoice.email}。您也可以直接点击下方卡片预览及下载 PDF 文件：`,
        timestamp: new Date().toTimeString().slice(0, 5),
        cardType: 'invoice_issued',
        cardData: {
          invoiceNo: newInvoice.invoiceNo,
          invoiceCode: newInvoice.invoiceCode,
          title: newInvoice.title,
          taxNumber: newInvoice.taxNumber,
          amount: newInvoice.amount,
          contentCategory: newInvoice.contentCategory,
          issuedAt: newInvoice.issuedAt,
          pdfUrl: newInvoice.pdfUrl
        }
      });
    }
  }

  res.json({ success: true, invoice: newInvoice });
});

// 7. 模拟电子发票 PDF 凭证预览 HTML 视图
app.get('/api/finance/invoices/:id/pdf', (req, res) => {
  const inv = invoicesStore.find(i => i.id === req.params.id) || invoicesStore[0];
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>全国统一增值税电子普通发票 - 知心谷心理</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f1f5f9; padding: 30px; display: flex; justify-content: center; }
          .invoice-box { background: white; padding: 40px; border-radius: 12px; border: 2px solid #0f766e; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 780px; position: relative; }
          .header { text-align: center; border-bottom: 2px double #0f766e; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #0f766e; margin: 0; font-size: 24px; letter-spacing: 2px; }
          .header p { color: #64748b; font-size: 12px; margin-top: 5px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px; color: #334155; margin-bottom: 25px; }
          .meta-grid div { background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
          .table th { background: #f0fdf4; color: #166534; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
          .table td { padding: 12px 10px; border: 1px solid #e2e8f0; color: #1e293b; }
          .total { text-align: right; font-size: 18px; font-weight: bold; color: #0f766e; padding-top: 10px; }
          .stamp { position: absolute; bottom: 50px; right: 60px; width: 140px; height: 140px; border: 3px double #dc2626; border-radius: 50%; color: #dc2626; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-15deg); opacity: 0.85; font-weight: bold; font-size: 11px; text-align: center; line-height: 1.3; pointer-events: none; }
          .btn-bar { text-align: center; margin-top: 25px; }
          .btn { background: #0f766e; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <h1>上海知心谷健康管理有限公司 电子发票</h1>
            <p>发票代码：${inv.invoiceCode} &nbsp;|&nbsp; 发票号码：${inv.invoiceNo} &nbsp;|&nbsp; 开票日期：${inv.issuedAt}</p>
          </div>
          <div class="meta-grid">
            <div><strong>购买方抬头：</strong>${inv.title}</div>
            <div><strong>纳税人识别号：</strong>${inv.taxNumber || '（个人开票免填）'}</div>
            <div><strong>服务单号：</strong>${inv.orderNo}</div>
            <div><strong>接收邮箱：</strong>${inv.email}</div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>货物或应税劳务、服务名称</th>
                <th>规格型号</th>
                <th>数量</th>
                <th>金额 (含税)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>*心理咨询服务* ${inv.contentCategory}</td>
                <td>标准服务包</td>
                <td>1 批</td>
                <td>￥${inv.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <div class="total">小写价税合计：￥${inv.amount.toFixed(2)}</div>
          <div class="stamp">
            <span>知心谷心理咨询</span>
            <span style="font-size:10px;margin:2px 0;">发票专用章</span>
            <span>(310115009231)</span>
          </div>
          <div class="btn-bar">
            <button class="btn" onclick="window.print()">🖨️ 打印 / 保存 PDF 发票凭证</button>
          </div>
        </div>
      </body>
    </html>
  `);
});

// 8. 获取中程评估与脱落预警列表
app.get('/api/retention/midterm-alerts', (_req, res) => {
  res.json({ alerts: midtermAlertsStore });
});

// 9. 坐席/助理一键发起“中程评估回访”与升级引导
app.post('/api/retention/midterm-alerts/:id/followup', (req, res) => {
  const { id } = req.params;
  const { staffName, customNotes } = req.body;
  const alert = midtermAlertsStore.find(a => a.id === id);

  if (!alert) {
    return res.status(404).json({ error: '脱落预警工单不存在' });
  }

  alert.status = 'followed_up';
  alert.followedUpAt = new Date().toLocaleString();
  alert.staffName = staffName || '知心谷·值班助理';

  // Push mid-term assessment care message card into user session
  for (const [_, sess] of sessionsStore.entries()) {
    if (sess.userName.includes(alert.clientName) || sess.id === alert.sessionId) {
      sess.messages.push({
        id: `msg_mid_${Date.now()}`,
        sender: 'agent',
        senderName: '知心谷·中程评估关怀',
        content: `【知心谷中程评估关怀】您好！您已顺利完成【${alert.packageName}】的前2次心理探索。${alert.counselorName}为您整理了前两阶段的情绪归因与梳理小结。为防止中途心理重构节奏中断，建议于本周预约第3次排期。同时，老学员补差价升级【10次长程成长蜕变方案】可享受特别回馈特惠 ￥3200！`,
        timestamp: new Date().toTimeString().slice(0, 5),
        cardType: 'midterm_review',
        cardData: {
          packageName: alert.packageName,
          completedCount: alert.completedCount,
          totalCount: alert.totalCount,
          counselorName: alert.counselorName,
          upgradeDiscountOffer: '补差价 ￥3,200 升级 10 次长程方案（省 ￥1,600）',
          notes: customNotes || '前2阶段焦虑指数下降 35%，睡眠质量有显性改善'
        }
      });
    }
  }

  res.json({ success: true, alert });
});

// --- PRD V1.0: Admin Service Control & Exception Management ---

// 10. 真人坐席/督导 接管会话 (Takeover)
app.post('/api/admin/sessions/:id/takeover', (req, res) => {
  const { id } = req.params;
  const { staffId, staffName } = req.body;
  const session = sessionsStore.get(id);

  if (!session) return res.status(404).json({ error: '会话不存在' });

  session.isTakenOverByHuman = true;
  session.assignedStaffId = staffId;
  session.assignedStaffName = staffName;
  session.handoverStatus = 'human_confirmed';
  
  session.messages.push({
    id: `msg_sys_${Date.now()}`,
    sender: 'system',
    content: `【系统状态更新】真人老师 ${staffName || ''} 已正式接管会话。AI 客服已转入静默监听模式。`,
    timestamp: new Date().toTimeString().slice(0, 5)
  });

  res.json({ success: true, session });
});

// 11. 真人接管后 平滑回退至 AI (Resume AI)
app.post('/api/admin/sessions/:id/resume-ai', (req, res) => {
  const { id } = req.params;
  const { summary, nextPlan } = req.body;
  const session = sessionsStore.get(id);

  if (!session) return res.status(404).json({ error: '会话不存在' });

  session.isTakenOverByHuman = false;
  session.handoverStatus = 'ai_resumed' as any; // Using custom state
  if (summary) session.summary = summary;
  
  session.messages.push({
    id: `msg_sys_${Date.now()}`,
    sender: 'system',
    content: `【系统状态更新】真人服务已结束，会话已平滑移交回 AI 助手。已同步人工阶段摘要：${summary || '无'}`,
    timestamp: new Date().toTimeString().slice(0, 5)
  });

  res.json({ success: true, session });
});

// 12. 切换系统服务能力状态 (Capability Control)
app.post('/api/admin/sessions/:id/set-capability', (req, res) => {
  const { id } = req.params;
  const { capability } = req.body; // 'normal' | 'restricted' | 'stopped'
  const session = sessionsStore.get(id);

  if (!session) return res.status(404).json({ error: '会话不存在' });

  session.serviceCapability = capability;
  if (capability === 'stopped' || capability === 'restricted') {
    session.handoverStatus = 'submitted';
  }

  res.json({ success: true, session });
});

// 13. 标记 Bad Case (Flywheel Integration)
app.post('/api/admin/sessions/:id/mark-badcase', (req, res) => {
  const { id } = req.params;
  const { messageId, errorTypes, comment } = req.body;
  const session = sessionsStore.get(id);

  if (!session) return res.status(404).json({ error: '会话不存在' });

  const msg = session.messages.find(m => m.id === messageId);
  if (!msg) return res.status(404).json({ error: '消息不存在' });

  const badcase: BadcaseItem = {
    id: `bc_${Date.now()}`,
    logId: messageId,
    sessionId: id,
    userQuery: '（自动回溯上一轮提问）', // Simplified for demo
    actualReply: msg.content,
    expectedReply: '（待督导标注）',
    category: 'knowledge_gap', // Default
    categoryLabel: errorTypes?.join('、') || '未归类',
    severity: 'P1',
    suggestedAction: 'tune_prompt',
    status: 'pending',
    assignedTo: '未分配',
    createdAt: new Date().toISOString()
  };

  // Push to badcases store
  flywheelBadcasesStore.unshift(badcase);

  res.json({ success: true, badcase });
});

// 14. 获取推荐的“最空闲”咨询师 (Least Busy Counselor Recommendation)
app.get('/api/admin/staff/recommend-least-busy', (_req, res) => {
  const onDutyStaff = staffStore.filter(s => s.status === 'active' && s.dutyStatus !== 'offline');
  
  if (onDutyStaff.length === 0) {
    return res.json({ success: false, message: '当前无在线值班人员' });
  }

  // Sort by (currentActiveSessions / maxConcurrent) - relative load
  const sortedStaff = [...onDutyStaff].sort((a, b) => {
    const loadA = a.currentActiveSessions / a.maxConcurrent;
    const loadB = b.currentActiveSessions / b.maxConcurrent;
    return loadA - loadB;
  });

  const recommendation = sortedStaff[0];
  res.json({ 
    success: true, 
    recommendation,
    reason: `当前负载率最低 (${Math.round((recommendation.currentActiveSessions / recommendation.maxConcurrent) * 100)}%)`
  });
});

// 15. 会话自愈与重置 (Self-Healing)
app.post('/api/sessions/:id/reset-capability', (req, res) => {
  const session = sessionsStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: '会话不存在' });

  session.serviceCapability = 'normal';
  if (session.incidentContext) {
    session.incidentContext.consecutiveFailures = 0;
    session.incidentContext.lastErrorType = undefined;
  }
  session.handoverStatus = 'none';

  session.messages.push({
    id: `msg_sys_reset_${Date.now()}`,
    sender: 'system',
    content: '【知心谷服务自愈】AI 助手服务能力已手动重置。系统将重新尝试通过智能方式为您提供陪伴。',
    timestamp: new Date().toTimeString().slice(0, 5)
  });

  res.json({ success: true, session });
});

// All unmatched /api/* routes must return 404 JSON, preventing Vite from serving index.html
app.all('/api/*', (req, res) => {

  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
});

// Global Express error handler returning JSON
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err?.message || 'Internal Server Error' });
});

// Setup Vite in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Psychology WeChat Assistant Server running on http://localhost:${PORT}`);
  });
}

startServer();
