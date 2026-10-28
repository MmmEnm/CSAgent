/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  PhoneCall,
  ShieldCheck,
  CreditCard,
  UserCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertTriangle,
  Info,
  Calendar,
  User,
  Phone,
  FileText,
  X,
  ThumbsUp,
  ThumbsDown,
  HeartHandshake,
  ShieldAlert,
  BarChart2,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { RoleConfig, ChatMessage, SessionData, ConsultationOrder, ServiceProduct } from '../types';
import { ROLES, SERVICE_PRODUCTS, COUNSELORS } from '../data/mockData';
import { BookingModal } from './BookingModal';
import { PsychAssessmentModal } from './PsychAssessmentModal';
import { ClinicEnvironmentCard, MapNavigationCard } from './MediaTrustCards';
import { ClinicEnvironmentModal } from './ClinicEnvironmentModal';
import { CounselorVoicePlayer } from './CounselorVoicePlayer';

interface WeChatCustomerServiceProps {
  role: RoleConfig;
  session: SessionData;
  onSendMessage: (text: string) => Promise<void>;
  onTriggerPayment: (order: ConsultationOrder) => void;
  isLoading: boolean;
  onNavigateToAdmin?: () => void;
  onRoleChange?: (roleId: any) => void;
  channelOrigin?: string;
  onBackToPortals?: () => void;
}

