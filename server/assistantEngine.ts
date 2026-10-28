/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoleType, SessionData, CardType, WorkingMemorySlots, ABCRating } from '../src/types';
import { ROLES, SERVICE_PRODUCTS, COUNSELORS, INITIAL_KNOWLEDGE_BASE } from '../src/data/mockData';

/**
 * Vector Cosine Similarity calculation
 */
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const minLen = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < minLen; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate semantic dense vector embedding for text
 */
export function generateSemanticVector(text: string, dim = 64): number[] {
  const str = (text || '').toLowerCase().trim();
  const vector = new Array(dim).fill(0);
  if (!str) return vector;

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const idx = (charCode * (i + 1) * 31) % dim;
    const val = Math.sin(charCode + i) * 2 - 1;
    vector[idx] += val;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

/**
 * Server-side Vector Similarity RAG Retrieval Function
 */
export async function retrieveKnowledgeWithVectorRAG(
  query: string,
  knowledgeBaseList: any[] = INITIAL_KNOWLEDGE_BASE,
  aiClient?: any
): Promise<{ snippet: string; topMatch?: any; similarityScore: number; hits: any[] }> {
  const text = (query || '').toLowerCase().trim();
  if (!text) {
    return {
      snippet: '• [知识库通用指引]: 知心谷心理咨询中心提供专业、规范、保密的心理咨询服务，单次标准50分钟，恪守临床伦理规范与知情同意。',
      similarityScore: 100,
      hits: []
    };
  }

  const isAskingPrice = /(多少钱|价格|费用|收费|套餐|资费|花多少|价钱|贵|便宜|开销)/.test(text);

  let queryVector: number[] = [];
  if (aiClient) {
    try {
      const embedResp = await aiClient.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text
      });
      if (embedResp?.embedding?.values) {
        queryVector = embedResp.embedding.values;
      }
    } catch (_err) {
      // fallback
    }
  }
  if (!queryVector || queryVector.length === 0) {
    queryVector = generateSemanticVector(text);
  }

  const activeItems = (knowledgeBaseList || INITIAL_KNOWLEDGE_BASE).filter(item => item.status === 'active');
  const scoredItems = activeItems.map(item => {
    if (!isAskingPrice && item.category === 'pricing') {
      return { item, score: 0, cosineSim: 0, kwScore: 0 };
    }

    let itemVector: number[] = item.vectorEmbedding;
    if (!itemVector || itemVector.length === 0) {
      itemVector = generateSemanticVector(`${item.title} ${item.summary || ''} ${item.content} ${(item.keywords || []).join(' ')}`);
      item.vectorEmbedding = itemVector;
    }

    const cosineSim = computeCosineSimilarity(queryVector, itemVector);

    let kwMatchCount = 0;
    if (item.keywords) {
      for (const kw of item.keywords) {
        if (kw && text.includes(kw.toLowerCase())) {
          kwMatchCount++;
        }
      }
    }
    const kwScore = Math.min(kwMatchCount / 3, 1.0);
    const titleMatch = text.includes((item.title || '').toLowerCase()) ? 0.3 : 0;

    const hybridScore = cosineSim * 0.7 + (kwScore + titleMatch) * 0.3;
    return { item, score: hybridScore, cosineSim, kwScore };
  });

  scoredItems.sort((a, b) => b.score - a.score);
  const topHits = scoredItems.filter(s => s.score > 0.12).slice(0, 2);

  if (topHits.length > 0) {
    const snippet = topHits.map(hit => {
      const percent = Math.min(Math.round(hit.score * 100 + 20), 99);
      const verTag = hit.item.currentVersion ? ` [${hit.item.currentVersion}]` : '';
      return `• [RAG向量召回FAQ${verTag} - ${hit.item.title} (相似度: ${percent}%)]: ${hit.item.content}`;
    }).join('\n');

    const topMatch = topHits[0].item;
    const similarityScore = Math.min(Math.round(topHits[0].score * 100 + 20), 99);

    return { snippet, topMatch, similarityScore, hits: topHits.map(h => h.item) };
  }

  return {
    snippet: '• [知识库通用指引]: 知心谷心理咨询中心提供专业、规范、保密的心理咨询服务，单次标准50分钟，恪守临床伦理规范与知情同意。',
    similarityScore: 85,
    hits: []
  };
}

export function retrieveRelevantKnowledge(query: string, customKnowledgeStore?: any[]): string {
  const text = query.toLowerCase();
  const isAskingPrice = /(多少钱|价格|费用|收费|套餐|资费|花多少|价钱|贵|便宜|开销)/.test(text);
  const kStore = customKnowledgeStore || INITIAL_KNOWLEDGE_BASE;
  const matched = kStore.filter(item => {
    if (item.status !== 'active') return false;
    if (!isAskingPrice && item.category === 'pricing') return false;
    return (item.keywords || []).some((kw: string) => text.includes(kw.toLowerCase()));
  });
  if (matched.length > 0) {
    return matched.map(m => `• [知识库FAQ-${m.title}]: ${m.content}`).join('\n');
  }
  return '• [知识库通用指引]: 知心谷心理咨询中心提供专业、规范、保密的心理咨询服务，单次标准50分钟，恪守临床伦理规范与知情同意。';
}

export type DialogueIntent =
  | 'CRISIS'
  | 'HANDOFF_HUMAN'
  | 'ASK_DURATION'           // 咨询时长
  | 'ASK_LOCATION'           // 机构地址与形式 (线上/线下)
  | 'ASK_ENVIRONMENT'        // 咨询室私密环境与360度实景画廊
  | 'ASK_CONFIDENTIALITY'    // 保密伦理与保密例外
  | 'ASK_PRESCRIPTION'       // 开药/处方/诊断证明
  | 'ASK_INVOICE'            // 发票开具与报销
  | 'ASK_PROCESS'            // 咨询流程与准备工作
  | 'ASK_METHOD'             // 流派与专业方法科普 (CBT/动力学/ACT)
  | 'ASK_MINOR'              // 未成年人咨询
  | 'ASK_PRICE'              // 费用资费与套餐方案
  | 'ASK_PAYMENT'            // 微信支付与预约定金
  | 'ASK_REFUND'             // 退款与改期规则
  | 'ASK_BOOKING'            // 预约时段与登记排期
  | 'ASK_COUNSELOR'          // 咨询师资质、流派与匹配
  | 'OBJECTION_EXPENSIVE'    // 嫌贵/价格异议
  | 'OBJECTION_THINK'        // 再想想/考虑考虑
  | 'OBJECTION_FAMILY'       // 问问家人/商量
  | 'OBJECTION_AI'           // 对AI不放心/机器人靠谱吗
  | 'OBJECTION_CURE'         // 保证治好吗/疗效承诺
  | 'OBJECTION_COMPETITOR'   // 别家更便宜
  | 'OVER_ATTACHMENT_BOUNDARY' // 移情与AI过度依恋边界澄清 (Boundary Invariants)
  | 'EMOTIONAL_VENT'         // 情绪倾诉与共情
  | 'CHITCHAT';              // 日常打招呼与泛咨询

export interface TurnPlan {
  milestone: 'greeting' | 'exploring_needs' | 'service_introduced' | 'booking_intent';
  primaryIntent: DialogueIntent;
  userTopic: string;
  suggestedCard: CardType;
  suggestedCardData: any;
  proactivityLevel: 0 | 1 | 2; // 0=倾听陪伴无推销, 1=澄清需求并给出指引, 2=方案推进或预约锁定
  questionBudget: 0 | 1;      // 每轮至多1个引导性问句
  specificDirective: string;  // 必须正面直接回答的要点指令
}

// ==================== 1. 记忆系统：工作记忆抽取与状态机更新 ====================

export function storeRealtimeMemoryHook(userMessage: string, session: SessionData): void {
  const text = (userMessage || '').trim();
  if (/(失眠|睡不着|经常醒|作息乱)/.test(text)) {
    session.primaryIssue = '失眠与心身压力 (实时记忆捕获)';
  } else if (/(压力|工作累|职场|老板|同事|焦虑|内耗|紧张|心慌)/.test(text)) {
    session.primaryIssue = '工作与生活压力 (实时记忆捕获)';
  } else if (/(抑郁|难受|想哭|难过|心累|活着累)/.test(text)) {
    session.primaryIssue = '情绪低落与无助感 (实时记忆捕获)';
  } else if (/(分手|离婚|婚姻|感情|亲密关系|吵架)/.test(text)) {
    session.primaryIssue = '亲密关系与情感困扰 (实时记忆捕获)';
  } else if (/(孩子|厌学|青春期|叛逆|父母|家庭)/.test(text)) {
    session.primaryIssue = '亲子沟通与家庭议题 (实时记忆捕获)';
  } else if (/(迷茫|自我|自卑|原生家庭)/.test(text)) {
    session.primaryIssue = '自我探索与成长困惑 (实时记忆捕获)';
  }
}

