/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Shield,
  Phone,
  Bookmark,
  Video,
  Building,
  CreditCard,
  Copy,
  Send,
  Sparkles,
  Users,
  Grid,
  Columns,
  RefreshCw,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import { ScheduleSlot, ScheduleRoom, ScheduleStats, CounselorProfile } from '../types';
import { COUNSELORS } from '../data/mockData';

interface CounselorScheduleCalendarProps {
  slots: ScheduleSlot[];
  rooms?: ScheduleRoom[];
  stats?: ScheduleStats;
  onBookSlot?: (slotId: string, data: Partial<ScheduleSlot>) => Promise<void>;
  onCancelSlot?: (slotId: string) => Promise<void>;
  onCreateSlot?: (data: Partial<ScheduleSlot>) => Promise<void>;
  onUpdateSlot?: (slotId: string, data: Partial<ScheduleSlot>) => Promise<void>;
  onCompleteSlot?: (slotId: string) => Promise<void>;
  onDeleteSlot?: (slotId: string) => Promise<void>;
  onBatchGenerate?: (counselorId: string, days: number) => Promise<void>;
  currentSessionClientName?: string;
  currentSessionClientPhone?: string;
  currentSessionPreferredCounselor?: string;
  onSendAppointmentNoticeToChat?: (slot: ScheduleSlot) => void;
}

export const ROOMS_DEFAULT: ScheduleRoom[] = [
  { id: 'room_1', name: '1号 独立静心咨询室 (徐汇中心)', type: 'offline', location: '徐汇区肇嘉浜路知心谷A座301', capacity: '1对1个案', description: '隔音阻尼墙与全遮光温控系统，适宜深度心理动力学及CBT面询' },
  { id: 'room_2', name: '2号 深度探索咨询室 (静安中心)', type: 'offline', location: '静安区南京西路知心谷B座502', capacity: '1对1/伴侣', description: '配备情绪调节香氛与柔和暖光，适宜亲密关系及情绪聚焦' },
  { id: 'room_3', name: '3号 家庭沙盘与测评室 (静安中心)', type: 'offline', location: '静安区南京西路知心谷B座503', capacity: '家庭/沙盘', description: '配备专业心理沙具柜与儿童家庭测评量表台' },
  { id: 'room_online', name: '4号 专属腾讯会议加密视频室', type: 'online', location: '云端加密节点 (双向TLS 1.3)', capacity: '远程1对1', description: '独立企业级安全加密会议室，端对端传输不录音不截屏' },
];

export const STANDARD_TIME_SLOTS = [
  '09:00 - 09:50',
  '10:10 - 11:00',
  '14:00 - 14:50',
  '15:10 - 16:00',
  '16:20 - 17:10',
  '18:30 - 19:20',
  '19:40 - 20:30',
];

export const WEEK_DAYS_CURRENT = [
  { date: '2026-10-12', label: '周一 (10-12)', isToday: false, isWeekend: false },
  { date: '2026-10-13', label: '周二 (10-13)', isToday: true, isWeekend: false },
  { date: '2026-10-14', label: '周三 (10-14)', isToday: false, isWeekend: false },
  { date: '2026-10-15', label: '周四 (10-15)', isToday: false, isWeekend: false },
  { date: '2026-10-16', label: '周五 (10-16)', isToday: false, isWeekend: false },
  { date: '2026-10-17', label: '周六 (10-17)', isToday: false, isWeekend: true },
  { date: '2026-10-18', label: '周日 (10-18)', isToday: false, isWeekend: true },
];

export const WEEK_DAYS_NEXT = [
  { date: '2026-10-19', label: '周一 (10-19)', isToday: false, isWeekend: false },
  { date: '2026-10-20', label: '周二 (10-20)', isToday: false, isWeekend: false },
  { date: '2026-10-21', label: '周三 (10-21)', isToday: false, isWeekend: false },
  { date: '2026-10-22', label: '周四 (10-22)', isToday: false, isWeekend: false },
  { date: '2026-10-23', label: '周五 (10-23)', isToday: false, isWeekend: false },
  { date: '2026-10-24', label: '周六 (10-24)', isToday: false, isWeekend: true },
  { date: '2026-10-25', label: '周日 (10-25)', isToday: false, isWeekend: true },
];

