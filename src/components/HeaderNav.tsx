/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { RoleType } from '../types';
import { ROLES } from '../data/mockData';

export type NavTab = 'chat' | 'workbench' | 'orders' | 'crisis' | 'dashboard' | 'knowledge';

interface HeaderNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  selectedRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  onEmergencyHandoff: () => void;
  isEmergencyActive: boolean;
  onResetSession: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  onTabChange,
  selectedRole,
  onRoleChange,
  onEmergencyHandoff,
  isEmergencyActive,
  onResetSession,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-base shadow-xs">
              知
            </div>
            <div>
              <a href="#" className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                知心谷心理 · 微信智能客服
              </a>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-600">
            <button
              onClick={() => onTabChange('chat')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              微信客服前台
            </button>
            <button
              onClick={() => onTabChange('workbench')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'workbench'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              会话工作台
            </button>
            <button
              onClick={() => onTabChange('orders')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              咨询支付与订单
            </button>
            <button
              onClick={() => onTabChange('crisis')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'crisis'
                  ? 'bg-rose-50 text-rose-700 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              危机预警台
            </button>
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              运营看板
            </button>
            <button
              onClick={() => onTabChange('knowledge')}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'knowledge'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              知识库与规则
            </button>
          </nav>

          {/* Zone 3: Primary Action & Role Selector */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick role selector */}
            <div className="hidden lg:flex items-center text-xs text-slate-600 bg-slate-100 p-1 rounded-lg">
              <span className="text-slate-400 px-2">接待角色:</span>
              {(['li_teacher', 'wang_teacher', 'chen_teacher', 'org_agent'] as RoleType[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onRoleChange(r)}
                  className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                    selectedRole === r ? 'bg-white text-slate-900 shadow-xs font-medium' : 'hover:text-slate-900'
                  }`}
                >
                  {ROLES[r].name}
                </button>
              ))}
            </div>

            <button
              onClick={onResetSession}
              title="重置会话体验"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onEmergencyHandoff}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isEmergencyActive
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isEmergencyActive ? '应急全员接手中' : '全局应急交还人工'}</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-2 border-t border-slate-100 scrollbar-none text-xs">
          <button
            onClick={() => onTabChange('chat')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'chat' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            微信客服
          </button>
          <button
            onClick={() => onTabChange('workbench')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'workbench' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            会话工作台
          </button>
          <button
            onClick={() => onTabChange('orders')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            咨询支付
          </button>
          <button
            onClick={() => onTabChange('crisis')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'crisis' ? 'bg-rose-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            危机预警
          </button>
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            总览看板
          </button>
          <button
            onClick={() => onTabChange('knowledge')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'knowledge' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            知识库
          </button>
        </div>
      </div>
    </header>
  );
};