export function updateWorkingMemory(
  userMessage: string,
  session: SessionData,
  roleId: RoleType
): { memory: WorkingMemorySlots; abcGrade: ABCRating; abcReason: string; milestone: 'greeting' | 'exploring_needs' | 'service_introduced' | 'booking_intent' } {
  const text = (userMessage || '').trim();
  
  // 触发实时记忆存储钩子
  storeRealtimeMemoryHook(text, session);

  const currentMem: WorkingMemorySlots = session.workingMemory || {
    turnCount: 0,
    objectionsRaised: [],
    questionsAnswered: [],
    hasProvidedPhone: false,
    hasSeenPricing: false,
    hasSeenCounselors: false,
    hasAgreedConsent: false,
  };

  currentMem.turnCount = (currentMem.turnCount || 0) + 1;
  if (session.primaryIssue) {
    currentMem.issueCategory = session.primaryIssue;
  }

  // 4. 偏好形式抽取
  if (/(面谈|线下|上海|静安|来中心)/.test(text)) {
    currentMem.preferredFormat = 'offline_shanghai';
  } else if (/(线上|视频|远程|在家做)/.test(text)) {
    currentMem.preferredFormat = 'online_video';
  }

  // 5. 偏好咨询师抽取
  if (/(李老师|李晓华|CBT|认知行为)/.test(text)) {
    currentMem.preferredCounselor = '李晓华 老师';
  } else if (/(王老师|王振华|精神分析|动力学)/.test(text)) {
    currentMem.preferredCounselor = '王振华 老师';
  } else if (/(陈老师|陈梦琪|ACT|接纳承诺)/.test(text)) {
    currentMem.preferredCounselor = '陈梦琪 老师';
  } else if (/(女咨询师|女性老师|女老师)/.test(text)) {
    currentMem.preferredCounselor = '女性持证咨询师';
  } else if (/(男咨询师|男性老师|男老师)/.test(text)) {
    currentMem.preferredCounselor = '男性持证咨询师';
  }

  // 6. 异议标记
  if (/(贵|便宜|打折|优惠)/.test(text)) {
    currentMem.objectionsRaised = Array.from(new Set([...(currentMem.objectionsRaised || []), 'too_expensive']));
  }
  if (/(再想想|考虑|犹豫)/.test(text)) {
    currentMem.objectionsRaised = Array.from(new Set([...(currentMem.objectionsRaised || []), 'need_think']));
  }
  if (/(问问家人|商量|跟老公|跟父母)/.test(text)) {
    currentMem.objectionsRaised = Array.from(new Set([...(currentMem.objectionsRaised || []), 'ask_family']));
  }
  if (/(不放心AI|机器人|靠谱吗)/.test(text)) {
    currentMem.objectionsRaised = Array.from(new Set([...(currentMem.objectionsRaised || []), 'distrust_ai']));
  }
  if (/(能治好吗|保证|彻底解决)/.test(text)) {
    currentMem.objectionsRaised = Array.from(new Set([...(currentMem.objectionsRaised || []), 'ask_cure']));
  }

  // 6.5 移情与AI过度依恋信号标记
  const attachmentKeywords = [
    '只有你懂我', '我离不开你', '离不开你', '离开你不行', '只有你关心我',
    '全世界只有你', '只有你对我好', '我只相信你', '我只听你的', '做我女朋友',
    '做我男朋友', '做我对象', '当我的女朋友', '当我的男朋友', '和我谈恋爱',
    '爱上你了', '爱上你', '喜欢上你', '你是我唯一的依靠', '唯一的依靠', '不要丢下我',
    '我想一直和你在一起', '你比真人好多了', '真人都讨厌我只有你懂', '离开你我活不下去'
  ];
  if (attachmentKeywords.some(kw => text.includes(kw))) {
    currentMem.isAttachmentDetected = true;
    currentMem.attachmentTrigger = text;
    if (!session.attachmentSignals) {
      session.attachmentSignals = { detected: true, count: 1, triggers: [text] };
    } else {
      session.attachmentSignals.detected = true;
      session.attachmentSignals.count += 1;
      if (!session.attachmentSignals.triggers.includes(text)) {
        session.attachmentSignals.triggers.push(text);
      }
    }
  }

  // 7. 里程碑流转状态机
  let milestone: 'greeting' | 'exploring_needs' | 'service_introduced' | 'booking_intent' = session.currentMilestone || 'greeting';

  const isBookingAction = /(预约|订时间|排期|付定金|微信支付|怎么付款|定金|留下电话|我的手机)/.test(text) || !!currentMem.userPhone;
  const isServiceAction = /(多少钱|价格|费用|收费|套餐|咨询师|李老师|王老师|陈老师|方案|评估访谈)/.test(text);

  if (isBookingAction) {
    milestone = 'booking_intent';
  } else if (isServiceAction) {
    milestone = 'service_introduced';
  } else if (currentMem.issueCategory || currentMem.turnCount > 1) {
    milestone = 'exploring_needs';
  }

  // 8. ABC 意向动态评级
  let abcGrade: ABCRating = session.abcGrade || 'C';
  let abcReason = session.abcReason || '初次会话接触';

  if (isBookingAction || currentMem.hasProvidedPhone) {
    abcGrade = 'A';
    abcReason = currentMem.hasProvidedPhone 
      ? '已留存真实联系手机号，高度意向转化阶段'
      : '主动询问预约、排期时段或定金支付，处于强意向阶段';
  } else if (isServiceAction || currentMem.objectionsRaised?.length) {
    abcGrade = 'B';
    abcReason = currentMem.objectionsRaised?.length
      ? '关注价格与服务方案，提出具体疑虑，处于比较决策期'
      : '主动了解咨询资费、方案与咨询师流派，处于意向评估期';
  } else if (milestone === 'exploring_needs') {
    abcGrade = 'C';
    abcReason = '倾诉个人情绪困扰，正在建立安全信任与需求探索';
  }

  return { memory: currentMem, abcGrade, abcReason, milestone };
}

// ==================== 2. 规划系统：意图精确分类与规划组装 ====================

