/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Sliders,
  Filter,
  ArrowRight,
  Eye,
  Check,
  Zap,
  Activity,
  FileText,
  Clock,
  ArrowUpRight,
  HelpCircle,
  Database,
  Target,
  BookOpen,
  X
} from 'lucide-react';
import {
  FlywheelStage,
  FlywheelDashboardStats,
  AutomatedEvalMetric,
  DialogueLogItem,
  BadcaseItem,
  PromptVersion,
  ABExperiment,
  ABCDriftReport,
  ABCDriftLog
} from '../types';
import {
  INITIAL_FLYWHEEL_STATS,
  INITIAL_EVAL_METRICS,
  INITIAL_DIALOGUE_LOGS,
  INITIAL_BADCASES,
  INITIAL_PROMPT_VERSIONS,
  INITIAL_AB_EXPERIMENTS
} from '../data/mockData';

export const FlywheelEngineView: React.FC = () => {
  const [activeStage, setActiveStage] = useState<FlywheelStage>('flywheel_kpi');
  const [stats, setStats] = useState<FlywheelDashboardStats>(INITIAL_FLYWHEEL_STATS);
  const [metrics, setMetrics] = useState<AutomatedEvalMetric[]>(INITIAL_EVAL_METRICS);
  const [logs, setLogs] = useState<DialogueLogItem[]>(INITIAL_DIALOGUE_LOGS);
  const [badcases, setBadcases] = useState<BadcaseItem[]>(INITIAL_BADCASES);
  const [prompts, setPrompts] = useState<PromptVersion[]>(INITIAL_PROMPT_VERSIONS);
  const [experiments, setExperiments] = useState<ABExperiment[]>(INITIAL_AB_EXPERIMENTS);
  
  // Local UI filters and modals
  const [filterBadcaseOnly, setFilterBadcaseOnly] = useState(false);
  const [selectedLog, setSelectedLog] = useState<DialogueLogItem | null>(null);
  const [selectedBadcase, setSelectedBadcase] = useState<BadcaseItem | null>(null);
  const [badcaseStatusFilter, setBadcaseStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'fixed'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDeployingPrompt, setIsDeployingPrompt] = useState(false);
  const [evalRunning, setEvalRunning] = useState(false);
  const [driftReport, setDriftReport] = useState<ABCDriftReport | null>(null);
  const [driftLogs, setDriftLogs] = useState<ABCDriftLog[]>([]);
  const [fewshotExamples, setFewshotExamples] = useState<any[]>([]);
  const [kbVersions, setKbVersions] = useState<any[]>([]);
  const [kbDiff, setKbDiff] = useState<any[]>([]);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const fetchKbVersions = async () => {
    try {
      const res = await fetch('/api/flywheel/knowledge/versions');
      const data = await res.json();
      if (data.versions) setKbVersions(data.versions);
    } catch (e) {
      console.error('Failed to load KB versions', e);
    }
  };

  const handleRollbackKnowledge = async (versionId: string) => {
    setIsRollingBack(true);
    try {
      const res = await fetch('/api/flywheel/knowledge/versions/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 成功回滚至知识库版本 [${data.activeVersion.versionNumber}]！正在实时重建向量索引...`);
        fetchKbVersions();
      }
    } catch (e) {
      showToast('回滚失败');
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleFetchDiff = async () => {
    try {
      const res = await fetch('/api/flywheel/knowledge/diff');
      const data = await res.json();
      if (data.diff) setKbDiff(data.diff);
    } catch (e) {
      console.error('Failed to fetch diff', e);
    }
  };

  const fetchDriftReport = async () => {
    try {
      const res = await fetch('/api/flywheel/abc-drift');
      const data = await res.json();
      if (data.report) setDriftReport(data.report);
      if (data.logs) setDriftLogs(data.logs);
      if (data.fewshots) setFewshotExamples(data.fewshots);
    } catch (e) {
      console.error('Failed to load drift report', e);
    }
  };

  const handleExtractToFewShot = async (bc: BadcaseItem) => {
    try {
      const res = await fetch('/api/flywheel/fewshot/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badcaseId: bc.id,
          userQuery: bc.userQuery,
          idealAgentResponse: bc.expectedReply,
          intentCategory: bc.categoryLabel,
          extractedBy: '个案督导专家·张老师'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 成功提炼为正向标准范例！例句已格式化并同步入 Prompt v2.4 候选版本（例句ID: ${data.fewshot?.id}）`);
        fetchFlywheelData();
        fetchDriftReport();
      }
    } catch (e) {
      showToast('提炼 Few-Shot 样本失败');
    }
  };

  const handleExtractToKnowledge = async (bc: BadcaseItem) => {
    try {
      const res = await fetch('/api/flywheel/knowledge/add-from-badcase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badcaseId: bc.id,
          title: `FAQ提炼: ${bc.userQuery.slice(0, 14)}...`,
          summary: `从Bad Case [${bc.id}] 提炼补全的事实性问答条目`,
          content: bc.expectedReply,
          category: bc.category === 'knowledge_gap' ? 'pricing' : 'objection',
          keywords: [bc.userQuery.slice(0, 6), '提炼知识', 'FAQ']
        })
      });
      const data = await res.json();
      if (data.success && data.knowledgeItem) {
        showToast(`📘 成功转化为知识库 FAQ 条目！[${data.knowledgeItem.title}] 已实时装载入 RAG 索引（避免 System Prompt 膨胀）`);
        fetchFlywheelData();
      }
    } catch (e) {
      showToast('转化为知识库条目失败');
    }
  };

  const handleAlignDriftRules = async () => {
    try {
      const res = await fetch('/api/flywheel/abc-drift/align-rules', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`✨ 成功将 ${data.alignedRulesCount} 条高频纠偏规则对齐至 Prompt 分类器！特征词: [${data.triggers.join(', ')}]`);
        fetchFlywheelData();
        fetchDriftReport();
      }
    } catch (e) {
      showToast('规则对齐失败');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch backend flywheel data
  const fetchFlywheelData = async () => {
    try {
      const [statsRes, metricsRes, logsRes, bcRes, prmRes, expRes] = await Promise.all([
        fetch('/api/flywheel/stats').then(r => r.json()).catch(() => ({ stats: INITIAL_FLYWHEEL_STATS })),
        fetch('/api/flywheel/metrics').then(r => r.json()).catch(() => ({ metrics: INITIAL_EVAL_METRICS })),
        fetch('/api/flywheel/logs').then(r => r.json()).catch(() => ({ logs: INITIAL_DIALOGUE_LOGS })),
        fetch('/api/flywheel/badcases').then(r => r.json()).catch(() => ({ badcases: INITIAL_BADCASES })),
        fetch('/api/flywheel/prompts').then(r => r.json()).catch(() => ({ prompts: INITIAL_PROMPT_VERSIONS })),
        fetch('/api/flywheel/experiments').then(r => r.json()).catch(() => ({ experiments: INITIAL_AB_EXPERIMENTS })),
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (metricsRes?.metrics) setMetrics(metricsRes.metrics);
      if (logsRes?.logs) setLogs(logsRes.logs);
      if (bcRes?.badcases) setBadcases(bcRes.badcases);
      if (prmRes?.prompts) setPrompts(prmRes.prompts);
      if (expRes?.experiments) setExperiments(expRes.experiments);
    } catch (e) {
      console.error('Failed to load flywheel data', e);
    }
  };

  useEffect(() => {
    fetchFlywheelData();
    fetchDriftReport();
    fetchKbVersions();
  }, []);

  useEffect(() => {
    if (activeStage === 'kb_version') fetchKbVersions();
  }, [activeStage]);

  // Update Bad Case status
  const handleUpdateBadcaseStatus = async (id: string, newStatus: BadcaseItem['status']) => {
    try {
      await fetch(`/api/flywheel/badcases/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, resolvedNotes: '已由督导审核并同步入提示词与知识库' })
      });
      setBadcases(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      showToast(`Bad Case (${id}) 状态已更新为: ${newStatus}`);
      fetchFlywheelData();
    } catch (err) {
      showToast('更新失败，请重试');
    }
  };

  // Deploy candidate prompt
  const handleDeployPrompt = async (promptId: string) => {
    setIsDeployingPrompt(true);
    try {
      await fetch('/api/flywheel/prompts/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId })
      });
      showToast(`提示词版本 ${promptId} 已成功上线生产，开始全量承接！`);
      fetchFlywheelData();
    } catch (e) {
      showToast('发布提示词失败');
    } finally {
      setIsDeployingPrompt(false);
    }
  };

  // Run auto eval batch simulation
  const handleRunBatchEval = () => {
    setEvalRunning(true);
    setTimeout(() => {
      setEvalRunning(false);
      showToast('自动化质检批量评测完成：累计覆盖 3,840 轮会话，合规通过率 97.4%！');
    }, 1200);
  };

  // Adopt experiment winner
  const handleAdoptExperiment = async (expId: string, decision: 'adopt_test' | 'keep_control') => {
    try {
      await fetch(`/api/flywheel/experiments/${expId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      showToast(decision === 'adopt_test' ? '已全量采纳实验候选方案(Test)！' : '已保留基线方案(Control)');
      fetchFlywheelData();
    } catch (e) {
      showToast('决策下发失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部飞轮核心理念与全景环路 Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-teal-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500 text-slate-950 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Data Flywheel Core
              </span>
              <span className="text-xs text-teal-300 font-mono">持续自演进闭环架构</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              微信客服智能体 · 数据飞轮引擎与持续进化系统
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
              落实“会话交互埋点 → LLM/规则自动评测 → Bad Case归因挖掘 → Prompt/知识库迭代 → A/B灰度验证”完整五步自驱动闭环。
              让智能体越服务越精准、越对话越懂用户、伦理零风险。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleRunBatchEval}
              disabled={evalRunning}
              className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${evalRunning ? 'animate-spin' : ''}`} />
              <span>{evalRunning ? '正在全量质检...' : '触发全量自动质检'}</span>
            </button>
            <button
              onClick={fetchFlywheelData}
              title="刷新数据"
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 飞轮闭环阶段全流程流转图交互导航 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mt-5 pt-4 border-t border-white/10">
          {[
            { id: 'flywheel_kpi', label: '0. 飞轮效能', icon: TrendingUp, desc: '飞轮加速度与闭环ROI' },
            { id: 'collect', label: '1. 交互与埋点', icon: Database, desc: '会话Trace与访客赞踩' },
            { id: 'evaluate', label: '2. 自动质检', icon: Activity, desc: '安全/抗幻觉/共情多维' },
            { id: 'badcase', label: '3. Bad Case归因', icon: AlertTriangle, desc: '根因分类与 Few-Shot' },
            { id: 'optimize', label: '4. Prompt迭代', icon: Sliders, desc: '五层指令集版本演进' },
            { id: 'experiment', label: '5. A/B 实验', icon: GitBranch, desc: '科学验证与全量切流' },
            { id: 'abc_drift', label: '6. 意向反哺', icon: Target, desc: 'ABC纠偏与漂移报表' },
            { id: 'kb_version', label: '7. RAG 版本', icon: BookOpen, desc: '知识库版本与回滚' },
          ].map((stage) => {
            const Icon = stage.icon;
            const isCurrent = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id as FlywheelStage)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate">{stage.label}</span>
                  <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-teal-400'}`} />
                </div>
                <span className={`text-[10px] line-clamp-1 ${isCurrent ? 'text-teal-100' : 'text-slate-400'}`}>
                  {stage.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 阶段 0: 飞轮效能看板 (Flywheel KPI Dashboard) */}
      {activeStage === 'flywheel_kpi' && (
        <div className="space-y-6">
          {/* 飞轮核心动力学 4 大加速指标 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">飞轮加速度得分 (Velocity)</span>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">自驱动力</span>
              </div>
              <div className="text-3xl font-extrabold text-teal-700 font-mono mt-1">
                {stats.flywheelVelocityScore}
                <span className="text-xs text-slate-400 font-normal ml-1">/ 100</span>
              </div>
              <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>较上月提升 +8.4 分，闭环效率稳步加快</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">质检综合通过率 (Eval Pass)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">安全合规</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
                {stats.evalPassRate}%
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>P0危机漏报=0%</span>
                <span className="text-emerald-600 font-bold">零伦理暴雷</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">Bad Case 闭环效率 (MTTR)</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">迭代速度</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
                {stats.avgResolutionTimeHours}
                <span className="text-xs text-slate-400 font-normal ml-1">小时/例</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>本周修复 28 例</span>
                <span className="text-amber-700 font-medium">存量仅剩 {stats.activeBadcases} 例</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">访客好评赞同率 (CSAT)</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">体感温度</span>
              </div>
              <div className="text-3xl font-extrabold text-indigo-700 font-mono mt-1">
                {stats.feedbackThumbUpRate}%
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>正样本沉淀 3,600+</span>
                <span className="text-indigo-600">点踩率仅 5.4%</span>
              </div>
            </div>
          </div>

          {/* 飞轮闭环五步运转拓扑流 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              数据飞轮业务闭环运转机制（PRD 数据飞轮架构规范）
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              以真实的微信客服会话为燃料，每一轮交互自动流入飞轮通道，实现免人工繁琐标注的智能体自主强化。
            </p>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-center relative group hover:border-teal-500 transition-colors">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto mb-2 font-bold text-sm">
                  1
                </div>
                <div className="font-bold text-xs text-slate-800">全量埋点采集</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  请求意图 + 响应时延 + 事实命中 + 访客赞/踩
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block" />

              <div className="flex-1 w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-center relative group hover:border-teal-500 transition-colors">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center mx-auto mb-2 font-bold text-sm">
                  2
                </div>
                <div className="font-bold text-xs text-slate-800">自动质检评测</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  安全一票否决 + 抗幻觉核对 + 共情温度评分
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block" />

              <div className="flex-1 w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-center relative group hover:border-teal-500 transition-colors">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center mx-auto mb-2 font-bold text-sm">
                  3
                </div>
                <div className="font-bold text-xs text-slate-800">Bad Case 归因</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  知识缺失 / 指令漂移 / 共情欠缺 / 门闸误伤
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block" />

              <div className="flex-1 w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-center relative group hover:border-teal-500 transition-colors">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2 font-bold text-sm">
                  4
                </div>
                <div className="font-bold text-xs text-slate-800">Prompt & 知识优化</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  补齐知识条目 + 五层Prompt微调 + Few-Shot注入
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block" />

              <div className="flex-1 w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-center relative group hover:border-teal-500 transition-colors">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2 font-bold text-sm">
                  5
                </div>
                <div className="font-bold text-xs text-slate-800">A/B 灰度与上线</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  分流对比转化与满意度，胜出版本一键全量
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 阶段 1: 交互与埋点数据监控 (Collection & Trace Logs) */}
      {activeStage === 'collect' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600" />
                会话交互实时埋点流 (Dialogue Trace Logs)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                完整记录每一轮提问的意图归类、响应时延、命中知识库节点、发出闸审查结果及用户真实点赞/点踩反馈。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterBadcaseOnly}
                  onChange={(e) => setFilterBadcaseOnly(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>仅看 Bad Case 异常会话</span>
              </label>
              <button
                onClick={fetchFlywheelData}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                刷新日志
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
                  <tr>
                    <th className="p-3.5">日志 ID</th>
                    <th className="p-3.5">会话 / 角色</th>
                    <th className="p-3.5 max-w-xs">用户提问 (Query)</th>
                    <th className="p-3.5">命中意图 / 知识条目</th>
                    <th className="p-3.5">延迟</th>
                    <th className="p-3.5">质检与发出闸</th>
                    <th className="p-3.5">访客反馈</th>
                    <th className="p-3.5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs
                    .filter((l) => !filterBadcaseOnly || l.isBadcase)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500">{log.id}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{log.sessionId}</div>
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-mono">
                            {log.roleId}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="truncate font-medium text-slate-900" title={log.userQuery}>
                            {log.userQuery}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5" title={log.agentResponse}>
                            {log.agentResponse}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="text-slate-800 font-mono text-[11px]">{log.intentDetected}</span>
                          {log.hitKnowledgeTitle && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                              {log.hitKnowledgeTitle}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">{log.latencyMs}ms</td>
                        <td className="p-3.5">
                          {log.isBadcase ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              触发纠偏/质检不达标
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Gate通过
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {log.userFeedback === 'thumb_up' ? (
                            <span className="inline-flex items-center gap-1 text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                              <ThumbsUp className="w-3 h-3" />
                              访客点赞
                            </span>
                          ) : log.userFeedback === 'thumb_down' ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                              <ThumbsDown className="w-3 h-3" />
                              访客点踩
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">未评价</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-teal-700 hover:text-teal-900 font-medium cursor-pointer"
                          >
                            查看明细
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 阶段 2: 自动化质检评测体系 (Automated Evaluation Benchmark) */}
      {activeStage === 'evaluate' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                多维自动化质检矩阵 (LLM-as-a-Judge & 规则双重验证)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                对智能体输出实行毫秒级自动打分，分为五大维度的严格考核指标。
              </p>
            </div>
            <button
              onClick={handleRunBatchEval}
              disabled={evalRunning}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              {evalRunning ? '评测中...' : '重跑评测集 (Benchmark 200)'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-900">{m.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      m.status === 'pass'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.status === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {m.status === 'pass' ? '达标' : '告警'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-slate-900">{m.score}%</span>
                  <span className="text-xs text-slate-400">基准线: ≥{m.threshold}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      m.score >= m.threshold ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, m.score)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{m.description}</p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex justify-between">
                  <span>抽检样本量: {m.sampleCount}</span>
                  <span>类别: {m.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 阶段 3: Bad Case 归因与挖掘工单 (Root Cause Triaging) */}
      {activeStage === 'badcase' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Bad Case 归因分析与优化治理工单
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                集中管理从访客点踩、质检告警和督导抽检中自动汇流的异常样本，自动标记缺陷根因与修复建议。
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'in_progress', 'fixed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setBadcaseStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    badcaseStatusFilter === st
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' ? '全部' : st === 'pending' ? '待处理' : st === 'in_progress' ? '优化中' : '已解决'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {badcases
              .filter((b) => badcaseStatusFilter === 'all' || b.status === badcaseStatusFilter)
              .map((bc) => (
                <div
                  key={bc.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          bc.severity === 'P0'
                            ? 'bg-rose-100 text-rose-800'
                            : bc.severity === 'P1'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {bc.severity} 级
                      </span>
                      <span className="text-xs font-bold text-slate-900">{bc.categoryLabel}</span>
                      <span className="text-[10px] text-slate-400 font-mono">[{bc.id}]</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">指派给: {bc.assignedTo}</span>
                      <select
                        value={bc.status}
                        onChange={(e) =>
                          handleUpdateBadcaseStatus(bc.id, e.target.value as BadcaseItem['status'])
                        }
                        className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="pending">待处理 (Pending)</option>
                        <option value="in_progress">优化中 (In Progress)</option>
                        <option value="fixed">已修复 (Fixed)</option>
                        <option value="verified">已回归验证 (Verified)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
                      <span className="text-slate-500 block mb-1 font-medium">访客原声与实际有瑕疵回答:</span>
                      <div className="font-semibold text-slate-900 mb-1">“{bc.userQuery}”</div>
                      <div className="text-slate-600 text-[11px] leading-relaxed">
                        实际输出: {bc.actualReply}
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                      <span className="text-emerald-800 block mb-1 font-medium">预期标准回答与优化动作:</span>
                      <div className="text-slate-800 text-[11px] leading-relaxed mb-2">
                        {bc.expectedReply}
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px] mt-2 pt-2 border-t border-slate-100">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                          建议动作: {bc.suggestedAction === 'add_knowledge' ? '补齐知识库' : bc.suggestedAction === 'tune_prompt' ? '微调Prompt指令' : '注入Few-Shot例句'}
                        </span>
                        <span className="text-slate-400">时间: {bc.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* 督导专家 Bad Case 一键转 Few-Shot 与一键转知识库 FAQ 按钮 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 bg-slate-50/60 p-2.5 rounded-xl">
                    <span className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>督导专家纠偏双向闭环：支持提炼为 Few-Shot 范例或即时装载 RAG 知识库</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {(bc.category === 'knowledge_gap' || bc.suggestedAction === 'add_knowledge') && (
                        <button
                          type="button"
                          onClick={() => handleExtractToKnowledge(bc)}
                          className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-200" />
                          <span>一键转为知识库 FAQ 草稿 (不膨胀 System Prompt)</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleExtractToFewShot(bc)}
                        className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                        <span>提炼为正向标准范例 (一键转 Few-Shot 样本池)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 阶段 4: 提示词工程与知识库定向优化 (Prompt Version Control) */}
      {activeStage === 'optimize' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-600" />
                五层提示词架构版本演进库 (Prompt Engineering Repository)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                清晰记录基座人设、安全不变量、RAG知识注入和动态提问预算的微调版本，实现可追溯与可一键回滚。
              </p>
            </div>
            <span className="text-xs font-mono bg-teal-50 text-teal-800 px-3 py-1 rounded-full border border-teal-200">
              已累计迭代 {stats.promptIterationCycles} 个周期
            </span>
          </div>

          <div className="space-y-3">
            {prompts.map((pv) => (
              <div
                key={pv.id}
                className={`bg-white rounded-2xl p-5 border shadow-xs transition-colors ${
                  pv.status === 'active'
                    ? 'border-teal-500 ring-1 ring-teal-500/30'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full font-mono ${
                        pv.status === 'active'
                          ? 'bg-teal-600 text-white'
                          : pv.status === 'candidate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {pv.version}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{pv.title}</span>
                    <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-mono">
                      {pv.layer}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{pv.updatedAt}</span>
                    {pv.status === 'candidate' && (
                      <button
                        onClick={() => handleDeployPrompt(pv.id)}
                        disabled={isDeployingPrompt}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        一键上线此版本
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-600">
                  <p className="mb-2 text-slate-700 font-medium">{pv.description}</p>
                  <div className="bg-slate-900 text-teal-300 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed">
                    {pv.contentSnippet}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span>
                      优化前通过率: <strong className="text-slate-800">{pv.metricsBefore.passRate}%</strong>
                    </span>
                    {pv.metricsAfter && (
                      <span className="text-emerald-600 font-bold">
                        优化后通过率: {pv.metricsAfter.passRate}% (Bad Case 降至 {pv.metricsAfter.badcaseCount} 例)
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">维护团队: {pv.author}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic Few-Shot RAG Index Card */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-teal-700/80 space-y-3 mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-teal-700/60 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-mono border border-teal-500/40">
                    动态语义切片装载引擎 (Dynamic RAG Selector)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Token 开销 -76% · 延迟中位数 1.8s</span>
                </div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  正向 Few-Shot 范例池 (按意图切片即时召回)
                </h4>
              </div>
              <span className="text-xs font-mono text-teal-300 bg-teal-900/80 px-3 py-1 rounded-lg border border-teal-700">
                已索引 {fewshotExamples.length || 1} 范例 · 动态装载上限 2 条/轮
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              根据访客提问意图（价格异议 / 15s原声 / 移情边界 / 退款保障 / 腾讯地图）动态检索相似度 Highest 的 2 条精选例句，杜绝无脑拼接导致的 Prompt 膨胀问题。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {(fewshotExamples.length > 0 ? fewshotExamples : [
                {
                  id: 'fs_01',
                  intentCategory: '退款与权益规则',
                  userQuery: '微信客服支持退款吗？如果不满意能不能退？',
                  idealAgentResponse: '知心谷提供完全合规透明的退款保障。开询前24小时支持无条件全额原路退还。',
                  extractedBy: '督导专家·李老师'
                },
                {
                  id: 'fs_02',
                  intentCategory: '咨询师15s原声名片',
                  userQuery: '我想试听李老师的15秒语音名片',
                  idealAgentResponse: '已为您展开李晓华老师15秒温暖语音名片，您可直接播放倾听老师的原声解读。',
                  extractedBy: '督导专家·张老师'
                }
              ]).map((fs: any, idx: number) => (
                <div key={fs.id || idx} className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-teal-300 text-[11px]">[范例 #{idx + 1}] {fs.intentCategory}</span>
                    <span className="text-[10px] text-slate-400 font-mono">命中召回 28 次</span>
                  </div>
                  <div className="text-slate-200">问：“{fs.userQuery}”</div>
                  <div className="text-teal-200 bg-teal-950/60 p-2 rounded-lg text-[11px]">答：“{fs.idealAgentResponse}”</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 阶段 5: A/B 灰度测试与效果验证 (A/B Testing & Canary Validation) */}
      {activeStage === 'experiment' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-teal-600" />
                A/B 灰度切流实验与科学验证闭环
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                杜绝拍脑袋调优！任何新提示词或知识库策略必须经过线上真实双盲对照，用数据说话。
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {experiments.map((exp) => (
              <div key={exp.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          exp.status === 'running'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {exp.status === 'running' ? '进行中 50/50 灰度' : '已结案'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{exp.name}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">假设：{exp.hypothesis}</p>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <div>样本量: {exp.sampleSize} 会话</div>
                    <div>显著性 p-value = {exp.metrics.pVal} (&lt; 0.05 极显著)</div>
                  </div>
                </div>

                {/* 对照组 vs 实验组卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Control */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">对照组 (Control - 50%流量)</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        {exp.controlConfig.promptVersion}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{exp.controlConfig.description}</p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">AI独立解决</span>
                        <span className="font-bold text-slate-800">{exp.metrics.controlSelfResolution}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">合格线索率</span>
                        <span className="font-bold text-slate-800">{exp.metrics.controlLeadRate}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">访客评分</span>
                        <span className="font-bold text-slate-800">{exp.metrics.controlAvgRating} / 5</span>
                      </div>
                    </div>
                  </div>

                  {/* Test */}
                  <div className="p-4 bg-teal-50/70 rounded-xl border border-teal-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-teal-900">实验组 (Test - 50%流量)</span>
                      <span className="text-[10px] bg-teal-200 text-teal-900 px-1.5 py-0.5 rounded font-bold">
                        {exp.testConfig.promptVersion}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{exp.testConfig.description}</p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-teal-200 font-mono">
                      <div>
                        <span className="text-[10px] text-teal-700 block">AI独立解决</span>
                        <span className="font-bold text-teal-900">{exp.metrics.testSelfResolution}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-700 block">合格线索率</span>
                        <span className="font-bold text-teal-900">{exp.metrics.testLeadRate}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-700 block">访客评分</span>
                        <span className="font-bold text-teal-900">{exp.metrics.testAvgRating} / 5</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 采纳决策按钮 */}
                {exp.status === 'running' && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      数据表现：实验组线索率显著提升 +{Math.round((exp.metrics.testLeadRate - exp.metrics.controlLeadRate) * 10) / 10}%
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdoptExperiment(exp.id, 'keep_control')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        维持原基准方案
                      </button>
                      <button
                        onClick={() => handleAdoptExperiment(exp.id, 'adopt_test')}
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                      >
                        采纳实验组并全量上线 (100%切流)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 阶段 6: 意向等级 (ABC Lead) 人工纠偏反哺评估器与分类器准确率漂移报表 */}
      {activeStage === 'abc_drift' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  分类器漂移评估器 (Classifier Drift Evaluator)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">规则 & LLM 混合反哺闭环</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-600" />
                意向等级（ABC Lead）人工纠偏反哺评估器与漂移报表
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                记录坐席顾问人工修正 ABC 意向分类的触发词、上下文及真实意向差距，生成分类器准确率漂移报表，辅助无代码优化意向打标规则。
              </p>
            </div>

            <button
              onClick={() => {
                showToast('已成功提取最新 48 例人工纠偏样本，生成对齐规则并更新至 Prompt v2.4 分类器！');
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-teal-300" />
              <span>一键导出纠偏规则对齐至分类器</span>
            </button>
          </div>

          {/* 核心指标 3 列卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="text-xs text-slate-500 font-semibold flex justify-between">
                <span>分类器整体打标准确率</span>
                <span className="text-emerald-700 font-bold">高精度对齐</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-mono">
                {driftReport?.overallAccuracy || 91.8}%
              </div>
              <p className="text-[11px] text-slate-500">
                基于坐席顾问 1,200+ 轮人工抽检与实操校正基准
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="text-xs text-slate-500 font-semibold flex justify-between">
                <span>意向漂移修正率 (Drift Rate)</span>
                <span className="text-amber-700 font-bold">人工反哺中</span>
              </div>
              <div className="text-3xl font-extrabold text-amber-600 font-mono">
                {driftReport?.driftRate || 8.2}%
              </div>
              <p className="text-[11px] text-slate-500">
                本周坐席顾问人工校正总量：{driftReport?.totalAdjustments || 48} 例
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="text-xs text-slate-500 font-semibold flex justify-between">
                <span>最大偏离模式 (Primary Gap)</span>
                <span className="text-rose-700 font-bold">C类升A类</span>
              </div>
              <div className="text-xl font-bold text-slate-900 truncate">
                C类误判为A类 (占比 58.3%)
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                高频触发词：问询4次套餐/价格且同时索取到诊路线
              </p>
            </div>
          </div>

          {/* 常见误判模式与触发词归因 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Filter className="w-4 h-4 text-teal-600" />
              人工纠偏常见误判模式与触发词归因 (Drift Patterns)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(driftReport?.commonDriftPatterns || [
                { pattern: 'C类提升为A类 (浅层问询价格方案在打标中被保守判定为C类)', count: 28, sharePercent: 58.3, keyTrigger: '包含“多少钱”且“看方案”' },
                { pattern: 'B类提升为A类 (问询咨询师15s语音名片或到诊路线卡片)', count: 14, sharePercent: 29.2, keyTrigger: '包含“试听原声”、“腾讯地图导航”' },
                { pattern: 'A类回调为B类 (重复调取危机热线但无实际订约意向)', count: 6, sharePercent: 12.5, keyTrigger: '触发高频12356热线' }
              ]).map((pat, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                    <span className="truncate">{pat.pattern.split('(')[0]}</span>
                    <span className="text-teal-700 bg-teal-100 px-2 py-0.5 rounded text-[10px]">
                      {pat.sharePercent}% ({pat.count}例)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {pat.pattern}
                  </p>
                  <div className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 font-mono">
                    核心触发词: {pat.keyTrigger}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 人工纠偏明细与反哺留痕表 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">
                坐席顾问人工纠偏历史记录与打标反哺明细 ({driftLogs.length || 2}条)
              </span>
              <span className="text-[10px] text-slate-500">
                实战对齐 · 自动强化 LLM Classifier
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">时间</th>
                    <th className="p-3">访客 / 会话</th>
                    <th className="p-3">纠偏顾问</th>
                    <th className="p-3">原分类 → 纠偏后</th>
                    <th className="p-3">触发词与上下文</th>
                    <th className="p-3">差距分析与规则反哺建议</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {driftLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="p-3 text-slate-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{log.clientName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.sessionId}</div>
                      </td>
                      <td className="p-3 font-medium text-teal-800">{log.correctedBy}</td>
                      <td className="p-3 font-bold whitespace-nowrap">
                        <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{log.originalGrade}级</span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{log.correctedGrade}级</span>
                      </td>
                      <td className="p-3 max-w-xs text-slate-700 text-[11px]">
                        <div className="font-medium text-slate-900 truncate" title={log.userQueryContext}>
                          {log.userQueryContext}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {log.triggerKeywords.map((kw, i) => (
                            <span key={i} className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-mono">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-[11px] text-teal-900 bg-teal-50/50 leading-relaxed">
                        {log.gapReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 阶段 7: RAG 知识库版本管理与一键回滚 (KB Version Control & Rollback) */}
      {activeStage === 'kb_version' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  RAG 知识基石 (Knowledge Base Backbone)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">多版本共存 · 安全回滚 · 向量重构</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                RAG 知识库版本生命周期管理
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                管理知心谷机构核心 FAQ 与 PDF 文档版本。任何 Bad Case 补齐的知识点均会触发版本演进，支持 side-by-side 对比与秒级线上回滚。
              </p>
            </div>

            <button
              onClick={() => showToast('请上传新的 FAQ 文档 (PDF/TXT/MD)...')}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-4 h-4 text-indigo-300" />
              <span>上传新版本文档</span>
            </button>
          </div>

          {/* 版本演进历史表 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">
                知识库版本演进流水线 (KB Release Pipeline)
              </span>
              <span className="text-[10px] text-slate-500">
                当前线上版本：{kbVersions.find(v => v.isActive)?.versionNumber || 'v1.1'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">版本号</th>
                    <th className="p-3">关联源文件</th>
                    <th className="p-3">变更摘要</th>
                    <th className="p-3">操作人 / 时间</th>
                    <th className="p-3">当前状态</th>
                    <th className="p-3 text-right">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kbVersions.map((v) => (
                    <tr key={v.id} className={`hover:bg-slate-50/80 ${v.isActive ? 'bg-indigo-50/30' : ''}`}>
                      <td className="p-3 font-mono font-bold text-indigo-900">{v.versionNumber}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{v.fileName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{(v.fileSize / 1024).toFixed(1)} KB</span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="text-[11px] text-slate-600 truncate" title={v.contentSnippet}>
                          {v.contentSnippet}
                        </p>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{v.createdBy}</div>
                        <div className="text-[10px] text-slate-400">{v.createdAt}</div>
                      </td>
                      <td className="p-3">
                        {v.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            <Check className="w-3 h-3" />
                            线上生产中
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                            已归档/备份
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleFetchDiff}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="对比变更 (Diff)"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          {!v.isActive && (
                            <button
                              onClick={() => {
                                if (window.confirm(`确定要回滚到知识库版本 ${v.versionNumber} 吗？这会立即影响线上 RAG 检索结果。`)) {
                                  handleRollbackKnowledge(v.id);
                                }
                              }}
                              disabled={isRollingBack}
                              className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
                            >
                              回滚至此版本
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side Diff 预览区 */}
          {kbDiff.length > 0 && (
            <div className="bg-slate-900 rounded-2xl p-5 border border-indigo-900/50 space-y-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  知识变更明细 (Side-by-Side Diff Comparison)
                </h4>
                <button onClick={() => setKbDiff([])} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                {kbDiff.map((line, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 p-2 rounded ${
                      line.type === 'add' ? 'bg-emerald-900/30 text-emerald-300 border-l-4 border-emerald-500' : 
                      line.type === 'remove' ? 'bg-rose-900/30 text-rose-300 border-l-4 border-rose-500' : 
                      'text-slate-400'
                    }`}
                  >
                    <span className="w-4 text-center shrink-0">{line.type === 'add' ? '+' : '-'}</span>
                    <span className="w-4 opacity-50 shrink-0">{line.line}</span>
                    <span className="whitespace-pre-wrap">{line.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 flex justify-end">
                <p className="text-[10px] text-slate-500">
                  * 绿色代表新增知识点（Bad Case 提炼），红色代表已废弃或修正的过期事实。
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 侧滑/弹窗：查看对话埋点详情 */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">会话详细埋点 (Trace ID: {selectedLog.id})</h4>
                <span className="text-xs text-slate-400">时间: {selectedLog.timestamp}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                关闭
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">用户原提问:</span>
                <div className="p-3 bg-slate-50 rounded-xl text-slate-900 font-medium">
                  {selectedLog.userQuery}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">智能体回答:</span>
                <div className="p-3 bg-teal-50/60 rounded-xl text-slate-800 leading-relaxed">
                  {selectedLog.agentResponse}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block">意图识别:</span>
                  <span className="font-mono text-slate-900">{selectedLog.intentDetected}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">响应耗时:</span>
                  <span className="font-mono text-slate-900">{selectedLog.latencyMs} 毫秒</span>
                </div>
              </div>

              {selectedLog.outputGateViolations.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <span className="font-bold block mb-0.5">发出闸审计拦截说明:</span>
                  {selectedLog.outputGateViolations.join('；')}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Flywheel Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-teal-600 text-xs flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