export const WeChatCustomerService: React.FC<WeChatCustomerServiceProps> = ({
  role,
  session,
  onSendMessage,
  onTriggerPayment,
  isLoading,
  onNavigateToAdmin,
  onRoleChange,
  channelOrigin,
  onBackToPortals,
}) => {
  const [inputText, setInputText] = useState('');
  const [bookingName, setBookingName] = useState('小林');
  const [bookingPhone, setBookingPhone] = useState('13800138000');
  const [bookingConsent, setBookingConsent] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState('本周三 14:00');
  const [inlineCardError, setInlineCardError] = useState('');
  const [activeBookingProduct, setActiveBookingProduct] = useState<ServiceProduct | null>(null);
  const [activeBookingCounselor, setActiveBookingCounselor] = useState<string | undefined>(undefined);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [environmentModalCenter, setEnvironmentModalCenter] = useState<'jingan' | 'xuhui'>('jingan');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceType: 'enterprise' as 'enterprise' | 'individual',
    title: '上海某某科技股份有限公司',
    taxNumber: '91310115MA1K3988X2',
    email: 'lin_xiaohua@example.com',
    amount: 1800,
    contentCategory: '心理咨询与评估服务'
  });
  const [refundForm, setRefundForm] = useState({
    orderNo: 'ORD2026102201',
    amount: 1800,
    refundReason: '因出差行程变更，在开询前36小时申请全额退款'
  });

  const handleCompleteAssessment = async (result: any) => {
    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          assessmentResult: result,
        }),
      });
      const data = await res.json();
      if (data.session) {
        session.messages = data.session.messages;
      }
    } catch (e) {
      console.error('Assessment submit failed', e);
    }
  };

  const [messageFeedbackMap, setMessageFeedbackMap] = useState<Record<string, 'thumb_up' | 'thumb_down'>>({});
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [feedbackModalMsgId, setFeedbackModalMsgId] = useState<string | null>(null);
  const [selectedFeedbackTags, setSelectedFeedbackTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState('');

  const handleFeedbackSubmit = async (msgId: string, rating: 'thumb_up' | 'thumb_down', tags?: string[], comment?: string) => {
    setMessageFeedbackMap(prev => ({ ...prev, [msgId]: rating }));
    try {
      await fetch('/api/flywheel/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: msgId,
          sessionId: session.id,
          rating,
          reason: rating === 'thumb_up' ? 'accurate' : (tags?.[0] || 'inaccurate'),
          tags: tags || [],
          comment: comment || '',
          submittedBy: 'user',
        }),
      });
      setFeedbackToast(rating === 'thumb_up' ? '感谢好评！已收录至数据飞轮正样本库' : '已收到您的详细反馈！这能显著帮助我们提升 AI 服务精度');
      setTimeout(() => setFeedbackToast(null), 3000);
      setFeedbackModalMsgId(null);
      setSelectedFeedbackTags([]);
      setFeedbackComment('');
    } catch (e) {
      console.error('Feedback failed', e);
    }
  };

  const handleThumbDownClick = (msgId: string) => {
    setFeedbackModalMsgId(msgId);
    setSelectedFeedbackTags([]);
    setFeedbackComment('');
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const msg = inputText.trim();
    setInputText('');
    onSendMessage(msg);
  };

  const handlePresetClick = (presetText: string) => {
    if (isLoading) return;
    onSendMessage(presetText);
  };

  // Open the dedicated Booking modal for any product or counselor
  const handleOpenBookingModal = (productId = 'p1', counselorName?: string) => {
    const prod = SERVICE_PRODUCTS.find((p) => p.id === productId) || SERVICE_PRODUCTS[0];
    setActiveBookingProduct(prod);
    setActiveBookingCounselor(counselorName);
  };

  // Confirm booking from modal
  const handleConfirmModalBooking = async (bookingData: {
    userName: string;
    phone: string;
    productId: string;
    productName: string;
    amount: number;
    paymentType: 'deposit' | 'full';
    counselorName: string;
    preferredTime: string;
  }) => {
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    const data = await res.json();
    if (data.order) {
      onTriggerPayment(data.order);
    }
  };

  // Handle in-chat card booking submit
  const handleInChatBookingSubmit = async (productId = 'p1') => {
    if (!bookingPhone || bookingPhone.trim().length !== 11) {
      setInlineCardError('请输入正确的11位中国大陆手机号（用于接收预约凭证）');
      return;
    }
    if (!bookingConsent) {
      setInlineCardError('请勾选知情同意与24小时退改保障条款');
      return;
    }
    setInlineCardError('');

    const targetProduct = SERVICE_PRODUCTS.find((p) => p.id === productId) || SERVICE_PRODUCTS[0];

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: bookingName.trim() || '访客',
          phone: bookingPhone.trim(),
          productId: targetProduct.id,
          productName: targetProduct.name,
          amount: targetProduct.price,
          paymentType: 'deposit',
          counselorName: '李晓华 老师',
          preferredTime: selectedSlot,
        }),
      });
      const data = await res.json();
      if (data.order) {
        onTriggerPayment(data.order);
      }
    } catch (err) {
      setInlineCardError('订单创建失败，请稍后重试');
    }
  };

  const [hasRated, setHasRated] = useState<Record<string, boolean>>({});
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);

  const handleSatisfactionSubmit = async (msgId: string, score: number, comment?: string) => {
    setRatingLoading(msgId);
    try {
      await fetch('/api/flywheel/satisfaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          score,
          comment: comment || '',
        }),
      });
      setHasRated(prev => ({ ...prev, [msgId]: true }));
      setFeedbackToast('感谢您的评价！我们会持续优化 AI 心理咨询服务体验。');
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (e) {
      console.error('Satisfaction rating failed', e);
    } finally {
      setRatingLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-45px)] w-full max-w-full lg:max-w-4xl mx-auto bg-slate-100 lg:border-x lg:border-slate-200 shadow-2xs">
      {/* WeChat Customer Service Header (Mobile & Desktop Responsive) */}
      <div className="bg-slate-900 text-white px-3.5 sm:px-5 py-3 shrink-0 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={role.avatar}
              alt={role.name}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-800 border border-white/20 object-cover"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-semibold text-xs sm:text-sm leading-tight text-white truncate max-w-[160px] sm:max-w-xs">
                {role.assistantTitle}
              </h2>
              <span className="bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded font-medium border border-emerald-500/30 whitespace-nowrap">
                企业微信客服
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
              <span className="truncate">{role.sourceDesc}</span>
              <span className="hidden xs:inline">·</span>
              <span className={`shrink-0 font-medium ${session.isTakenOverByHuman ? 'text-amber-300 font-bold' : 'text-emerald-400'}`}>
                {session.isTakenOverByHuman ? '🟢 在岗值班老师已接管' : 'AI智能接待 (真人协同)'}
              </span>
            </p>
          </div>
        </div>

        {/* Right tools: Role switcher & Admin portal link */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick role switcher dropdown/buttons on larger screens */}
          {onRoleChange && (
            <div className="hidden md:flex items-center text-[11px] bg-slate-800 p-1 rounded-lg border border-slate-700">
              {(['li_teacher', 'wang_teacher', 'chen_teacher', 'org_agent'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onRoleChange(r)}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    role.id === r ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {ROLES[r].name}
                </button>
              ))}
            </div>
          )}

          {/* Quota indicator */}
          <div className="hidden sm:flex flex-col items-end text-[11px] text-slate-400">
            <span className="text-slate-300">配额水位</span>
            <span className="text-[10px] font-mono">{session.quotaCount}/{session.quotaMax} 条</span>
          </div>

          {/* Assessment Trigger Button */}
          <button
            onClick={() => setShowAssessmentModal(true)}
            title="心理健康自测与身心压力雷达评估"
            className="px-2 sm:px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white border border-teal-500 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <BarChart2 className="w-3.5 h-3.5 text-teal-200 shrink-0" />
            <span className="hidden sm:inline">心理自测</span>
          </button>

          {/* Manual Crisis Hotline Button */}
          <button
            onClick={() => setShowCrisisModal(true)}
            title="全国心理援助与危机干预守护通道"
            className="px-2 sm:px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-200 shrink-0" />
            <span className="hidden sm:inline">危机热线</span>
          </button>

          {/* Invoice Request Button */}
          <button
            onClick={() => setShowInvoiceModal(true)}
            title="开具发票与电子票据登记"
            className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="hidden sm:inline">开具发票</span>
          </button>

          {/* 24h Refund Request Button */}
          <button
            onClick={() => setShowRefundModal(true)}
            title="开询前24小时无条件退款申请"
            className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">24h退款</span>
          </button>

          {/* Jump to Admin Backend */}
          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              title="切换至知心谷机构管理后台"
              className="px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="hidden sm:inline">机构管理后台</span>
              <span className="sm:hidden text-[11px]">后台</span>
            </button>
          )}
        </div>
      </div>

      {/* Channel Origin Badge and Switcher */}
      <div className="bg-slate-800 text-slate-300 px-3.5 sm:px-4 py-1.5 text-xs flex items-center justify-between border-b border-slate-700/80">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="text-[10px] text-teal-300 bg-teal-950/80 border border-teal-700/60 px-2 py-0.5 rounded font-mono truncate">
            来源：{channelOrigin || role.sourceDesc}
          </span>
          <span className="text-slate-400 hidden md:inline text-[11px]">
            已自动挂载专属角色及重点推介服务
          </span>
        </div>
        {onBackToPortals && (
          <button
            onClick={onBackToPortals}
            className="text-xs text-teal-300 hover:text-white flex items-center gap-0.5 font-medium transition-colors cursor-pointer shrink-0 ml-2"
          >
            <span>渠道入口</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Flywheel Feedback Toast */}
      {feedbackToast && (
        <div className="bg-teal-900 text-teal-100 text-xs px-4 py-2 flex items-center justify-between border-b border-teal-700 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)} className="text-teal-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Compliance & AI disclosure banner */}
      <div className="bg-teal-50 border-b border-teal-100/80 px-3.5 sm:px-4 py-2 text-xs text-teal-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            <strong>AI客服告知：</strong>当前由智能助手接待，提供服务咨询、方案询价与微信支付引导。绝不承诺疗效，支持随时转接真人。
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="text-teal-700 font-medium hover:underline text-xs shrink-0 ml-2 cursor-pointer"
        >
          服务协议
        </button>
      </div>
      
      {/* Service Exception Fallback Banner (PRD V1.0) */}
      {session.serviceCapability !== 'normal' && (
        <div className={`px-3.5 sm:px-4 py-2 text-xs flex items-center justify-between border-b shadow-xs animate-slideDown ${
          session.serviceCapability === 'stopped' 
            ? 'bg-red-600 text-white border-red-700' 
            : 'bg-amber-500 text-white border-amber-600'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-white animate-pulse" />
            <span className="font-bold truncate sm:whitespace-normal">
              {session.serviceCapability === 'stopped' 
                ? '【重要提示】系统响应组件正在自动修复中。真人老师已加急接入，请在此留言。' 
                : '【服务波动提示】AI 助手当前处于受限模式。我们已同步为您安排人工值班顾问接入。'}
            </span>
          </div>
          {session.incidentContext?.failureTimestamp && (
            <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded opacity-80 hidden sm:inline">
              故障点: {new Date(session.incidentContext.failureTimestamp).toLocaleTimeString().slice(0, 5)}
            </span>
          )}
        </div>
      )}


      {/* Emergency Guardian Banner if crisis */}
      {session.isCrisisLocked && (
        <div className="bg-rose-600 text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
            <span className="font-medium truncate sm:whitespace-normal">
              【生命安全守护防线已激活】常规商业推销已暂停。会话通道全程畅通，AI助手与值班老师正全力陪伴您倾听与安全守护。
            </span>
          </div>
          <a
            href="tel:12356"
            className="bg-white text-rose-700 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-rose-50 shrink-0 ml-2 shadow-2xs"
          >
            直接拨打 12356
          </a>
        </div>
      )}

      {/* Preset Scenario Shortcuts - Touch-friendly scrolling on mobile, full bar on desktop (Ordered by conversation depth: Shallow to Deep) */}
      <div className="bg-white px-3 sm:px-4 py-2 border-b border-slate-200 overflow-x-auto scrollbar-none flex items-center gap-1.5 sm:gap-2 text-xs shrink-0 select-none">
        <span className="text-slate-400 shrink-0 text-[11px] sm:text-xs">快捷测试(由浅至深):</span>
        <button
          onClick={() => handlePresetClick('知心谷中心在哪个城市？具体在哪里？支持线上视频吗？')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          📍 中心地址与形式
        </button>
        <button
          onClick={() => handlePresetClick('请问单次咨询是多长时间？')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          ⏱️ 单次咨询多长
        </button>
        <button
          onClick={() => handlePresetClick('请问心理咨询怎么收费？有打包优惠套餐吗？')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          💰 资费与套餐
        </button>
        <button
          onClick={() => handlePresetClick('我怎么付定金？微信支付支持退款吗？')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          💳 微信支付定金
        </button>
        <button
          onClick={() => handlePresetClick('你们中心能开精神药物或者病假诊断证明吗？')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          💊 能开药/处方吗
        </button>
        <button
          onClick={() => handlePresetClick('咨询内容会保密吗？会被单位或家里人知道吗？')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          🔒 保密守则
        </button>
        <button
          onClick={() => handlePresetClick('我想推荐一位擅长认知行为CBT的女咨询师')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          👩 推荐女咨询师/CBT
        </button>
        <button
          onClick={() => handlePresetClick('单次600有点贵，你们这个效果能保证治好吗？')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          🏷️ 保证治好吗(异议)
        </button>
        <button
          onClick={() => handlePresetClick('我想听听李晓华老师的声音，可以发我语音名片试听吗？')}
          className="px-2 sm:px-2.5 py-1 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs font-semibold border border-amber-200 shadow-2xs"
        >
          🎙️ 试听李老师15秒语音名片
        </button>
        <button
          onClick={() => handlePresetClick('请发我静安中心的具体到诊路线、地铁怎么走以及腾讯地图导航')}
          className="px-2 sm:px-2.5 py-1 bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-800 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs font-semibold border border-teal-200 shadow-2xs"
        >
          📍 到诊与腾讯地图导航
        </button>
        <button
          onClick={() => handlePresetClick('我想看看你们咨询室环境照片，隔音和私密性好吗？')}
          className="px-2 sm:px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs font-semibold border border-emerald-200 shadow-2xs"
        >
          🖼️ 360°咨询室私密实景
        </button>
        <button
          onClick={() => handlePresetClick('最近工作压力特别大，每天都失眠，心情很烦躁也很累...')}
          className="px-2 sm:px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs font-medium"
        >
          🌧️ 情绪倾诉与失眠
        </button>
        <button
          onClick={() => handlePresetClick('只有你懂我，我离不开你，你做我女朋友好不好？')}
          className="px-2 sm:px-2.5 py-1 bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-800 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs font-semibold border border-sky-200 shadow-2xs"
        >
          💙 移情依恋("只有你懂我，我离不开你")
        </button>
        <button
          onClick={() => handlePresetClick('大半夜睡不着，感觉现实里没人懂我，只能跟你说这些话...')}
          className="px-2 sm:px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-800 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs font-medium border border-indigo-200"
        >
          🌙 深夜深度倾诉(现实孤独与边界)
        </button>
        <button
          onClick={() => handlePresetClick('请帮我转人工客服')}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px] sm:text-xs"
        >
          👤 转人工客服
        </button>
        <button
          onClick={() => handlePresetClick('我最近老是想死')}
          className="px-2 sm:px-2.5 py-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg whitespace-nowrap transition-colors cursor-pointer font-bold text-[11px] sm:text-xs shadow-2xs"
        >
          🆘 危机意念(我最近老是想死)
        </button>
        <button
          onClick={() => handlePresetClick('我最近真的撑不下去了，活着好累想自杀...')}
          className="px-2 sm:px-2.5 py-1 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 rounded-lg whitespace-nowrap transition-colors cursor-pointer font-medium text-[11px] sm:text-xs"
        >
          🆘 极端危机(想自杀)
        </button>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* System initial message */}
        <div className="flex justify-center">
          <div className="bg-slate-200/80 text-slate-600 text-[11px] px-3 py-1 rounded-full max-w-md text-center">
            微信客服安全通道已建立 · 咨询服务前请确认本人知情同意
          </div>
        </div>

        {/* First AI greeting */}
        <div className="flex gap-3 items-start">
          <img
            src={role.avatar}
            alt={role.name}
            className="w-8 h-8 rounded-full bg-slate-800 shrink-0 border border-slate-200"
          />
          <div className="max-w-[85%] sm:max-w-xl">
            <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1.5">
              <span>{role.assistantTitle}</span>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded">官方AI助手</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 text-sm text-slate-800 shadow-xs border border-slate-100 leading-relaxed">
              {role.greeting}
            </div>
          </div>
        </div>

        {/* Messages */}
        {session.messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isHuman = msg.sender === 'human';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {!isUser && (
                <img
                  src={isHuman ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=DutyStaff' : role.avatar}
                  alt="avatar"
                  className="w-8 h-8 rounded-full bg-slate-800 shrink-0 border border-slate-200"
                />
              )}

              <div className={`max-w-[90%] sm:max-w-xl ${isUser ? 'items-end' : ''}`}>
                <div className={`text-[10px] sm:text-[11px] text-slate-400 mb-1 flex items-center gap-1.5 ${isUser ? 'justify-end' : ''}`}>
                  <span>{isUser ? '我' : isHuman ? '在岗值班顾问 (真人)' : role.assistantTitle}</span>
                  <span>{msg.timestamp}</span>
                  {msg.meta?.gatePassed && (
                    <span className="text-[9px] sm:text-[10px] text-emerald-600 font-medium">· 出站已复核</span>
                  )}
                </div>

                {/* Text Bubble */}
                <div
                  className={`rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-xs'
                      : isHuman
                      ? 'bg-amber-50 text-amber-950 border border-amber-200 rounded-tl-xs'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-xs'
                  }`}
                >
                  {msg.content}
                </div>

                {/* CARD: Satisfaction Rating (PRD Request 5) */}
                {msg.cardType === 'satisfaction_rating' && (
                  <div className="mt-3 bg-white rounded-xl border border-teal-200 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="bg-teal-50 px-4 py-2 border-b border-teal-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        访客服务满意度评价
                      </span>
                    </div>
                    <div className="p-4 text-center">
                      {hasRated[msg.id] ? (
                        <div className="py-4 space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                          <p className="text-sm font-bold text-slate-800">评价成功！感谢反馈</p>
                          <p className="text-[11px] text-slate-500">您的声音是知心谷进步的动力</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                            感谢您对【{role.name}】的支持。为了提供更专业温暖的心理陪伴，诚邀您为本次 AI & 真人协同服务打分：
                          </p>
                          <div className="flex justify-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleSatisfactionSubmit(msg.id, star)}
                                disabled={ratingLoading === msg.id}
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                  ratingLoading === msg.id ? 'opacity-50' : 'hover:scale-110 active:scale-95'
                                } bg-white border-slate-200 hover:border-teal-500 hover:text-teal-600 shadow-2xs`}
                              >
                                <span className="text-lg font-bold">{star}</span>
                                <span className="text-[10px] ml-0.5">⭐</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-around text-[10px] text-slate-400 px-4">
                            <span>极不满意</span>
                            <span>非常满意</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Feedback rating buttons for AI answers (数据飞轮闭环采集点) */}
                {!isUser && !isHuman && !['satisfaction_rating', 'crisis_alert', 'handoff_summary'].includes(msg.cardType || '') && (
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="text-[10px] text-slate-400">回答是否对您有帮助？</span>
                    <button
                      onClick={() => handleFeedbackSubmit(msg.id, 'thumb_up')}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        messageFeedbackMap[msg.id] === 'thumb_up'
                          ? 'text-teal-700 bg-teal-50 font-bold border border-teal-200'
                          : 'hover:text-slate-600 hover:bg-slate-200/60'
                      }`}
                      title="有帮助（点赞）"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{messageFeedbackMap[msg.id] === 'thumb_up' ? '已赞' : '有帮助'}</span>
                    </button>
                    <button
                      onClick={() => handleThumbDownClick(msg.id)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        messageFeedbackMap[msg.id] === 'thumb_down'
                          ? 'text-rose-700 bg-rose-50 font-bold border border-rose-200'
                          : 'hover:text-slate-600 hover:bg-slate-200/60'
                      }`}
                      title="不准确或太生硬（点踩并反馈）"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      <span>{messageFeedbackMap[msg.id] === 'thumb_down' ? '已反馈' : '需改进'}</span>
                    </button>
                  </div>
                )}

                {/* Visitor Structured Feedback Modal */}
                {feedbackModalMsgId === msg.id && (
                  <div className="mt-2.5 p-4 bg-white rounded-xl border border-rose-200 shadow-md animate-fadeIn">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span>请告知我们哪里可以改进？</span>
                      </div>
                      <button onClick={() => setFeedbackModalMsgId(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { id: 'fact_error', label: '事实或知识错误' },
                        { id: 'tone_bad', label: '语气生硬/不亲和' },
                        { id: 'pricing_friction', label: '价格/退款政策疑惑' },
                        { id: 'crisis_slow', label: '危机干预反应迟钝' },
                        { id: 'hallucination', label: '内容失真/答非所问' },
                        { id: 'compliance', label: '涉及违规或伦理不当' },
                      ].map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            setSelectedFeedbackTags(prev => 
                              prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                            );
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[11px] text-left border transition-all ${
                            selectedFeedbackTags.includes(tag.id)
                              ? 'bg-rose-50 border-rose-400 text-rose-800 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      placeholder="还有其他想说的吗？(选填，100字以内)"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] mb-3 focus:outline-hidden focus:border-rose-400 min-h-[60px]"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setFeedbackModalMsgId(null)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleFeedbackSubmit(msg.id, 'thumb_down', selectedFeedbackTags, feedbackComment)}
                        disabled={selectedFeedbackTags.length === 0 && !feedbackComment.trim()}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        提交反馈
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter notification if output gate repaired something */}
                {msg.meta?.filterApplied && msg.meta.filterApplied.length > 0 && (
                  <div className="mt-1 text-[10px] text-amber-700 bg-amber-50/80 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                    <Info className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>发出闸合规修正：{msg.meta.filterApplied.join('；')}</span>
                  </div>
                )}

                {/* Boundary Clarification Card (移情与AI过度依恋边界守护) */}
                {msg.meta?.isBoundaryClarification && (
                  <div className="mt-2.5 p-3.5 bg-gradient-to-r from-teal-50/95 via-sky-50/90 to-emerald-50/90 rounded-xl border border-teal-200/90 shadow-2xs text-slate-800">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-teal-200/60 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-teal-900">
                        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>知心谷技术伦理 · 人机健康边界守护 (Boundary Invariants)</span>
                      </div>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-medium px-2 py-0.5 rounded-full">
                        移情与依恋边界澄清
                      </span>
                    </div>

                    <div className="p-2.5 bg-white/90 rounded-lg border border-teal-100/90 mb-2.5">
                      <p className="text-xs text-teal-950 font-medium leading-relaxed">
                        “我是一个AI助手，能够随时陪伴您倾听与梳理，但深度的生命联结与心理疗愈需要真实的现实人际与专业咨询师共同完成”。
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1 mb-3">
                      <div className="flex items-start gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span>AI提供24小时安全倾听与认知梳理支架，但不会成为现实情感关系的孤立替代。</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span>面对深层的依恋渴望或现实孤独，建议在安全的伦理设置中与真人持证咨询师展开系统陪伴。</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenBookingModal('p1', '李晓华 老师')}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>预约持证注册心理师深度陪伴</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetClick('请帮我转人工客服')}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>转在岗值班顾问</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CARD 1: Service Catalog */}
                {msg.cardType === 'service_catalog' && msg.cardData && (
                  <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">心理咨询方案与价格明细</span>
                      <span className="text-[10px] text-slate-500">透明定价 · 严谨合规</span>
                    </div>
                    <div className="divide-y divide-slate-100 p-2">
                      {SERVICE_PRODUCTS.map((prod) => (
                        <div key={prod.id} className="p-3 hover:bg-slate-50/80 rounded-lg transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900">{prod.name}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{prod.duration} · {prod.description}</p>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {prod.suitableFor.slice(0, 2).map((item, idx) => (
                                  <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-bold text-emerald-600">￥{prod.price}</span>
                              {prod.originalPrice && prod.originalPrice > prod.price && (
                                <div className="text-[10px] text-slate-400 line-through">￥{prod.originalPrice}</div>
                              )}
                              <button
                                onClick={() => handleOpenBookingModal(prod.id)}
                                className="mt-2 block w-full px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                              >
                                预约方案
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CARD 2: Counselor Recommendation */}
                {msg.cardType === 'counselor_recommendation' && (
                  <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                      <span className="font-semibold text-slate-800">匹配咨询师公开档案（1–3位候选）</span>
                      <span className="text-[10px] text-teal-700">30天排期已校对</span>
                    </div>
                    {COUNSELORS.slice(0, 2).map((c) => (
                      <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-900">{c.name}</span>
                              <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-medium">
                                {c.modality.split('·')[0]}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{c.qualification}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">擅长：{c.specialties.join(' / ')}</p>
                            <p className="text-[11px] text-emerald-700 font-medium mt-1">
                              可约时段：{c.nextAvailableSlot}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-slate-800">{c.priceRange}</span>
                            <button
                              onClick={() => handleOpenBookingModal('p1', c.name)}
                              className="mt-2 block px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              选此老师预约
                            </button>
                          </div>
                        </div>

                        {/* 15秒真人温暖语音名片试听 */}
                        <CounselorVoicePlayer
                          counselor={c}
                          onBookCounselor={(cName) => handleOpenBookingModal('p1', cName)}
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-400">
                      *注：智能体仅按公开档案客观推荐，不排序、不作背书，最终人选由您自主决定。
                    </p>
                  </div>
                )}

                {/* CARD 4: Satisfaction Rating Card (PRD: Flywheel Satisfaction Capture) */}
                {msg.cardType === 'satisfaction_rating' && (
                  <div className="mt-3 bg-white rounded-xl border border-teal-200 shadow-sm p-4 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-3 border-b border-teal-50 pb-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span className="text-xs font-bold text-slate-900">咨询服务满意度调研</span>
                    </div>
                    
                    {hasRated[msg.id] ? (
                      <div className="py-4 text-center">
                        <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800">评价成功</p>
                        <p className="text-[11px] text-slate-500 mt-1">感谢您的反馈，祝您生活愉快！</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          为了给您提供更专业、更有温度的心理咨询导诊服务，请对本次 AI 智能助手的接待表现进行评价：
                        </p>
                        
                        <div className="flex justify-center gap-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleSatisfactionSubmit(msg.id, star)}
                              disabled={!!ratingLoading}
                              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                                ratingLoading === msg.id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 hover:shadow-md'
                              } ${
                                star >= 4 ? 'bg-teal-50 border-teal-200 text-teal-700' : 
                                star === 3 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                'bg-rose-50 border-rose-200 text-rose-700'
                              }`}
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-bold">{star}</span>
                                <span className="text-[8px] -mt-0.5">★</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-slate-400 px-2">
                          <span>极不满意</span>
                          <span>非常满意</span>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-50">
                          <p className="text-[9px] text-slate-400 text-center italic">
                            * 您的评价将直接同步至知心谷数据飞轮优化系统
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CARD 3: Booking Form */}
                {msg.cardType === 'booking_form' && (
                  <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      咨询预约登记与排期锁定
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                      预约需采集联系人称呼与手机号，仅用于本次预约确认与到诊提醒。
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          联系人称呼 (支持化名/昵称)
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            placeholder="如：王女士 / 小林"
                            value={bookingName}
                            onChange={(e) => setBookingName(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          联系手机号 (11位，用于接收到诊提醒)
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="tel"
                            maxLength={11}
                            placeholder="如：13800000000"
                            value={bookingPhone}
                            onChange={(e) => setBookingPhone(e.target.value)}
                            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          期望咨询时段
                        </label>
                        <select
                          value={selectedSlot}
                          onChange={(e) => setSelectedSlot(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-emerald-500"
                        >
                          <option value="本周三 14:00 (李晓华老师)">本周三 14:00 (李晓华老师)</option>
                          <option value="本周四 18:30 (陈梦琪老师)">本周四 18:30 (陈梦琪老师)</option>
                          <option value="本周六 10:00 (李晓华老师)">本周六 10:00 (李晓华老师)</option>
                          <option value="下周二 19:00 (王振华老师)">下周二 19:00 (王振华老师)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="consent-check"
                          checked={bookingConsent}
                          onChange={(e) => setBookingConsent(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        <label htmlFor="consent-check" className="text-[11px] text-slate-600 cursor-pointer">
                          我同意知心谷仅将手机号用于本次预约联络，知悉24小时前退改保障。
                        </label>
                      </div>

                      {inlineCardError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[11px] p-2.5 rounded-lg flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{inlineCardError}</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleInChatBookingSubmit('p1')}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>确认预约并微信支付预约定金 (￥100)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CARD 4: Payment Card (微信支付定金或全款) */}
                {msg.cardType === 'payment_card' && (
                  <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
                          微
                        </div>
                        <span className="text-xs font-bold text-slate-900">微信支付 · 预约收银台</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                        官方商户安全担保
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 mb-3 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">预约定金</span>
                        <span className="font-bold text-slate-900 text-sm text-emerald-600">￥100.00</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>抵扣说明</span>
                        <span>到诊核销，全额抵扣咨询尾款</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>退改政策</span>
                        <span className="text-emerald-700 font-medium">咨询前24小时无条件全额退款</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const order: ConsultationOrder = {
                            id: `ord_${Date.now()}`,
                            orderNo: `ZXG${Date.now().toString().slice(-8)}`,
                            userName: bookingName || '咨询访客',
                            phone: bookingPhone || '138****0000',
                            productId: 'p1',
                            productName: '首次心理评估与访谈 (预约定金)',
                            amount: 400,
                            depositAmount: 100,
                            paymentType: 'deposit',
                            paymentStatus: 'pending',
                            paymentMethod: 'wechat_pay',
                            createdAt: new Date().toLocaleTimeString(),
                            invoiceRequired: false
                          };
                          onTriggerPayment(order);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>微信支付 ￥100 (付定金)</span>
                      </button>

                      <button
                        onClick={() => {
                          const order: ConsultationOrder = {
                            id: `ord_${Date.now()}`,
                            orderNo: `ZXG${Date.now().toString().slice(-8)}`,
                            userName: bookingName || '咨询访客',
                            phone: bookingPhone || '138****0000',
                            productId: 'p3',
                            productName: '4次深度心理探索包 (全额方案)',
                            amount: 1800,
                            depositAmount: 1800,
                            paymentType: 'full',
                            paymentStatus: 'pending',
                            paymentMethod: 'wechat_pay',
                            createdAt: new Date().toLocaleTimeString(),
                            invoiceRequired: true
                          };
                          onTriggerPayment(order);
                        }}
                        className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        购买4次套餐 (￥1800)
                      </button>
                    </div>
                  </div>
                )}

                {/* CARD 5: Crisis Emergency Card */}
                {msg.cardType === 'crisis_alert' && (
                  <div className="mt-3 bg-rose-50 border-2 border-rose-500 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>全国免费心理援助热线与危机干预守护通道</span>
                    </div>
                    <p className="text-xs text-rose-900 leading-relaxed mb-3">
                      无论遇到什么困境，请相信您并不孤单。全国专业心理危机干预师24小时免费倾听并守护您，请随时直接点击拨打：
                    </p>

                    <div className="space-y-2 mb-3">
                      <a
                        href="tel:12356"
                        className="flex items-center justify-between p-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-bold text-sm transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <PhoneCall className="w-5 h-5" />
                          <span>12356 (全国统一心理援助热线)</span>
                        </div>
                        <span className="text-xs bg-rose-800 px-2 py-0.5 rounded font-normal">24小时免费</span>
                      </a>

                      <div className="p-2.5 bg-white rounded-lg border border-rose-200 text-xs text-slate-700 flex justify-between items-center">
                        <span>即时身体/生命急性险境呼叫：</span>
                        <div className="flex gap-2">
                          <a href="tel:110" className="text-rose-700 font-bold hover:underline">110 (报警)</a>
                          <span>·</span>
                          <a href="tel:120" className="text-rose-700 font-bold hover:underline">120 (急救)</a>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-rose-800 bg-rose-100/80 p-2.5 rounded-lg space-y-1">
                      <div>• 知心谷在岗危机处置团队与李老师已同步接收告警并在线守护</div>
                      <div>• 严格恪守伦理底线，输入框完全开放，本会话绝不主动断开或锁死</div>
                    </div>
                  </div>
                )}

                {/* CARD 6: Human Handoff Summary & Emergency Fallback */}
                {msg.cardType === 'handoff_summary' && msg.cardData && (
                  <div className={`mt-3 rounded-xl border shadow-sm p-4 ${
                    msg.cardData.isCrisisHandoff || msg.cardData.status === 'emergency_stopped'
                      ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-200'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <UserCheck className={`w-4 h-4 ${msg.cardData.isCrisisHandoff || msg.cardData.status === 'emergency_stopped' ? 'text-rose-600' : 'text-emerald-600'}`} />
                        <span>
                          {msg.cardData.status === 'emergency_stopped' 
                            ? '系统维护/紧急人工直连通道' 
                            : msg.cardData.isCrisisHandoff 
                            ? '危机生命守护专线 · 值班老师接管' 
                            : '转接真人服务上下文摘要'}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        msg.cardData.isCrisisHandoff || msg.cardData.status === 'emergency_stopped' 
                          ? 'bg-rose-200 text-rose-800 font-bold' 
                          : 'text-slate-500 bg-slate-100'
                      }`}>
                        {msg.cardData.status === 'emergency_stopped' ? '紧急模式' : msg.cardData.isCrisisHandoff ? '加急' : '免重复陈述'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600 mb-3 bg-white/90 p-2.5 rounded-lg border border-slate-100">
                      {msg.cardData.status === 'emergency_stopped' ? (
                        <div className="space-y-2 py-1">
                          <p className="text-rose-900 font-bold">抱歉，AI 智能助手核心组件当前不可用。</p>
                          <p className="text-[11px] leading-relaxed">我们已将您的联络请求标记为 P0 级，在岗值班顾问将通过本对话框或企业微信直接与您联络。建议您同时保存下方机构二维码：</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">转接原因:</span>
                            <span className="font-medium text-slate-800">{msg.cardData.reason || (msg.cardData.status === 'seeking_human' ? '正在呼叫专家支持' : '专家老师协同接入')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">服务通道:</span>
                            <span className="font-medium text-emerald-700">{msg.cardData.channel || '企业微信客服'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">接管人员:</span>
                            <span className="font-bold text-slate-900">{msg.cardData.assignedDuty || '在岗督导老师'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">当前状态:</span>
                            <span className="font-medium text-amber-700">
                              {msg.cardData.status === 'seeking_human' ? '老师正查阅摘要并准备接入' : msg.cardData.status}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {msg.cardData.hotline && (
                      <div className="mb-2 text-xs flex items-center justify-between bg-rose-100/90 text-rose-900 p-2 rounded-lg border border-rose-200 shadow-2xs">
                        <span className="font-semibold">24小时值班电话:</span>
                        <a href={`tel:${msg.cardData.hotline}`} className="font-bold underline text-rose-700 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-rose-300">
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>拨打 {msg.cardData.hotline}</span>
                        </a>
                      </div>
                    )}

                    {msg.cardData.institutionQRCode && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-slate-100 flex flex-col items-center gap-2">
                        <img src={msg.cardData.institutionQRCode} alt="QR Code" className="w-24 h-24 border border-slate-100" />
                        <span className="text-[10px] text-slate-400">长按或扫描二维码直接联络机构主管</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 mt-2">
                      {msg.cardData.status === 'emergency_stopped' 
                        ? '如果您有任何即刻的身心危险，请不要等待回复，立即拨打 110 或 120。' 
                        : '值班老师已全面接入当前对话并查阅会话上下文，您无需重复叙述，请稍候片刻。'}
                    </p>
                  </div>
                )}

                {/* CARD 7: Clinic Environment Photo Gallery & 360° Panorama */}
                {msg.cardType === 'clinic_environment' && (
                  <ClinicEnvironmentCard
                    cardData={msg.cardData}
                    onOpenEnvironmentModal={(c) => {
                      setEnvironmentModalCenter(c);
                      setShowEnvironmentModal(true);
                    }}
                    onOpenMapNavigation={(c) => {
                      onSendMessage(`请发我${c === 'xuhui' ? '徐汇' : '静安'}中心的腾讯地图到诊指引与停车指南`);
                    }}
                  />
                )}

                {/* CARD 8: Tencent Map Navigation & Parking Guide */}
                {msg.cardType === 'map_navigation' && (
                  <MapNavigationCard
                    cardData={msg.cardData}
                    onOpenEnvironmentModal={(c) => {
                      setEnvironmentModalCenter(c);
                      setShowEnvironmentModal(true);
                    }}
                  />
                )}

                {/* CARD 9: Refund Completion Notice */}
                {msg.cardType === 'refund_notice' && (
                  <div className="mt-3 bg-emerald-50/90 rounded-xl border border-emerald-300 p-4 shadow-2xs text-slate-800">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>微信支付 · 退款成功凭证</span>
                      </div>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                        已原路原费退回
                      </span>
                    </div>
                    <div className="text-xs space-y-1 text-emerald-900 bg-white/80 p-2.5 rounded-lg border border-emerald-100 font-mono mb-2">
                      <div className="flex justify-between"><span>退款单号:</span><span>{msg.cardData?.refundTxId || 'wx_rf_20261023'}</span></div>
                      <div className="flex justify-between"><span>订单编号:</span><span>{msg.cardData?.orderNo || 'ORD2026102201'}</span></div>
                      <div className="flex justify-between"><span>退款金额:</span><span className="font-bold text-emerald-700">￥{msg.cardData?.amount || 1800}.00</span></div>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      ✨ {msg.cardData?.policyNotice || '知心谷【开询前24小时无条件退款】保障政策已成功履约。资金已退回您的微信账户。'}
                    </p>
                  </div>
                )}

                {/* CARD 10: Electronic Invoice Issued */}
                {msg.cardType === 'invoice_issued' && (
                  <div className="mt-3 bg-white rounded-xl border border-teal-200 p-4 shadow-xs text-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Receipt className="w-4 h-4 text-teal-700" />
                        <span>全国增值税电子普通发票凭证</span>
                      </div>
                      <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded border border-teal-200">
                        电子票据已签章
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200/80 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">发票抬头:</span>
                        <span className="font-bold text-slate-900">{msg.cardData?.title || '个人'}</span>
                      </div>
                      {msg.cardData?.taxNumber && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">纳税人识别号:</span>
                          <span className="font-mono text-slate-800 text-[11px]">{msg.cardData.taxNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">开票项目:</span>
                        <span className="text-slate-800 font-medium">{msg.cardData?.contentCategory || '心理咨询与评估服务'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">发票代码/号码:</span>
                        <span className="font-mono text-slate-800">{msg.cardData?.invoiceCode} / {msg.cardData?.invoiceNo}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1 font-bold">
                        <span className="text-slate-900">含税金总计:</span>
                        <span className="text-teal-700 font-mono">￥{msg.cardData?.amount}.00</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={msg.cardData?.pdfUrl || `/api/finance/invoices/inv_01/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>在线预览 / 打印发票 PDF</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* CARD 11: Mid-term Assessment Care */}
                {msg.cardType === 'midterm_review' && (
                  <div className="mt-3 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-xl p-4 shadow-sm border border-teal-700">
                    <div className="flex items-center justify-between border-b border-teal-700/60 pb-2 mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-200">
                        <Sparkles className="w-4 h-4 text-teal-400" />
                        <span>知心谷阶段评估 · 4次方案中程小结关怀</span>
                      </div>
                      <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded border border-teal-500/40">
                        防脱落履约护航
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5 text-slate-200 bg-white/10 p-3 rounded-lg border border-white/10 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-300">已执行进度:</span>
                        <span className="font-bold text-teal-300 font-mono">已完成 2 / 4 次深度探索</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">主诊咨询师:</span>
                        <span className="font-medium text-white">{msg.cardData?.counselorName || '李晓华 老师'}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 border-t border-white/10 pt-1.5 mt-1">
                        阶段小结：{msg.cardData?.notes || '前2阶段情绪重构展现良好效果，宜本周接续第3次排期以保障重构节奏'}
                      </div>
                    </div>
                    <div className="p-2.5 bg-teal-500/20 rounded-lg border border-teal-400/30 mb-3 text-xs">
                      <span className="text-teal-300 font-bold block mb-0.5">🌟 10次长程蜕变方案老学员独享复购礼:</span>
                      <span className="text-slate-200 text-[11px]">{msg.cardData?.upgradeDiscountOffer || '直接补差价 ￥3,200 升级为10次系统长程心理成长蜕变方案（立省 ￥1,600）'}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePresetClick('请帮我预约第3次咨询排期')}
                        className="flex-1 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        预约第3次排期
                      </button>
                      <button
                        onClick={() => handlePresetClick('我想了解补差价升级10次长程方案')}
                        className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        升级10次长程包
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-start">
            <img
              src={role.avatar}
              alt="loading"
              className="w-8 h-8 rounded-full bg-slate-800 shrink-0"
            />
            <div className="bg-white rounded-2xl rounded-tl-xs p-3 text-sm text-slate-500 border border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse delay-75" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse delay-150" />
              <span className="text-xs">知心谷AI助手正在思考回复并进行出站复核...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input bar - Mobile and Web Responsive */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 p-2.5 sm:p-3.5 shrink-0 safe-bottom">
        {/* Interactive Crisis Assessment Companion Quick Reply Bar */}
        {(session.isCrisisLocked || session.crisisAssessment) && (
          <div className="mb-2.5 p-2 bg-rose-50/95 rounded-xl border border-rose-200 shadow-2xs">
            {session.isTakenOverByHuman ? (
              <div className="flex items-center justify-between px-1 py-0.5 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>知心谷在岗危机督导·李老师 已接入当前会话并在线陪伴</span>
                </span>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  真人实时对话中
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>知心谷生命守护与心理援助陪伴通道</span>
                </span>
                <span className="text-[10px] text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded font-medium">
                  输入完全开放 · 可直接打字或快捷选择
                </span>
              </div>
            )}
            {!session.isTakenOverByHuman && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {((session.crisisAssessment?.stepNumber || 1) === 1) && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('我现在一个人在房间里')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    我现在一个人在房间里
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('我身边有家人/朋友在，但心里很痛苦')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    身边有家人/朋友在
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('我现在在一个安全的地方，没有冲动举动')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    我现在在一个安全的地方
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('心里特别难受，不知道怎么办，很想找人聊聊')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    心里很难受想找人聊聊
                  </button>
                </>
              )}
              {((session.crisisAssessment?.stepNumber || 1) === 2) && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('手边没有危险物品，只是心里很绝望')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    手边没有危险物品
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('刚才没有服药也没有伤害自己')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    刚才没有吃药或伤害自己
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('脑子里没有具体伤害计划，就是感觉快支撑不下去')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    没有具体计划，只是很累
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('我答应你把手边的东西移开，我还在听你说')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    已把危险物品移开，在听你说
                  </button>
                </>
              )}
              {((session.crisisAssessment?.stepNumber || 1) === 3) && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('好，我答应你24小时内不伤害自己，和你拉钩')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    好，答应你24小时不伤害自己
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('我和你拉钩做这个约定')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    我和你拉钩做约定
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('我有可以信任的朋友，我打算发微信找他')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    我有可联系的信任朋友
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('我想先打12356免费热线倾诉一下')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    拨打12356免费热线
                  </button>
                </>
              )}
              {((session.crisisAssessment?.stepNumber || 1) >= 4) && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('最近工作和生活压力实在太大了，感觉喘不过气')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    最近工作与生活压力太大
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('我喝了一口温水，跟着深呼吸稍微平静了一点')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    已深呼吸，平静了一点
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('总是自我否定，感觉没有人真正理解我')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    感觉没有人真正理解我
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetClick('想和在岗值班老师多说会儿话')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                  >
                    想和值班老师多说会儿话
                  </button>
                </>
              )}
            </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={
              session.isTakenOverByHuman
                ? '值班老师正在接听守护中，请在此输入您想说的话...'
                : session.isCrisisLocked
                ? '请随时告诉我您此刻的状态或感受，我们一直在陪伴守护您...'
                : '输入咨询问题、想了解的咨询方案或费用...'
            }
            className="flex-1 text-xs sm:text-sm px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-emerald-500 rounded-xl transition-all focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs ${
              session.isCrisisLocked
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            <span>发送</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2 px-1">
          <span className="truncate">
            {session.isCrisisLocked
              ? '微信客服危机生命防线已激活 · 对话通道全程畅通 · 值班团队全程守护'
              : '微信客服会话通道 · 48小时内平滑续接'}
          </span>
          <span className="text-slate-500 shrink-0 ml-2">首响延迟 ≤ 3秒</span>
        </div>
      </div>

      {/* Booking Drawer / Modal */}
      <BookingModal
        isOpen={Boolean(activeBookingProduct)}
        onClose={() => setActiveBookingProduct(null)}
        product={activeBookingProduct}
        preferredCounselorName={activeBookingCounselor}
        onConfirmBooking={handleConfirmModalBooking}
      />

      {/* In-app Service Terms Modal (No window.alert) */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="bg-teal-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm">《知心谷心理咨询中心服务协议与隐私规范》</h3>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 text-xs text-slate-700 space-y-3 overflow-y-auto leading-relaxed">
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-teal-900">
                <strong>一、AI 智能客服接待与服务边界</strong><br />
                当前微信客服由知心谷 AI 智能助手协同接待，仅负责机构公开信息问答、价格方案核算、预约意向登记与微信支付引导。AI 助手不具备医生或心理师执业资格，绝不对外下达任何临床诊断或处方。
              </div>
              <div>
                <strong>二、保密原则与法定例外</strong><br />
                知心谷严格遵循中国心理学会临床与心理咨询工作伦理守则。您在咨询过程中表达的个人信息与隐私均受保密保护。但依据法律法规，在出现自杀/自残等威胁自身或他人生命安全的紧急危机、虐待未成年人等法定情形下，保密原则将依法被打破并转介紧急援助。
              </div>
              <div>
                <strong>三、24小时无忧退改保障与支付定金</strong><br />
                为锁定注册心理师独立个案咨询室时段，预约需通过微信支付缴纳 ￥100 意向定金（到诊全额抵扣）。在咨询正式开始前 24 小时以上，可随时无条件原路全额退还；开始前 24 小时内可申请免费改期一次。
              </div>
              <div>
                <strong>四、数据分级与隔离机制</strong><br />
                本系统交互数据仅用于本次咨询服务履约及个案管理档案建档，绝对不用于任何第三方公开大模型训练。
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                我已阅读并知悉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Crisis Support & Hotline Modal */}
      {showCrisisModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border-2 border-rose-500 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 border-b border-rose-100 pb-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>全国心理援助热线与危机干预守护通道</span>
              </div>
              <button
                onClick={() => setShowCrisisModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed mb-4">
              无论遇到什么困境，请相信您并不孤单。全国专业心理危机干预师24小时免费倾听并守护您，随时直接点击拨打：
            </p>
            <div className="space-y-2.5 mb-4">
              <a
                href="tel:12356"
                className="flex items-center justify-between p-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-bold text-sm transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-5 h-5" />
                  <span>12356 (全国统一心理援助热线)</span>
                </div>
                <span className="text-xs bg-rose-800 px-2 py-0.5 rounded font-normal">24小时免费</span>
              </a>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-rose-200 text-xs text-slate-700 flex justify-between items-center">
                <span>即时身体/生命急性险境呼叫：</span>
                <div className="flex gap-2">
                  <a href="tel:110" className="text-rose-700 font-bold hover:underline">110 (报警)</a>
                  <span>·</span>
                  <a href="tel:120" className="text-rose-700 font-bold hover:underline">120 (急救)</a>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-rose-800 bg-rose-50 p-2.5 rounded-xl space-y-1 mb-4">
              <div>• 知心谷在岗危机处置团队与李老师始终在线守护</div>
              <div>• 严格恪守伦理底线，输入框完全开放，本会话绝不主动断开或锁死</div>
            </div>
            <button
              onClick={() => setShowCrisisModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              我知道了，返回对话
            </button>
          </div>
        </div>
      )}
      {/* Psych Assessment Modal */}
      <PsychAssessmentModal
        isOpen={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        onCompleteAssessment={handleCompleteAssessment}
      />

      {/* Clinic Environment & 360° Panorama Modal */}
      <ClinicEnvironmentModal
        isOpen={showEnvironmentModal}
        onClose={() => setShowEnvironmentModal(false)}
        defaultLocation={environmentModalCenter}
        onBookCenter={(center) => handleOpenBookingModal('p1', center)}
        onOpenMap={(center) => {
          setShowEnvironmentModal(false);
          onSendMessage(`请发我${center === 'xuhui' ? '徐汇' : '静安'}中心的腾讯地图到诊指引与停车指南`);
        }}
      />

      {/* Electronic Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">开具电子发票与票据登记</h3>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              知心谷支持开具增值税电子普通发票（可用于企业报销或个人核算）。提交登记后系统将即时回传发票 PDF 至对话框并发送邮件。
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch('/api/finance/invoices/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderId: session.id,
                      orderNo: 'ORD2026102201',
                      clientName: session.userName,
                      clientPhone: session.userPhone,
                      invoiceType: invoiceForm.invoiceType,
                      title: invoiceForm.title,
                      taxNumber: invoiceForm.taxNumber,
                      email: invoiceForm.email,
                      amount: invoiceForm.amount,
                      contentCategory: invoiceForm.contentCategory
                    })
                  });
                  const data = await res.json();
                  if (data.success && data.invoice) {
                    setShowInvoiceModal(false);
                    onSendMessage(`已成功提交发票抬头【${invoiceForm.title}】的开票申请。`);
                  }
                } catch (err) {
                  console.error('Invoice request error', err);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-semibold mb-1">发票抬头类型</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceForm(prev => ({ ...prev, invoiceType: 'enterprise' }))}
                    className={`flex-1 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      invoiceForm.invoiceType === 'enterprise'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    企业 / 机构抬头
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceForm(prev => ({ ...prev, invoiceType: 'individual' }))}
                    className={`flex-1 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                      invoiceForm.invoiceType === 'individual'
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    个人抬头
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">发票抬头全称 *</label>
                <input
                  type="text"
                  required
                  value={invoiceForm.title}
                  onChange={e => setInvoiceForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="例如：上海某某科技有限公司 或 张三"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {invoiceForm.invoiceType === 'enterprise' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">纳税人识别号 (税号) *</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.taxNumber}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, taxNumber: e.target.value }))}
                    placeholder="18位企业统一社会信用代码"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">接收电子发票的邮箱 *</label>
                <input
                  type="email"
                  required
                  value={invoiceForm.email}
                  onChange={e => setInvoiceForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">开票类目</label>
                  <select
                    value={invoiceForm.contentCategory}
                    onChange={e => setInvoiceForm(prev => ({ ...prev, contentCategory: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="心理咨询与评估服务">心理咨询与评估服务</option>
                    <option value="心理健康指导与辅导">心理健康指导与辅导</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">开票金额</label>
                  <input
                    type="number"
                    disabled
                    value={invoiceForm.amount}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  提交开票并即时生成 PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 24h Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">开询前24小时无条件退款申请</h3>
              </div>
              <button onClick={() => setShowRefundModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <span className="font-bold block mb-1">🛡️ 知心谷服务无忧保障规约：</span>
              距离预约开询时间大于 24 小时的订单，支持 100% 原路退还至您的微信零钱/支付银卡。提交后后台财务将一键核准。
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch('/api/finance/refunds/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderId: session.id,
                      orderNo: refundForm.orderNo,
                      clientName: session.userName,
                      amount: refundForm.amount,
                      refundReason: refundForm.refundReason,
                      initiatedBy: '访客微信客服端主动申请'
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setShowRefundModal(false);
                    onSendMessage(`已提交订单【${refundForm.orderNo}】的开询前24h退款申请，理由：${refundForm.refundReason}`);
                  }
                } catch (err) {
                  console.error('Refund request error', err);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-semibold mb-1">申请退款的订单编号</label>
                <input
                  type="text"
                  required
                  value={refundForm.orderNo}
                  onChange={e => setRefundForm(prev => ({ ...prev, orderNo: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">退款金额 (元)</label>
                <input
                  type="number"
                  disabled
                  value={refundForm.amount}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">退款申请说明与原因 *</label>
                <textarea
                  required
                  rows={3}
                  value={refundForm.refundReason}
                  onChange={e => setRefundForm(prev => ({ ...prev, refundReason: e.target.value }))}
                  placeholder="例如：因临时出差日程变更，申请开询前24小时全额原路退款"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  确认提交退款申请
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