export const CounselorScheduleCalendar: React.FC<CounselorScheduleCalendarProps> = ({
  slots = [],
  rooms = ROOMS_DEFAULT,
  stats,
  onBookSlot,
  onCancelSlot,
  onCreateSlot,
  onUpdateSlot,
  onCompleteSlot,
  onDeleteSlot,
  onBatchGenerate,
  currentSessionClientName,
  currentSessionClientPhone,
  currentSessionPreferredCounselor,
  onSendAppointmentNoticeToChat,
}) => {
  // View states
  const [viewMode, setViewMode] = useState<'matrix' | 'kanban' | 'rooms'>('matrix');
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0); // 0 = this week, 1 = next week
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>('2026-10-17');

  // Filters
  const [counselorFilter, setCounselorFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'offline' | 'online'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [activeSlotModal, setActiveSlotModal] = useState<ScheduleSlot | null>(null);
  const [isNewSlotModalOpen, setIsNewSlotModalOpen] = useState(false);
  const [isEditSlotModalOpen, setIsEditSlotModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Form states
  const [formCounselorId, setFormCounselorId] = useState(COUNSELORS[0].id);
  const [formRoomId, setFormRoomId] = useState(rooms[0].id);
  const [formDate, setFormDate] = useState('2026-10-17');
  const [formTimeRange, setFormTimeRange] = useState(STANDARD_TIME_SLOTS[1]);
  const [formStatus, setFormStatus] = useState<'available' | 'booked' | 'blocked'>('available');
  const [formClientName, setFormClientName] = useState(currentSessionClientName || '微信咨询访客 (小林)');
  const [formClientPhone, setFormClientPhone] = useState(currentSessionClientPhone || '138****6621');
  const [formServiceType, setFormServiceType] = useState('首次心理评估与深度访谈');
  const [formFormat, setFormFormat] = useState<'offline_shanghai' | 'online_video'>('offline_shanghai');
  const [formPaymentStatus, setFormPaymentStatus] = useState<'paid_deposit' | 'paid_full' | 'unpaid'>('paid_deposit');
  const [formTopic, setFormTopic] = useState('职场倦怠与焦虑 · 人际冲突');
  const [formNotes, setFormNotes] = useState('由工作台中台直接分配锁定');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const activeWeekDays = currentWeekOffset === 0 ? WEEK_DAYS_CURRENT : WEEK_DAYS_NEXT;

  // Filtered slots
  const filteredSlots = useMemo(() => {
    return slots.filter(s => {
      if (counselorFilter !== 'all' && s.counselorId !== counselorFilter) return false;
      if (roomFilter !== 'all' && s.roomId !== roomFilter) return false;
      if (formatFilter === 'offline' && s.consultationFormat === 'online_video') return false;
      if (formatFilter === 'online' && s.consultationFormat !== 'online_video') return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [slots, counselorFilter, roomFilter, formatFilter, statusFilter]);

  // Derived KPIs
  const computedStats = useMemo(() => {
    if (stats) return stats;
    const totalSlots = slots.length;
    const bookedCount = slots.filter(s => s.status === 'booked').length;
    const availableCount = slots.filter(s => s.status === 'available').length;
    const completedCount = slots.filter(s => s.status === 'completed').length;
    const blockedCount = slots.filter(s => s.status === 'blocked').length;
    const bookingRate = totalSlots > 0 ? Math.round(((bookedCount + completedCount) / totalSlots) * 1000) / 10 : 0;
    const todayConsultations = slots.filter(s => s.date === '2026-10-13' && (s.status === 'booked' || s.status === 'completed')).length;

    return {
      totalSlots,
      bookedCount,
      availableCount,
      completedCount,
      blockedCount,
      bookingRate,
      todayConsultations
    };
  }, [slots, stats]);

  // Handle open create modal for specific counselor/time/date
  const handleQuickSlotClick = (counselorId: string, timeRange: string, date: string) => {
    const counselor = COUNSELORS.find(c => c.id === counselorId) || COUNSELORS[0];
    setFormCounselorId(counselor.id);
    setFormTimeRange(timeRange);
    setFormDate(date);
    setFormStatus('booked');
    setFormClientName(currentSessionClientName || '微信咨询访客 (小林)');
    setFormClientPhone(currentSessionClientPhone || '138****6621');
    setIsNewSlotModalOpen(true);
  };

  // Submit create slot
  const handleCreateSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const counselor = COUNSELORS.find(c => c.id === formCounselorId) || COUNSELORS[0];
    const room = rooms.find(r => r.id === formRoomId) || rooms[0];

    // Collision check
    const collision = slots.find(s =>
      s.date === formDate &&
      s.timeRange === formTimeRange &&
      s.status !== 'available' &&
      (
        s.counselorId === formCounselorId ||
        (formRoomId !== 'room_online' && s.roomId === formRoomId)
      )
    );

    if (collision && formStatus !== 'available') {
      showToast(`⚠️ 时段冲突：${collision.counselorId === formCounselorId ? `【${collision.counselorName}】` : `【${collision.roomName}】`}在 ${formDate} ${formTimeRange} 已被占用！`);
      return;
    }

    try {
      if (onCreateSlot) {
        await onCreateSlot({
          counselorId: counselor.id,
          counselorName: counselor.name,
          counselorTitle: counselor.title,
          roomId: room.id,
          roomName: room.name,
          date: formDate,
          timeRange: formTimeRange,
          status: formStatus,
          clientName: formStatus === 'booked' ? formClientName : undefined,
          clientPhone: formStatus === 'booked' ? formClientPhone : undefined,
          serviceType: formStatus === 'booked' ? formServiceType : undefined,
          consultationFormat: formFormat,
          paymentStatus: formStatus === 'booked' ? formPaymentStatus : undefined,
          topic: formTopic,
          notes: formNotes,
          orderNo: formStatus === 'booked' ? `ZXG${Date.now().toString().slice(-8)}` : undefined
        });
        setIsNewSlotModalOpen(false);
        showToast(`已成功创建 ${counselor.name} 在 ${formDate} ${formTimeRange} 的排期！`);
      }
    } catch (err: any) {
      showToast(err?.message || '排期创建失败');
    }
  };

  // Copy notice template
  const handleCopyNotice = (slot: ScheduleSlot) => {
    const isOnline = slot.consultationFormat === 'online_video';
    const text = isOnline
      ? `【知心谷心理 · 预约确认与到诊指引】\n尊敬的 ${slot.clientName}，您已成功预约【${slot.counselorName}】的高清远程心理咨询。\n时段：${slot.date} ${slot.timeRange}\n咨询形式：腾讯会议加密专属会议室\n会议链接：https://meeting.tencent.com/dm/zxg_${slot.id}\n会议密码：882109\n请提前5分钟进入并测试音频，祝您度过温暖而有启发的一段时光。`
      : `【知心谷心理 · 线下到访预约指引】\n尊敬的 ${slot.clientName}，您已成功预约【${slot.counselorName}】的线下私密心理咨询。\n时段：${slot.date} ${slot.timeRange}\n到访地址：上海市${slot.roomName}（地铁1/7号线常熟路站2号口步行300米）\n前台联系电话：021-6288-0099\n温馨提示：咨询前24小时内可享有免费改期一次权益，我们已为您准备好独立静音空间与温热茶饮。`;

    navigator.clipboard?.writeText(text);
    showToast('已复制到诊指引通知文案，可直接发送给来访者！');
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-teal-300 px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>总排期时段</span>
            <CalendarIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900">{computedStats.totalSlots}</span>
            <span className="text-xs text-slate-500">节 / 50min</span>
          </div>
          <div className="mt-1 text-[11px] text-teal-700 font-medium">覆盖4位资深注册顾问</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>排满负荷率</span>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-teal-700">{computedStats.bookingRate}%</span>
            <span className="text-xs text-slate-500">利用率</span>
          </div>
          <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(computedStats.bookingRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>待履约个案</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-700">{computedStats.bookedCount}</span>
            <span className="text-xs text-slate-500">位访客</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">定金/全款均已到账锁定</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>今日已接诊/履约</span>
            <CheckCircle2 className="w-4 h-4 text-teal-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900">{computedStats.todayConsultations}</span>
            <span className="text-xs text-slate-500">场次</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">历史累计完成 {computedStats.completedCount} 次</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>空闲开放时段</span>
            <Plus className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-600">{computedStats.availableCount}</span>
            <span className="text-xs text-slate-500">时段待约</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">工作台可随时向访客推荐</div>
        </div>
      </div>

      {/* Control Header & Toolbars */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Title & View Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">咨询师与个案场地排期日历看板</h2>
              <p className="text-[11px] text-slate-500">双轨时段冲突防撞机 · 微信定金到账自动锁定 · 线下静安/徐汇与线上视频互不冲突</p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-700">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'matrix' ? 'bg-white shadow-xs text-teal-900 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-teal-600" />
              <span>周矩阵视图</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white shadow-xs text-teal-900 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-teal-600" />
              <span>咨询师看板</span>
            </button>
            <button
              onClick={() => setViewMode('rooms')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'rooms' ? 'bg-white shadow-xs text-teal-900 font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-teal-600" />
              <span>咨询室负荷</span>
            </button>
          </div>
        </div>

        {/* Right: Week Controls & Quick Add */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
            <button
              onClick={() => setCurrentWeekOffset(prev => Math.max(-1, prev - 1))}
              disabled={currentWeekOffset <= -1}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 disabled:opacity-40 cursor-pointer"
              title="上一周"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 font-bold font-mono text-slate-800">
              {currentWeekOffset === 0 ? '本周 (10-12 ~ 10-18)' : currentWeekOffset === 1 ? '下周 (10-19 ~ 10-25)' : '上周 (10-05 ~ 10-11)'}
            </span>
            <button
              onClick={() => setCurrentWeekOffset(prev => Math.min(2, prev + 1))}
              disabled={currentWeekOffset >= 2}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 disabled:opacity-40 cursor-pointer"
              title="下一周"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {currentWeekOffset !== 0 && (
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="ml-1 text-[11px] px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold hover:bg-teal-200 cursor-pointer"
              >
                回到本周
              </button>
            )}
          </div>

          {/* Quick Create Slot */}
          <button
            onClick={() => {
              setFormCounselorId(COUNSELORS[0].id);
              setFormStatus('available');
              setIsNewSlotModalOpen(true);
            }}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-teal-400" />
            <span>新增排期</span>
          </button>

          {/* One-click lock for current visitor */}
          {currentSessionClientName && (
            <button
              onClick={() => {
                setFormClientName(currentSessionClientName);
                setFormStatus('booked');
                setFormDate('2026-10-17');
                setFormTimeRange('14:00 - 14:50');
                setIsNewSlotModalOpen(true);
              }}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              title={`为当前微信访客【${currentSessionClientName}】锁定预约`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>为访客锁定预约</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar & Legend */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-500 flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            筛选：
          </span>

          {/* Counselor filter */}
          <select
            value={counselorFilter}
            onChange={(e) => setCounselorFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
          >
            <option value="all">全部咨询师 (4位)</option>
            {COUNSELORS.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
            ))}
          </select>

          {/* Room filter */}
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
          >
            <option value="all">全部咨询室场地 (4间)</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {/* Format filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${formatFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : ''}`}
            >
              全部形式
            </button>
            <button
              onClick={() => setFormatFilter('offline')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${formatFilter === 'offline' ? 'bg-white text-teal-800 shadow-2xs' : ''}`}
            >
              <MapPin className="w-3 h-3 text-teal-600" />
              <span>实体面询</span>
            </button>
            <button
              onClick={() => setFormatFilter('online')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${formatFilter === 'online' ? 'bg-white text-purple-800 shadow-2xs' : ''}`}
            >
              <Video className="w-3 h-3 text-purple-600" />
              <span>加密视频</span>
            </button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-hidden"
          >
            <option value="all">全部状态</option>
            <option value="available">空闲可约</option>
            <option value="booked">已预约 (定金/全款)</option>
            <option value="completed">已履约完成</option>
            <option value="blocked">督导/休息留白</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
            <span>空闲可约</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shadow-2xs" />
            <span>定金锁定 (待履约)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-2xs" />
            <span>已履约完成</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-2xs" />
            <span>督导会诊留白</span>
          </span>
        </div>
      </div>

      {/* ======================= View 1: Weekly Matrix Timetable Grid ======================= */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="py-3 px-3.5 w-32 font-bold text-left border-r border-slate-200 bg-slate-100/70">
                    时段 \ 日期
                  </th>
                  {activeWeekDays.map(day => (
                    <th
                      key={day.date}
                      className={`py-3 px-3 font-bold text-center border-r border-slate-200 min-w-[160px] ${
                        day.isToday
                          ? 'bg-teal-50/80 text-teal-950 font-extrabold'
                          : day.isWeekend
                          ? 'bg-amber-50/40 text-amber-950'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{day.label}</span>
                        {day.isToday && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-teal-600 text-white rounded font-bold">
                            今日
                          </span>
                        )}
                        {day.isWeekend && !day.isToday && (
                          <span className="text-[9px] px-1 py-0.2 bg-amber-200 text-amber-900 rounded font-medium">
                            高峰
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {STANDARD_TIME_SLOTS.map(timeRange => (
                  <tr key={timeRange} className="hover:bg-slate-50/40 transition-colors">
                    {/* Time Column */}
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-700 border-r border-slate-200 bg-slate-50/70">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{timeRange}</span>
                      </div>
                    </td>

                    {/* Week day cells */}
                    {activeWeekDays.map(day => {
                      // Find slots for this date and timeRange
                      const matchingSlots = filteredSlots.filter(s =>
                        s.date === day.date &&
                        s.timeRange === timeRange
                      );

                      return (
                        <td
                          key={day.date}
                          className={`p-2 border-r border-slate-200 align-top ${
                            day.isToday ? 'bg-teal-50/20' : ''
                          }`}
                        >
                          {matchingSlots.length > 0 ? (
                            <div className="space-y-1.5">
                              {matchingSlots.map(slot => {
                                const isBooked = slot.status === 'booked';
                                const isCompleted = slot.status === 'completed';
                                const isBlocked = slot.status === 'blocked';
                                const isAvailable = slot.status === 'available';

                                if (isBooked) {
                                  return (
                                    <div
                                      key={slot.id}
                                      onClick={() => setActiveSlotModal(slot)}
                                      className="p-2.5 rounded-xl bg-teal-50/90 border border-teal-300 text-teal-950 hover:shadow-md hover:border-teal-400 transition-all cursor-pointer group"
                                    >
                                      <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                                        <span className="flex items-center gap-1 truncate">
                                          <User className="w-3 h-3 text-teal-700 shrink-0" />
                                          <strong className="truncate">{slot.clientName || '访客预约'}</strong>
                                        </span>
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                          slot.paymentStatus === 'paid_full' ? 'bg-emerald-200 text-emerald-900' : 'bg-teal-200 text-teal-800'
                                        }`}>
                                          {slot.paymentStatus === 'paid_full' ? '全款已付' : '定金已付'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px] text-teal-700">
                                        <span className="font-semibold text-slate-800">{slot.counselorName}</span>
                                        <span className="flex items-center gap-0.5 text-teal-600">
                                          {slot.consultationFormat === 'online_video' ? (
                                            <>
                                              <Video className="w-3 h-3 text-purple-600" />
                                              <span className="text-[9px] text-purple-700">远程视频</span>
                                            </>
                                          ) : (
                                            <>
                                              <MapPin className="w-3 h-3 text-teal-600" />
                                              <span className="text-[9px]">{slot.roomName.split('(')[0]}</span>
                                            </>
                                          )}
                                        </span>
                                      </div>
                                      {slot.topic && (
                                        <div className="text-[9px] text-teal-600/80 truncate mt-1">
                                          议题: {slot.topic}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                if (isCompleted) {
                                  return (
                                    <div
                                      key={slot.id}
                                      onClick={() => setActiveSlotModal(slot)}
                                      className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:shadow-xs transition-all cursor-pointer"
                                    >
                                      <div className="flex items-center justify-between font-bold text-[11px] mb-0.5">
                                        <span className="truncate">{slot.clientName}</span>
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                                          已履约完成
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-500">{slot.counselorName} · 50min</div>
                                    </div>
                                  );
                                }

                                if (isBlocked) {
                                  return (
                                    <div
                                      key={slot.id}
                                      onClick={() => setActiveSlotModal(slot)}
                                      className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 cursor-pointer"
                                    >
                                      <div className="font-bold text-[11px] flex items-center justify-between">
                                        <span>{slot.topic || '督导/会诊留白'}</span>
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-200 text-purple-800">专设</span>
                                      </div>
                                      <div className="text-[10px] text-purple-700 mt-0.5">{slot.counselorName}</div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={slot.id}
                                    onClick={() => {
                                      setFormCounselorId(slot.counselorId);
                                      setFormDate(slot.date);
                                      setFormTimeRange(slot.timeRange);
                                      setFormStatus('booked');
                                      setIsNewSlotModalOpen(true);
                                    }}
                                    className="p-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-100/60 text-emerald-800 text-[11px] font-medium flex items-center justify-between transition-all cursor-pointer group"
                                  >
                                    <span className="truncate">{slot.counselorName} · 空闲</span>
                                    <Plus className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-125 transition-transform shrink-0" />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleQuickSlotClick(COUNSELORS[0].id, timeRange, day.date)}
                              className="w-full h-10 rounded-xl border border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-slate-400 hover:text-teal-700 text-[11px] font-medium flex items-center justify-center gap-1 transition-all cursor-pointer opacity-40 hover:opacity-100"
                              title="点击为此日期此时段排期"
                            >
                              <Plus className="w-3 h-3" />
                              <span>排期</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================= View 2: Counselor Lanes Kanban ======================= */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COUNSELORS
            .filter(c => counselorFilter === 'all' || c.id === counselorFilter)
            .map(counselor => {
              const counselorSlots = filteredSlots.filter(s => s.counselorId === counselor.id);
              const bookedList = counselorSlots.filter(s => s.status === 'booked');
              const availableList = counselorSlots.filter(s => s.status === 'available');
              const completedList = counselorSlots.filter(s => s.status === 'completed');

              return (
                <div key={counselor.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                  {/* Counselor Profile Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-teal-100 border border-teal-300 flex items-center justify-center font-bold text-teal-800 text-sm">
                          {counselor.name.slice(0, 1)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{counselor.name}</h3>
                          <p className="text-[10px] text-slate-500">{counselor.title}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-teal-100 text-teal-800">
                        {counselor.priceRange}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                      <span>已预约 <strong>{bookedList.length}</strong> 节</span>
                      <span>空闲 <strong>{availableList.length}</strong> 节</span>
                      <span>已履约 <strong>{completedList.length}</strong> 节</span>
                    </div>
                  </div>

                  {/* Lane Cards Pool */}
                  <div className="p-3 flex-1 space-y-2.5 overflow-y-auto max-h-[600px] bg-slate-50/50">
                    {/* Booked consultations */}
                    {bookedList.map(slot => (
                      <div
                        key={slot.id}
                        onClick={() => setActiveSlotModal(slot)}
                        className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs hover:shadow-md transition-all cursor-pointer border-l-4 border-l-teal-600"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-teal-600" />
                            {slot.clientName}
                          </span>
                          <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                            {slot.timeRange}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600">
                          <span className="font-mono font-medium">{slot.date}</span>
                          <span className="truncate text-slate-500 max-w-[120px]">{slot.roomName.split('(')[0]}</span>
                        </div>

                        {slot.topic && (
                          <p className="mt-1.5 text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-lg truncate">
                            议题: {slot.topic}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Available slots */}
                    {availableList.map(slot => (
                      <div
                        key={slot.id}
                        onClick={() => {
                          setFormCounselorId(slot.counselorId);
                          setFormDate(slot.date);
                          setFormTimeRange(slot.timeRange);
                          setFormStatus('booked');
                          setIsNewSlotModalOpen(true);
                        }}
                        className="p-2.5 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-300 hover:bg-emerald-100/60 transition-colors cursor-pointer flex items-center justify-between text-xs text-emerald-900"
                      >
                        <div>
                          <span className="font-semibold">{slot.date}</span>
                          <span className="ml-2 font-mono text-[11px] text-emerald-700">{slot.timeRange}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                          可约
                        </span>
                      </div>
                    ))}

                    {counselorSlots.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-400">
                        暂无该咨询师当前排期
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ======================= View 3: Room Utilization ======================= */}
      {viewMode === 'rooms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rooms
            .filter(r => roomFilter === 'all' || r.id === roomFilter)
            .map(room => {
              const roomSlots = filteredSlots.filter(s => s.roomId === room.id);
              const bookedSlots = roomSlots.filter(s => s.status === 'booked');

              return (
                <div key={room.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{room.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        room.type === 'online' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {room.type === 'online' ? '云端加密' : '线下独立'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{room.description}</p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{room.location}</span>
                    </div>
                  </div>

                  <div className="p-3 flex-1 space-y-2 overflow-y-auto max-h-[500px]">
                    {roomSlots.map(slot => (
                      <div
                        key={slot.id}
                        onClick={() => setActiveSlotModal(slot)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          slot.status === 'booked'
                            ? 'bg-teal-50 border-teal-200 text-teal-950'
                            : slot.status === 'completed'
                            ? 'bg-slate-50 border-slate-200 text-slate-700'
                            : 'bg-emerald-50/40 border-dashed border-emerald-300 text-emerald-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{slot.date} {slot.timeRange}</span>
                          <span className="text-[10px]">
                            {slot.status === 'booked' ? '已占位' : slot.status === 'completed' ? '已履约' : '空闲'}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-600 flex items-center justify-between">
                          <span>咨询师: {slot.counselorName}</span>
                          {slot.clientName && <span className="font-semibold text-teal-800">{slot.clientName}</span>}
                        </div>
                      </div>
                    ))}
                    {roomSlots.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400">
                        当前场地此时段空闲无预约
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ======================= Modal: View / Manage Slot Details ======================= */}
      {activeSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">咨询排期与到诊凭证单</h3>
                  <span className="text-[10px] text-slate-400 font-mono">单号: {activeSlotModal.orderNo || `SLOT-${activeSlotModal.id}`}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveSlotModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              {/* Client & Status Banner */}
              <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 flex justify-between items-center">
                <div>
                  <div className="font-bold text-teal-950 text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-teal-700" />
                    <span>{activeSlotModal.clientName || '未指定访客 (空闲时段)'}</span>
                  </div>
                  <div className="text-teal-700 text-[11px] font-mono mt-1 flex items-center gap-2">
                    <span>电话: {activeSlotModal.clientPhone || '未登记手机号'}</span>
                    {activeSlotModal.consultationFormat === 'online_video' ? (
                      <span className="text-purple-700 font-semibold bg-purple-100 px-1.5 py-0.2 rounded">腾讯会议加密室</span>
                    ) : (
                      <span className="text-teal-800 font-semibold bg-teal-200 px-1.5 py-0.2 rounded">实体静安/徐汇面询</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-block ${
                    activeSlotModal.status === 'booked'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : activeSlotModal.status === 'completed'
                      ? 'bg-slate-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {activeSlotModal.status === 'booked' ? '已确认待履约' : activeSlotModal.status === 'completed' ? '已完成履约' : '空闲可约'}
                  </span>
                  <div className="text-[10px] text-teal-700 mt-1">
                    {activeSlotModal.paymentStatus === 'paid_full' ? '微信支付全款已结' : activeSlotModal.paymentStatus === 'paid_deposit' ? '微信支付定金￥100' : '未支付'}
                  </div>
                </div>
              </div>

              {/* Grid detail */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">指定咨询师</span>
                  <strong className="text-slate-900 text-xs">{activeSlotModal.counselorName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">咨询日期与时段</span>
                  <strong className="text-slate-900 font-mono text-xs">{activeSlotModal.date} {activeSlotModal.timeRange}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">个案室场地</span>
                  <strong className="text-slate-900">{activeSlotModal.roomName}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">绑定服务方案</span>
                  <strong className="text-teal-800">{activeSlotModal.serviceType || '4次深度心理探索与梳理方案'}</strong>
                </div>
                {activeSlotModal.topic && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">主诉议题</span>
                    <strong className="text-slate-800">{activeSlotModal.topic}</strong>
                  </div>
                )}
                {activeSlotModal.notes && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">内部协同备注</span>
                    <span className="text-slate-600 text-[11px]">{activeSlotModal.notes}</span>
                  </div>
                )}
              </div>

              {/* Notice Copy Bar */}
              <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleCopyNotice(activeSlotModal)}
                  className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5 text-teal-600" />
                  <span>复制到诊指引短信/通知模版</span>
                </button>

                {onSendAppointmentNoticeToChat && activeSlotModal.clientName && (
                  <button
                    type="button"
                    onClick={() => {
                      onSendAppointmentNoticeToChat(activeSlotModal);
                      showToast(`已将【${activeSlotModal.counselorName}】排期凭证卡直接同步至微信访客聊天窗口！`);
                      setActiveSlotModal(null);
                    }}
                    className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="将此排期确认信息直接推送给微信客服访客"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>推送凭证至访客会话</span>
                  </button>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {activeSlotModal.status === 'booked' && onCompleteSlot && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onCompleteSlot(activeSlotModal.id);
                        setActiveSlotModal(null);
                        showToast('已标记该次心理咨询履约完成！');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>标记履约完成</span>
                    </button>
                  )}

                  {activeSlotModal.status === 'booked' && onCancelSlot && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`确定要释放【${activeSlotModal.clientName}】在此时间段的排期吗？释放后将恢复为可对外预约状态。`)) {
                          await onCancelSlot(activeSlotModal.id);
                          setActiveSlotModal(null);
                          showToast('已成功释放该排期时段');
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs cursor-pointer"
                    >
                      释放时段
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSlotModal(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer text-xs"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= Modal: Create / Book New Slot ======================= */}
      {isNewSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {formStatus === 'booked' ? '锁定咨询师专属预约时段' : '新增开放排期时段'}
                  </h3>
                  <p className="text-[11px] text-slate-500">双轨防撞机自动校验 · 锁定后实时同步大盘</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewSlotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlotSubmit} className="space-y-3.5 mt-4 text-xs">
              {/* Slot Mode: Open vs Booked */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
                <button
                  type="button"
                  onClick={() => setFormStatus('booked')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    formStatus === 'booked' ? 'bg-white text-teal-900 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  访客实名锁定预约
                </button>
                <button
                  type="button"
                  onClick={() => setFormStatus('available')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    formStatus === 'available' ? 'bg-white text-teal-900 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  开放空闲时段挂号
                </button>
                <button
                  type="button"
                  onClick={() => setFormStatus('blocked')}
                  className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    formStatus === 'blocked' ? 'bg-white text-purple-900 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  督导/会诊留白时段
                </button>
              </div>

              {/* Counselor & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">指定咨询师 <span className="text-rose-500">*</span></label>
                  <select
                    value={formCounselorId}
                    onChange={(e) => setFormCounselorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                  >
                    {COUNSELORS.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">排期日期 <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">咨询时段 (50分钟) <span className="text-rose-500">*</span></label>
                  <select
                    value={formTimeRange}
                    onChange={(e) => setFormTimeRange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white font-mono"
                  >
                    {STANDARD_TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">场地咨询室 <span className="text-rose-500">*</span></label>
                  <select
                    value={formRoomId}
                    onChange={(e) => {
                      setFormRoomId(e.target.value);
                      if (e.target.value === 'room_online') {
                        setFormFormat('online_video');
                      } else {
                        setFormFormat('offline_shanghai');
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* If booked mode, client details */}
              {formStatus === 'booked' && (
                <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">来访者称呼 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formClientName}
                        onChange={(e) => setFormClientName(e.target.value)}
                        placeholder="如：林女士"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">联系手机号</label>
                      <input
                        type="text"
                        value={formClientPhone}
                        onChange={(e) => setFormClientPhone(e.target.value)}
                        placeholder="138****6621"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">服务方案</label>
                      <select
                        value={formServiceType}
                        onChange={(e) => setFormServiceType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                      >
                        <option value="首次心理评估与深度访谈">首次心理评估与深度访谈 (400-600元)</option>
                        <option value="4次深度心理探索与梳理方案">4次深度心理探索与梳理方案 (打包特惠 1800元)</option>
                        <option value="10次系统长程心理成长疗程">10次系统长程心理成长疗程 (4200元)</option>
                        <option value="考前心理调适与压力重塑专案">考前心理调适与压力重塑专案</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">支付状态</label>
                      <select
                        value={formPaymentStatus}
                        onChange={(e) => setFormPaymentStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                      >
                        <option value="paid_deposit">微信定金已付 (￥100)</option>
                        <option value="paid_full">微信全款已结</option>
                        <option value="unpaid">待支付</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">初访主诉困扰</label>
                    <input
                      type="text"
                      value={formTopic}
                      onChange={(e) => setFormTopic(e.target.value)}
                      placeholder="如：职场人际压力与偶发性失眠"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">排期备注与交接须知</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="如：访客倾向面询，前台已确认茶饮与静音室安排"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewSlotModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>确认排期入库</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
