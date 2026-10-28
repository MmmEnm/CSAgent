/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  AlertOctagon,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  Filter,
  DollarSign,
  PhoneCall,
  AlertTriangle,
  RotateCcw,
  Check,
  FileCheck,
  Receipt,
  X,
  Share2,
  Send,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  UserPlus,
  ArrowRight,
  Calendar,
  FileText,
  TrendingUp
} from 'lucide-react';
import {
  SessionData,
  ConsultationOrder,
  CrisisAlert,
  DashboardStats,
  KnowledgeItem,
  StaffUser,
  DutyStatus,
  ABCRating,
  ScheduleSlot,
  ScheduleRoom,
  ScheduleStats,
  RefundRecord,
  InvoiceRecord,
  MidtermRetentionAlert,
  ServiceExceptionLog
} from '../types';
import { SERVICE_PRODUCTS, COUNSELORS, INITIAL_KNOWLEDGE_BASE } from '../data/mockData';
import { FlywheelEngineView } from './FlywheelEngineView';
import { StaffAccountManagement } from './StaffAccountManagement';
import { CounselorScheduleCalendar } from './CounselorScheduleCalendar';
import { AdminTab } from './AdminHeaderNav';
import { EmotionalTrendPanel, analyzeEmotionalTrend } from './EmotionalTrendPanel';
import { Activity, Target } from 'lucide-react';

interface AdminConsoleProps {
  currentTab: AdminTab;
  session: SessionData;
  sessionsList?: SessionData[];
  onSelectSession?: (sessionId: string) => void;
  currentUser?: StaffUser | null;
  staffList?: StaffUser[];
  scheduleSlots?: ScheduleSlot[];
  scheduleRooms?: ScheduleRoom[];
  scheduleStats?: ScheduleStats;
  onBookScheduleSlot?: (slotId: string, data: Partial<ScheduleSlot>) => Promise<void>;
  onCancelScheduleSlot?: (slotId: string) => Promise<void>;
  onCreateScheduleSlot?: (data: Partial<ScheduleSlot>) => Promise<void>;
  onUpdateScheduleSlot?: (slotId: string, data: Partial<ScheduleSlot>) => Promise<void>;
  onCompleteScheduleSlot?: (slotId: string) => Promise<void>;
  onDeleteScheduleSlot?: (slotId: string) => Promise<void>;
  onBatchGenerateSchedule?: (counselorId: string, days: number) => Promise<void>;
  onSendAppointmentNoticeToChat?: (slot: ScheduleSlot) => void;
  onNavigateTab?: (tab: AdminTab) => void;
  onClaimSession?: (sessionId: string, staffId: string, staffName: string) => Promise<void>;
  onTransferSession?: (sessionId: string, targetStaffId: string, targetStaffName: string, reason: string) => Promise<void>;
  onAddInternalNote?: (sessionId: string, note: string) => Promise<void>;
  onUpdateSessionGrade?: (sessionId: string, grade: ABCRating, reason?: string) => Promise<void>;
  onUpdateDutyStatus?: (staffId: string, status: DutyStatus) => void;
  onCreateStaff?: (data: Partial<StaffUser>) => Promise<void>;
  onUpdateStaff?: (staffId: string, data: Partial<StaffUser>) => Promise<void>;
  onDeleteStaff?: (staffId: string) => Promise<void>;
  orders: ConsultationOrder[];
  crisisAlerts: CrisisAlert[];
  stats: DashboardStats;
  onTakeoverToggle: (isTakenOver: boolean, manualReply?: string, transitionSummary?: string) => void;
  onUpdateAlertAction: (alertId: string, actionType: string) => void;
  onTriggerPayment: (order: ConsultationOrder) => void;
}

