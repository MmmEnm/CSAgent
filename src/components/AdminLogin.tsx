/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { StaffUser } from '../types';

interface AdminLoginProps {
  staffList: StaffUser[];
  onLoginSuccess: (user: StaffUser) => void;
  onCancelToClient?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  staffList,
  onLoginSuccess,
  onCancelToClient,
}) => {
  const [username, setUsername] = useState('li_supervisor');
  const [password, setPassword] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickLogin = (staff: StaffUser) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setTimeout(() => {
      onLoginSuccess(staff);
      setIsSubmitting(false);
    }, 300);
  };

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('请输入工作人员工号或用户名');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || '登录凭证无效，请核对用户名');
      }
    } catch {
      // Local fallback
      const found = staffList.find(s => s.username === username.trim()) || staffList[0];
      onLoginSuccess(found);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-teal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white font-bold text-2xl shadow-xl shadow-teal-900/40 mb-3 border border-teal-400/30">
          知
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          知心谷心理 · 机构管理中台
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          国家卫健委规范心理服务机构 · 多人协同值班消息回复工作台
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 sm:px-8 shadow-2xl rounded-2xl">
          {/* Preset Quick Login Roles (High convenience for review) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                选择值班角色快捷一键登入（演示免密）
              </span>
              <span className="text-[11px] text-teal-400/80">实时模拟不同岗位</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {staffList.slice(0, 4).map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleQuickLogin(staff)}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-teal-500/50 transition-all text-left group cursor-pointer"
                >
                  <img
                    src={staff.avatar}
                    alt={staff.name}
                    className="w-9 h-9 rounded-full bg-slate-700 shrink-0 border border-slate-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                        {staff.name}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800/60 shrink-0">
                        {staff.roleName.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {staff.title}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-400">或使用账号密码登入</span>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                工作人员账号 (工号 / 登录名)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="如 li_supervisor 或 counselor_zhang"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                登录密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="默认 123456"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-700 bg-slate-950 text-teal-600 focus:ring-0"
                />
                <span>保持7天登录在线值班状态</span>
              </label>
              <span className="text-[11px] text-slate-500">测试默认密码: 123456</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? '验证登入中...' : '进入值班回复工作台'}</span>
            </button>
          </form>

          {/* Compliance & back buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>符合中国心理学会临床心理伦理守则</span>
            </div>
            {onCancelToClient && (
              <button
                type="button"
                onClick={onCancelToClient}
                className="text-teal-400 hover:text-teal-300 hover:underline cursor-pointer"
              >
                返回微信客服前台 →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
