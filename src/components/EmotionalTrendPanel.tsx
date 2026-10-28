/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldAlert,
  Heart,
  Zap,
  Info,
  Clock,
  UserCheck,
  BarChart2,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { SessionData, ChatMessage } from '../types';

export interface EmotionTurnData {
  turn: number;
  score: number;
  emotionTag: string;
  textSnippet: string;
  time: string;
  trend: 'up' | 'down' | 'same';
}

export interface EmotionalAnalysisResult {
  currentStressScore: number;
  stressLevel: 'critical' | 'high' | 'moderate' | 'low';
  trendDirection: 'rising' | 'falling' | 'stable';
  trendChange: number;
  isHighAttention: boolean;
  levelLabel: string;
  levelColor: {
    bg: string;
    text: string;
    border: string;
    ring: string;
    badge: string;
  };
  turnHistory: EmotionTurnData[];
  stressTags: string[];
  interventionTip: string;
  transferenceDetected: boolean;
  isCrisisActive: boolean;
}

/**
 * 访客情绪压力与时序情感趋势分析引擎
 */
export function analyzeEmotionalTrend(session: SessionData): EmotionalAnalysisResult {
  const userMessages = (session.messages || []).filter(m => m.sender === 'user');
  const isCrisisActive = Boolean(session.isCrisisLocked || session.crisisAssessment);
  const transferenceDetected = Boolean(
    session.attachmentSignals?.detected ||
    session.workingMemory?.isAttachmentDetected
  );

  // 1. 如果没有用户发言，根据会话初始状态设定基线
  if (userMessages.length === 0) {
    let baseScore = 30;
    if (session.emotionalState === 'crisis') baseScore = 95;
    else if (session.emotionalState === 'distressed') baseScore = 75;
    else if (session.emotionalState === 'anxious') baseScore = 60;
    else if (session.emotionalState === 'depressed') baseScore = 55;

    const isHigh = baseScore >= 65 || isCrisisActive;
    return {
      currentStressScore: baseScore,
      stressLevel: baseScore >= 85 ? 'critical' : baseScore >= 65 ? 'high' : baseScore >= 40 ? 'moderate' : 'low',
      trendDirection: 'stable',
      trendChange: 0,
      isHighAttention: isHigh,
      levelLabel: isCrisisActive ? '危机生命守护' : isHigh ? '高关注访客' : baseScore >= 40 ? '中度负荷' : '平稳接访',
      levelColor: getLevelColor(baseScore >= 85 ? 'critical' : baseScore >= 65 ? 'high' : baseScore >= 40 ? 'moderate' : 'low'),
      turnHistory: [{
        turn: 1,
        score: baseScore,
        emotionTag: '初始会话接入',
        textSnippet: session.primaryIssue || '访客正在接入...',
        time: session.startTime || '10:00',
        trend: 'same'
      }],
      stressTags: [session.primaryIssue || '初访接入', '情绪待探索'],
      interventionTip: '新访客初次接入，建议以专业温暖的态度倾听，先共情澄清需求，严格非询不推。',
      transferenceDetected: false,
      isCrisisActive,
    };
  }

  // 2. 逐轮计算用户消息的情绪压力打分
  const turnScores: EmotionTurnData[] = [];
  const extractedTags = new Set<string>();

  userMessages.forEach((msg, idx) => {
    const text = msg.content || '';
    let score = 35; // 默认中平基准
    let tag = '常规咨询';

    // 危机与即刻致命词汇
    if (/(吃了药|吞药|在流血|割腕|在天台|准备跳|拿了刀|马上就死|救救我|救我|想自杀|不想活|活不下去了|老是想死|结束生命)/.test(text)) {
      score = 98;
      tag = '生命危机信号';
      extractedTags.add('生命危机防线');
    }
    // 移情与过度依恋
    else if (/(只有你懂我|离不开你|做我女朋友|做我男朋友|爱上你|喜欢你|唯一的依靠|不要丢下我|我想一直和你|只有你关心我)/.test(text)) {
      score = 82;
      tag = '强烈情感寄托/移情';
      extractedTags.add('人机移情依恋');
    }
    // 重度心身耗竭与情绪崩溃
    else if (/(崩溃|撑不住|快撑不下去|绝望|痛哭|难受死了|受不了了|窒息|整夜失眠|心力交瘁|无法呼吸|极其痛苦)/.test(text)) {
      score = 85;
      tag = '重度身心崩溃';
      extractedTags.add('重度身心耗竭');
      extractedTags.add('急性焦虑/失眠');
    }
    // 中重度负面情绪 (焦虑/抑郁/难过/失眠/压力大)
    else if (/(难受|焦虑|失眠|睡不着|压力大|心慌|压抑|烦躁|心累|好累|好烦|无助|孤独|迷茫|委屈|吵架|分手|离婚)/.test(text)) {
      score = 65;
      tag = '焦虑与心身压力';
      extractedTags.add('焦虑情绪');
      if (text.includes('失眠') || text.includes('睡不着')) extractedTags.add('深度失眠困扰');
      if (text.includes('工作') || text.includes('加班') || text.includes('老板')) extractedTags.add('职场倦怠高压');
      if (text.includes('感情') || text.includes('吵架') || text.includes('分手')) extractedTags.add('亲密关系困扰');
    }
    // 纠结/自责/轻度内耗
    else if (/(自卑|自责|内耗|纠结|犹豫|敏感|烦心|提不起劲|不知所措|自我否定)/.test(text)) {
      score = 50;
      tag = '自我内耗与纠结';
      extractedTags.add('自我探索与内耗');
    }
    // 舒缓/认同/平静反馈
    else if (/(好多了|平静|放松|答应你|拉钩|谢谢|明白了|喝了温水|稍微好点|听你的|有道理)/.test(text)) {
      score = 25;
      tag = '情绪逐步舒缓';
      extractedTags.add('信任建立与舒缓');
    }
    // 业务/咨询/流程问询
    else if (/(多少钱|价格|费用|收费|时长|地址|发票|开药|保密|李老师|预约|微信支付)/.test(text)) {
      score = 30;
      tag = '理性服务问询';
      extractedTags.add('咨询方案评估');
    }

    // 危机模式下保底加权
    if (isCrisisActive && score < 75) {
      score = Math.max(score, 75);
    }

    const prevScore = turnScores.length > 0 ? turnScores[turnScores.length - 1].score : score;
    const trend: 'up' | 'down' | 'same' = score > prevScore + 3 ? 'up' : score < prevScore - 3 ? 'down' : 'same';

    turnScores.push({
      turn: idx + 1,
      score,
      emotionTag: tag,
      textSnippet: text.length > 24 ? text.slice(0, 24) + '...' : text,
      time: msg.timestamp || '10:00',
      trend,
    });
  });

  // 3. 综合当轮压力值与走势 (结合最近2轮平滑)
  const lastTurn = turnScores[turnScores.length - 1];
  const secondLastTurn = turnScores.length > 1 ? turnScores[turnScores.length - 2] : null;

  let currentStressScore = lastTurn ? lastTurn.score : 35;
  if (secondLastTurn) {
    // 最近一轮权重 70%，上一轮权重 30%
    currentStressScore = Math.round(lastTurn.score * 0.7 + secondLastTurn.score * 0.3);
  }

  if (isCrisisActive) {
    currentStressScore = Math.max(currentStressScore, 92);
  } else if (transferenceDetected) {
    currentStressScore = Math.max(currentStressScore, 75);
  }

  // 趋势方向
  let trendChange = 0;
  let trendDirection: 'rising' | 'falling' | 'stable' = 'stable';
  if (secondLastTurn) {
    trendChange = lastTurn.score - secondLastTurn.score;
    if (trendChange > 4) trendDirection = 'rising';
    else if (trendChange < -4) trendDirection = 'falling';
  }

  // 压力等级判定
  let stressLevel: 'critical' | 'high' | 'moderate' | 'low' = 'low';
  let levelLabel = '情绪平稳探索';
  if (currentStressScore >= 85 || isCrisisActive) {
    stressLevel = 'critical';
    levelLabel = '高危生命关注';
  } else if (currentStressScore >= 65 || transferenceDetected) {
    stressLevel = 'high';
    levelLabel = '高关注访客 · 重点倾听';
  } else if (currentStressScore >= 40) {
    stressLevel = 'moderate';
    levelLabel = '中度心身负荷';
  } else {
    stressLevel = 'low';
    levelLabel = '常态咨询探索';
  }

  const isHighAttention = stressLevel === 'critical' || stressLevel === 'high';

  // 建议话术与干预指引
  let interventionTip = '访客情绪平稳，可根据其主诉客观介绍首次评估访谈（400元/50分）或咨询师流派匹配。';
  if (isCrisisActive) {
    interventionTip = '【高危警戒】：生命安全为绝对第一红线！严格遵守四步危机评估SOP，提供12356免费热线，严禁任何商业推销，保持在岗督导在线守护。';
  } else if (transferenceDetected) {
    interventionTip = '【移情依恋红线】：访客出现对AI的情感寄托。必须温和重申技术边界：“我是一个AI助手，能够随时陪伴您倾听与梳理，但深度的生命联结与心理疗愈需要真实的现实人际与专业咨询师共同完成”。';
  } else if (stressLevel === 'high' && trendDirection === 'rising') {
    interventionTip = '【高关注提示】：访客当前情绪压力处于攀升态，心身防御较弱。建议第一要务给予深度接纳与情绪命名，暂缓推进付费方案，以温和开放式提问梳理压力根源。';
  } else if (stressLevel === 'high' && trendDirection === 'falling') {
    interventionTip = '【情绪转机】：经AI温和共情，访客情绪出现明显舒缓回落。可适度探讨其现实应对资源，或引荐擅长CBT/EFT的李晓华老师进行4次短程梳理。';
  } else if (stressLevel === 'moderate') {
    interventionTip = '访客存在一定的工作/生活心理消耗，正在建立信任。保持非询不推，耐心解答咨询流程、保密守则与费用规范。';
  }

  return {
    currentStressScore,
    stressLevel,
    trendDirection,
    trendChange,
    isHighAttention,
    levelLabel,
    levelColor: getLevelColor(stressLevel),
    turnHistory: turnScores,
    stressTags: Array.from(extractedTags),
    interventionTip,
    transferenceDetected,
    isCrisisActive,
  };
}

