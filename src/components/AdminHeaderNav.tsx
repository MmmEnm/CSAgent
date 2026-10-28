/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, RefreshCw, ExternalLink, MessageSquare, Users, LogOut, Sparkles, Calendar } from 'lucide-react';
import { RoleType, StaffUser, DutyStatus } from '../types';
import { ROLES } from '../data/mockData';

export type AdminTab = 'workbench' | 'schedule' | 'accounts' | 'orders' | 'crisis' | 'dashboard' | 'knowledge' | 'flywheel';

interface AdminHeaderNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  selectedRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  onEmergencyHandoff: () => void;
  isEmergencyActive: boolean;
  onResetSession: () => void;
  onNavigateToClient: () => void;
  currentUser?: StaffUser | null;
  onDutyStatusChange?: (status: DutyStatus) => void;
  onLogout?: () => void;
}

export const AdminHeaderNav: React.FC<AdminHeaderNavProps> = ({
  activeTab,
  onTabChange,
  selectedRole,
  onRoleChange,
  onEmergencyHandoff,
  isEmergencyActive,
  onResetSession,
  onNavigateToClient,
  currentUser,
  onDutyStatusChange,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              知
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                  知心谷心理 · 机构管理中台
                </span>
                <span className="text-[10px] bg-slate-800 text-teal-300 px-2 py-0.5 rounded border border-slate-700">
                  多人值班中台
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden xl:block">
                多席位会话协同 · 人员账号排班 · 咨询师日历看板 · 订单支付 · 危机守护
              </p>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-300">
            <button
              onClick={() => onTabChange('workbench')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'workbench'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              会话工作台
            </button>
            <button
              onClick={() => onTabChange('schedule')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'bg-teal-900/90 text-teal-200 font-semibold border border-teal-700/60 shadow-xs'
                  : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>排期日历看板</span>
            </button>
            <button
              onClick={() => onTabChange('accounts')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'accounts'
                  ? 'bg-teal-900/90 text-teal-200 font-semibold border border-teal-700/60'
                  : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-teal-400" />
              <span>人员与账号</span>
            </button>
            <button
              onClick={() => onTabChange('orders')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              咨询支付与订单
            </button>
            <button
              onClick={() => onTabChange('crisis')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'crisis'
                  ? 'bg-rose-950 text-rose-300 font-semibold border border-rose-800/60'
                  : 'hover:text-rose-300 hover:bg-slate-800/60'
              }`}
            >
              危机预警台
            </button>
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              总览看板
            </button>
            <button
              onClick={() => onTabChange('knowledge')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'knowledge'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'hover:text-white hover:bg-slate-800/60'
              }`}
            >
              知识库
            </button>
            <button
              onClick={() => onTabChange('flywheel')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'flywheel'
                  ? 'bg-teal-900/90 text-teal-200 font-semibold border border-teal-700/60 shadow-xs'
                  : 'text-teal-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span>数据飞轮</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions & Current Staff Indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Current Staff User Pill */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 shrink-0"
                />
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5 leading-tight">
                    <span className="text-xs font-bold text-white truncate max-w-[80px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800 shrink-0">
                      {currentUser.roleName.split(' ')[0]}
                    </span>
                  </div>
                  {onDutyStatusChange && (
                    <select
                      value={currentUser.dutyStatus}
                      onChange={(e) => onDutyStatusChange(e.target.value as DutyStatus)}
                      className="text-[10px] bg-transparent text-slate-300 font-medium focus:outline-hidden cursor-pointer"
                    >
                      <option value="on_duty" className="bg-slate-900 text-emerald-400">🟢 在线值班中</option>
                      <option value="busy" className="bg-slate-900 text-amber-400">🟡 忙碌 (暂不分流)</option>
                      <option value="break" className="bg-slate-900 text-blue-400">☕ 暂离小休</option>
                      <option value="offline" className="bg-slate-900 text-slate-400">⚪ 离线</option>
                    </select>
                  )}
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="切换账号 / 退出登录"
                    className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer ml-0.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onResetSession}
              title="重置演示数据"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onEmergencyHandoff}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isEmergencyActive
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEmergencyActive ? '应急全员接手中' : '全局应急交还人工'}</span>
            </button>

            {/* Jump to Client Frontend button */}
            <button
              onClick={onNavigateToClient}
              className="px-2.5 sm:px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">微信客服前台</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-2 border-t border-slate-800 scrollbar-none text-xs">
          <button
            onClick={() => onTabChange('workbench')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'workbench' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300'
            }`}
          >
            会话工作台
          </button>
          <button
            onClick={() => onTabChange('schedule')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'schedule' ? 'bg-teal-700 text-white font-semibold' : 'text-teal-300'
            }`}
          >
            排期日历
          </button>
          <button
            onClick={() => onTabChange('accounts')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'accounts' ? 'bg-teal-700 text-white font-semibold' : 'text-teal-300'
            }`}
          >
            人员与账号
          </button>
          <button
            onClick={() => onTabChange('orders')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300'
            }`}
          >
            支付与订单
          </button>
          <button
            onClick={() => onTabChange('crisis')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'crisis' ? 'bg-rose-600 text-white font-semibold' : 'text-rose-300'
            }`}
          >
            危机预警台
          </button>
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300'
            }`}
          >
            总览看板
          </button>
          <button
            onClick={() => onTabChange('knowledge')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'knowledge' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300'
            }`}
          >
            知识库
          </button>
          <button
            onClick={() => onTabChange('flywheel')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'flywheel' ? 'bg-teal-700 text-white font-semibold' : 'text-teal-300'
            }`}
          >
            数据飞轮
          </button>
        </div>
      </div>
    </header>
  );
};
