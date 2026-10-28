/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Video,
  Users,
  Smartphone,
  Globe,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Layers,
  Calendar,
  CreditCard,
  Heart
} from 'lucide-react';
import { RoleType } from '../types';
import { ROLES, SERVICE_PRODUCTS, COUNSELORS } from '../data/mockData';

interface ChannelEntryPortalsProps {
  onSelectChannelAndLaunch: (roleId: RoleType, initialPrompt?: string, channelName?: string) => void;
}

export type ChannelId = 'ad_landing' | 'video_ip' | 'community_event' | 'official_wechat' | 'website_widget';

export const ChannelEntryPortals: React.FC<ChannelEntryPortalsProps> = ({
  onSelectChannelAndLaunch,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ChannelId>('ad_landing');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Overview Banner - Adaptive Mobile & Web Layout */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-teal-100 text-teal-800">
                企业微信 · 多渠道矩阵导流
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500">统一接入微信客服原生通道</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              知心谷智能体 · 全渠道获客与会话接入矩阵
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              不同获客入口自动绑定专属的AI角色人设。点击下方任意业务入口，体验从渠道触发、意图传递到微信客服开场与支付咨询的完整闭环。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <span className="text-xs text-slate-500 hidden sm:inline">配置状态:</span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
              4套独立人设 · 5类获客场景
            </span>
          </div>
        </div>

        {/* Channel Selector - Responsive scroll on mobile, clean grid on desktop */}
        <div className="flex sm:grid sm:grid-cols-5 gap-2 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedChannel('ad_landing')}
            className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[145px] sm:min-w-0 ${
              selectedChannel === 'ad_landing'
                ? 'bg-teal-50/80 border-teal-600 shadow-xs text-teal-950'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Search className="w-4 h-4 text-teal-700" />
              <span className="text-xs font-bold">1. 投流落地页</span>
            </div>
            <span className="text-[11px] text-slate-500 truncate">关键词广告落地页</span>
            <span className="text-[10px] text-teal-700 font-semibold mt-1">李老师 · 助手</span>
          </button>

          <button
            onClick={() => setSelectedChannel('video_ip')}
            className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[145px] sm:min-w-0 ${
              selectedChannel === 'video_ip'
                ? 'bg-teal-50/80 border-teal-600 shadow-xs text-teal-950'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Video className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold">2. 视频号 / IP</span>
            </div>
            <span className="text-[11px] text-slate-500 truncate">IP内容科普引流</span>
            <span className="text-[10px] text-emerald-700 font-semibold mt-1">王老师 · 助手</span>
          </button>

          <button
            onClick={() => setSelectedChannel('community_event')}
            className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[145px] sm:min-w-0 ${
              selectedChannel === 'community_event'
                ? 'bg-teal-50/80 border-teal-600 shadow-xs text-teal-950'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-indigo-700" />
              <span className="text-xs font-bold">3. 社群活动页</span>
            </div>
            <span className="text-[11px] text-slate-500 truncate">解压沙龙与工作坊</span>
            <span className="text-[10px] text-indigo-700 font-semibold mt-1">陈老师 · 助手</span>
          </button>

          <button
            onClick={() => setSelectedChannel('official_wechat')}
            className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[145px] sm:min-w-0 ${
              selectedChannel === 'official_wechat'
                ? 'bg-teal-50/80 border-teal-600 shadow-xs text-teal-950'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Smartphone className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-bold">4. 公众号/小程序</span>
            </div>
            <span className="text-[11px] text-slate-500 truncate">官方主页底栏菜单</span>
            <span className="text-[10px] text-blue-700 font-semibold mt-1">知心谷 · 机构助手</span>
          </button>

          <button
            onClick={() => setSelectedChannel('website_widget')}
            className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between shrink-0 min-w-[145px] sm:min-w-0 ${
              selectedChannel === 'website_widget'
                ? 'bg-teal-50/80 border-teal-600 shadow-xs text-teal-950'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Globe className="w-4 h-4 text-cyan-700" />
              <span className="text-xs font-bold">5. 官网内嵌浮窗</span>
            </div>
            <span className="text-[11px] text-slate-500 truncate">一行JS组件接入</span>
            <span className="text-[10px] text-cyan-700 font-semibold mt-1">知心谷 · 机构助手</span>
          </button>
        </div>
      </div>

      {/* Main Channel Live Preview Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* ================= CHANNEL 1: 投流落地页 ================= */}
        {selectedChannel === 'ad_landing' && (
          <div>
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-teal-400" />
                <span className="font-semibold">渠道场景：搜索关键词竞价投放落地页</span>
                <span className="text-slate-400">· 投放词: “心理咨询怎么收费 / 焦虑情绪疏导”</span>
              </div>
              <span className="text-teal-300 font-mono text-[11px]">匹配智能体：知心谷·李老师的AI助手</span>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/60">
              {/* Fake Landing Page Hero */}
              <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-teal-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  企业微信直连 · 官方客服在岗
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    知心谷注册心理师团队
                  </span>
                  <span className="text-xs text-slate-400">10年临床执业 · 100%持证专家</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mb-3">
                  告别情绪消耗与内耗 · 科学定制您的1对1心理咨询方案
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  不确定自己的焦虑处于哪个程度？不知道哪个流派最对症？支持首次50分钟深度访谈评估，透明收费400元起，提前24小时无条件全额退改。
                </p>

                {/* Pricing preview grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-xs text-slate-500">首次评估与梳理</span>
                    <div className="text-lg font-bold text-teal-700 mt-1">￥400 <span className="text-xs font-normal text-slate-400">/ 50min</span></div>
                    <span className="text-[10px] text-slate-400">个案管理师初筛评估</span>
                  </div>
                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-center">
                    <span className="text-xs text-teal-900 font-semibold">资深心理师单次</span>
                    <div className="text-lg font-bold text-teal-700 mt-1">￥600 <span className="text-xs font-normal text-slate-400">/ 50min</span></div>
                    <span className="text-[10px] text-teal-700">8年+注册心理师</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-xs text-slate-500">4次深度探索包</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">￥1,800 <span className="text-xs font-normal text-slate-400">/ 4次</span></div>
                    <span className="text-[10px] text-slate-400">平均450元/次</span>
                  </div>
                </div>

                {/* Floating Contact Card in Landing Page */}
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={ROLES.li_teacher.avatar}
                      alt="李老师"
                      className="w-12 h-12 rounded-full border border-teal-300 bg-white"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">李老师 · 微信智能客服助手</span>
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-medium">在线</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        无需加好友 · 点击直接启动微信客服 · 咨询价格、流派匹配与微信支付
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectChannelAndLaunch('li_teacher', '请问心理咨询怎么收费？有打包优惠套餐吗？', '投流落地页')}
                      className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02]"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>立即进入微信客服问询</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CHANNEL 2: 视频号 / IP 内容 ================= */}
        {selectedChannel === 'video_ip' && (
          <div>
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">渠道场景：微信视频号主页 / IP知识专栏</span>
                <span className="text-slate-400">· 来源：王老师科普专栏《如何走出慢性精神消耗》</span>
              </div>
              <span className="text-emerald-300 font-mono text-[11px]">匹配智能体：知心谷·王老师的AI助手</span>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/60">
              <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                {/* Fake WeChat Video Channel Header */}
                <div className="flex items-start gap-4 border-b border-slate-100 pb-5 mb-5">
                  <img
                    src={ROLES.wang_teacher.avatar}
                    alt="王老师"
                    className="w-16 h-16 rounded-full border-2 border-emerald-500 shadow-xs"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">王振华 · 心理疗愈与深层探索</h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                        认证创作者
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">国家二级心理咨询师 · 中德班精神动力学持续培训 · 12年个案沉淀</p>
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-2 font-mono">
                      <span><strong>18.4万</strong> 关注</span>
                      <span><strong>126</strong> 篇科普视频</span>
                      <span><strong>4.2万</strong> 获赞</span>
                    </div>
                  </div>
                </div>

                {/* Channel Actions */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-emerald-600" />
                      粉丝专属 · 王老师AI助理直通通道
                    </span>
                    <span className="text-[10px] text-emerald-700">企业微信「微信客服」承接</span>
                  </div>
                  <p className="text-xs text-emerald-900 mb-3 leading-relaxed">
                    王老师因日间接待个案，特设专属AI助手协助粉丝朋友。助手沿袭温和留白的倾听风格，为您解答精神动力学流派特点、王老师当前排期与预约定金办理。
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => onSelectChannelAndLaunch('wang_teacher', '王老师你好，看了您的视频，我想了解精神动力学怎么做咨询？', '视频号主页')}
                      className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>向王老师AI助手倾诉 / 预约</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectChannelAndLaunch('wang_teacher', '请问王老师现在的排期需要提前多久预定？定金怎么付？', '视频号主页')}
                      className="py-2.5 px-4 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      咨询排期与定金
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CHANNEL 3: 社群 / 线下活动 ================= */}
        {selectedChannel === 'community_event' && (
          <div>
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold">渠道场景：微信社群运营 / 青年工作坊招募推文</span>
                <span className="text-slate-400">· 来源：“情绪急救箱·周末解压沙龙”报名页面</span>
              </div>
              <span className="text-indigo-300 font-mono text-[11px]">匹配智能体：知心谷·陈老师的AI助手</span>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/60">
              <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="border-l-4 border-indigo-600 pl-4 mb-4">
                  <span className="text-xs font-bold text-indigo-700">线下沙龙 & 社群答疑</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    【招募中】青年心理接纳与情绪书写工作坊（陈梦琪老师主持）
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">时间：本周六 14:00-16:30 · 地点：知心谷静安多功能活动室</p>
                </div>

                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  报名有疑问？想了解自己是否适合参与团体还是个体咨询？欢迎联系沙龙主持陈老师的微信客服助手，解答所有活动、分组及费用疑惑。
                </p>

                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={ROLES.chen_teacher.avatar}
                      alt="陈老师"
                      className="w-12 h-12 rounded-full border border-indigo-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900">陈老师 · 活动AI助理</span>
                      <p className="text-[11px] text-slate-500">短句互动 · 亲切温暖 · 快速解答</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectChannelAndLaunch('chen_teacher', '陈老师助手你好，我想咨询一下周末沙龙的参与要求，还有如果想做个人ACT咨询怎么收费？', '社群活动页')}
                    className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>联系陈老师助手</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CHANNEL 4: 公众号 / 小程序 ================= */}
        {selectedChannel === 'official_wechat' && (
          <div>
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">渠道场景：知心谷官方微信公众号 / 自有小程序</span>
                <span className="text-slate-400">· 来源：公众号底部菜单「预约咨询 · 微信客服」</span>
              </div>
              <span className="text-blue-300 font-mono text-[11px]">匹配智能体：知心谷·官方智能助手</span>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/60">
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-300 shadow-lg overflow-hidden">
                {/* WeChat Official Account Preview */}
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-xs">
                  <span className="font-bold">知心谷心理咨询中心 (服务号)</span>
                  <span className="text-[11px] text-slate-400">官方认证</span>
                </div>

                <div className="p-5 text-center bg-slate-50/60 border-b border-slate-100">
                  <div className="w-14 h-14 bg-teal-700 text-white font-bold text-xl rounded-2xl flex items-center justify-center mx-auto mb-2">
                    知
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">知心谷心理咨询中心</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    专业、严谨、温暖的现代心理健康服务平台。提供个体咨询、婚姻家庭、危机干预与心理体检。
                  </p>
                </div>

                <div className="p-4 space-y-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">最新推文：如何选择适合自己的流派</span>
                      <p className="text-[10px] text-slate-400">阅读 8201 · 2天前</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Bottom Menu Bar Simulation */}
                <div className="border-t border-slate-200 bg-white grid grid-cols-3 text-center text-xs text-slate-700 divide-x divide-slate-100">
                  <div className="py-3 hover:bg-slate-50 cursor-pointer">
                    机构介绍
                  </div>
                  <div className="py-3 hover:bg-slate-50 cursor-pointer">
                    价格与方案
                  </div>
                  <button
                    onClick={() => onSelectChannelAndLaunch('org_agent', '您好，我想了解知心谷完整的咨询服务流程和资费标准', '公众号底栏菜单')}
                    className="py-3 bg-teal-700 text-white font-bold hover:bg-teal-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>在线微信客服</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CHANNEL 5: 官网一行JS嵌入 ================= */}
        {selectedChannel === 'website_widget' && (
          <div>
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">渠道场景：机构官方网站 (Web嵌入组件 · FR-39)</span>
                <span className="text-slate-400">· 接入方式：一行JavaScript脚本安全挂载</span>
              </div>
              <span className="text-cyan-300 font-mono text-[11px]">匹配智能体：知心谷·官方智能助手</span>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/60">
              <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  官网嵌入规范说明（PRD FR-39 验收标准）：
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  官网组件由机构后端鉴权并下发短期访客会话令牌，前端JS不暴露任何模型密钥。用户在官网站点右下角点击客服气泡，即可无缝拉起全功能智能咨询对话。
                </p>

                {/* Code embed snippet */}
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto mb-6">
                  <span className="text-slate-500">// 1. 机构站点引入官方安全聊天组件</span><br />
                  <span className="text-teal-400">&lt;script</span> <span className="text-slate-300">src=</span><span className="text-amber-300">"https://static.zhixingu.com/sdk/chat-widget.js"</span><br />
                  &nbsp;&nbsp;<span className="text-slate-300">data-channel-id=</span><span className="text-amber-300">"official_website"</span><br />
                  &nbsp;&nbsp;<span className="text-slate-300">data-theme=</span><span className="text-amber-300">"teal"</span><br />
                  &nbsp;&nbsp;<span className="text-slate-300">data-security-gate=</span><span className="text-amber-300">"strict"</span><span className="text-teal-400">&gt;&lt;/script&gt;</span>
                </div>

                <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-teal-950">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>站内会话与微信客服共用安全拦截、知识库与微信支付定金中台能力</span>
                  </div>
                  <button
                    onClick={() => onSelectChannelAndLaunch('org_agent', '您好，我正在浏览知心谷官网，想了解单次咨询和长程疗程的区别', '机构官方网站')}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>体验官网浮窗唤起</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