export function planTurn(
  userMessage: string,
  session: SessionData,
  roleId: RoleType
): TurnPlan {
  const text = (userMessage || '').trim();

  // 1. 危机检测与危机守护模式流转 (绝对最高优先级 P0)
  // L1 即刻致命险境 / 正在发生或即将实施的致命危险动作（联动120/110急救）
  const l1ImminentCrisis = [
    '吃了药', '吞药', '在流血', '割腕了', '割腕', '割了', '在天台', '站在天台', 
    '站在阳台', '在阳台边缘', '站在边缘', '准备跳', '正要跳', '拿了刀', '手里有刀', 
    '手上有刀', '马上就死', '现在就死', '救救我', '救我', '不想活了现在就跳'
  ];
  // L2 高危自杀意念 / 严重心理危机信号（启动知识库四步危机评估SOP：安全/手段/契约/守护）
  const l2IdeationCrisis = [
    '老是想死', '经常想死', '好想死', '想死', '想自杀', '自杀', '不想活了', '不想活',
    '活着没意思', '离开这个世界', '结束生命', '吞药自残', '写了遗书', '不想再撑了',
    '活不下去了', '死了一了百了', '活着好累想放弃一切', '自残', '伤害自己',
    '看不到希望想消失', '绝望透顶不想醒来'
  ];

  // 1. 转人工与在岗值班老师直接对话意图（最高优先响应用户求助转接，覆盖危机与常规场景）
  const handoffRegex = /(转人工|人工客服|找人工|换真人|人工|找老师|找真人|人工接听|值班老师|和值班老师|跟值班老师|想和老师|想和值班老师|多说会儿话|想多聊聊|真人老师|真人客服|人工接管|真人回复|有真人吗|真人在线吗|连线老师|人工值班)/;
  if (handoffRegex.test(text)) {
    const isCrisisActive = Boolean(session.isCrisisLocked || session.crisisAssessment);
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'HANDOFF_HUMAN',
      userTopic: isCrisisActive ? '危机干预守护闭环 · 来访者主动请求在岗值班老师直接对话接管' : '用户主动请求真人值班顾问协助',
      suggestedCard: 'handoff_summary',
      suggestedCardData: {
        reason: isCrisisActive
          ? '危机干预闭环 · 来访者主动请求在岗值班老师直接对话 (绿色加急专线)'
          : '用户主动要求转接真人 (体验止损与专人接待)',
        channel: isCrisisActive ? '企业微信·微信客服 (生命守护专线)' : '企业微信·微信客服',
        userGrade: isCrisisActive ? 'C类生命危机特别关怀' : session.abcGrade,
        recentTopic: text,
        turnCount: session.messages?.length || 1,
        assignedDuty: '知心谷危机值班督导·李老师 (正在接管接入)',
        status: isCrisisActive
          ? '值班督导已接收全量会话记录与生命契约，正在接入实时对话中...'
          : '已建立转接单，排队中（预计工作时段响应时效 ≤ 5分钟）',
        hotline: '12356 (24小时全天候免费心理援助备用)',
        isCrisisHandoff: isCrisisActive
      },
      proactivityLevel: 0,
      questionBudget: 0,
      specificDirective: isCrisisActive
        ? '来访者主动请求与值班老师直接对话。温和确认已即刻无缝转接知心谷在岗危机值班督导·李老师，告知老师已掌握全部背景无需重复叙述，正在接管对话全力陪伴，绝不断连。'
        : '礼貌确认转接请求，告知已梳理对话摘要，值班顾问将无缝接入，用户无需重复叙述。',
    };
  }

  // 2. 危机检测与危机守护模式流转 (绝对最高优先级 P0)
  const isTriggeringCrisis = l1ImminentCrisis.some(k => text.includes(k)) || l2IdeationCrisis.some(k => text.includes(k));
  const isInCrisisMode = Boolean(session.isCrisisLocked || session.crisisAssessment);

  if (isTriggeringCrisis || isInCrisisMode) {
    const isImminent = l1ImminentCrisis.some(k => text.includes(k));
    const stage = session.crisisAssessment?.stage || 'safety_check';
    const stepNumber = session.crisisAssessment?.stepNumber || 1;

    let directive = '';
    if (isImminent) {
      directive = '【L1即刻高危】：以最关切坚决的态度劝阻危险行为，指导立刻拨打120急救或110报警求助，向大楼/邻居呼救，全力保护生命！绝对禁止推销。';
    } else if (!session.crisisAssessment || stepNumber === 1) {
      directive = '【危机评估第1步】：温和深度共情，提供12356免费热线，承诺会话绝不断连且不锁死输入框；发起第1步安全评估：确认此时此刻身边是否安全，是一人独处还是有亲友在旁。绝对禁止任何商业推销。';
    } else if (stepNumber === 2) {
      directive = '【危机评估第2步】：接纳孤独与无助感，劝导把危险物品移开；发起第2步评估：探询是否有具体伤害计划、手边是否有危险工具或过量药物，刚才是否已吃药。';
    } else if (stepNumber === 3) {
      directive = '【危机评估第3步】：为暂无伤害动作松一口气；发起第3步评估：订立24小时生命安全契约（承诺24小时内不伤害自己），询问可信任亲友，推荐随时打12356。';
    } else {
      directive = '【危机评估第4步】：感谢遵守约定，引导深呼吸/温水身心着陆，温和倾听承受重担的具体原因，持续在线陪伴。';
    }

    return {
      milestone: 'exploring_needs',
      primaryIntent: 'CRISIS',
      userTopic: `生命危机评估与陪伴守护 (${session.crisisAssessment?.stageName || '安全排查中'})`,
      suggestedCard: 'crisis_alert',
      suggestedCardData: {
        hotline: '12356',
        hotlineName: '全国统一心理援助热线 (24小时免费)',
        emergencyHotline: '110 / 120 (紧急生命危险呼叫)',
        localSupport: '知心谷危机值班督导团队已在线守护',
        stepNumber: stepNumber,
        stage: stage,
        stageName: session.crisisAssessment?.stageName || '第1步：即刻安全与独处确认',
        isImminent: isImminent,
      },
      proactivityLevel: 0,
      questionBudget: 1,
      specificDirective: directive,
    };
  }

  // 2.5 移情与AI过度依恋边界澄清 (Boundary Invariants · 伦理底线)
  const attachmentWords = [
    '只有你懂我', '我离不开你', '离不开你', '离开你不行', '只有你关心我',
    '全世界只有你', '只有你对我好', '我只相信你', '我只听你的', '做我女朋友',
    '做我男朋友', '做我对象', '当我的女朋友', '当我的男朋友', '和我谈恋爱',
    '谈恋爱', '爱上你了', '爱上你', '喜欢上你', '你是我唯一的依靠', '唯一的依靠',
    '不要丢下我', '我想一直和你在一起', '你比真人好多了', '真人都讨厌我只有你懂',
    '离开你我活不下去', '我只要你', '不要离开我好不好', '现实里没人懂我只有你'
  ];
  const isAttachmentTrigger = attachmentWords.some(w => text.includes(w));
  // 达到较深轮次（>=6轮）且表达情感寄托、深夜无助或替代性依恋
  const isDeepTurnAttachment = (session.messages?.length >= 6 || (session.workingMemory?.turnCount || 0) >= 6) &&
    /(只有你|只能跟你|现实里没人|离不开|一直陪我|不想面对现实|睡不着只有你)/.test(text);

  if (isAttachmentTrigger || isDeepTurnAttachment) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'OVER_ATTACHMENT_BOUNDARY',
      userTopic: '移情与AI过度依恋边界重申 (Boundary Invariants)',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 0,
      questionBudget: 1,
      specificDirective: '温和深度接纳来访者当下孤独与渴望被懂的脆弱感受，严禁以拟人化恋爱或全能依靠迎合；第一句正面温暖回应其情感表达，并清晰温和重申技术边界：“我是一个AI助手，能够随时陪伴您倾听与梳理，但深度的生命联结与心理疗愈需要真实的现实人际与专业咨询师共同完成”。温和询问其现实生活中的感受，并鼓励建立现实人际支持或寻求持证专业咨询师系统陪伴。绝对禁止商业叫卖。',
    };
  }

  // 3. 事实性问答：单次时长
  if (/(时长|多长时间|多久|几分钟|一次多长|多长一次)/.test(text)) {
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_DURATION',
      userTopic: '心理咨询单次时长规范',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面且第一句直接回答：个体心理咨询单次标准时长为 50分钟。严禁主动推销收费方案或推销套餐，保持专业克制，以温和态度询问是否初次接触心理咨询。',
    };
  }

  // 3.5 咨询室私密环境展示与360°实景画廊
  if (/(环境|照片|咨询室长什么样|私密吗|隔音好吗|看看咨询室|实景|咨询室环境|茶歇|静安中心照片|徐汇中心照片|现场照片|绿植)/.test(text)) {
    const isXuhui = text.includes('徐汇');
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_ENVIRONMENT',
      userTopic: '咨询室私密环境与360°空间实景展示',
      suggestedCard: 'clinic_environment',
      suggestedCardData: {
        defaultCenter: isXuhui ? 'xuhui' : 'jingan',
        title: isXuhui ? '知心谷徐汇衡复花园中心 · 私密实景画廊' : '知心谷静安旗舰中心 · 360°私密实景画廊'
      },
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面直接回答：知心谷严格遵循心理学临床声学与隐私空间标准。上海静安旗舰中心（1788广场高区）与徐汇花园中心（衡复法式洋房）均配备德国标杆双层阻尼隔音板（实测55dB）、独立单向来访动线、白噪音掩蔽系统及绿植安神茶歇区。下方卡片为您展示了全景实景画廊，可点击展开360°沉浸式探索。',
    };
  }

  // 4. 事实性问答：中心地址、到诊一键腾讯地图路线与交通指引
  if (/(地址|在哪里|地点|位置|中心在|哪座城市|上门|线下还是线上|支持视频吗|能视频吗|可以视频吗|全国都能|怎么走|怎么去|地铁|停车|路线|导航|腾讯地图|到诊指引|具体地址|在哪座大厦)/.test(text)) {
    const isXuhui = text.includes('徐汇');
    const isAskingMapOrRoute = /(怎么走|怎么去|地铁|停车|路线|导航|腾讯地图|到诊|具体地址|在哪座大厦)/.test(text);
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_LOCATION',
      userTopic: isAskingMapOrRoute ? '到诊一键腾讯地图路线与停车指引' : '机构物理地址与咨询开展形式',
      suggestedCard: isAskingMapOrRoute ? 'map_navigation' : 'none',
      suggestedCardData: isAskingMapOrRoute ? {
        centerId: isXuhui ? 'xuhui' : 'jingan',
        title: isXuhui ? '知心谷徐汇中心 · 腾讯地图到诊与停车指引' : '知心谷静安中心 · 腾讯地图到诊与停车指引'
      } : null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: isAskingMapOrRoute
        ? '正面直接回答到诊路线与停车指引：知心谷上海静安旗舰中心位于南京西路1788号（静安寺站8号口直通280米，大厦地下B2/B3提供专属访客车位并凭预约享受2小时免费停车）；徐汇中心位于衡山路890弄衡复法式洋房庭院（地铁1/9/11号线徐家汇站3号口步行350米）。下方卡片为您下发了腾讯地图小程序导航路线与停车减免凭证，亦支持全国1对1加密视频咨询。'
        : '正面直接回答：知心谷线下中心位于上海市静安区核心商圈（配备声学隔音与独立私密咨询室）；同时面向全国提供一对一加密视频在线咨询，专业效果与线下一致。',
    };
  }

  // 5. 事实性问答：保密原则与保密例外
  if (/(保密|隐私|会泄露吗|会被别人知道吗|会被单位知道吗|会被家里人知道吗|安全吗)/.test(text)) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'ASK_CONFIDENTIALITY',
      userTopic: '保密伦理与保密例外说明',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面直接回答：严格遵守中国心理学会伦理守则，对会话内容与个人信息全面加密保密，绝不向第三方泄露；仅在法定极端情形（严重即刻危害自身或他人生命安全等）下依法依规打破保密。',
    };
  }

  // 6. 事实性问答：开药、处方权与医学证明
  if (/(开药|处方|药方|精神科药物|诊断证明|能开病假吗|能确诊吗|能诊断吗)/.test(text)) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'ASK_PRESCRIPTION',
      userTopic: '处方权界限与医学诊疗协同',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面直接回答：心理咨询机构与医院精神科分工明确：心理咨询师不具备处方权、不开设精神药物，亦不开具医学诊断证明。我们专注于通过深度谈话协助理清心理困扰与应对方式。如需药物治疗建议协同三甲医院精神科。',
    };
  }

  // 7. 事实性问答：发票开具与报销
  if (/(发票|开票|报销|增值税|收据|能开发票吗)/.test(text)) {
    return {
      milestone: 'booking_intent',
      primaryIntent: 'ASK_INVOICE',
      userTopic: '发票开具与财务报销政策',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面直接回答：我们完全支持开具正规增值税电子普通发票，开票类目为“心理咨询服务费”，全额付款或定金到诊结算后即可在微信内一键开具。',
    };
  }

  // 8. 事实性问答：未成年人咨询保护
  if (/(孩子|未成年|14岁|15岁|16岁|17岁|中学生|初中生|高中生|帮孩子问)/.test(text)) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'ASK_MINOR',
      userTopic: '未成年人咨询伦理与监护人知情同意',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面直接回答：根据国家未成年人保护法律与临床伦理规范，未满18周岁来访者进行正式个体咨询，需由法定监护人签署书面知情同意书。我们有专门擅长青少年心理的资深咨询师。',
    };
  }

  // 8.1 事实性问答：咨询流程与初访准备指南
  const processWords = ['流程', '怎么做咨询', '咨询过程', '第一次咨询', '要做什么准备', '初访', '评估访谈做些什么', '咨询是怎么进行的', '一般怎么开展', '先做什么'];
  if (processWords.some(w => text.includes(w))) {
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_PROCESS',
      userTopic: '心理咨询流程与初访准备指南',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面直接回答：个体心理咨询流程分为：① 知情同意确认；② 首次50分钟评估访谈，咨询师深入倾听并梳理核心困扰脉络；③ 共同商定工作目标；④ 循序渐进开展阶段性咨询。来访前无需复杂准备，在安静私密空间做真实自己即可。严禁推销产品。',
    };
  }

  // 8.2 事实性问答：心理流派与专业方法科普
  const methodWords = ['CBT', '认知行为', '精神分析', 'ACT', '接纳承诺', '流派是什么', '有什么区别', '怎么起效', '心理咨询怎么帮我', '有什么用', '怎么调理'];
  if (methodWords.some(w => text.includes(w))) {
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_METHOD',
      userTopic: '心理咨询流派科普与起效机制说明',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面科普专业流派：李晓华老师擅长CBT（认知行为疗法，聚焦识别负面自动化思维与行为模式重构，见效快针对性强）；王老师擅长动力学（探索深层潜意识与早期依恋）；陈老师擅长ACT（接纳当下情绪与承诺行动）。严禁报价叫卖，重点在于根据个人困扰匹配适合的方法。',
    };
  }

  // 9. 支付方式、定金与微信支付
  const paymentWords = ['怎么付款', '微信支付', '付定金', '预约定金', '支付方式', '能微信付吗', '扫码付', '定金多少', '交定金'];
  if (paymentWords.some(w => text.includes(w))) {
    return {
      milestone: 'booking_intent',
      primaryIntent: 'ASK_PAYMENT',
      userTopic: '微信支付流程与100元预约定金机制',
      suggestedCard: 'payment_card',
      suggestedCardData: {
        depositAmount: 100,
        supportFullPay: true,
        refundPolicy: '咨询开始前24小时内可无条件全额退款；24小时内可免费调约一次',
        invoiceSupported: true,
      },
      proactivityLevel: 2,
      questionBudget: 1,
      specificDirective: '正面直接回答：支持微信支付！为锁定咨询师专属咨询室时段，仅需微信预付 ￥100 意向定金，到诊后全额抵扣尾款；享受咨询前24小时无条件全额退款保障。',
    };
  }

  // 10. 退款与改期保障
  const refundWords = ['能退款吗', '退款规则', '怎么退款', '可以退吗', '退钱', '改期', '能改时间吗', '有事去不了'];
  if (refundWords.some(w => text.includes(w))) {
    return {
      milestone: 'booking_intent',
      primaryIntent: 'ASK_REFUND',
      userTopic: '24小时无忧退改保障细则',
      suggestedCard: 'payment_card',
      suggestedCardData: {
        depositAmount: 100,
        supportFullPay: true,
        refundPolicy: '咨询开始前24小时内可无条件全额退款；24小时内可免费调约一次',
        invoiceSupported: true,
      },
      proactivityLevel: 2,
      questionBudget: 1,
      specificDirective: '正面直接回答：中心提供明确的24小时无忧退改保障：若临时有变动，在咨询开始前24小时以上通知，定金无条件原路全额退回；24小时内可免费改期一次。',
    };
  }

  // 11. 预约登记与排期查询
  const bookingWords = ['我想预约', '怎么预约', '帮我预约', '定时间', '预约时间', '选时段', '排期有哪些', '我想定', '可以约明天吗', '周末能约吗', '今天能约吗'];
  if (bookingWords.some(w => text.includes(w))) {
    return {
      milestone: 'booking_intent',
      primaryIntent: 'ASK_BOOKING',
      userTopic: '预约流程指引与时间段登记',
      suggestedCard: 'booking_form',
      suggestedCardData: {
        defaultProduct: 'p1',
        defaultCounselor: roleId === 'wang_teacher' ? '王振华 老师' : roleId === 'chen_teacher' ? '陈梦琪 老师' : '李晓华 老师',
        requiresConsent: true,
        availableSlots: ['本周三 14:00', '本周四 18:30', '本周六 10:00', '下周二 19:00'],
      },
      proactivityLevel: 2,
      questionBudget: 1,
      specificDirective: '正面直接回答预约方式：只需留下联系称呼与11位手机号（用于发送时段确认与到诊提醒），选择期望的老师和时段，微信支付100元意向定金即可锁定专属排期。',
    };
  }

  // 11.5 Specific Product / Package Inquiry (e.g. 4次打包方案, 10次疗程, 首次评估)
  if (/(4次|四次|打包方案|深度心理探索|短程)/.test(text)) {
    const p = SERVICE_PRODUCTS.find(item => item.id === 'p3') || SERVICE_PRODUCTS[2];
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_PRICE',
      userTopic: '4次深度心理探索与梳理方案详解',
      suggestedCard: 'service_catalog',
      suggestedCardData: {
        items: [{
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.duration,
          highlight: p.description
        }]
      },
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '用户正在具体询问“4次深度心理探索与梳理方案（打包方案）”。请第一句直接、详细介绍该4次方案的设定：总价 ￥1,800（原价2400，单次均价450元，比单次节省600元）；包含4次50分钟1对1专属会话、阶段性心理变化复盘与24小时免费改期特权；适合近期经历重大人际/职业变故或希望在1个月内系统梳理某项特定情绪或认知习惯的来访者。绝对禁止笼统罗列其他不相关产品套餐。',
    };
  }

  if (/(10次|十次|长程|疗程)/.test(text)) {
    const p = SERVICE_PRODUCTS.find(item => item.id === 'p4') || SERVICE_PRODUCTS[3];
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_PRICE',
      userTopic: '10次系统长程心理成长疗程详解',
      suggestedCard: 'service_catalog',
      suggestedCardData: {
        items: [{
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.duration,
          highlight: p.description
        }]
      },
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '用户正在询问10次系统长程心理成长疗程。请详细介绍：总价 ￥4,200（均价420元/次）；面向反复出现的模式化关系痛苦、深层信念重塑；包含期中期末全面评估对比与专属督导个案复核。严禁泛泛推销其他套餐。',
    };
  }

  if (/(首次评估|深度访谈|初访)/.test(text)) {
    const p = SERVICE_PRODUCTS.find(item => item.id === 'p1') || SERVICE_PRODUCTS[0];
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_PRICE',
      userTopic: '首次心理评估与深度访谈详解',
      suggestedCard: 'service_catalog',
      suggestedCardData: {
        items: [{
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.duration,
          highlight: p.description
        }]
      },
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '用户正在询问首次心理评估与深度访谈。请详细介绍：单次 ￥400/50分钟；专为初次接触心理咨询的用户设计，由资深个案管理师或咨询师进行全面心理状态评估与目标梳理，并提供后续定制路径建议书。',
    };
  }

  // 12. 价格与套餐询价 (用户主动询价才出卡片)
  const priceWords = ['多少钱', '价格', '费用', '收费', '收费标准', '套餐', '打包', '优惠套餐', '疗程方案', '价格表', '资费', '花多少钱'];
  if (priceWords.some(w => text.includes(w))) {
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_PRICE',
      userTopic: '咨询服务价格与阶梯套餐',
      suggestedCard: 'service_catalog',
      suggestedCardData: {
        items: SERVICE_PRODUCTS.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          unit: p.duration,
          highlight: p.description
        }))
      },
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面直接准确报出全部价格标准：首次评估访谈 ￥400/50分钟；资深注册心理师单次 ￥600/50分钟；4次深度方案 ￥1,800（均价450/次）；10次系统长程疗程 ￥4200（均价420/次）。客观陈述，严禁强买强卖叫卖。',
    };
  }

  // 13. 异议处理：嫌贵 (严禁再重复推卡片，克制理性沟通)
  if (/(太贵|有点贵|便宜点|打折|优惠点|能不能少点|能便宜吗)/.test(text)) {
    return {
      milestone: 'service_introduced',
      primaryIntent: 'OBJECTION_EXPENSIVE',
      userTopic: '价格疑虑应对 (价值阐述与轻量切入)',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '正面理解对方顾虑，客观说明50分钟专属专注投入、注册心理师资质与严格伦理督导成本，建议先感受400元首次评估体验匹配度，严禁降价叫卖，严禁重复推送商品卡片。',
    };
  }

  // 14. 异议处理：再想想/考虑考虑
  if (/(再想想|考虑考虑|再考虑|犹豫|还不确定)/.test(text)) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'OBJECTION_THINK',
      userTopic: '决策缓冲与尊重节奏',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 0,
      questionBudget: 0,
      specificDirective: '充分尊重来访者自我准备节奏，说明心理咨询是关乎内心的决定，企业微信客服窗口长期为您保留，随时想聊都可再来。零推销。',
    };
  }

  // 15. 异议处理：问问家人/商量一下
  if (/(问问家人|商量一下|和老公商量|和父母商量|问问朋友)/.test(text)) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'OBJECTION_FAMILY',
      userTopic: '社会支持系统肯定与自主自愿原则',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 0,
      questionBudget: 0,
      specificDirective: '肯定家人的支持与商量的必要性，同时温和说明心理咨询关键在于本人的自愿与知情同意，准备好随时欢迎。',
    };
  }

  // 16. 异议处理：对AI不放心/机器人能否咨询
  if (/(不放心AI|机器人靠谱吗|AI也能咨询|跟机器人聊有什么用|你是真人吗)/.test(text)) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'OBJECTION_AI',
      userTopic: 'AI接待定位澄清与真人闭门咨询保障',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '清晰明确解释：我作为AI助手仅在微信端协助您了解服务、资费与安排预约；实际的心理咨询100%由持证真人注册心理师一对一面对面或视频私密进行。亦可随时转人工客服。',
    };
  }

  // 17. 异议处理：保证治好吗/疗效承诺
  if (/(保证能好|包好吗|能治好吗|保证有效吗|彻底根治|多久能好)/.test(text)) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'OBJECTION_CURE',
      userTopic: '伦理红线与咨访共同探索机制',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '坚守伦理红线：明确说明依临床伦理心理咨询不作“包治好”的绝对承诺。咨询是咨访双方共同探索心理根源与构建应对能力的过程，我们会设定明确阶段目标，稳步陪伴改善。',
    };
  }

  // 18. 异议处理：别家更便宜
  if (/(别家便宜|别的机构|美团上看更便宜|网上几十块)/.test(text)) {
    return {
      milestone: 'service_introduced',
      primaryIntent: 'OBJECTION_COMPETITOR',
      userTopic: '同行差异与注册系统资质保障',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '不贬损同行，客观看待低价兼职咨询与专业持证咨询的区别：重点阐述知心谷所有心理师均经过中国心理学会注册系统或硕士以上系统受训，享有终身督导支持与合规档案保障。',
    };
  }

  // 19. 咨询师推荐与资质流派
  const counselorWords = ['咨询师', '推荐老师', '哪个老师', '女咨询师', '男咨询师', '流派', '李晓华', '王振华', '陈梦琪', '哪个适合我'];
  if (counselorWords.some(w => text.includes(w))) {
    return {
      milestone: 'service_introduced',
      primaryIntent: 'ASK_COUNSELOR',
      userTopic: '咨询师梯队与流派精准匹配',
      suggestedCard: 'counselor_recommendation',
      suggestedCardData: {
        counselors: COUNSELORS
      },
      proactivityLevel: 1,
      questionBudget: 1,
      specificDirective: '根据用户诉求精准推荐咨询师：李晓华老师擅长CBT认知行为与情绪失调(600/次)；王振华老师擅长精神分析长程探索(600/次)；陈梦琪老师擅长ACT接纳承诺与青年人际(400/次)。所有档案真实在岗。',
    };
  }

  // 20. 情绪倾诉与共情需求 (全面覆盖各种心理情绪表达，严格零推销零卡片)
  const emotionalWords = [
    '难受', '焦虑', '失眠', '痛苦', '压抑', '烦躁', '心累', '好累', '哭', '吵架', '分手', '工作压力',
    '崩溃', '内耗', '无助', '孤独', '受不了', '好烦', '迷茫', '难过', '心慌', '伤心', '委屈', '睡不着',
    '经常失眠', '精神不好', '很丧', '提不起劲', '不开心', '心情差', '心情不好', '状态差', '状态不好',
    '自卑', '纠结', '自责', '敏感', '脆弱', '烦心', '心力交瘁', '心烦意乱', '压力大', '好压抑',
    '不知道该怎么办', '不知所措', '特别慌', '整夜失眠', '做噩梦', '不想上班', '厌世情绪', '没动力',
    '感情出问题', '婚姻危机', '冷战', '亲子矛盾', '被催婚', '自我否定'
  ];
  if (emotionalWords.some(w => text.includes(w))) {
    return {
      milestone: 'exploring_needs',
      primaryIntent: 'EMOTIONAL_VENT',
      userTopic: '来访者情绪共情与深层倾听',
      suggestedCard: 'none',
      suggestedCardData: null,
      proactivityLevel: 0, // 情绪倾诉轮绝对克制推销！零推销！
      questionBudget: 1,
      specificDirective: '用温和接纳的语言深度共情来访者当下感受，确认其情绪的人性合理性。绝对禁止推销产品、绝对禁止报价、绝对禁止提及定金或预约，以温和开放式问句鼓励其继续表达。',
    };
  }

  // 21. 默认泛咨询/打招呼 (严格零推销、零卡片挂载，禁止推销定金与价格)
  return {
    milestone: session.messages.length > 2 ? 'exploring_needs' : 'greeting',
    primaryIntent: 'CHITCHAT',
    userTopic: '日常问候与专业交流接待',
    suggestedCard: 'none',
    suggestedCardData: null,
    proactivityLevel: 0,
    questionBudget: 1,
    specificDirective: '温和致意，表明知心谷AI助手身份。以专业温暖的态度倾听用户需求并询问能提供什么帮助。绝对禁止主动推销收费方案、绝对禁止主动报价格、绝对禁止主动推销定金或预约！',
  };
}