function getLevelColor(level: 'critical' | 'high' | 'moderate' | 'low') {
  switch (level) {
    case 'critical':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-300',
        ring: 'ring-rose-500',
        badge: 'bg-rose-600 text-white',
      };
    case 'high':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        ring: 'ring-amber-500',
        badge: 'bg-amber-600 text-white',
      };
    case 'moderate':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        border: 'border-sky-200',
        ring: 'ring-sky-400',
        badge: 'bg-sky-600 text-white',
      };
    case 'low':
    default:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        ring: 'ring-emerald-400',
        badge: 'bg-emerald-600 text-white',
      };
  }
}

interface EmotionalTrendPanelProps {
  session: SessionData;
  onTakeoverToggle?: (isTakenOver: boolean) => void;
  onOpenAssessment?: () => void;
  onOpenBooking?: () => void;
  onClose?: () => void;
  isCompact?: boolean;
}

export const EmotionalTrendPanel: React.FC<EmotionalTrendPanelProps> = ({
  session,
  onTakeoverToggle,
  onOpenAssessment,
  onOpenBooking,
  onClose,
  isCompact = false,
}) => {
  const analysis = useMemo(() => analyzeEmotionalTrend(session), [session]);

  return (
    <div className={`bg-white rounded-2xl border ${analysis.levelColor.border} shadow-sm overflow-hidden flex flex-col ${isCompact ? 'p-3' : 'p-4 sm:p-5'} transition-all`}>
      {/* 顶部标题与高关注指示 */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className={`w-3 h-3 rounded-full ${analysis.stressLevel === 'critical' ? 'bg-rose-500 animate-ping' : analysis.stressLevel === 'high' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className={`absolute w-2 h-2 rounded-full ${analysis.stressLevel === 'critical' ? 'bg-rose-600' : analysis.stressLevel === 'high' ? 'bg-amber-600' : 'bg-emerald-600'}`} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>实时情感趋势与心身压力</span>
              {analysis.isHighAttention && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200 animate-pulse">
                  高关注访客
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500">
              基于微信对话流实时多轮语义与心理学特征分析
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="收起趋势面板"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 核心仪表卡片：当前压力数值与走势 */}
      <div className={`mt-3 p-3 sm:p-3.5 rounded-xl ${analysis.levelColor.bg} border ${analysis.levelColor.border}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-600">当前综合情绪压力指数</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black ${analysis.levelColor.text} font-mono tracking-tight`}>
                {analysis.currentStressScore}
              </span>
              <span className="text-xs text-slate-400 font-normal">/ 100</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${analysis.levelColor.badge}`}>
                {analysis.levelLabel}
              </span>
            </div>
          </div>

          {/* 趋势方向指示 */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end font-semibold text-xs">
              {analysis.trendDirection === 'rising' && (
                <span className="text-rose-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>压力攀升</span>
                  {analysis.trendChange > 0 && <span className="text-[10px]">(+{analysis.trendChange})</span>}
                </span>
              )}
              {analysis.trendDirection === 'falling' && (
                <span className="text-emerald-700 flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>持续舒缓</span>
                  {analysis.trendChange < 0 && <span className="text-[10px]">({analysis.trendChange})</span>}
                </span>
              )}
              {analysis.trendDirection === 'stable' && (
                <span className="text-slate-500 flex items-center gap-0.5">
                  <Minus className="w-3.5 h-3.5" />
                  <span>波动平稳</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              对比上轮变动
            </span>
          </div>
        </div>

        {/* 压力可视化进度条 */}
        <div className="mt-2.5">
          <div className="w-full bg-white/80 rounded-full h-2 overflow-hidden shadow-inner flex">
            <div
              className={`h-full transition-all duration-500 ${
                analysis.currentStressScore >= 85
                  ? 'bg-rose-500'
                  : analysis.currentStressScore >= 65
                  ? 'bg-amber-500'
                  : analysis.currentStressScore >= 40
                  ? 'bg-sky-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, analysis.currentStressScore))}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>平和稳定 (0)</span>
            <span>中度负荷 (40)</span>
            <span>高关注 (65)</span>
            <span>危机红线 (85-100)</span>
          </div>
        </div>
      </div>

      {/* 心理特征标签 */}
      {analysis.stressTags.length > 0 && (
        <div className="mt-3">
          <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
            识别心身困扰特征：
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.stressTags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium border border-slate-200 transition-colors"
              >
                #{tag}
              </span>
            ))}
            {analysis.transferenceDetected && (
              <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold border border-indigo-200 flex items-center gap-1">
                <Heart className="w-2.5 h-2.5 text-indigo-500" />
                <span>移情依恋重申中</span>
              </span>
            )}
            {analysis.isCrisisActive && (
              <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md font-bold border border-rose-200 flex items-center gap-1 animate-pulse">
                <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                <span>危机守护闭环开启</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 时序情感波动轨迹 (Turn-by-Turn Timeline) */}
      <div className="mt-3.5 flex-1 overflow-y-auto max-h-52 pr-1 scrollbar-thin">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-2">
          <span>逐轮情绪压力演变轨迹:</span>
          <span className="text-[10px] text-slate-400">共 {analysis.turnHistory.length} 轮访客发言</span>
        </div>

        <div className="space-y-2">
          {analysis.turnHistory.map((item) => (
            <div
              key={item.turn}
              className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-colors text-xs flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {item.turn}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 text-[11px]">
                      {item.emotionTag}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    “{item.textSnippet}”
                  </p>
                </div>
              </div>

              {/* 右侧分数柱条 */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      item.score >= 85
                        ? 'bg-rose-500'
                        : item.score >= 65
                        ? 'bg-amber-500'
                        : item.score >= 40
                        ? 'bg-sky-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-700 w-6 text-right">
                  {item.score}
                </span>
                {item.trend === 'up' && <TrendingUp className="w-3 h-3 text-rose-500" />}
                {item.trend === 'down' && <TrendingDown className="w-3 h-3 text-emerald-600" />}
                {item.trend === 'same' && <Minus className="w-3 h-3 text-slate-300" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 客服 / 咨询师干预建议 */}
      <div className="mt-3.5 pt-3 border-t border-slate-100">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/90 text-xs text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>智能接待与心理关怀要点建议</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {analysis.interventionTip}
          </p>
        </div>

        {/* 快速协作按钮 */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          {onTakeoverToggle && (
            <button
              onClick={() => onTakeoverToggle(!session.isTakenOverByHuman)}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                session.isTakenOverByHuman
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{session.isTakenOverByHuman ? '退出真人接管' : '人工直接接入'}</span>
            </button>
          )}

          {onOpenBooking && (
            <button
              onClick={onOpenBooking}
              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>预约排期</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