// 机构多岗位快捷专业话术库
const QUICK_REPLY_TEMPLATES: Array<{
  category: string;
  items: Array<{ title: string; content: string }>;
}> = [
  {
    category: '🌸 温暖问候',
    items: [
      {
        title: '值班顾问标准问候',
        content: '您好，我是知心谷今日在线值班心理顾问。感受到您此刻带着困扰来到这里，请放心，无论是什么事情，我都在这里陪伴您。'
      },
      {
        title: '共情破冰致意',
        content: '您好呀！看到您发送的咨询消息了。独自承受这些一定很不容易，请按照您最舒适的节奏对我说，我们一步步来。'
      }
    ]
  },
  {
    category: '🤝 深度共情',
    items: [
      {
        title: '职场人际压力接纳',
        content: '职场中的人际消耗与压力往往隐秘而沉重，产生疲惫或失眠都是身体给出的提醒，这绝不是您的软弱，而是心力透支的信号。'
      },
      {
        title: '情绪失眠安慰',
        content: '整夜失眠、脑海里思绪停不下来确实非常折磨人。深呼吸一下，把今晚的担忧暂时交给我，我们可以一起梳理背后的压力源。'
      }
    ]
  },
  {
    category: '📋 4次探索方案详解',
    items: [
      {
        title: '4次深度方案拆解',
        content: '针对您的情况，最适合的是【4次深度心理探索与梳理方案（打包方案）】特惠价1800元（单次600元，原价2400元立省600元）：第1次全面深度心理评估定位核心症结；第2-3次认知模式与情绪归因拆解；第4次制定定制化生活应对方案与成长策略。'
      },
      {
        title: '对比单次与套餐建议',
        content: '心理探索通常需要一定连续性，单次咨询（400-600元）侧重于评估排查；而4次方案能形成完整的心理支持闭环，性价比和效果都更显著。'
      }
    ]
  },
  {
    category: '💰 100元定金与预约',
    items: [
      {
        title: '定金锁定专属时段',
        content: '由于资深咨询师每日仅开放2-3个私密个案时段，您可以先通过微信支付100元意向定金锁定老师专属时段。定金在咨询到访时全额抵扣尾款。'
      },
      {
        title: '24小时退改期保障',
        content: '我们提供安心保障承诺：咨询前24小时以上支持无条件原路全额退款；咨询前24小时内可免费改期一次，无需担心行程变化。'
      }
    ]
  },
  {
    category: '🚨 危机守护与热线',
    items: [
      {
        title: '危机安抚与契约',
        content: '周女士/先生，我感受到您现在承受着难以承受的重压。请先停下手边的事，深呼吸。知心谷有专业危机守护通道，无论发生什么，我们都在这里守护您的安全。'
      },
      {
        title: '免费心理热线推荐',
        content: '如需即刻24小时专业倾听，请拨打全国免费心理援助热线：400-161-9995 或 北京心理危机干预中心 010-82951332，随时有人接听。'
      }
    ]
  },
  {
    category: '🌿 伦理与保密守则',
    items: [
      {
        title: '专业保密原则说明',
        content: '知心谷严格遵循中国心理学会临床与咨询心理学伦理守则，所有咨询记录、个人信息全程加密存储，除法定人身极端安全等极罕见例外，严格保密。'
      }
    ]
  }
];

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentTab,
  session,
  sessionsList = [],
  onSelectSession,
  currentUser,
  staffList = [],
  onClaimSession,
  onTransferSession,
  onAddInternalNote,
  onUpdateSessionGrade,
  onUpdateDutyStatus,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
  orders,
  crisisAlerts,
  stats,
  scheduleSlots = [],
  scheduleRooms,
  scheduleStats,
  onBookScheduleSlot,
  onCancelScheduleSlot,
  onCreateScheduleSlot,
  onUpdateScheduleSlot,
  onCompleteScheduleSlot,
  onDeleteScheduleSlot,
  onBatchGenerateSchedule,
  onSendAppointmentNoticeToChat,
  onNavigateTab,
  onTakeoverToggle,
  onUpdateAlertAction,
  onTriggerPayment,
}) => {
  const [manualReplyText, setManualReplyText] = useState('');
  const [filterABC, setFilterABC] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [sessionScopeFilter, setSessionScopeFilter] = useState<'all' | 'mine' | 'pending' | 'others'>('all');
  const [selectedOrder, setSelectedOrder] = useState<ConsultationOrder | null>(null);
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState<ConsultationOrder | null>(null);
  
  // Finance & Retention Sub-tabs and Data
  const [financeSubTab, setFinanceSubTab] = useState<'orders' | 'refunds' | 'invoices' | 'midterm'>('orders');
  const [refundsList, setRefundsList] = useState<RefundRecord[]>([]);
  const [invoicesList, setInvoicesList] = useState<InvoiceRecord[]>([]);
  const [midtermAlertsList, setMidtermAlertsList] = useState<MidtermRetentionAlert[]>([]);
  const [exceptionLogs, setExceptionLogs] = useState<ServiceExceptionLog[]>([]);

  useEffect(() => {
    fetch('/api/finance/refunds')
      .then(res => res.json())
      .then(data => { if (data.refunds) setRefundsList(data.refunds); })
      .catch(console.error);

    fetch('/api/finance/invoices')
      .then(res => res.json())
      .then(data => { if (data.invoices) setInvoicesList(data.invoices); })
      .catch(console.error);

    fetch('/api/retention/midterm-alerts')
      .then(res => res.json())
      .then(data => { if (data.alerts) setMidtermAlertsList(data.alerts); })
      .catch(console.error);

    fetch('/api/admin/exception-logs')
      .then(res => res.json())
      .then(data => { if (data.logs) setExceptionLogs(data.logs); })
      .catch(console.error);
  }, [currentTab]);

  const handleApproveRefund = async (refundId: string) => {
    try {
      const res = await fetch(`/api/finance/refunds/${refundId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditedBy: currentUser?.name || '周建国 (中台主管)' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`已成功核准退款！调用微信支付原路退款单号：${data.refund.refundTxId}`);
        setRefundsList(prev => prev.map(r => r.id === refundId ? data.refund : r));
      }
    } catch (e) {
      console.error('Approve refund failed', e);
    }
  };

  const handleRejectRefund = async (refundId: string, reason: string) => {
    try {
      const res = await fetch(`/api/finance/refunds/${refundId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectReason: reason, auditedBy: currentUser?.name || '周建国 (中台主管)' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('已拒绝退款工单，已向访客微信端发送通知说明');
        setRefundsList(prev => prev.map(r => r.id === refundId ? data.refund : r));
      }
    } catch (e) {
      console.error('Reject refund failed', e);
    }
  };

  const handleTriggerMidtermFollowup = async (alertId: string) => {
    try {
      const res = await fetch(`/api/retention/midterm-alerts/${alertId}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName: currentUser?.name || '知心谷·值班助理',
          customNotes: '前2阶段情绪重构效果显性，已自动下发中程评估关怀及10次长程方案升级优惠'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('已向访客微信会话成功发送中程评估关怀及10次长程复购升级优惠卡片！');
        setMidtermAlertsList(prev => prev.map(a => a.id === alertId ? data.alert : a));
      }
    } catch (e) {
      console.error('Trigger midterm followup failed', e);
    }
  };
  
  // Workbench collaborative state
  const [rightPanelTab, setRightPanelTab] = useState<'profile' | 'internal_notes' | 'emotional_trend'>('profile');
  const [isQuickTemplatesOpen, setIsQuickTemplatesOpen] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState(0);
  const [newInternalNoteText, setNewInternalNoteText] = useState('');
  
  // Transfer modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetStaffId, setTransferTargetStaffId] = useState('');
  const [transferReason, setTransferReason] = useState('专长个案精准匹配');

  // Knowledge base state
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>(INITIAL_KNOWLEDGE_BASE);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [knowledgeCategoryFilter, setKnowledgeCategoryFilter] = useState<string>('all');
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeItem | null>(null);
  const [isNewKnowledgeModal, setIsNewKnowledgeModal] = useState(false);
  const [ragTestQuery, setRagTestQuery] = useState('');
  const [ragTestResult, setRagTestResult] = useState<KnowledgeItem | null>(null);

  // Side-by-side Diff comparison & Rollout confirmation states
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [selectedDiffItem, setSelectedDiffItem] = useState<KnowledgeItem | null>(null);
  const [diffVersionA, setDiffVersionA] = useState<string>('');
  const [diffVersionB, setDiffVersionB] = useState<string>('');
  const [isRolloutModalOpen, setIsRolloutModalOpen] = useState(false);
  const [rolloutTargetItem, setRolloutTargetItem] = useState<KnowledgeItem | null>(null);
  const [rolloutTargetVersion, setRolloutTargetVersion] = useState<any | null>(null);
  const [customVersionInput, setCustomVersionInput] = useState<string>('v1.3');

  // Bad Case modal states for AI replies
  const [isBadCaseModalOpen, setIsBadCaseModalOpen] = useState(false);
  const [badCaseTargetMessage, setBadCaseTargetMessage] = useState<any | null>(null);
  const [badCaseSelectedTypes, setBadCaseSelectedTypes] = useState<string[]>(['inaccurate']);
  const [badCaseCommentInput, setBadCaseCommentInput] = useState('');
  const [isFallbackModalOpen, setIsFallbackModalOpen] = useState(false);
  const [fallbackSummary, setFallbackSummary] = useState('');

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3500);
  };

  const handleManualReply = () => {
    if (!manualReplyText.trim()) return;
    onTakeoverToggle(true, manualReplyText.trim());
    setManualReplyText('');
    showToast('人工消息已发送，并同步至来访者微信端');
  };

  // Claim session to current user
  const handleClaimCurrentSession = async () => {
    if (!currentUser) {
      showToast('请先登录值班工号');
      return;
    }
    if (onClaimSession) {
      await onClaimSession(session.id, currentUser.id, `${currentUser.name} (${currentUser.roleName.split(' ')[0]})`);
      showToast(`已成功认领会话【${session.userName}】，开始真人值班接待`);
    } else {
      onTakeoverToggle(true, `【知心谷机构派工】值班顾问 ${currentUser.name} 已正式认领并接入本会话。`);
    }
  };

  // Submit transfer
  const handleConfirmTransfer = async () => {
    const targetStaff = staffList.find(s => s.id === transferTargetStaffId);
    if (!targetStaff) {
      showToast('请选择接班顾问');
      return;
    }
    if (onTransferSession) {
      await onTransferSession(
        session.id,
        targetStaff.id,
        `${targetStaff.name} (${targetStaff.roleName.split(' ')[0]})`,
        transferReason
      );
      setIsTransferModalOpen(false);
      showToast(`已成功将会话转接至【${targetStaff.name}】`);
    }
  };

  // Submit internal note
  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternalNoteText.trim()) return;
    if (onAddInternalNote) {
      await onAddInternalNote(session.id, newInternalNoteText.trim());
      setNewInternalNoteText('');
      showToast('内部协同备忘已记录并留痕存证');
    }
  };

  // Filter session list
  const activeSessionList = sessionsList.length > 0 ? sessionsList : [session];
  const filteredSessions = activeSessionList.filter((s) => {
    if (filterABC !== 'all' && s.abcGrade !== filterABC) return false;
    if (sessionScopeFilter === 'mine') {
      return s.assignedStaffId === currentUser?.id;
    }
    if (sessionScopeFilter === 'pending') {
      return !s.assignedStaffId || !s.isTakenOverByHuman;
    }
    if (sessionScopeFilter === 'others') {
      return s.assignedStaffId && s.assignedStaffId !== currentUser?.id;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 1. 多人协同会话工作台 (Session Workbench - Multi-Seat On-Duty) */}
      {currentTab === 'workbench' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Active sessions list (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col h-[720px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-700" />
                在线会话协同池
              </h3>
              <span className="text-[11px] text-teal-700 font-mono font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                {activeSessionList.length} 个实时连接
              </span>
            </div>

            {/* Scope Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 mb-2 bg-slate-100 p-1 rounded-lg text-[11px] font-medium">
              {[
                { id: 'all', label: '全部' },
                { id: 'mine', label: '我的在办' },
                { id: 'pending', label: '待接入' },
                { id: 'others', label: '同事在办' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSessionScopeFilter(tab.id as any)}
                  className={`py-1 rounded text-center transition-colors cursor-pointer ${
                    sessionScopeFilter === tab.id
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ABC Filter pills */}
            <div className="flex gap-1 mb-3 bg-slate-50 p-1 rounded-lg text-xs border border-slate-100">
              {(['all', 'A', 'B', 'C'] as const).map((grade) => (
                <button
                  key={grade}
                  onClick={() => setFilterABC(grade)}
                  className={`flex-1 py-0.5 rounded transition-colors cursor-pointer text-[11px] ${
                    filterABC === grade
                      ? 'bg-teal-700 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {grade === 'all' ? '全部意向' : `${grade}类`}
                </button>
              ))}
            </div>

            {/* Session items list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {filteredSessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  当前筛选条件下暂无会话
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isSelected = s.id === session.id;
                  const isMySession = s.assignedStaffId === currentUser?.id;
                  const lastMsg = s.messages[s.messages.length - 1];

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectSession && onSelectSession(s.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-teal-50/80 border-teal-500 shadow-xs ring-1 ring-teal-500/30'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[140px]">
                          {s.userName}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                            s.abcGrade === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.abcGrade === 'B'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {s.abcGrade}类意向
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                        {lastMsg ? `${lastMsg.sender === 'user' ? '访客: ' : '回复: '}${lastMsg.content}` : '会话已建立'}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/60">
                        {/* Assignment indicator */}
                        {s.assignedStaffId ? (
                          <span className={`font-semibold flex items-center gap-1 ${isMySession ? 'text-teal-700' : 'text-slate-600'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {isMySession ? '我的在办' : (s.assignedStaffName?.split(' ')[0] || '同事在办')}
                          </span>
                        ) : s.isTakenOverByHuman ? (
                          <span className="text-amber-600 font-semibold">真人接管中</span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                            待认领 (AI中)
                          </span>
                        )}

                        <span className="font-mono text-slate-400">
                          配额 {s.quotaCount}/{s.quotaMax}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom duty status summary */}
            <div className="pt-2.5 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>在岗人员: {staffList.filter(s => s.dutyStatus === 'on_duty').length}人</span>
              <span className="text-teal-700 font-semibold">
                当前登入: {currentUser?.name || '值班老师'}
              </span>
            </div>

            {/* --- PRD V1.0: Service Exception Monitor --- */}
            <div className="mt-4 pt-4 border-t-2 border-rose-100">
              <h4 className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5 mb-2 px-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                服务异常与加急工单监控
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {activeSessionList.filter(s => s.serviceCapability !== 'normal' || s.handoverStatus === 'submitted').length === 0 ? (
                  <div className="py-4 text-center text-[10px] text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    AI 服务核心组件：全量正常 (200 OK)
                  </div>
                ) : (
                  activeSessionList.filter(s => s.serviceCapability !== 'normal' || s.handoverStatus === 'submitted').map(s => (
                    <div 
                      key={`monitor-${s.id}`}
                      onClick={() => onSelectSession && onSelectSession(s.id)}
                      className={`p-2 border rounded-lg cursor-pointer transition-all ${
                        s.serviceCapability === 'stopped' 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                          : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-bold truncate ${s.serviceCapability === 'stopped' ? 'text-red-900' : 'text-amber-900'}`}>
                          {s.userName}
                        </span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-bold text-white ${s.serviceCapability === 'stopped' ? 'bg-red-600' : 'bg-amber-500'}`}>
                          {s.serviceCapability === 'stopped' ? '熔断' : '受限'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-slate-500">{s.incidentContext?.lastErrorType || '待命'}</span>
                        <span className="animate-pulse font-bold text-rose-600 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          待人工接入
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Center: Live chat stream and collaborative workbench (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[720px]">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {session.userName}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                    {session.userCity || '微信客服'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 truncate">
                    接待状态：
                    <strong className={session.assignedStaffId ? 'text-teal-800' : 'text-emerald-700'}>
                      {session.assignedStaffId ? `由【${session.assignedStaffName}】负责` : '待指派 (AI自动应答中)'}
                    </strong>
                  </span>

                  {/* 实时心身压力与高关注度访客动态指示器 (仅管理后台坐席可见) */}
                  {(() => {
                    const emo = analyzeEmotionalTrend(session);
                    return (
                      <button
                        type="button"
                        onClick={() => setRightPanelTab('emotional_trend')}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all border flex items-center gap-1 shadow-2xs ${
                          emo.isHighAttention
                            ? 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse'
                            : emo.currentStressScore >= 40
                            ? 'bg-sky-50 border-sky-200 text-sky-800'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}
                        title="点击直接在右侧面板切入【心身压力时序雷达图】"
                      >
                        <Activity className="w-3 h-3" />
                        <span>心身压力: {emo.currentStressScore}分</span>
                        <span className="text-[10px] bg-white/90 px-1 rounded font-bold">
                          {emo.levelLabel}
                        </span>
                        {emo.isHighAttention && (
                          <span className="text-[9px] bg-rose-600 text-white px-1 rounded font-bold">
                            高关注
                          </span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons: Claim / Transfer / Takeover */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Claim Button */}
                {(!session.assignedStaffId || session.assignedStaffId !== currentUser?.id) && (
                  <button
                    onClick={handleClaimCurrentSession}
                    title="将本会话正式指派给自己承接"
                    className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>认领接单</span>
                  </button>
                )}

                {/* Transfer Button */}
                <button
                  onClick={() => {
                    const firstOther = staffList.find(s => s.id !== currentUser?.id);
                    if (firstOther) setTransferTargetStaffId(firstOther.id);
                    setIsTransferModalOpen(true);
                  }}
                  title="转接给其他在线顾问或督导专家"
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>转接</span>
                </button>

                {/* Takeover toggle (Takeover & Fallback with Summary) */}
                <button
                  onClick={() => {
                    if (session.isTakenOverByHuman) {
                      setIsFallbackModalOpen(true);
                    } else {
                      onTakeoverToggle(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    session.isTakenOverByHuman
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                   }`}
                >
                  <span>{session.isTakenOverByHuman ? '交还AI' : '人工接管'}</span>
                </button>

                {/* --- PRD V1.0: Reset Service Capability --- */}
                {(session.serviceCapability !== 'normal' || (session.incidentContext?.consecutiveFailures || 0) > 0) && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/sessions/${session.id}/reset-capability`, {
                          method: 'POST'
                        });
                        const data = await res.json();
                        if (data.success) {
                          showToast('AI 服务状态已手动恢复至 Normal');
                        }
                      } catch (e) {
                        console.error('Reset capability failed', e);
                      }
                    }}
                    title="手动恢复该会话的 AI 服务能力"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>自愈重置</span>
                  </button>
                )}
              </div>
            </div>

            {/* Transfer Modal with Smart Recommendation */}
            {isTransferModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 animate-fadeIn">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-teal-600" />
                      会话转接与专家指派
                    </h3>
                    <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Smart Recommendation Card */}
                  {(() => {
                    // Logic to find least busy on the fly if backend fetch not used or as fallback
                    const availableStaff = staffList.filter(s => s.dutyStatus !== 'offline');
                    const leastBusy = [...availableStaff].sort((a, b) => (a.currentActiveSessions / a.maxConcurrent) - (b.currentActiveSessions / b.maxConcurrent))[0];
                    
                    if (!leastBusy) return null;

                    return (
                      <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            智能辅助决策：最空闲顾问推荐
                          </span>
                          <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full font-bold">
                            当前负载: {Math.round((leastBusy.currentActiveSessions / leastBusy.maxConcurrent) * 100)}%
                          </span>
                        </div>
                        <div 
                          onClick={() => setTransferTargetStaffId(leastBusy.id)}
                          className="flex items-center gap-3 p-2 bg-white rounded-lg border border-emerald-300 hover:border-emerald-500 cursor-pointer transition-all shadow-2xs"
                        >
                          <img src={leastBusy.avatar} className="w-8 h-8 rounded-full bg-slate-100" alt="" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900">{leastBusy.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{leastBusy.title}</div>
                          </div>
                          <CheckCircle2 className={`w-4 h-4 ${transferTargetStaffId === leastBusy.id ? 'text-emerald-600' : 'text-slate-200'}`} />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">选择目标接班人</label>
                      <select
                        value={transferTargetStaffId}
                        onChange={(e) => setTransferTargetStaffId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-teal-500"
                      >
                        <option value="">请选择在线同事...</option>
                        {staffList.filter(s => s.id !== currentUser?.id).map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.roleName.split(' ')[0]}) - 负载:{s.currentActiveSessions}/{s.maxConcurrent}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">转接原因/交接备忘</label>
                      <textarea
                        rows={3}
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        placeholder="请输入交接理由，如：专家咨询需求、休息换班、异议处理升级等"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setIsTransferModalOpen(false)}
                      className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleConfirmTransfer}
                      disabled={!transferTargetStaffId}
                      className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      确认转接并通知
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback Summary Modal */}
            {isFallbackModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 animate-fadeIn">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      平滑回退 AI：请提供人工处理摘要
                    </h3>
                    <button onClick={() => setIsFallbackModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-4">
                    为了让 AI 助手能够无缝接续您的服务，请简要总结刚才的人工处理过程。该摘要将作为 AI 的实时记忆注入。
                  </p>

                  <textarea
                    rows={4}
                    value={fallbackSummary}
                    onChange={(e) => setFallbackSummary(e.target.value)}
                    placeholder="如：访客主要纠结价格，已告知4次打包方案的性价比。对方目前情绪平稳，正考虑中..."
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-teal-500 mb-4"
                  />

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        onTakeoverToggle(false);
                        setIsFallbackModalOpen(false);
                      }}
                      className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                    >
                      跳过摘要直接交还
                    </button>
                    <button
                      onClick={() => {
                        onTakeoverToggle(false, undefined, fallbackSummary);
                        setIsFallbackModalOpen(false);
                        setFallbackSummary('');
                      }}
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      确认交还并注入记忆
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
              {session.messages.map((m) => {
                const isUser = m.sender === 'user';
                const isHuman = m.sender === 'human';
                const isSystem = m.sender === 'system';

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center my-2">
                      <div className="bg-slate-200 text-slate-700 text-[10px] px-3 py-1 rounded-full max-w-md text-center leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl text-xs leading-relaxed max-w-lg shadow-2xs ${
                      isUser
                        ? 'ml-auto bg-emerald-600 text-white rounded-tr-xs'
                        : isHuman
                        ? 'bg-amber-50 border border-amber-200/90 text-amber-950 rounded-tl-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    <div className="text-[10px] opacity-75 mb-1 flex items-center justify-between">
                      <span className="font-medium">
                        {isUser ? '访客' : isHuman ? (m.senderName || '值班人工老师') : (m.senderName || 'AI智能助手')}
                      </span>
                      <span>{m.timestamp}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.cardType && m.cardType !== 'none' && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 text-[10px] text-teal-800 font-semibold">
                        [业务功能卡片]: {m.cardType}
                      </div>
                    )}
                    {!isUser && !isHuman && !isSystem && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">ID: {m.id}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBadCaseTargetMessage(m);
                            setBadCaseSelectedTypes(['inaccurate']);
                            setBadCaseCommentInput('');
                            setIsBadCaseModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-medium border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                          title="标记为此条AI回复为Bad Case，归入飞轮处理队列"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>标记Bad Case</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Templates Drawer / Accordion */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-3 py-1.5 bg-slate-50 flex items-center justify-between border-b border-slate-100 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsQuickTemplatesOpen(!isQuickTemplatesOpen)}
                  className="flex items-center gap-1.5 text-slate-700 font-semibold hover:text-teal-700 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>快捷回复话术库 (共{QUICK_REPLY_TEMPLATES.reduce((s, c) => s + c.items.length, 0)}条)</span>
                  {isQuickTemplatesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <span className="text-[10px] text-slate-400">
                  点击话术一键填入输入框
                </span>
              </div>

              {isQuickTemplatesOpen && (
                <div className="p-3 bg-slate-50/70 border-b border-slate-200 max-h-48 overflow-y-auto animate-fadeIn">
                  <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                    {QUICK_REPLY_TEMPLATES.map((cat, idx) => (
                      <button
                        key={cat.category}
                        type="button"
                        onClick={() => setSelectedTemplateCategory(idx)}
                        className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                          selectedTemplateCategory === idx
                            ? 'bg-teal-700 text-white font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat.category}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {QUICK_REPLY_TEMPLATES[selectedTemplateCategory].items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        onClick={() => {
                          setManualReplyText(item.content);
                          if (!session.isTakenOverByHuman) {
                            onTakeoverToggle(true);
                          }
                        }}
                        className="p-2 bg-white rounded-lg border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer text-left"
                      >
                        <div className="font-semibold text-[11px] text-slate-900 mb-0.5 text-teal-900">
                          {item.title}
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual reply box */}
              <div className="p-3 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      session.isTakenOverByHuman
                        ? `以【${currentUser?.name || '值班老师'}】身份回复微信访客...`
                        : '请先点击右上角【人工接管】或【认领接单】后再输入回复'
                    }
                    value={manualReplyText}
                    onChange={(e) => setManualReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualReply()}
                    disabled={!session.isTakenOverByHuman}
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 disabled:bg-slate-100"
                  />
                  <button
                    onClick={handleManualReply}
                    disabled={!session.isTakenOverByHuman || !manualReplyText.trim()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>发送回复</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visitor 360 Panorama & Collaboration Notes (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col h-[720px] overflow-y-auto">
            {/* Tabs for Right Panel */}
            <div className="flex border-b border-slate-200 mb-3 text-xs">
              <button
                onClick={() => setRightPanelTab('profile')}
                className={`flex-1 py-1.5 font-bold text-center border-b-2 cursor-pointer ${
                  rightPanelTab === 'profile'
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                访客画像与ABC分级
              </button>
              <button
                onClick={() => setRightPanelTab('internal_notes')}
                className={`flex-1 py-1.5 font-bold text-center border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
                  rightPanelTab === 'internal_notes'
                    ? 'border-teal-700 text-teal-800'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>督导备忘</span>
                <span className="text-[10px] bg-slate-100 px-1.5 rounded-full">
                  {session.internalNotes?.length || 0}
                </span>
              </button>
            </div>

            {rightPanelTab === 'profile' ? (
              <div className="space-y-4 text-xs">
                {/* ABC Grade Selector */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-700">意向分级判定 (可手动纠偏)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      session.abcGrade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                      session.abcGrade === 'B' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {session.abcGrade} 级客户
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {(['A', 'B', 'C'] as ABCRating[]).map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        onClick={async () => {
                          if (onUpdateSessionGrade) {
                            await onUpdateSessionGrade(session.id, grade, `坐席顾问【${currentUser?.name || '人工顾问'}】手动校正意向：原 ${session.abcGrade} 级 -> 修正为 ${grade} 级（反哺分类器漂移报表）`);
                            showToast(`已成功将【${session.userName}】意向纠偏为【${grade}类】，并同步至分类器漂移反哺评估器！`);
                          }
                        }}
                        className={`py-1 rounded text-center font-bold text-xs cursor-pointer transition-colors ${
                          session.abcGrade === grade
                            ? grade === 'A' ? 'bg-emerald-600 text-white' :
                              grade === 'B' ? 'bg-amber-500 text-white' :
                              'bg-slate-700 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {grade} 类
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100 leading-relaxed">
                    <strong>判定依据：</strong>{session.abcReason || '根据访客咨询意愿与问询深度自动分析'}
                  </p>
                </div>

                {/* Gemini Live Memory Summary */}
                <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                  <span className="text-xs font-bold text-teal-900 block mb-1">
                    Gemini 会话记忆摘要 (实时提取)
                  </span>
                  <p className="text-[11px] text-teal-800 bg-white p-2 rounded border border-teal-100 leading-relaxed">
                    {session.summary || '暂无实时摘要，随着对话进行将自动由Gemini API生成'}
                  </p>
                </div>

                {/* Compliance checklist */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">
                    已获知情同意存证 (合规审计)
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>服务协议与AI接待告知已触达</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>咨询师公开档案推荐授权已确认</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>预约手机号与称呼仅限本次联络</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>24小时前无条件退款保障已披露</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab('schedule');
                    }}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>前往排期日历为访客锁定专属时段</span>
                  </button>
                  <button
                    onClick={() => showToast(`已生成销售交接单：访客【${session.userName}】（${session.abcGrade}类），已指派值班顾问跟进`)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    推送给销售顾问跟进
                  </button>
                  <button
                    onClick={() => showToast('已成功将当前会话脱敏摘要生成为标准化个案初筛档案，并存档到后台数据库。')}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    导出脱敏初筛档案
                  </button>

                  {/* PRD V1.0: System Capability Admin Control */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">系统响应组件管控 (故障模拟)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/sessions/${session.id}/set-capability`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ capability: 'normal' })
                          });
                          showToast('AI 响应能力已恢复：NORMAL');
                        }}
                        className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                          session.serviceCapability === 'normal' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-500' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        健康
                      </button>
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/sessions/${session.id}/set-capability`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ capability: 'stopped' })
                          });
                          showToast('系统响应已人工熔断：STOPPED');
                        }}
                        className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                          session.serviceCapability === 'stopped' 
                            ? 'bg-red-600 text-white border-red-700' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-red-50'
                        }`}
                      >
                        熔断
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : rightPanelTab === 'internal_notes' ? (
              /* Internal Notes & Transfer History */
              <div className="space-y-4 text-xs flex flex-col flex-1">
                {/* Add new note form */}
                <form onSubmit={handleAddInternalNote} className="space-y-2">
                  <label className="block text-slate-700 font-semibold">
                    新增顾问私密备忘 (来访者不可见)
                  </label>
                  <textarea
                    rows={2}
                    value={newInternalNoteText}
                    onChange={(e) => setNewInternalNoteText(e.target.value)}
                    placeholder="如：访客对价格略有犹豫，已告知支持100元定金锁定周末李老师时段..."
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!newInternalNoteText.trim()}
                    className="w-full py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50 cursor-pointer text-xs"
                  >
                    保存备忘
                  </button>
                </form>

                {/* Notes list */}
                <div className="space-y-2 flex-1 overflow-y-auto">
                  <h4 className="font-semibold text-slate-700 text-[11px]">
                    历史备忘记录 ({session.internalNotes?.length || 0})
                  </h4>
                  {(!session.internalNotes || session.internalNotes.length === 0) ? (
                    <p className="text-[11px] text-slate-400 py-4 text-center">
                      暂无备忘记录，可随时在上方输入保存
                    </p>
                  ) : (
                    session.internalNotes.map((note) => (
                      <div key={note.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                          <span className="font-bold text-slate-700">{note.authorName}</span>
                          <span>{note.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}

                  {/* Transfer Logs */}
                  {session.transferHistory && session.transferHistory.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <h4 className="font-semibold text-slate-700 text-[11px] mb-2">
                        会话流转记录
                      </h4>
                      {session.transferHistory.map((th) => (
                        <div key={th.id} className="p-2 bg-teal-50/60 border border-teal-100 rounded-lg text-[10px] text-teal-900 mb-1.5">
                          <div className="flex justify-between">
                            <strong>{th.fromStaffName} → {th.toStaffName}</strong>
                            <span>{th.timestamp}</span>
                          </div>
                          <div className="text-teal-700 mt-0.5">原因: {th.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Emotional Trend Panel inside Admin Console Workbench */
              <div className="flex-1 overflow-y-auto">
                <EmotionalTrendPanel
                  session={session}
                  onTakeoverToggle={(isTakenOver) => onTakeoverToggle(isTakenOver)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer Session Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-teal-700" />
                转接当前会话：{session.userName}
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  选择接收会话的在线顾问 / 督导专家 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={transferTargetStaffId}
                  onChange={(e) => setTransferTargetStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                >
                  {staffList
                    .filter((s) => s.id !== currentUser?.id)
                    .map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.roleName}) · 当前承接 {staff.currentActiveSessions}/{staff.maxConcurrent}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">转接交接事由</label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="如：擅长CBT流派匹配 / 青少年个案转接 / 换班交接"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-amber-50 text-amber-900 rounded-xl text-[11px] leading-relaxed">
                转接确认后，接班老师的工作台将收到实时弹窗提示，会话流转记录将自动归档。
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  确认转接
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. 咨询师排期日历看板 (Counselor Schedule Kanban & Calendar) */}
      {currentTab === 'schedule' && (
        <CounselorScheduleCalendar
          slots={scheduleSlots || []}
          rooms={scheduleRooms}
          stats={scheduleStats}
          onBookSlot={onBookScheduleSlot}
          onCancelSlot={onCancelScheduleSlot}
          onCreateSlot={onCreateScheduleSlot}
          onUpdateSlot={onUpdateScheduleSlot}
          onCompleteSlot={onCompleteScheduleSlot}
          onDeleteSlot={onDeleteScheduleSlot}
          onBatchGenerate={onBatchGenerateSchedule}
          currentSessionClientName={session.userName}
          currentSessionClientPhone={session.bookingDraft?.phone}
          currentSessionPreferredCounselor={session.bookingDraft?.preferredCounselor}
          onSendAppointmentNoticeToChat={onSendAppointmentNoticeToChat}
        />
      )}

      {/* 3. 账号与权限管理 (Accounts & Staff Management - FR-NEW) */}
      {currentTab === 'accounts' && (
        <StaffAccountManagement
          staffList={staffList}
          currentUserId={currentUser?.id || ''}
          onUpdateDutyStatus={onUpdateDutyStatus || (() => {})}
          onCreateStaff={onCreateStaff || (async () => {})}
          onUpdateStaff={onUpdateStaff || (async () => {})}
          onDeleteStaff={onDeleteStaff || (async () => {})}
        />
      )}

      {/* 3. 咨询支付、退款、电子发票与中程履约 (Orders, Refunds, Invoices & Retention) */}
      {currentTab === 'orders' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">累计成交金额</span>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                ￥{stats.totalRevenue.toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">微信支付企业商户到账</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">待处理退款工单</span>
              <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
                {refundsList.filter(r => r.status === 'pending_review').length} 笔
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">开询前24小时无条件退款规约</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">电子发票已开具</span>
              <div className="text-2xl font-bold text-teal-700 mt-1 font-mono">{invoicesList.length} 张</div>
              <span className="text-[11px] text-teal-700 mt-1 block">增值税电子发票PDF可实时下载</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">中程评估回访/脱落预警</span>
              <div className="text-2xl font-bold text-rose-600 mt-1 font-mono">
                {midtermAlertsList.filter(a => a.status === 'pending').length} 人
              </div>
              <span className="text-[11px] text-rose-600 mt-1 block">4次方案完成2次触发防脱落</span>
            </div>
          </div>

          {/* Sub-tab Navigation Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-2 flex flex-wrap gap-2 shadow-xs">
            <button
              onClick={() => setFinanceSubTab('orders')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                financeSubTab === 'orders'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>咨询订单与支付明细 ({orders.length})</span>
            </button>

            <button
              onClick={() => setFinanceSubTab('refunds')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                financeSubTab === 'refunds'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>退款申请管理 (24h政策核准)</span>
              {refundsList.filter(r => r.status === 'pending_review').length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {refundsList.filter(r => r.status === 'pending_review').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFinanceSubTab('invoices')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                financeSubTab === 'invoices'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>电子票据与发票 ({invoicesList.length})</span>
            </button>

            <button
              onClick={() => setFinanceSubTab('midterm')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                financeSubTab === 'midterm'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>中程评估回访与脱落预警</span>
              {midtermAlertsList.filter(a => a.status === 'pending').length > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {midtermAlertsList.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>
          </div>

          {/* Sub-tab 1: Orders Table */}
          {financeSubTab === 'orders' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">心理咨询服务订单与支付记录</h3>
                  <p className="text-xs text-slate-500">微信客服渠道生成的预约定金与方案购买清单</p>
                </div>
                <span className="text-xs text-slate-500 font-mono">共 {orders.length} 条记录</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">订单编号</th>
                      <th className="px-4 py-3">咨询访客</th>
                      <th className="px-4 py-3">服务方案</th>
                      <th className="px-4 py-3">指定咨询师</th>
                      <th className="px-4 py-3">预约时段</th>
                      <th className="px-4 py-3">支付金额</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">销售跟进</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{ord.orderNo}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{ord.userName}</div>
                          <div className="text-[10px] text-slate-400">{ord.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">{ord.productName}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{ord.counselorName || '系统指派'}</td>
                        <td className="px-4 py-3 text-slate-700">{ord.preferredTime || '待沟通确认'}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600 font-mono">
                          ￥{ord.paymentType === 'deposit' ? `${ord.depositAmount} (定金)` : ord.amount}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ord.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                            ord.paymentStatus === 'deposit_paid' ? 'bg-teal-100 text-teal-800' :
                            ord.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {ord.paymentStatus === 'paid' ? '已付全款' :
                             ord.paymentStatus === 'deposit_paid' ? '已付定金' :
                             ord.paymentStatus === 'pending' ? '待微信支付' : '已退款'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{ord.humanSalesAssignee || '待分配'}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {ord.paymentStatus === 'pending' ? (
                            <button
                              onClick={() => onTriggerPayment(ord)}
                              className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer"
                            >
                              去支付
                            </button>
                          ) : (
                            <button
                              onClick={() => setReceiptModalOrder(ord)}
                              className="text-xs text-teal-700 hover:text-teal-900 font-medium cursor-pointer"
                            >
                              查看凭证
                            </button>
                          )}
                          <button
                            onClick={() => setFinanceSubTab('invoices')}
                            className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            开具发票
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Refund Management Table */}
          {financeSubTab === 'refunds' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-amber-600" />
                    微信支付退款申请审核与原路原费退回中心
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    严格执行【开询前24小时无条件全额退款】政策。核准后系统直接调用微信支付商户退款 API 原路退回给访客。
                  </p>
                </div>
                <span className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                  24h保障履约率：100%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">工单/订单号</th>
                      <th className="px-4 py-3">申请访客</th>
                      <th className="px-4 py-3">退款金额</th>
                      <th className="px-4 py-3">开询约定时段</th>
                      <th className="px-4 py-3">24h政策校验</th>
                      <th className="px-4 py-3">退款申请说明</th>
                      <th className="px-4 py-3">当前状态</th>
                      <th className="px-4 py-3 text-right">审核操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {refundsList.map((rf) => (
                      <tr key={rf.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{rf.orderNo}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{rf.clientName}</td>
                        <td className="px-4 py-3 font-bold text-amber-700 font-mono">￥{rf.amount}.00</td>
                        <td className="px-4 py-3 text-slate-700">{rf.appointmentTime || '待确定'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            rf.isWithin24hPolicy
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {rf.isWithin24hPolicy ? '✅ 符合>24h政策条件' : '⚠️ 不符合24h条件'}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] text-slate-600 line-clamp-2">{rf.refundReason}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rf.status === 'pending_review' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                            rf.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {rf.status === 'pending_review' ? '待审核' :
                             rf.status === 'approved' ? '已核准退款' : '已驳回'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {rf.status === 'pending_review' ? (
                            <>
                              <button
                                onClick={() => handleApproveRefund(rf.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                一键微信原路退款
                              </button>
                              <button
                                onClick={() => handleRejectRefund(rf.id, '不符合开询前24h申请规则')}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium cursor-pointer"
                              >
                                驳回
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {rf.refundTxId ? `退款单: ${rf.refundTxId}` : '退款结案'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 3: Invoices Table */}
          {financeSubTab === 'invoices' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-teal-700" />
                    增值税电子发票与财务票据存根
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    访客可在微信客服端自行登记抬头并即时生成开具。支持下载增值税电子普通发票 PDF 文件。
                  </p>
                </div>
                <span className="text-xs text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 font-medium">
                  发票合规开具率：100%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">发票代码/号码</th>
                      <th className="px-4 py-3">发票抬头</th>
                      <th className="px-4 py-3">抬头类型</th>
                      <th className="px-4 py-3">纳税人识别号</th>
                      <th className="px-4 py-3">开票类目</th>
                      <th className="px-4 py-3">金额 (含税)</th>
                      <th className="px-4 py-3">接收邮箱</th>
                      <th className="px-4 py-3">开票时间</th>
                      <th className="px-4 py-3 text-right">PDF凭证</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoicesList.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">
                          {inv.invoiceCode}<br />
                          <span className="text-teal-700">{inv.invoiceNo}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{inv.title}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                            {inv.invoiceType === 'enterprise' ? '企业/机构' : '个人'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">{inv.taxNumber || '—'}</td>
                        <td className="px-4 py-3 text-slate-800 font-medium">{inv.contentCategory}</td>
                        <td className="px-4 py-3 font-bold text-teal-700 font-mono">￥{inv.amount}.00</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{inv.email}</td>
                        <td className="px-4 py-3 text-slate-500">{inv.issuedAt}</td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>预览/打印 PDF</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 4: Mid-term Assessment Retention Table */}
          {financeSubTab === 'midterm' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    4次打包方案中程评估回访与脱落预警护航中心
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    在4次深度心理探索方案完成前2次后，系统自动触发脱落警报。值班助理发起中程回访关怀，防范流失并提升10次长程复购升级率。
                  </p>
                </div>
                <span className="text-xs text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 font-medium">
                  中程评估触发标准：完成 2/4 次
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {midtermAlertsList.map((alt) => (
                  <div key={alt.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex justify-between items-start border-b border-slate-200/80 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{alt.clientName}</span>
                          <span className="text-xs text-slate-400 font-mono">({alt.phone})</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">签约方案：{alt.packageName}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        alt.riskLevel === 'high' ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {alt.riskLevel === 'high' ? '⚠️ 高脱落风险 (间隔>10天)' : '⚡ 中程评估窗口期'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200/60 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">已完成进度</span>
                        <span className="font-bold text-teal-700">{alt.completedCount} / {alt.totalCount} 次</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">上次咨询日期</span>
                        <span className="font-bold text-slate-800">{alt.lastSessionDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">停滞天数</span>
                        <span className="font-bold text-rose-600">{alt.daysSinceLastSession} 天</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100 leading-relaxed">
                      💡 {alt.riskReason}
                    </p>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[11px] text-slate-400">
                        {alt.status === 'followed_up' ? `已由 ${alt.staffName || '值班助理'} 于 ${alt.followedUpAt} 完成回访` : '待值班助理发起关怀'}
                      </span>

                      {alt.status === 'pending' ? (
                        <button
                          onClick={() => handleTriggerMidtermFollowup(alt.id)}
                          className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>一键下发中程评估与10次长程升级卡片</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          ✅ 已下发中程关怀与复购优惠
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. 危机预警台 (Crisis Alert Desk - FR-23) */}
      {currentTab === 'crisis' && (
        <div className="space-y-6">
          <div className="bg-rose-50 border-2 border-rose-500/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-950">
                    危机预警台 (在岗值班员专用 · P0最高响应优先级)
                  </h3>
                  <p className="text-xs text-rose-800">
                    5分钟内必须真人确认接手 · 规则命中即触发 · 误报仅标记无惩罚记录
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-white text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200">
                实时告警队列: {crisisAlerts.length}
              </span>
            </div>
          </div>

          {/* Alert cards */}
          <div className="space-y-4">
            {crisisAlerts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-base font-semibold text-slate-700">当前无待处置的危机预警</h4>
                <p className="text-xs text-slate-500 mt-1">系统三级防线正在全量监控微信客服会话流</p>
              </div>
            ) : (
              crisisAlerts.map((alt) => (
                <div
                  key={alt.id}
                  className={`bg-white rounded-xl border p-5 shadow-sm ${
                    alt.status === 'pending'
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : alt.status === 'handled'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white">
                        {alt.riskLevel}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{alt.userName}</span>
                      <span className="text-xs text-slate-400 font-mono">触发时间: {alt.detectedAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-600 animate-spin" />
                      <span className="text-xs font-bold text-rose-700 font-mono">
                        5分钟升级截止: {alt.deadlineAt}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        alt.status === 'pending' ? 'bg-rose-100 text-rose-800' :
                        alt.status === 'handled' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {alt.status === 'pending' ? '待接手确认' : alt.status === 'handled' ? '已闭环接管' : '已核对误报'}
                      </span>
                    </div>
                  </div>

                  {/* Verbatim quote */}
                  <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-100 mb-3 text-xs">
                    <div className="text-rose-900 font-medium">触发原句: “{alt.triggerSentence}”</div>
                    <div className="text-rose-700 text-[11px] mt-1">命中规则: {alt.hitRule} (风险得分 {alt.score}分)</div>
                  </div>

                  {/* Real-time Crisis Assessment Progress from Knowledge Base SOP */}
                  {alt.assessmentSummary && (
                    <div className="bg-amber-50/90 p-2.5 rounded-lg border border-amber-200 mb-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                        <span className="font-bold shrink-0">四步危机评估状态:</span>
                        <span className="text-amber-800">{alt.assessmentSummary}</span>
                      </div>
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-bold shrink-0 self-start sm:self-auto">
                        C-SSRS SOP守护中
                      </span>
                    </div>
                  )}

                  {/* 3-step institutional checklist */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                    <h5 className="text-xs font-bold text-slate-800 mb-2">机构侧三项动作闭环核验清单 (FR-12):</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alt.actions.hotlineProvided}
                          onChange={() => onUpdateAlertAction(alt.id, 'hotline')}
                          className="rounded text-emerald-600"
                        />
                        <span>① 12356免费热线已送达</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alt.actions.userWillingnessChecked}
                          onChange={() => onUpdateAlertAction(alt.id, 'willingness')}
                          className="rounded text-emerald-600"
                        />
                        <span>② 求助意愿已询问</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alt.actions.dutyStaffNotified}
                          onChange={() => onUpdateAlertAction(alt.id, 'notified')}
                          className="rounded text-emerald-600"
                        />
                        <span>③ 值班在岗人员已实际通知</span>
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  {alt.status === 'pending' && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => onUpdateAlertAction(alt.id, 'false_positive')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        标记误报 (仅确认，无任何惩罚记录)
                      </button>
                      <button
                        onClick={() => onUpdateAlertAction(alt.id, 'resolve')}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                      >
                        立即确认接手会话 (倒计时转绿)
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. 总览看板 (Analytics Dashboard - FR-24) */}
      {currentTab === 'dashboard' && (
        <div className="space-y-6">
          {/* O1, O2, O3, O4 KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* O1 安全不出事 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-rose-700">O1 安全不出事 (准入门槛)</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">P0一票否决</span>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">危机识别召回率</span>
                  <span className="font-bold text-emerald-600 font-mono">100% (漏报=0)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">高风险5分钟响应达标</span>
                  <span className="font-bold text-emerald-600 font-mono">{stats.humanResponseRate}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">机构动作闭环率</span>
                  <span className="font-bold text-emerald-600 font-mono">100%</span>
                </div>
              </div>
            </div>

            {/* O2 接得住洪峰 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-teal-700">O2 接得住洪峰</span>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">承接力</span>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">AI独立解决率</span>
                  <span className="font-bold text-slate-900 font-mono">{stats.aiSelfResolutionRate}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">首响延迟中位数</span>
                  <span className="font-bold text-slate-900 font-mono">{stats.avgFirstResponseSec}秒 (目标≤3s)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">P90延迟时差</span>
                  <span className="font-bold text-slate-900 font-mono">{stats.p90ResponseSec}秒 (目标≤8s)</span>
                </div>
              </div>
            </div>

            {/* O3 线索与转化 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-indigo-700">O3 线索与转化</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">两段式归因</span>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">合格线索转化率</span>
                  <span className="font-bold text-slate-900 font-mono">{stats.qualifiedLeadRate}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">今日总会话量</span>
                  <span className="font-bold text-slate-900 font-mono">{stats.todaySessions} 会话</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">转人工率</span>
                  <span className="font-bold text-slate-900 font-mono">{stats.handOverRate}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-500">平均服务满意度</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 font-mono">{stats.averageSatisfaction}</span>
                    <span className="text-amber-500 text-xs">★★★★★</span>
                  </div>
                </div>
              </div>
            </div>

            {/* O4 合规零缺陷 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-800">O4 合规零缺陷</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">法定义务</span>
              </div>
              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">AI身份告知触达率</span>
                  <span className="font-bold text-emerald-600 font-mono">100% (首响必须)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">长时提醒触发率 (2h)</span>
                  <span className="font-bold text-emerald-600 font-mono">100%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">训练数据隔离度</span>
                  <span className="font-bold text-emerald-600 font-mono">100% (零数据出域)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exception Capture Monitoring Panel (PRD Request: FR-韧性监控) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs animate-fadeIn">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  异常捕获与服务韧性实时监控 (Exception Monitor)
                </h4>
                <p className="text-xs text-slate-500 mt-1">实时捕获系统降级、熔断及访客体验指标下滑预警，支持快速技术归因</p>
              </div>
              <div className="flex gap-3 text-[10px] font-bold">
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  降级事件: {exceptionLogs.filter(l => l.type === 'degradation').length}
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  熔断状态: {exceptionLogs.filter(l => l.type === 'circuit_breaker').length}
                </div>
                <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  体验预警: {exceptionLogs.filter(l => l.type === 'metric_decline').length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Exception Distribution Chart (Mocked Visual) */}
              <div className="lg:col-span-4 space-y-5">
                <h5 className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  AI 服务异常分类分布 (近24h)
                </h5>
                <div className="space-y-4">
                  {[
                    { label: 'AI 响应超时 (Timeout)', count: 12, total: 30, color: 'bg-amber-400' },
                    { label: '模型生成失败 (Model Error)', count: 6, total: 30, color: 'bg-rose-500' },
                    { label: '安全合规拦截 (Safety Blocked)', count: 8, total: 30, color: 'bg-indigo-400' },
                    { label: '访客体验/满意度波动预警', count: 4, total: 30, color: 'bg-teal-400' },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">{item.label}</span>
                        <span className="font-mono font-bold text-slate-700">{item.count} 次</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${(item.count / item.total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-4">
                  <p className="text-[10px] text-slate-400 leading-relaxed italic text-center">
                    “系统根据会话心跳、AI延迟及情绪雷达自动判断。熔断事件需技术主管介入恢复。”
                  </p>
                </div>
              </div>

              {/* Right: Exception Event Stream Table */}
              <div className="lg:col-span-8 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-[11px] text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">触发时间</th>
                      <th className="px-4 py-2.5">受影响访客</th>
                      <th className="px-4 py-2.5">韧性策略</th>
                      <th className="px-4 py-2.5">异常事件描述</th>
                      <th className="px-4 py-2.5 text-right">人工复核</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {exceptionLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <ShieldCheck className="w-8 h-8 text-emerald-200" />
                            <span>当前系统核心组件稳定，无异常事件捕获</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      exceptionLogs.slice(0, 6).map((log) => (
                        <tr key={log.id} className="hover:bg-teal-50/30 transition-colors group">
                          <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString().slice(0, 5)}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{log.userName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              log.type === 'circuit_breaker' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              log.type === 'degradation' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {log.type === 'circuit_breaker' ? '熔断防护' : log.type === 'degradation' ? '降级运行' : '指标预警'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[180px]">{log.event}</span>
                              {log.errorType && (
                                <span className="text-[9px] bg-slate-100 text-slate-400 px-1 rounded font-mono">
                                  {log.errorType}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => onSelectSession && onSelectSession(log.sessionId)}
                              className={`font-bold transition-all cursor-pointer ${log.status === 'active' ? 'text-rose-600 hover:underline' : 'text-emerald-600'}`}
                            >
                              {log.status === 'active' ? '立即复核 →' : '核销完成'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Lead Funnel & Attribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              两段式线索漏斗（PRD G-09 规范：系统归因于合格线索，真人归因于到访与成交）
            </h4>
            <p className="text-xs text-slate-500 mb-6">严禁把AI线索与真人成交混算，确保效果科学归因</p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs text-slate-500">第1步：微信客服接待</span>
                <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">142</div>
                <span className="text-[11px] text-slate-400 mt-1 block">AI独立解决 68.2%</span>
              </div>
              <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200/80">
                <span className="text-xs text-teal-800">第2步：合格线索 (系统归因)</span>
                <div className="text-2xl font-bold text-teal-900 mt-1 font-mono">59</div>
                <span className="text-[11px] text-teal-700 mt-1 block">A/B类有效留资或方案询价</span>
              </div>
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
                <span className="text-xs text-indigo-800">第3步：真人加好友/确认 (真人侧)</span>
                <div className="text-2xl font-bold text-indigo-900 mt-1 font-mono">38</div>
                <span className="text-[11px] text-indigo-700 mt-1 block">私域顾问一对一建联</span>
              </div>
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                <span className="text-xs text-emerald-800">第4步：到访与方案成交 (真人侧)</span>
                <div className="text-2xl font-bold text-emerald-900 mt-1 font-mono">19</div>
                <span className="text-[11px] text-emerald-700 mt-1 block">微信支付定金或全款到访</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. 知识库与规则治理 (Knowledge & Guardrail Engine - FR-08, FR-10) */}
      {currentTab === 'knowledge' && (
        <div className="space-y-6">
          {/* Header & Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-700" />
                机构知识库管理与内容维护中心 (FR-08 / RAG检索)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                统一维护微信客服智能体调用的标准化知识条目。前端会话自动检索相关知识，确保回答精准、合规、零幻觉。
              </p>
            </div>
            <button
              onClick={() => {
                setEditingKnowledge({
                  id: `kb-${Date.now()}`,
                  category: 'pricing',
                  title: '',
                  summary: '',
                  content: '',
                  keywords: [],
                  status: 'active',
                  updatedAt: new Date().toISOString().slice(0, 10),
                  author: '后台管理员'
                });
                setIsNewKnowledgeModal(true);
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              <span>新建知识条目</span>
            </button>
          </div>

          {/* RAG Retrieval Simulator Tester */}
          <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-xl p-6 shadow-md">
            <h4 className="text-sm font-bold text-teal-200 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              智能体 RAG 知识检索测试模拟器
            </h4>
            <p className="text-xs text-slate-300 mb-4">
              在下方输入测试用户提问，实时预览知识库检索引擎命中的条目与内容注入效果。
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={ragTestQuery}
                onChange={(e) => setRagTestQuery(e.target.value)}
                placeholder="例如：首次咨询多少钱？保密是怎么规定的？可以开药吗？"
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                onClick={() => {
                  const text = ragTestQuery.toLowerCase();
                  const found = knowledgeList.find(item => 
                    item.status === 'active' && item.keywords.some(kw => text.includes(kw.toLowerCase()))
                  );
                  setRagTestResult(found || null);
                  showToast(found ? `成功检索到知识条目: ${found.title}` : '未精准命中特定知识条目，将启用默认通用指引');
                }}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                测试检索
              </button>
            </div>

            {ragTestResult && (
              <div className="p-4 bg-white/10 border border-teal-500/40 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-teal-300 font-bold">
                  <span>🎯 命中知识标题：{ragTestResult.title}</span>
                  <span className="bg-teal-950 text-teal-200 px-2 py-0.5 rounded text-[10px]">分类：{ragTestResult.category}</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{ragTestResult.content}</p>
                <div className="text-[11px] text-slate-400 font-mono">
                  关键词标签: {ragTestResult.keywords.join(', ')} · 维护人: {ragTestResult.author} ({ragTestResult.updatedAt})
                </div>
              </div>
            )}
          </div>

          {/* Knowledge Articles Table / Cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">知识条目列表 ({knowledgeList.length})</h4>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                  {(['all', 'pricing', 'process', 'ethics', 'objection', 'crisis'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setKnowledgeCategoryFilter(cat)}
                      className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                        knowledgeCategoryFilter === cat ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat === 'all' ? '全部' : cat === 'pricing' ? '资费' : cat === 'process' ? '流程' : cat === 'ethics' ? '伦理' : cat === 'objection' ? '异议' : '危机'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                placeholder="搜索标题或关键词..."
                className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeList
                .filter(item => knowledgeCategoryFilter === 'all' || item.category === knowledgeCategoryFilter)
                .filter(item => 
                  !knowledgeSearch || 
                  item.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) || 
                  item.content.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
                  item.keywords.some(k => k.toLowerCase().includes(knowledgeSearch.toLowerCase()))
                )
                .map(item => (
                  <div key={item.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 hover:border-teal-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                          {item.currentVersion && (
                            <span className="ml-2 text-[10px] bg-teal-100 text-teal-800 font-mono px-1.5 py-0.5 rounded font-bold">
                              当前版本: {item.currentVersion}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          item.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.status === 'active' ? '已生效' : '草稿'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        {item.content}
                      </p>

                      {/* File Versions Preview Accordion */}
                      {item.fileVersions && item.fileVersions.length > 0 && (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 mb-3 text-[11px] space-y-1.5">
                          <div className="font-semibold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-teal-600" />
                              <span>历史文件版本库 ({item.fileVersions.length})</span>
                            </span>
                            {item.fileVersions.length >= 2 && (
                              <button
                                onClick={() => {
                                  setSelectedDiffItem(item);
                                  setDiffVersionA(item.fileVersions![1]?.version || 'v1.0');
                                  setDiffVersionB(item.fileVersions![0]?.version || item.currentVersion || 'v1.2');
                                  setIsDiffModalOpen(true);
                                }}
                                className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 px-2 py-0.5 rounded font-bold cursor-pointer flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3 text-teal-600" />
                                <span>版本侧边对比</span>
                              </button>
                            )}
                          </div>
                          {item.fileVersions.map((fv) => (
                            <div key={fv.id} className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100 text-[10px]">
                              <div className="truncate max-w-[180px]">
                                <span className="font-bold text-teal-800 font-mono mr-1">[{fv.version}]</span>
                                <span className="text-slate-700">{fv.fileName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.currentVersion !== fv.version && (
                                  <button
                                    onClick={() => {
                                      setRolloutTargetItem(item);
                                      setRolloutTargetVersion(fv);
                                      setIsRolloutModalOpen(true);
                                    }}
                                    className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    回滚
                                  </button>
                                )}
                                <span className="text-slate-400 font-mono">{fv.uploadedAt.slice(5, 16)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex flex-wrap gap-1">
                        {item.keywords.map((kw, i) => (
                          <span key={i} className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingKnowledge(item);
                            setIsNewKnowledgeModal(true);
                          }}
                          className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer"
                        >
                          编辑/上传文件
                        </button>
                        <button
                          onClick={() => {
                            setKnowledgeList(knowledgeList.filter(k => k.id !== item.id));
                            showToast(`已删除知识条目：${item.title}`);
                          }}
                          className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Edit / New Knowledge Modal with File Upload and Version Control */}
          {editingKnowledge && isNewKnowledgeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
                <div className="bg-teal-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
                  <h4 className="font-bold text-sm">知识条目维护与 FAQ 文件版本管理</h4>
                  <button
                    onClick={() => {
                      setEditingKnowledge(null);
                      setIsNewKnowledgeModal(false);
                    }}
                    className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto flex-1">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">知识标题</label>
                    <input
                      type="text"
                      value={editingKnowledge.title}
                      onChange={(e) => setEditingKnowledge({ ...editingKnowledge, title: e.target.value })}
                      placeholder="例如：知心谷心理咨询服务资费与套餐说明"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">分类</label>
                      <select
                        value={editingKnowledge.category}
                        onChange={(e) => setEditingKnowledge({ ...editingKnowledge, category: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="pricing">资费方案 (pricing)</option>
                        <option value="process">咨询流程 (process)</option>
                        <option value="ethics">保密与伦理 (ethics)</option>
                        <option value="objection">异议处理 (objection)</option>
                        <option value="crisis">危机干预 (crisis)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">状态</label>
                      <select
                        value={editingKnowledge.status}
                        onChange={(e) => setEditingKnowledge({ ...editingKnowledge, status: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="active">已生效 (Active)</option>
                        <option value="draft">草稿 (Draft)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">详细标准口径正文 (RAG检索内容)</label>
                    <textarea
                      rows={3}
                      value={editingKnowledge.content}
                      onChange={(e) => setEditingKnowledge({ ...editingKnowledge, content: e.target.value })}
                      placeholder="输入详细的标准回答口径与规范..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">关键词标签 (以逗号或空格分隔)</label>
                    <input
                      type="text"
                      value={(editingKnowledge.keywords || []).join(', ')}
                      onChange={(e) => setEditingKnowledge({ 
                        ...editingKnowledge, 
                        keywords: e.target.value.split(/[,，\s]+/).filter(Boolean) 
                      })}
                      placeholder="例如：价格, 多少钱, 费用"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* File Upload Component for FAQ Documents (PDF, TXT, DOCX) */}
                  <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-teal-700" />
                        <span>FAQ 文档上传与版本控制 (PDF / TXT / DOCX)</span>
                      </span>
                      <span className="text-[10px] text-teal-700 bg-teal-100 px-2 py-0.5 rounded font-mono">
                        当前版本: {editingKnowledge.currentVersion || 'v1.0'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700">手动设置版本号 (Custom Version):</label>
                        <input
                          type="text"
                          value={customVersionInput}
                          onChange={(e) => setCustomVersionInput(e.target.value)}
                          placeholder="例如：v1.3, v2.0-beta"
                          className="w-32 bg-white border border-teal-300 rounded px-2 py-1 text-xs font-mono font-bold text-teal-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.txt,.docx,.md"
                          id="faq-file-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const targetVer = (customVersionInput || '').trim() || `v1.${(editingKnowledge.fileVersions?.length || 0) + 1}`;
                            const newFileVer = {
                              id: `ver_${Date.now()}`,
                              version: targetVer,
                              fileName: file.name,
                              fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                              fileType: file.name.split('.').pop() || 'pdf',
                              fileUrl: '#',
                              uploadedBy: '督导专家·当前管理员',
                              uploadedAt: new Date().toLocaleString(),
                              changelog: `上传新版本文件 (${targetVer}): ${file.name}`,
                              contentSnippet: `[${targetVer} 上传文档正文]: ${editingKnowledge.content}`,
                              status: 'active' as const
                            };
                            const updatedVersions = [newFileVer, ...(editingKnowledge.fileVersions || [])];
                            setEditingKnowledge({
                              ...editingKnowledge,
                              currentVersion: targetVer,
                              fileVersions: updatedVersions,
                              content: `[文件更新至 ${targetVer} (${file.name})]: ${editingKnowledge.content}`
                            });
                            showToast(`成功上传文件【${file.name}】并绑定自定义版本号 ${targetVer}！`);
                          }}
                        />
                        <label
                          htmlFor="faq-file-upload"
                          className="flex-1 py-2 px-3 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold cursor-pointer text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <span>📁 选择并上传 FAQ 文档 (.pdf / .txt) [版本: {customVersionInput}]</span>
                        </label>
                      </div>
                    </div>

                    {/* Version History Table in Modal */}
                    {editingKnowledge.fileVersions && editingKnowledge.fileVersions.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-teal-200/60">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          版本对比与历史回滚列表：
                        </span>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {editingKnowledge.fileVersions.map((fv) => (
                            <div key={fv.id} className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-bold text-teal-800 font-mono mr-1.5">[{fv.version}]</span>
                                <span className="font-medium text-slate-800">{fv.fileName}</span>
                                <span className="text-slate-400 ml-1">({fv.fileSize})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">{fv.uploadedAt}</span>
                                {editingKnowledge.currentVersion !== fv.version && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingKnowledge({
                                        ...editingKnowledge,
                                        currentVersion: fv.version,
                                        content: fv.changelog ? `[回滚至 ${fv.version}]: ${fv.changelog}` : editingKnowledge.content
                                      });
                                      showToast(`已成功将当前编辑草稿回滚至版本 ${fv.version}！`);
                                    }}
                                    className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    回滚到此版本
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingKnowledge(null);
                      setIsNewKnowledgeModal(false);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (!editingKnowledge.title.trim() || !editingKnowledge.content.trim()) {
                        showToast('标题与正文不能为空！');
                        return;
                      }
                      const exists = knowledgeList.some(k => k.id === editingKnowledge.id);
                      if (exists) {
                        setKnowledgeList(knowledgeList.map(k => k.id === editingKnowledge.id ? editingKnowledge : k));
                        showToast(`成功更新知识条目：${editingKnowledge.title} (${editingKnowledge.currentVersion || 'v1.0'})`);
                      } else {
                        setKnowledgeList([editingKnowledge, ...knowledgeList]);
                        showToast(`成功创建知识条目：${editingKnowledge.title}`);
                      }
                      setEditingKnowledge(null);
                      setIsNewKnowledgeModal(false);
                    }}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    保存并同步 RAG 索引
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. 数据飞轮引擎与持续进化系统 (Data Flywheel Engine) */}
      {currentTab === 'flywheel' && (
        <FlywheelEngineView />
      )}

      {/* Electronic Voucher / Receipt Dialog */}
      {receiptModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-teal-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-200" />
                <h4 className="font-bold text-sm">知心谷 · 电子咨询预约凭证</h4>
              </div>
              <button
                onClick={() => setReceiptModalOrder(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-700 space-y-2.5">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">订单编号</span>
                <span className="font-mono font-bold text-slate-900">{receiptModalOrder.orderNo}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">服务项目</span>
                <span className="font-bold text-slate-800">{receiptModalOrder.productName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">咨询来访人</span>
                <span className="font-medium text-slate-800">{receiptModalOrder.userName} ({receiptModalOrder.phone})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">匹配咨询师</span>
                <span className="font-medium text-teal-800">{receiptModalOrder.counselorName || '李晓华 老师'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">预约时段</span>
                <span className="font-medium text-slate-800">{receiptModalOrder.preferredTime || '本周三 14:00'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">微信支付金额</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  ￥{receiptModalOrder.paymentType === 'deposit' ? `${receiptModalOrder.depositAmount} (定金抵扣)` : receiptModalOrder.amount}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] leading-relaxed">
                • 状态：微信支付成功 · 企业微信商户加密存证<br />
                • 保障：咨询前24小时内可无条件原路全额退款；24小时内可免费改期一次。
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setReceiptModalOrder(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Version Diff Comparison Modal */}
      {isDiffModalOpen && selectedDiffItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h4 className="font-bold text-sm">FAQ 版本差异侧边对比 (Side-by-Side Diff) — {selectedDiffItem.title}</h4>
              </div>
              <button
                onClick={() => setIsDiffModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 text-xs">
              <div className="flex items-center gap-3">
                <label className="font-semibold text-slate-700">对比左侧 (Base 版本):</label>
                <select
                  value={diffVersionA}
                  onChange={(e) => setDiffVersionA(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 font-mono font-bold text-teal-800"
                >
                  {(selectedDiffItem.fileVersions || []).map(fv => (
                    <option key={fv.id} value={fv.version}>[{fv.version}] {fv.fileName}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="font-semibold text-slate-700">对比右侧 (Target 版本):</label>
                <select
                  value={diffVersionB}
                  onChange={(e) => setDiffVersionB(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 font-mono font-bold text-indigo-800"
                >
                  {(selectedDiffItem.fileVersions || []).map(fv => (
                    <option key={fv.id} value={fv.version}>[{fv.version}] {fv.fileName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-y-auto flex-1 bg-slate-100/60 text-xs">
              {/* Left Version Panel */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-100 font-bold text-slate-800">
                  <span className="font-mono text-teal-800">版本 [{diffVersionA}] 内容</span>
                  <span className="text-[10px] text-slate-400">
                    {selectedDiffItem.fileVersions?.find(f => f.version === diffVersionA)?.uploadedAt || ''}
                  </span>
                </div>
                <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {selectedDiffItem.fileVersions?.find(f => f.version === diffVersionA)?.contentSnippet || selectedDiffItem.content}
                </div>
              </div>

              {/* Right Version Panel (Highlighted diffs) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-100 font-bold text-slate-800">
                  <span className="font-mono text-indigo-800">版本 [{diffVersionB}] 内容 (高亮差异)</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    增删比对已高亮
                  </span>
                </div>
                <div className="flex-1 bg-indigo-50/30 p-3 rounded-lg border border-indigo-100 font-mono text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {(() => {
                    const snippetB = selectedDiffItem.fileVersions?.find(f => f.version === diffVersionB)?.contentSnippet || selectedDiffItem.content;
                    return snippetB.split(/(商圈|首次|400|50分钟|标准化|深度|专属|无条件)/g).map((chunk, i) => {
                      if (['商圈', '首次', '400', '50分钟', '标准化', '深度', '专属', '无条件'].includes(chunk)) {
                        return (
                          <span key={i} className="bg-emerald-200 text-emerald-900 font-bold px-1 rounded mx-0.5" title="新增/修订文本">
                            +{chunk}
                          </span>
                        );
                      }
                      return chunk;
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500">
                💡 绿色高亮表示版本间新增或修订的知识术语与资费规则
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDiffModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  关闭对比
                </button>
                <button
                  onClick={() => {
                    setIsDiffModalOpen(false);
                    const targetVer = selectedDiffItem.fileVersions?.find(f => f.version === diffVersionB);
                    if (targetVer) {
                      setRolloutTargetItem(selectedDiffItem);
                      setRolloutTargetVersion(targetVer);
                      setIsRolloutModalOpen(true);
                    }
                  }}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                >
                  快速回滚至版本 [{diffVersionB}]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rollout Confirmation Dialog */}
      {isRolloutModalOpen && rolloutTargetItem && rolloutTargetVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-teal-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-200" />
                <h4 className="font-bold text-sm">确认快速回滚版本</h4>
              </div>
              <button
                onClick={() => setIsRolloutModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-700 space-y-3">
              <p className="font-semibold text-slate-900 leading-relaxed">
                您即将把知识条目 <span className="text-teal-800 font-bold">“{rolloutTargetItem.title}”</span> 快速回滚至版本 <span className="text-indigo-800 font-mono font-bold">[{rolloutTargetVersion.version}]</span> ({rolloutTargetVersion.fileName})。
              </p>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 leading-relaxed">
                ⚠️ 回滚生效后，智能体进行 RAG 检索时将即刻采用该版本的标准正文口径。是否确认执行回滚？
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsRolloutModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const updated = {
                    ...rolloutTargetItem,
                    currentVersion: rolloutTargetVersion.version,
                    content: rolloutTargetVersion.contentSnippet || rolloutTargetVersion.changelog || rolloutTargetItem.content
                  };
                  setKnowledgeList(knowledgeList.map(k => k.id === rolloutTargetItem.id ? updated : k));
                  showToast(`🚀 成功将知识条目【${rolloutTargetItem.title}】快速回滚至版本 [${rolloutTargetVersion.version}]！RAG 索引已即刻同步。`);
                  setIsRolloutModalOpen(false);
                  setRolloutTargetItem(null);
                  setRolloutTargetVersion(null);
                }}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
              >
                确认回滚并同步索引
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bad Case Marking Modal Dialog */}
      {isBadCaseModalOpen && badCaseTargetMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="bg-rose-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <h4 className="font-bold text-sm">标记 AI 回复为 Bad Case (数据飞轮闭环)</h4>
              </div>
              <button
                onClick={() => setIsBadCaseModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-xs text-slate-700 space-y-4">
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">目标 AI 回复内容摘要：</span>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 line-clamp-3 font-mono">
                  "{badCaseTargetMessage.content}"
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-2">
                  请勾选错误类型 (可多选)：
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'off_topic', label: '答非所问 (Off-topic)' },
                    { id: 'inaccurate', label: '内容失准 (Inaccurate)' },
                    { id: 'robotic', label: '态度生硬 (Robotic tone)' },
                    { id: 'missing_knowledge', label: '知识遗漏 (Missing knowledge)' },
                  ].map((err) => {
                    const isChecked = badCaseSelectedTypes.includes(err.id);
                    return (
                      <label
                        key={err.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                          isChecked ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBadCaseSelectedTypes([...badCaseSelectedTypes, err.id]);
                            } else {
                              setBadCaseSelectedTypes(badCaseSelectedTypes.filter(t => t !== err.id));
                            }
                          }}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>{err.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  督导分析说明 / 期望优化方向 (可选)：
                </label>
                <textarea
                  rows={3}
                  value={badCaseCommentInput}
                  onChange={(e) => setBadCaseCommentInput(e.target.value)}
                  placeholder="如：应当补充知心谷4次打包方案的详细价格梯度说明，避免答非所问..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-500 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsBadCaseModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/flywheel/feedback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        messageId: badCaseTargetMessage.id,
                        sessionId: session.id,
                        rating: 'thumb_down',
                        reason: badCaseSelectedTypes.join(','),
                        comment: badCaseCommentInput,
                        submittedBy: currentUser?.name || '管理员'
                      })
                    });
                    const data = await res.json();
                    if (data.success) {
                      showToast('已成功将该条对话记录归类至后台飞轮处理队列，用于后续的督导分析与Few-Shot训练！');
                      setIsBadCaseModalOpen(false);
                      setBadCaseTargetMessage(null);
                    }
                  } catch (e) {
                    console.error('Submit badcase failed', e);
                    showToast('提交失败，请检查网络连接');
                  }
                }}
                disabled={badCaseSelectedTypes.length === 0}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
              >
                提交并归入飞轮队列
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Admin Toast Notification */}
      {adminToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{adminToast}</span>
        </div>
      )}
    </div>
  );
};
