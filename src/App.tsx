/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WeChatCustomerService } from './components/WeChatCustomerService';
import { ChannelEntryPortals } from './components/ChannelEntryPortals';
import { AdminConsole } from './components/AdminConsole';
import { AdminHeaderNav, AdminTab } from './components/AdminHeaderNav';
import { AdminLogin } from './components/AdminLogin';
import { PaymentModal } from './components/PaymentModal';
import { RoleType, SessionData, ConsultationOrder, CrisisAlert, DashboardStats, StaffUser, DutyStatus, ABCRating } from './types';
import { ROLES, INITIAL_STATS } from './data/mockData';
import { MessageSquare, Layers, UserCheck, Smartphone, Monitor } from 'lucide-react';
import { useResponsive } from './hooks/useResponsive';

export default function App() {
  // Routing state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const { isMobile, isDesktop } = useResponsive();

  // Client view state: 'chat' | 'portals'
  // 移动端进入则默认进入微信客服移动端会话设计页面，PC端进入则显示web全渠道矩阵设计
  const [clientViewMode, setClientViewMode] = useState<'chat' | 'portals'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'chat';
    }
    return 'portals';
  });
  const [channelOrigin, setChannelOrigin] = useState<string>('关键词投放落地页');

  const [adminTab, setAdminTab] = useState<AdminTab>('workbench');
  const [selectedRole, setSelectedRole] = useState<RoleType>('li_teacher');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<ConsultationOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Staff and multi-session states
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zhixingu_current_staff');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);

  // Sync route on popstate (browser forward/back)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      if (path.startsWith('/admin')) {
        const sub = path.replace('/admin', '').replace('/', '');
        if (['workbench', 'orders', 'crisis', 'dashboard', 'knowledge', 'flywheel', 'accounts'].includes(sub)) {
          setAdminTab(sub as AdminTab);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Safe navigation function
  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  const handleAdminTabChange = (tab: AdminTab) => {
    setAdminTab(tab);
    navigateTo(`/admin/${tab}`);
  };

  // Default Session
  const [session, setSession] = useState<SessionData>({
    id: 'sess_default_01',
    role: 'li_teacher',
    userName: '微信咨询访客 (小林)',
    abcGrade: 'B',
    abcReason: '了解服务与费用，正比较适合的咨询师与时段',
    emotionalState: 'anxious',
    primaryIssue: '职场人际压力与偶发性失眠',
    quotaCount: 1,
    quotaMax: 5,
    isTakenOverByHuman: false,
    isCrisisLocked: false,
    isMinorProtected: false,
    startTime: '10:00',
    lastActiveTime: '10:05',
    durationMinutes: 5,
    messages: [],
    serviceCapability: 'normal',
    handoverStatus: 'none',
    outboundStatus: 'pending'
  });

  const [orders, setOrders] = useState<ConsultationOrder[]>([]);
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);

  // Fetch backend data and sync session state in real-time
  const fetchData = async () => {
    try {
      const [ordRes, criRes, statRes, sessRes, allSessRes, staffRes] = await Promise.all([
        fetch('/api/orders').then(r => r.json()).catch(() => ({ orders: [] })),
        fetch('/api/crisis/alerts').then(r => r.json()).catch(() => ({ alerts: [] })),
        fetch('/api/stats').then(r => r.json()).catch(() => ({ ...INITIAL_STATS })),
        fetch(`/api/sessions/${session.id}`).then(r => r.json()).catch(() => null),
        fetch('/api/sessions').then(r => r.json()).catch(() => ({ sessions: [] })),
        fetch('/api/staff').then(r => r.json()).catch(() => ({ staff: [] })),
      ]);

      if (ordRes?.orders) setOrders(ordRes.orders);
      if (criRes?.alerts) setCrisisAlerts(criRes.alerts);
      if (statRes) setStats(statRes);
      if (sessRes?.session) {
        setSession(sessRes.session);
      }
      if (allSessRes?.sessions) {
        setAllSessions(allSessRes.sessions);
      }
      if (staffRes?.staff) {
        setStaffList(staffRes.staff);
        // Default login if not set
        if (!currentUser && staffRes.staff.length > 0) {
          setCurrentUser(staffRes.staff[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching backend data', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, [session.id]);

  // Send message from chat
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          userMessage: text,
          roleId: selectedRole,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const errorText = await res.text().catch(() => '');
        console.warn('Received non-JSON response from /api/chat:', errorText.slice(0, 100));
        // Graceful in-chat fallback so user experience is not disrupted
        const timeStr = new Date().toTimeString().slice(0, 5);
        setSession(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: `msg_u_${Date.now()}`,
              sender: 'user',
              content: text,
              timestamp: timeStr,
            },
            {
              id: `msg_fallback_${Date.now()}`,
              sender: 'agent',
              senderName: '知心谷·李老师的AI助手',
              content: '您好，李老师助手一直在您身边。由于网络连接瞬时波动，您可以随时继续对我发送消息，无论是了解咨询细节、方案资费还是倾诉当前困扰，我都在这里陪伴您。',
              timestamp: timeStr,
            }
          ]
        }));
        return;
      }

      const data = await res.json();
      if (data.session) {
        setSession(data.session);

        // Call Gemini API summary extraction logic after conversation turn
        try {
          const sumRes = await fetch(`/api/sessions/${data.session.id}/summary`, {
            method: 'POST',
          });
          const sumContentType = sumRes.headers.get('content-type') || '';
          if (sumRes.ok && sumContentType.includes('application/json')) {
            const sumData = await sumRes.json();
            if (sumData.session) {
              setSession(sumData.session);
            }
          }
        } catch (sumErr) {
          console.error('Failed to update session summary', sumErr);
        }
      }
      fetchData();
    } catch (e) {
      console.error('Failed to send message', e);
      const timeStr = new Date().toTimeString().slice(0, 5);
      setSession(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: `msg_u_${Date.now()}`,
            sender: 'user',
            content: text,
            timestamp: timeStr,
          },
          {
            id: `msg_fallback_${Date.now()}`,
            sender: 'agent',
            senderName: '知心谷·李老师的AI助手',
            content: '抱歉，刚才网络传输稍有延迟。我一直在屏幕这边，您可以随时继续对我说。',
            timestamp: timeStr,
          }
        ]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Launch from an entry channel
  const handleSelectChannelAndLaunch = (roleId: RoleType, initialPrompt?: string, channelName?: string) => {
    setSelectedRole(roleId);
    if (channelName) setChannelOrigin(channelName);
    setClientViewMode('chat');

    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  };

  // Human Takeover toggle (Takeover & Fallback)
  const handleTakeoverToggle = async (isTakenOver: boolean, manualReply?: string, transitionSummary?: string) => {
    try {
      const res = await fetch(`/api/sessions/${session.id}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTakenOver,
          replyContent: manualReply,
          transitionSummary,
          senderName: currentUser ? `${currentUser.title || currentUser.roleName.split(' ')[0]}·${currentUser.name}` : undefined
        }),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
      }
      fetchData();
    } catch (e) {
      console.error('Failed takeover toggle', e);
    }
  };

  // Switch active session from workbench list
  const handleSelectSession = (sessionId: string) => {
    const target = allSessions.find(s => s.id === sessionId);
    if (target) {
      setSession(target);
    }
  };

  // Claim session to staff
  const handleClaimSession = async (sessionId: string, staffId: string, staffName: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, staffName }),
      });
      const data = await res.json();
      if (data.session && sessionId === session.id) {
        setSession(data.session);
      }
      fetchData();
    } catch (e) {
      console.error('Failed to claim session', e);
    }
  };

  // Transfer session to another staff
  const handleTransferSession = async (sessionId: string, toStaffId: string, toStaffName: string, reason: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStaffId: currentUser?.id,
          fromStaffName: currentUser?.name,
          toStaffId,
          toStaffName,
          reason,
        }),
      });
      const data = await res.json();
      if (data.session && sessionId === session.id) {
        setSession(data.session);
      }
      fetchData();
    } catch (e) {
      console.error('Failed to transfer session', e);
    }
  };

  // Add internal consultation note
  const handleAddInternalNote = async (sessionId: string, note: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/internal-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: currentUser ? `${currentUser.name} (${currentUser.roleName.split(' ')[0]})` : '值班顾问',
          content: note,
        }),
      });
      const data = await res.json();
      if (data.session && sessionId === session.id) {
        setSession(data.session);
      }
      fetchData();
    } catch (e) {
      console.error('Failed to add internal note', e);
    }
  };

  // Update session ABC grade
  const handleUpdateSessionGrade = async (sessionId: string, grade: ABCRating, reason?: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abcGrade: grade, abcReason: reason }),
      });
      const data = await res.json();
      if (data.session && sessionId === session.id) {
        setSession(data.session);
      }
      fetchData();
    } catch (e) {
      console.error('Failed to update session grade', e);
    }
  };

  // Staff management handlers
  const handleDutyStatusChange = async (staffId: string, dutyStatus: DutyStatus) => {
    try {
      await fetch('/api/staff/duty-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, dutyStatus }),
      });
      setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, dutyStatus } : s));
      if (currentUser?.id === staffId) {
        setCurrentUser(prev => prev ? { ...prev, dutyStatus } : null);
      }
    } catch (e) {
      console.error('Failed to change duty status', e);
    }
  };

  const handleCreateStaff = async (data: Partial<StaffUser>) => {
    try {
      await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchData();
    } catch (e) {
      console.error('Failed to create staff', e);
    }
  };

  const handleUpdateStaff = async (staffId: string, data: Partial<StaffUser>) => {
    try {
      await fetch(`/api/staff/${staffId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchData();
    } catch (e) {
      console.error('Failed to update staff', e);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      await fetch(`/api/staff/${staffId}/delete`, {
        method: 'POST',
      });
      fetchData();
    } catch (e) {
      console.error('Failed to delete staff', e);
    }
  };

  // Staff Login / Logout
  const handleLoginSuccess = (user: StaffUser) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zhixingu_current_staff', JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zhixingu_current_staff');
    }
  };

  // Update Crisis alert
  const handleUpdateAlertAction = async (alertId: string, actionType: string) => {
    try {
      await fetch(`/api/crisis/alerts/${alertId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType }),
      });
      fetchData();
    } catch (e) {
      console.error('Failed to update alert action', e);
    }
  };

  // Reset Session
  const handleResetSession = async () => {
    try {
      await fetch(`/api/sessions/${session.id}/reset`, { method: 'POST' });
      setSession({
        id: `sess_${Date.now()}`,
        role: selectedRole,
        userName: '新访客 (微信客服)',
        abcGrade: 'C',
        abcReason: '初次建立会话，待识别核心困扰',
        emotionalState: 'calm',
        primaryIssue: '待了解',
        quotaCount: 0,
        quotaMax: 5,
        isTakenOverByHuman: false,
        isCrisisLocked: false,
        isMinorProtected: false,
        startTime: new Date().toLocaleTimeString().slice(0, 5),
        lastActiveTime: new Date().toLocaleTimeString().slice(0, 5),
        durationMinutes: 1,
        messages: [],
        serviceCapability: 'normal',
        handoverStatus: 'none',
        outboundStatus: 'pending'
      });
    } catch (e) {
      console.error('Reset session error', e);
    }
  };

  // Emergency Global Handoff (FR-21)
  const handleEmergencyHandoff = () => {
    const nextState = !isEmergencyActive;
    setIsEmergencyActive(nextState);
    handleTakeoverToggle(nextState, nextState ? '【全局应急指令】机构已启动全线真人承接模式，所有会话均由在岗值班顾问接手。' : undefined);
  };

  // Payment completed
  const handlePaymentSuccess = (orderId: string) => {
    fetchData();
    const timeStr = new Date().toLocaleTimeString().slice(0, 5);
    setSession(prev => ({
      ...prev,
      abcGrade: 'A',
      abcReason: '已成功完成微信支付（定金或方案款），进入确认履约阶段',
      messages: [
        ...prev.messages,
        {
          id: `msg_sys_${Date.now()}`,
          sender: 'system',
          content: '【微信支付成功凭证】您的咨询预约定金/方案款项已到账。知心谷客服已为您保留咨询师独立时段与私密咨询室。值班老师将在15分钟内致电/微信发送到诊须知。',
          timestamp: timeStr,
        },
        {
          id: `msg_map_${Date.now() + 1}`,
          sender: 'agent',
          senderName: '知心谷·到诊服务',
          content: '🎉 恭喜您预约成功！已为您备好到诊一键腾讯地图导航与专属【2小时免费停车减免券】。下方卡片已为您展开详细路线与私密到访动线，期待在知心谷与您相遇：',
          timestamp: timeStr,
          cardType: 'map_navigation',
          cardData: {
            centerId: 'jingan',
            title: '知心谷静安旗舰中心 · 腾讯地图到诊指引与停车券'
          }
        },
        {
          id: `msg_sat_${Date.now() + 2}`,
          sender: 'agent',
          senderName: '知心谷·服务评价',
          content: '您的反馈对我们至关重要。请花 3 秒钟为本次智能接待服务打个分吧：',
          timestamp: timeStr,
          cardType: 'satisfaction_rating'
        }
      ]
    }));
  };

  const currentRoleConfig = ROLES[selectedRole] || ROLES.li_teacher;
  const isAdminView = currentPath.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {isAdminView ? (
        /* ================= 2. 机构管理后台 (/admin) ================= */
        !currentUser ? (
          <AdminLogin
            staffList={staffList}
            onLoginSuccess={handleLoginSuccess}
            onCancelToClient={() => navigateTo('/')}
          />
        ) : (
          <div className="flex flex-col min-h-screen">
            <AdminHeaderNav
              activeTab={adminTab}
              onTabChange={handleAdminTabChange}
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              onEmergencyHandoff={handleEmergencyHandoff}
              isEmergencyActive={isEmergencyActive}
              onResetSession={handleResetSession}
              onNavigateToClient={() => navigateTo('/')}
              currentUser={currentUser}
              onDutyStatusChange={(st) => handleDutyStatusChange(currentUser.id, st)}
              onLogout={handleLogout}
            />
            <main className="flex-1 bg-slate-50">
              <AdminConsole
                currentTab={adminTab}
                session={session}
                sessionsList={allSessions}
                onSelectSession={handleSelectSession}
                currentUser={currentUser}
                staffList={staffList}
                onClaimSession={handleClaimSession}
                onTransferSession={handleTransferSession}
                onAddInternalNote={handleAddInternalNote}
                onUpdateSessionGrade={handleUpdateSessionGrade}
                onUpdateDutyStatus={handleDutyStatusChange}
                onCreateStaff={handleCreateStaff}
                onUpdateStaff={handleUpdateStaff}
                onDeleteStaff={handleDeleteStaff}
                orders={orders}
                crisisAlerts={crisisAlerts}
                stats={stats}
                onTakeoverToggle={handleTakeoverToggle}
                onUpdateAlertAction={handleUpdateAlertAction}
                onTriggerPayment={(order) => setActivePaymentOrder(order)}
              />
            </main>
          </div>
        )
      ) : (
        /* ================= 1. 智能体前端 (访客端 /) ================= */
        <div className="flex-1 flex flex-col min-h-screen bg-slate-100">
          {/* Top Mode Bar for Visitor Experience - Responsive Adaptive UI */}
          <div className="bg-white border-b border-slate-200 px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between text-xs sticky top-0 z-30 shadow-2xs gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setClientViewMode('portals')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md font-medium transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                  clientViewMode === 'portals'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-teal-700" />
                <span className="hidden xs:inline">获客渠道矩阵</span>
                <span className="xs:hidden">矩阵</span>
                <span className="hidden md:inline text-[10px] text-slate-400 font-normal">(Web宽屏)</span>
              </button>
              <button
                onClick={() => setClientViewMode('chat')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md font-medium transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                  clientViewMode === 'chat'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden xs:inline">微信客服会话</span>
                <span className="xs:hidden">会话</span>
                <span className="hidden md:inline text-[10px] text-slate-400 font-normal">(移动端设计)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Responsive Device State Pill */}
              <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                {isMobile ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>移动端视图</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3.5 h-3.5 text-teal-600" />
                    <span>Web宽屏视图</span>
                  </>
                )}
              </div>

              <span className="text-[11px] text-slate-500 hidden sm:inline">
                角色：<strong className="text-slate-800">{currentRoleConfig.name}·助手</strong>
              </span>

              <button
                onClick={() => navigateTo('/admin')}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">机构管理后台</span>
                <span className="sm:hidden text-[11px]">管理端</span>
              </button>
            </div>
          </div>

          {/* Main Visitor Content */}
          <main className="flex-1 flex flex-col">
            {clientViewMode === 'portals' ? (
              <ChannelEntryPortals
                onSelectChannelAndLaunch={handleSelectChannelAndLaunch}
              />
            ) : (
              <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-2 sm:p-4 items-stretch justify-center">
                {/* 微信客服会话区域 */}
                <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-60px)]">
                  <WeChatCustomerService
                    role={currentRoleConfig}
                    session={session}
                    onSendMessage={handleSendMessage}
                    onTriggerPayment={(order) => setActivePaymentOrder(order)}
                    isLoading={isLoading}
                    onNavigateToAdmin={() => navigateTo('/admin')}
                    onRoleChange={setSelectedRole}
                    channelOrigin={channelOrigin}
                    onBackToPortals={() => setClientViewMode('portals')}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* WeChat Pay Modal */}
      <PaymentModal
        isOpen={Boolean(activePaymentOrder)}
        onClose={() => setActivePaymentOrder(null)}
        order={activePaymentOrder}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