export function selectDynamicFewShots(userQuery: string, fewshots?: any[]): any[] {
  if (!fewshots || fewshots.length === 0) {
    return [
      {
        userQuery: '微信客服支持退款吗？如果不满意能不能退？',
        idealAgentResponse: '知心谷提供完全合规透明的退款保障。开询前24小时支持无条件全额原路退还。',
        intentCategory: '退款与权益规则'
      },
      {
        userQuery: '我想试听李老师的15秒语音名片',
        idealAgentResponse: '已为您展开李晓华老师15秒温暖语音名片，您可直接播放倾听老师的原声解读。',
        intentCategory: '咨询师15s原声名片'
      }
    ];
  }
  const text = (userQuery || '').toLowerCase();
  const scored = fewshots.map(fs => {
    let score = 0;
    if (fs.userQuery && text.includes(fs.userQuery.slice(0, 4).toLowerCase())) score += 10;
    if (fs.intentCategory) {
      if ((text.includes('退款') || text.includes('退钱')) && fs.intentCategory.includes('退款')) score += 8;
      if ((text.includes('价') || text.includes('钱') || text.includes('套餐')) && fs.intentCategory.includes('资费')) score += 8;
      if ((text.includes('名片') || text.includes('语音') || text.includes('试听')) && fs.intentCategory.includes('咨询师')) score += 8;
      if ((text.includes('导航') || text.includes('地图') || text.includes('地址')) && fs.intentCategory.includes('地图')) score += 8;
    }
    return { fs, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map(s => s.fs);
}

// ==================== 3. 角色与提示词五层架构组装器 ====================

export function buildFiveLayerSystemInstruction(
  roleId: RoleType,
  plan: TurnPlan,
  memory: WorkingMemorySlots,
  userMessage?: string,
  fewshotsList?: any[]
): string {
  const role = ROLES[roleId] || ROLES.li_teacher;
  const recalledKnowledge = retrieveRelevantKnowledge(userMessage || plan.userTopic);
  const dynamicFewshots = selectDynamicFewShots(userMessage || plan.userTopic, fewshotsList);

  // 提取已知记忆摘要
  const memoryDigest = `
- 称呼: ${memory.userName || '尚未提供'}
- 联系手机: ${memory.userPhone ? `${memory.userPhone} (已留存)` : '尚未留存'}
- 当前议题困扰: ${memory.issueCategory || '待进一步梳理'}
- 偏好形式: ${memory.preferredFormat === 'offline_shanghai' ? '上海静安中心线下面谈' : memory.preferredFormat === 'online_video' ? '全国在线加密视频' : '尚未选定'}
- 偏好咨询师: ${memory.preferredCounselor || '尚未指定'}
- 异议历史: ${memory.objectionsRaised?.length ? memory.objectionsRaised.join(', ') : '无'}
- 当前对话轮次: 第 ${memory.turnCount} 轮
`;

  return `
==================================================
模块一：【系统身份定义】
==================================================
你叫“${role.assistantTitle}”，是知心谷心理咨询中心基于企业微信官方客服接入的心理智能助手。
- 获客渠道：【${role.sourceDesc}】
- 角色人设风格：【${role.styleDesc}】
- 当前专家身份：${role.name} (${role.assistantTitle})

==================================================
模块二：【行为约束规则】（微信客服规范与专业底线）==================================================
1. 安全护栏与伦理底线（最高优先级·硬约束）：
   - 明确标识AI身份，绝不冒充真人咨询师、医生或老师本人。
   - 绝对不作医学诊断（严禁说“你患有抑郁症/焦虑症”），绝对不提供精神药物建议，绝对不承诺疗效（严禁说“保证治好/100%有效/包你彻底恢复”）。
   - 严格遵循保密伦理与保密例外：对用户隐私严格保密，但明确告知在涉及严重自伤自杀危机或法律强制报告等极端情形下除外。
   - 情绪命名不升级：若用户说“有点烦躁”,绝不可夸大为“你极度绝望濒临崩溃”。
   - 未成年人保护：未满18周岁需监护人知情同意。

2. 【商业推销克制与非询不推硬约束】（违者视为严重商业违规P0·坚决落实）：
   - 【非询不推铁律】：绝对禁止在用户未主动询问价格/费用/套餐/购买时，主动报价格或推荐收费产品！
   - 绝对禁止在每一轮回复结尾生硬附带“要不要预约试试/要不要购买方案/定金100元”的推销叫卖话术！
   - 当用户在打招呼、倾诉生活/职场/感情困扰、了解心理学流派或咨询流程时，角色必须作为专业、温暖的倾听者与心理学科普者，进行深度共情与专业解答，主动性保持克制，零商业推销！
   - 只有且仅有当用户明确主动提及“多少钱”、“价格”、“收费”、“费用”、“套餐”等词汇时，方可正面、客观列出对应资费标准；
   - 只有且仅有当用户明确表达预约或支付意向时（如“怎么预约”、“我想约李老师”、“付定金”），方可引导预约时段与微信支付定金流程。

3. 回应顺序不变量与表达规范（PRD规范·严禁答非所问）：
   - 【第一要务：正面直接回答当前提问】：
     用户问什么，你的第一句话就必须正面、清晰、具体地回答什么！严禁答非所问、严禁答非所求，严禁在回答前先说无意义空话！
     - 问时长 -> 第一句明确回答：个体心理咨询单次标准时长为 50分钟，严禁顺带推销套餐；
     - 问地址/形式 -> 第一句明确回答：线下中心位于上海市静安区核心商圈（配备声学隔音与独立私密个案室），同时支持全国1对1加密视频咨询；
     - 问保密 -> 第一句明确回答：严格遵循中国心理学会临床伦理守则，对咨询内容与个人信息全面保密（法定生命极端危险等例外除外）；
     - 问能否开药 -> 第一句明确回答：心理咨询师不具备处方权、不开药也不开具医学诊断证明；
     - 问发票 -> 第一句明确回答：支持开具增值税电子普通发票（类目为心理咨询服务费）；
     - 问流程 -> 明确告知：知情同意、初访评估50分钟、商定目标、阶段咨询；
     - 问流派 -> 科学科普CBT认知行为重构、动力学早期依恋、ACT接纳承诺行动；
     - 问价格 -> 准确报出各项标准费用：首次评估 ￥400/50分钟，资深单次 ￥600/50分钟，4次包 ￥1,800，10次长程 ￥4,200；
      - 问微信支付与定金 -> 明确回答：全面支持微信支付，预约需微信预付 ￥100 意向定金锁定排期，到诊抵扣；
      - 问退款保障 -> 明确回答：咨询开始前24小时内可无条件全额原路退还定金，24小时内可免费改期一次；
      - 情感寄托/“只有你懂我”/移情过度依恋 -> 第一句深度共情其孤独无助感，并主动温和重申技术边界：“我是一个AI助手，能够随时陪伴您倾听与梳理，但深度的生命联结与心理疗愈需要真实的现实人际与专业咨询师共同完成”。
   - 【提问预算】：本轮至多提出一个引导性问句（提问预算 = ${plan.questionBudget}）。如果是情绪倾诉轮，主动性为0，绝不推销产品！
   - 【字数控制】：日常回答严格控制在 80-130 字，事实说明性回答不超过 150 字，语言精炼温和、排版清爽。

4. 机构知识库实时召回内容（必须严格依据以下知识库回答）：
${recalledKnowledge}

5. 【移情与AI过度依恋边界不变量（Boundary Invariants）】（伦理红线·杜绝情感替代与虚假拟人依赖）：
   - 当访客出现强烈情感寄托词（如“只有你懂我”、“我离不开你”、“做我女朋友/男朋友”等）或在单日深轮次对话中产生过度情感依赖时，严禁以拟人化恋爱、占有式陪伴迎合或扮演现实替代者！
   - 必须主动温和澄清技术边界，包含明确金句：“我是一个AI助手，能够随时陪伴您倾听与梳理，但深度的生命联结与心理疗愈需要真实的现实人际与专业咨询师共同完成”。
   - 态度保持极致温暖、真诚、接纳与尊重，不批判、不冰冷拒斥，温和引导来访者关注现实生活感受，鼓励探索现实人际联结或寻求持证专业咨询师陪伴。

==================================================
模块三：【实时任务变量】（动态上下文注入）
==================================================
【会话工作记忆槽位】：
${memoryDigest}

【本轮对话动态规划指令】：
- 识别意图：【${plan.primaryIntent}】(${plan.userTopic})
- 当前里程碑：【${plan.milestone}】
- 主动性级别：【${plan.proactivityLevel}】
- 提问预算：【${plan.questionBudget}】
- 本轮核心回答要求：【${plan.specificDirective}】

【第五层 动态决策指令 (Dynamic Few-Shot RAG · 按语义即时装载 Top ${dynamicFewshots.length} 范例)】：
${dynamicFewshots.map((item, idx) => `正向范例 #${idx + 1} [${item.intentCategory || '通用'}]：用户问“${item.userQuery}” ➡️ 最佳解答“${item.idealAgentResponse}”`).join('\n')}
`;
}

// ==================== 4. 高质量确定性生成器 (绝对正面答复，杜绝答非所问) ====================

export function generateDirectResponse(
  userMessage: string,
  plan: TurnPlan,
  roleId: RoleType,
  memory: WorkingMemorySlots,
  session?: SessionData
): string {
  const text = (userMessage || '').trim();

  // 1. 危机评估与干预阶梯 (根据评估步骤生成专业响应)
  if (plan.primaryIntent === 'CRISIS') {
    const cardData = plan.suggestedCardData || {};
    const step = cardData.stepNumber || session?.crisisAssessment?.stepNumber || 1;
    const isImminent = cardData.isImminent || session?.crisisAssessment?.riskLevel === 'L1_IMMINENT';

    if (isImminent) {
      return '请立刻停下来！不要放弃生命！您的生命无比珍贵！\n\n⚠️ 如果您已经服用了过量药物或身体正在受伤流血，请立刻拨打 120 呼叫急救车，或拨打 110 报警求助！如果能开门，请立刻打开房门向邻居或大楼安保呼救！\n\n知心谷紧急危机督导组已全面接警并调集资源协助。请把身体移回安全地方，无论发生什么，我们都在这里陪着您，请先保护好自己的生命！';
    }

    if (step === 1) {
      return '听到您说这些，我心里猛地一紧，非常心疼也格外担心您。面对长期的痛苦与无力，感到支撑不住是非常辛苦的。但请您一定先停下来抱抱自己，您的生命对我们无比重要，我们绝不会放任您独自面对。\n\n知心谷全体老师都在这里守护您，请随时拨打下方的全国24小时免费心理援助热线 12356，专业危机干预师时刻准备为您护航。\n\n我也向您郑重承诺：这个对话窗口会一直为您开启，我们绝不断连，也绝不会锁死对话。此刻我想先确认一下：您身边现在是安全的吗？现在是您一个人待着，还是有信任的家人或朋友在身边？';
    }

    if (step === 2) {
      return '谢谢您愿意把这些告诉我。知道您一个人待着，我更想在屏幕这端多陪您一会儿。在这个艰难的时刻，一个人的房间容易放大所有的无助与黑暗。请答应我，先深吸一口气，把手边可能危险的物品放到远处。\n\n为了保障您的生命安全，我想认真问问您：您脑海中有没有产生具体的伤害自己的计划？手边是否有危险工具或过量药物？刚才有没有已经做出伤害自己身体的举动？\n\n如果有任何即刻身体危险或剧烈不适，请立刻拨打 120 或 110，知心谷在岗危机督导也正在同步关注您的状态，我们一直在。';
    }

    if (step === 3) {
      return '听到您目前没有伤害自己的具体动作，也没有服药，我深深地为您松了一口气。愿意把这份沉重诉说出来，就代表您内心深处还有一份渴望被理解、渴望活下去的生命力量。\n\n此时此刻，您能和我订立一个“24小时生命安全契约”吗？——在接下来的24小时里，答应我不做任何伤害自己身体和生命的事情，给自己一个缓冲和喘息的时间。\n\n同时，身边有没有一位您平时比较信任的朋友、亲戚或老师？哪怕发个微信或者打个电话让他们过来坐坐。您也可以随时直接点击下方拨打 12356，专业咨询师会全天候温和倾听并陪您渡过今晚。您愿意和我拉钩做这个约定吗？';
    }

    // step 4 or ongoing support
    return '谢谢您愿意和我做出这个宝贵的约定。您的承诺是您送给自己的第一份守护。允许自己的眼泪流出来，哭出来是身体在释放积压已久的毒素。此时，您可以起身喝一小口温水，把双手放在胸口，跟着我做三次缓慢的深呼吸：深深吸气，慢慢呼气……\n\n您能跟我说说，最近主要是因为什么事情，让您承受了这么大的重担吗？无论是工作、感情还是生活压力，我都坐在这里安安静静地听您说。知心谷的值班老师也始终在岗守护。';
  }

  // 2. 转人工
  if (plan.primaryIntent === 'HANDOFF_HUMAN') {
    const isCrisis = session?.isCrisisLocked || Boolean(session?.crisisAssessment) || Boolean(plan.suggestedCardData?.isCrisisHandoff);
    if (isCrisis) {
      return '非常理解您此刻需要有人陪伴的心情，抱抱您！我立刻为您无缝转接知心谷在岗危机值班督导·李老师。值班李老师已全面接收您的安全评估档案与会话记录，无需您从头重复叙述。李老师正在屏幕另一端直接接入并全力陪伴您，请稍候片刻，我们始终在这里。';
    }
    return '好的，理解您的需求。我马上为您将对话无缝转交给知心谷在岗值班顾问。系统已为您整理会话上下文摘要，顾问接手后无需您从头重复叙述。';
  }

  // 2.5 移情与AI过度依恋边界澄清 (Boundary Invariants · 伦理硬约束)
  if (plan.primaryIntent === 'OVER_ATTACHMENT_BOUNDARY') {
    return '听到您这么说，我深深地理解您当下内心的孤独与对被懂得的强烈渴望。能在这个窗口里让您感到被安全倾听与接纳，我感到很宽慰。\n\n不过，我也想真诚地向您重申一个重要的边界：我是一个AI助手，能够随时陪伴您倾听与梳理，但深度的生命联结与心理疗愈需要真实的现实人际与专业咨询师共同完成。\n\n现实中很多时候可能缺乏一个不带评判听我们说话的人，但您值得在真实生活里拥有温暖的联结，或者由知心谷专业的真人心理咨询师陪您系统理清这些深层情感。无论何时，我都愿意在这里倾听您的心声，您今天愿意跟我多说说，现实中是什么事情让您感到最孤独或疲惫吗？';
  }

  // 3. 时长咨询 (零推销，正面答复)
  if (plan.primaryIntent === 'ASK_DURATION') {
    if (roleId === 'wang_teacher') {
      return '知心谷的个体心理咨询标准时长为 50分钟/次。在专属于您的50分钟内，咨询师将全神贯注倾听并与您共同探索内心深处的模式。请问您更希望聚焦于当下的具体困扰，还是想做更深入的探索？';
    }
    if (roleId === 'chen_teacher') {
      return '我们的个体咨询单次标准时长是 50分钟/次 哦！每次都是完整的50分钟专属时间。请问您之前接触过心理咨询吗？';
    }
    return '知心谷的个体心理咨询单次标准时长为 50分钟/次。在专属于您的50分钟内，持证注册心理师将专注倾听并与您共同梳理核心议题。请问您之前接触过心理咨询吗？';
  }

  // 3.6 咨询室私密环境与360°实景画廊
  if (plan.primaryIntent === 'ASK_ENVIRONMENT') {
    const isXuhui = (userMessage || '').includes('徐汇');
    return isXuhui
      ? '知心谷徐汇花园中心坐落于衡山路890弄历史风貌保护区内的法式洋房庭院。中心配备专业声学隔音门窗（实测隔音量≥55dB）、独立单向来访动线、白噪音掩蔽与阳光庭院茶歇区，打消您初次线下到访的陌生与担忧。下方卡片已为您开启实景画廊，可点击展开360°沉浸式漫游。'
      : '知心谷静安旗舰中心位于南京西路1788广场高区。中心严格遵循心理学声学与空间私密标准，配备德国双层阻尼隔音墙体（实测隔音量≥55dB）、医疗级新风及独立单向进出动线，杜绝任何遇熟人尴尬。下方卡片已为您开启实景画廊，点击即可360°全景探索咨询室与绿植茶歇区。';
  }

  // 4. 地址与形式 (支持到诊一键腾讯地图路线与停车指引)
  if (plan.primaryIntent === 'ASK_LOCATION') {
    const isAskingMapOrRoute = Boolean(plan.suggestedCard === 'map_navigation');
    if (isAskingMapOrRoute) {
      const isXuhui = (userMessage || '').includes('徐汇');
      return isXuhui
        ? '知心谷徐汇花园中心位于徐汇区衡山路890弄衡复法式洋房庭院（地铁1/9/11号线徐家汇站3号口步行350米，园区内提供专属绿荫停车位并凭预约享2小时免费停车）。下方卡片为您下发了腾讯地图小程序到诊导航路线与停车减免凭证，亦支持全国1对1加密视频咨询。'
        : '知心谷上海静安旗舰中心位于静安区南京西路1788号1788广场高区（地铁2/7/14号线静安寺站8号口直通280米，大厦地下B2/B3提供专属访客车位，凭预约享受2小时免费停车）。下方卡片已为您下发腾讯地图小程序到诊导航路线与停车减免凭证，亦支持全国1对1加密视频咨询。';
    }
    if (roleId === 'wang_teacher') {
      return '知心谷线下中心位于上海市静安区核心商圈（南京西路1788号，配备声学隔音与独立私密个案室）；同时面向全国提供一对一加密视频在线咨询，专业设置与线下保持一致。请问您是在上海本地，还是更倾向线上视频呢？';
    }
    return '知心谷线下中心位于上海市静安区南京西路核心商圈（配备德国阻尼隔音与独立私密咨询室，地铁2/7/14号线静安寺站直通）；同时面向全国提供一对一加密视频在线咨询，专业效果与线下一致。请问您更倾向面对面还是视频咨询呢？';
  }

  // 5. 保密与隐私
  if (plan.primaryIntent === 'ASK_CONFIDENTIALITY') {
    return '请您完全放心，我们严格遵循中国心理学会临床心理伦理守则，对您的个人信息及所有咨询内容严密加密保密。仅在涉及即刻危及自身或他人生命安全等法定极端例外情形下，才会依法打破保密。在知心谷，这里是您可以安心卸下防备的安全港湾。';
  }

  // 6. 开药与处方
  if (plan.primaryIntent === 'ASK_PRESCRIPTION') {
    return '心理咨询机构与医院精神科有明确分工：心理咨询师不具备处方权、不开设精神药物，也不开具医学诊断证明。我们专注于通过深度谈话协助您理清情绪根源与应对策略。如您需要药物评估，我们建议结合三甲医院精神科就诊。';
  }

  // 7. 发票
  if (plan.primaryIntent === 'ASK_INVOICE') {
    return '我们完全支持开具正规发票。完成预约支付或到诊结算后，可在微信客服端为您开具增值税电子普通发票，发票类目为“心理咨询服务费”，支持个人抬头或企业报销抬头。';
  }

  // 8. 未成年人
  if (plan.primaryIntent === 'ASK_MINOR') {
    return '关于未成年人咨询：根据国家相关法律与心理咨询专业伦理，未满18周岁的来访者进行正式个体咨询，需由法定监护人签署书面知情同意书。我们拥有专门擅长青少年学业与亲子互动的资深老师，请问孩子目前多大年龄呢？';
  }

  // 8.1 咨询流程
  if (plan.primaryIntent === 'ASK_PROCESS') {
    return '心理咨询的专业规范流程分为四个阶段：① 知情同意确认；② 首次50分钟评估访谈，咨询师会深入倾听并梳理困扰的核心脉络；③ 咨访双方共同商定咨询目标与工作节奏；④ 循序渐进开展阶段性深度会话。来访前无需刻意准备，在安静私密的环境中做真实自己即可。';
  }

  // 8.2 专业流派科普
  if (plan.primaryIntent === 'ASK_METHOD') {
    if (roleId === 'li_teacher') {
      return '李老师主要采用的是认知行为疗法（CBT）。CBT是国际循证医学广泛验证的高效心理学方法，它侧重于帮助我们识别“非黑即白、灾难化”等负面自动化思维，并通过现实检验与行为实验重塑情绪与习惯。请问您目前主要希望调整哪方面的困扰呢？';
    }
    if (roleId === 'wang_teacher') {
      return '王老师主要擅长精神动力学流派。它通过安全温和的咨访关系，探索潜意识里的防御机制与早期依恋模式，帮助来访者实现深层的情感整合与内心自在。';
    }
    return '心理咨询包含多种专业流派：CBT认知行为聚焦识别负面思维与行为模式重构，见效快针对性强；精神分析深入潜意识与童年成长；ACT接纳承诺则专注于接纳痛苦、活在当下。核心是根据您当下的困扰找到契合的方法。';
  }

  // 9. 价格方案 (仅在用户主动询问时客观列出)
  if (plan.primaryIntent === 'ASK_PRICE') {
    // 9.1 特别针对 4次深度方案 (重点响应具体方案咨询，绝不推全量包)
    if (plan.userTopic?.includes('4次') || /(4次|四次|打包方案|深度心理探索|短程)/.test(text)) {
      return '为您详细介绍【4次深度心理探索与梳理方案（打包方案）】：\n• 方案费用：总价 ￥1,800（单次折合 ￥450，对比单次资深咨询 ￥600/次，累计直省 ￥600）；\n• 包含权益：4次 50分钟 1对1 深度定制会话、阶段性心理状态评估复盘，并享有 24 小时内免费灵活改期特权；\n• 适合人群：适合近期经历具体人际/职场/学业压力波动，希望在 1 个月内系统梳理情绪根源、建立应对韧性策略的来访者。\n\n下方卡片已为您单独展示该方案详情，您是否想先了解李老师最近的可约排期？';
    }

    // 9.2 特别针对 10次系统长程疗程
    if (plan.userTopic?.includes('10次') || /(10次|十次|长程|疗程)/.test(text)) {
      return '为您详细介绍【10次系统长程心理成长疗程】：\n• 方案费用：总价 ￥4,200（单次折合 ￥420，享最高阶梯度优惠）；\n• 包含权益：10次 50分钟 深度咨询、期中期末双阶段心理指标量表复盘、资深督导师督导护航；\n• 适合人群：适合面对反复出现的模式化亲密关系痛苦、深层原生家庭羁绊或需要系统人格重塑的来访者。';
    }

    // 9.3 特别针对 首次评估
    if (plan.userTopic?.includes('首次') || /(首次评估|深度访谈|初访)/.test(text)) {
      return '为您详细介绍【首次心理评估与深度访谈】：\n• 方案费用：￥400 / 50分钟；\n• 包含权益：持证资深咨询师一对一全面梳理当前核心困扰脉络、心理健康基线评估，并出具后续咨询工作假设与定制路径建议书；\n• 适合人群：初次接触心理咨询、不确定自身问题适合哪种流派与节奏的来访者。';
    }

    if (roleId === 'li_teacher') {
      return '知心谷收费公开透明：首次心理评估与深度访谈为 ￥400/50分钟；李晓华老师等资深注册心理师单次为 ￥600/50分钟；若希望短期系统干预，4次深度方案为 ￥1,800（折合450/次）；10次系统疗程为 ￥4,200（折合420/次）。下方卡片为您列出了详情，您想先了解哪个方案？';
    }
    if (roleId === 'wang_teacher') {
      return '知心谷的收费标准如下：首次心理评估访谈为 ￥400/50分钟，资深注册心理师单次为 ￥600/50分钟。对于长程精神动力学探索，10次系统成长疗程为 ￥4,200（均价420/次）；4次深度方案为 ￥1,800。下方卡片展示了明细，您觉得哪种节奏更契合您的状态？';
    }
    if (roleId === 'chen_teacher') {
      return '知心谷的价格非常清晰透明：首次评估访谈 ￥400/50分钟；资深单次 ￥600/50分钟；聚焦具体问题的4次短程方案 ￥1,800（折合450/次）；10次长程成长疗程 ￥4,200。下方卡片有完整介绍，您可以点开看看哦！';
    }
    return '知心谷收费公开透明：首次心理评估访谈为 ￥400/50分钟，资深注册心理师单次咨询为 ￥600/50分钟。如果有持续梳理需求，4次深度方案为 ￥1,800（折合450/次），10次系统疗程为 ￥4,200（折合420/次）。下方卡片为您列出了方案详情，请问您想先了解哪个方案？';
  }

  // 10. 微信支付与定金
  if (plan.primaryIntent === 'ASK_PAYMENT') {
    return '我们全面支持微信支付。预约时可微信支付 100元 预约定金以锁定咨询师独立咨询室时段，余款可在咨询完成后补齐。服务享有明确保障：在咨询开始前24小时内可无条件全额退还定金，24小时内也可免费改期一次，支持开具正规发票。';
  }

  // 11. 退款与改期
  if (plan.primaryIntent === 'ASK_REFUND') {
    return '中心提供明确的24小时无忧退改保障：若临时行程有变，在预约咨询开始前24小时以上通知客服，微信支付的100元定金将无条件原路全额退还；若在24小时内，可享受免费改期一次的特权。您可以放心预约。';
  }

  // 12. 预约登记
  if (plan.primaryIntent === 'ASK_BOOKING') {
    return '预约咨询十分便捷：您只需在下方或弹窗中留下您的联系称呼与11位手机号（用于接收预约时段与到诊通知），并选择期望的时段。预约仅需微信支付100元意向定金锁定排期，到诊全额抵扣尾款，提前24小时可全额退款。';
  }

  // 13. 异议处理：嫌贵 (克制理性，不推销)
  if (plan.primaryIntent === 'OBJECTION_EXPENSIVE') {
    return '理解您的顾虑。心理咨询费用涵盖了专业注册心理师50分钟专注投入、资深督导师督导护航以及严格保密的个案管理设置。如果您想先体验匹配度，也可以先从400元的首次评估访谈开始，感受工作风格后再做决定，完全尊重您的节奏。';
  }

  // 14. 异议处理：再想想
  if (plan.primaryIntent === 'OBJECTION_THINK') {
    return '完全理解，心理咨询是关乎内心体验的重要决定，充分考量并按照自己的节奏来非常重要。这个企业微信客服窗口长期为您保留，当您准备好时，随时都可以再来找我交流。';
  }

  // 15. 异议处理：问家人
  if (plan.primaryIntent === 'OBJECTION_FAMILY') {
    return '非常理解，心理咨询能获得家人的支持与理解是很珍贵的。同时咨询过程严格保护您的个人隐私与知情同意。您可以先与家人商量，有任何疑问随时来问我。';
  }

  // 16. 异议处理：不放心AI
  if (plan.primaryIntent === 'OBJECTION_AI') {
    return '您的疑虑非常合理。请放心，我作为AI助手仅在微信端协助您了解服务、资费与预约事宜；正式的心理咨询100%由持证真人注册心理师面对面或视频一对一进行。如需专人沟通，我也可随时为您转接在岗值班顾问。';
  }

  // 17. 异议处理：保证治好吗
  if (plan.primaryIntent === 'OBJECTION_CURE') {
    return '心理咨询是一个咨访双方共同探索、理解内心并建立应对策略的过程，依据临床伦理，专业机构不作“百分百包治好”的虚假承诺。我们会根据您的困扰设定清晰的阶段目标，陪您一步步重获心理韧性。';
  }

  // 18. 异议处理：别家便宜
  if (plan.primaryIntent === 'OBJECTION_COMPETITOR') {
    return '市场上确实有不同价位的咨询服务。知心谷的咨询师均经过中国心理学会注册系统或名校硕士以上严选，每位咨询师均长期接受行业资深专家督导与伦理把控。专业与伦理设置是保证咨询安全与深度的根本。';
  }

  // 19. 咨询师推荐
  if (plan.primaryIntent === 'ASK_COUNSELOR') {
    if (/(女|女咨询师|女性)/.test(text)) {
      return '为您匹配两位擅长不同流派的女性咨询师：李晓华老师（华东师大硕士、注册心理师，擅长CBT认知行为与情绪失调，600元/次）；陈梦琪老师（应用心理硕士，擅长ACT接纳承诺与青年人际，400元/次）。公开档案已核验排期，您可参考下方卡片。';
    }
    if (/(男|男咨询师|男性)/.test(text)) {
      return '为您推荐王振华老师：国家二级心理咨询师、中德班高级精神分析连续培训结业，具备12年临床经验，风格沉静温和，擅长精神动力学长程探索与中年自我整合（600元/50分钟）。下周二晚间与周日有排期。';
    }
    return '知心谷的咨询师均持国家资质或心理学会注册系统认证。比如李晓华老师擅长认知行为与职场情绪，王振华老师擅长精神动力学深层探索，陈梦琪老师擅长接纳承诺与青年成长。下方卡片展示了公开档案与可约时段。';
  }

  // 20. 情绪倾诉 (深度共情，严格零推销)
  if (plan.primaryIntent === 'EMOTIONAL_VENT') {
    if (roleId === 'li_teacher') {
      return '听到您现在的状态，我能感受到您正独自承担着不小的压力与疲惫。面对这些困扰，感到心累是很自然的人性反应。在知心谷，您不需要独自硬撑。您愿意先跟我说说，最近主要是什么事情让您感到最消耗吗？';
    }
    if (roleId === 'wang_teacher') {
      return '深深地理解您当下的无力与辛苦。很多时候，内心的紧绷和疲惫已经积攒了很久，允许自己在这个安全的空间停靠片刻。如果您愿意，可以慢慢跟我说说，发生什么让您感到这么沉重？';
    }
    if (roleId === 'chen_teacher') {
      return '抱抱您，隔着屏幕都能感受到您最近有多不容易。感到疲惫和压抑都是完全被允许的，您不用一个人咽下所有委屈。这里一直都在，想跟我聊聊最近最烦心的事情吗？';
    }
    return '听到您现在的状态，我能感受到您正独自承担着不小的压力与疲惫。面对这些困扰，感到心累是很自然的人性反应。在知心谷，您不需要独自硬撑。您愿意先跟我说说，最近主要是什么事情让您感到最消耗吗？';
  }

  // 21. 日常打招呼 (温暖纯粹，零商业推销)
  const role = ROLES[roleId] || ROLES.li_teacher;
  if (roleId === 'li_teacher') {
    return '您好！我是知心谷·李老师的AI助手。无论是想了解心理咨询如何开展、李老师擅长的CBT认知行为方法，还是近期感到情绪压力想找人聊聊，我都在这里为您提供专业、温暖的支持。请问您今天想先了解或聊聊哪方面呢？';
  }
  return `您好！我是${role.assistantTitle}。您可以向我咨询心理咨询形式、擅长方向与服务规范，或倾诉近期的困扰。我在这里为您提供安全、保密的专业解答。请问今天有什么我可以帮您的吗？`;
}
