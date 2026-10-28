/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  KeyRound,
  Phone,
  MessageSquare,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Plus,
  Sliders,
  Check,
  Power
} from 'lucide-react';
import { StaffUser, DutyStatus, StaffRole } from '../types';

interface StaffAccountManagementProps {
  staffList: StaffUser[];
  currentUserId: string;
  onUpdateDutyStatus: (staffId: string, status: DutyStatus) => void;
  onCreateStaff: (data: Partial<StaffUser>) => Promise<void>;
  onUpdateStaff: (staffId: string, data: Partial<StaffUser>) => Promise<void>;
  onDeleteStaff: (staffId: string) => Promise<void>;
}

export const StaffAccountManagement: React.FC<StaffAccountManagementProps> = ({
  staffList,
  currentUserId,
  onUpdateDutyStatus,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newTitle, setNewTitle] = useState('心理咨询顾问');
  const [newRole, setNewRole] = useState<StaffRole>('duty_counselor');
  const [newMaxConcurrent, setNewMaxConcurrent] = useState('5');
  const [newPhone, setNewPhone] = useState('13800000000');
  const [newWechat, setNewWechat] = useState('');
  const [newPermissions, setNewPermissions] = useState<string[]>(['chat_reply', 'takeover', 'order_manage']);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim()) {
      showToast('请完整填写姓名与登录账号');
      return;
    }
    await onCreateStaff({
      name: newName.trim(),
      username: newUsername.trim(),
      title: newTitle.trim(),
      role: newRole,
      maxConcurrent: Number(newMaxConcurrent) || 5,
      phone: newPhone.trim(),
      wechat: newWechat.trim() || `wx_${newUsername.trim()}`,
      permissions: newPermissions,
    });
    setIsCreateModalOpen(false);
    showToast(`已成功创建工作人员账号：${newName}`);
    // Reset
    setNewName('');
    setNewUsername('');
    setNewTitle('心理咨询顾问');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    await onUpdateStaff(editingStaff.id, {
      name: editingStaff.name,
      title: editingStaff.title,
      role: editingStaff.role,
      maxConcurrent: editingStaff.maxConcurrent,
      phone: editingStaff.phone,
      wechat: editingStaff.wechat,
      permissions: editingStaff.permissions,
      status: editingStaff.status,
    });
    setEditingStaff(null);
    showToast(`已更新【${editingStaff.name}】的权限与席位设置`);
  };

  // Stats calculation
  const onDutyCount = staffList.filter(s => s.dutyStatus === 'on_duty').length;
  const busyCount = staffList.filter(s => s.dutyStatus === 'busy').length;
  const offlineCount = staffList.filter(s => s.dutyStatus === 'offline').length;
  const totalConcurrencyCapacity = staffList.reduce((sum, s) => sum + (s.dutyStatus === 'on_duty' ? s.maxConcurrent : 0), 0);
  const currentTotalActive = staffList.reduce((sum, s) => sum + s.currentActiveSessions, 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-teal-300 px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              人员与账号权限管理
            </h2>
            <span className="text-xs bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">
              共 {staffList.length} 名在册咨询服务团队成员
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            支持心理咨询师、督导专家、一线值班顾问及危机干预专员的多人在线排班、接待配额容量调度与权限细分
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>新建工作人员账号</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>在线值班中席位</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">
            {onDutyCount} 人
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            忙碌 {busyCount} 人 · 离线 {offlineCount} 人
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">实时承接总容量</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {currentTotalActive} / {totalConcurrencyCapacity} <span className="text-xs font-normal text-slate-400">路</span>
          </div>
          <span className="text-[11px] text-teal-600 mt-0.5 block">
            在线顾问最大并发负荷比 {totalConcurrencyCapacity > 0 ? Math.round((currentTotalActive / totalConcurrencyCapacity) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">今日人工接管回复量</span>
          <div className="text-2xl font-bold text-teal-700 mt-1 font-mono">
            {staffList.reduce((sum, s) => sum + s.todayHandledCount, 0)} 会话
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            真人顾问平均首响 18秒
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">咨询满意度好评率</span>
          <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
            99.2%
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            近30天零伦理差评与投诉
          </span>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-teal-700" />
            机构在册人员与值班状态清单
          </h3>
          <span className="text-[11px] text-slate-400">
            绿色圆点代表当前可自动分流与认领会话
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">工作人员 / 工号</th>
                <th className="px-4 py-3">岗位与角色</th>
                <th className="px-4 py-3">当前值班状态</th>
                <th className="px-4 py-3">接待负载 (在办/上限)</th>
                <th className="px-4 py-3">联系方式</th>
                <th className="px-4 py-3">操作与权限设置</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((staff) => {
                const isCurrent = staff.id === currentUserId;

                return (
                  <tr key={staff.id} className={`hover:bg-slate-50/80 transition-colors ${staff.status === 'disabled' ? 'opacity-50 bg-slate-50/50' : ''}`}>
                    {/* Member info */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={staff.avatar}
                          alt={staff.name}
                          className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{staff.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded font-semibold">
                                当前登入
                              </span>
                            )}
                            {staff.status === 'disabled' && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">
                                已停用
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            @{staff.username} · {staff.title}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        staff.role === 'super_admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        staff.role === 'supervisor' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                        staff.role === 'crisis_specialist' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-teal-100 text-teal-800 border border-teal-200'
                      }`}>
                        {staff.roleName}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <span>好评率 {staff.satisfactionScore}%</span>
                        <span>·</span>
                        <span>今日接管 {staff.todayHandledCount} 单</span>
                      </div>
                    </td>

                    {/* Duty Status */}
                    <td className="px-4 py-3.5">
                      <select
                        value={staff.dutyStatus}
                        onChange={(e) => onUpdateDutyStatus(staff.id, e.target.value as DutyStatus)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer ${
                          staff.dutyStatus === 'on_duty' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                          staff.dutyStatus === 'busy' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                          staff.dutyStatus === 'break' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                          'bg-slate-100 border-slate-300 text-slate-600'
                        }`}
                      >
                        <option value="on_duty">🟢 在线值班中</option>
                        <option value="busy">🟡 忙碌 (暂不分流)</option>
                        <option value="break">☕ 暂离小休</option>
                        <option value="offline">⚪ 离线</option>
                      </select>
                    </td>

                    {/* Concurrency Load */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">
                          {staff.currentActiveSessions} / {staff.maxConcurrent}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              staff.currentActiveSessions >= staff.maxConcurrent
                                ? 'bg-rose-500'
                                : 'bg-teal-500'
                            }`}
                            style={{ width: `${Math.min(100, (staff.currentActiveSessions / staff.maxConcurrent) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        配额上限: {staff.maxConcurrent} 会话
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5 text-slate-600">
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{staff.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>企微: {staff.wechat}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingStaff({ ...staff })}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>配置</span>
                        </button>

                        <button
                          onClick={() => {
                            const newStatus = staff.status === 'active' ? 'disabled' : 'active';
                            onUpdateStaff(staff.id, { status: newStatus });
                            showToast(`已${newStatus === 'active' ? '启用' : '停用'}账号：${staff.name}`);
                          }}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            staff.status === 'active'
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={staff.status === 'active' ? '停用此账号' : '重新启用此账号'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {!isCurrent && (
                          <button
                            onClick={() => {
                              if (confirm(`确定要移除工作人员【${staff.name}】吗？`)) {
                                onDeleteStaff(staff.id);
                                showToast(`已删除账号：${staff.name}`);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="删除账号"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Staff Account */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-700" />
                新建工作人员账号与值班席位
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    员工姓名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="如 赵芳华 老师"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    系统登录工号/账号 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="如 counselor_zhao"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">岗位角色</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                  >
                    <option value="duty_counselor">值班心理顾问</option>
                    <option value="supervisor">心理督导专家</option>
                    <option value="crisis_specialist">危机干预专员</option>
                    <option value="super_admin">机构超级管理员</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">对外职称 / 专长标签</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="如 注册心理师 · 情绪与睡眠专长"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">最大接待会话数</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newMaxConcurrent}
                    onChange={(e) => setNewMaxConcurrent(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">联系手机</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="13800000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">初始功能权限赋予</label>
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  {[
                    { id: 'chat_reply', label: '人工会话接管与实时回复' },
                    { id: 'takeover', label: '会话转接与内部督导备忘' },
                    { id: 'order_manage', label: '咨询定金与方案订单发起' },
                    { id: 'crisis_handle', label: '高危预警接管与绿色通道' },
                    { id: 'staff_manage', label: '值班账号与权限维护' },
                    { id: 'knowledge_edit', label: '知识库与价格规则编排' }
                  ].map((perm) => (
                    <label key={perm.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPermissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewPermissions([...newPermissions, perm.id]);
                          } else {
                            setNewPermissions(newPermissions.filter(p => p !== perm.id));
                          }
                        }}
                        className="rounded border-slate-300 text-teal-600 focus:ring-0"
                      />
                      <span className="text-[11px] text-slate-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  保存并开通账号
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Staff */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-700" />
                配置顾问权限与席位：{editingStaff.name}
              </h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">对外职称 / 专长展示</label>
                  <input
                    type="text"
                    value={editingStaff.title}
                    onChange={(e) => setEditingStaff({ ...editingStaff, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">岗位角色</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as StaffRole })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white"
                  >
                    <option value="duty_counselor">值班心理顾问</option>
                    <option value="supervisor">心理督导专家</option>
                    <option value="crisis_specialist">危机干预专员</option>
                    <option value="super_admin">机构超级管理员</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">并发接待上限 (路)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editingStaff.maxConcurrent}
                    onChange={(e) => setEditingStaff({ ...editingStaff, maxConcurrent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">企业微信账号</label>
                  <input
                    type="text"
                    value={editingStaff.wechat}
                    onChange={(e) => setEditingStaff({ ...editingStaff, wechat: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">功能模块操作权限</label>
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  {[
                    { id: 'chat_reply', label: '人工会话接管与实时回复' },
                    { id: 'takeover', label: '会话转接与内部督导备忘' },
                    { id: 'order_manage', label: '咨询定金与方案订单发起' },
                    { id: 'crisis_handle', label: '高危预警接管与绿色通道' },
                    { id: 'staff_manage', label: '值班账号与权限维护' },
                    { id: 'knowledge_edit', label: '知识库与价格规则编排' }
                  ].map((perm) => (
                    <label key={perm.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingStaff.permissions.includes(perm.id) || editingStaff.permissions.includes('all')}
                        onChange={(e) => {
                          const currentPerms = editingStaff.permissions.filter(p => p !== 'all');
                          if (e.target.checked) {
                            setEditingStaff({ ...editingStaff, permissions: [...currentPerms, perm.id] });
                          } else {
                            setEditingStaff({ ...editingStaff, permissions: currentPerms.filter(p => p !== perm.id) });
                          }
                        }}
                        className="rounded border-slate-300 text-teal-600 focus:ring-0"
                      />
                      <span className="text-[11px] text-slate-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
