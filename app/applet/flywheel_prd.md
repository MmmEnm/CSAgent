# 《智能客服数据飞轮与闭环功能设计文档》

---

## 文档概述
* **产品名称**：知心谷心理咨询中心 AI 智能体客服与数据飞轮中台
* **文档版本**：v2.7 (Feedback Loop Enhanced)
* **核心目的**：阐述数据标注飞轮、RAG 版本控制、人工客服平滑介入、ABC 意向分级漂移对齐、全流程业务时序图、元数据存储结构及**全链路多维反馈机制优化方案**。

---

## 一、 数据标注与自演进流程（Data Annotation & Flywheel Loop）

本模块解决 AI 在真实心理咨询场景中“遇到未见问题容易失误”的痛点，通过人工管理员复核构建自动化数据飞轮。

### 1. 业务流程设计
```
[访客端真实对话] ──> [多维结构化反馈与差评捕获] ──> [管理员后台 Bad Case 待办队列]
                                                              │
         ┌────────────────────────────────────────────────────┴────────────────────────────────────────────────────┐
         ▼                                                                                                         ▼
[归因类别: 事实知识检索缺漏]                                                                                 [归因类别: 异议处理/应答话术不佳]
         │                                                                                                         │
         ├─> 点击【一键转为 FAQ 草稿】                                                                                ├─> 点击【一键沉淀 Few-Shot 范例】
         │                                                                                                         │
         ▼                                                                                                         ▼
[知识库待审池 ──> 终审发布 ──> 向量化入库]                                                                   [动态 Few-Shot 索引库 ──> 按需挂载]
         │                                                                                                         │
         └────────────────────────────────────────────┬────────────────────────────────────────────────────────────]
                                                      ▼
                                     [AI 运行时检索与动态注入 ──> 效果自演进]
```

### 2. 核心功能逻辑
* **Bad Case 标注**：管理员在管理后台对历史对话进行多维归因打标（事实知识缺漏、异议处理生硬、合规红线等）。
* **Few-Shot / FAQ 转换**：
  * 针对事实知识缺漏，一键转化为知识库 FAQ 草稿，人工终审后向量化入库。
  * 针对话术与异议处理不佳，一键沉淀为正向 Few-Shot 范例。
* **Prompt 动态更新**：运行时根据用户当前意图动态召回最相关的 2 条正向范例，避免 System Prompt 无限膨胀，保证 Token 占用最小、响应最快。

---

## 二、 RAG 知识库版本管理流程（Knowledge Base Version Control）

知识库是 AI 客服的大脑基石。为确保企业知识资产安全、可审计、可回滚，设计了严格的版本生命周期管理。

### 1. 业务流程设计
```
[管理员上传 FAQ 文档 (PDF/TXT/DOCX)] ──> [手动设置版本号 (如 v1.0, v1.1)] ──> [版本正式生效与向量索引构建]
                                                    │
                                        ┌───────────┴───────────┐
                                        ▼                       ▼
                           [双栏 Side-by-Side 对比]    [发现召回异常/版本冲突]
                                        │                       │
                                        ▼                       ▼
                           [高亮展示文本增删差异]     [点击【快速回滚至此版本】]
                                        │                       │
                                        └───────────┬───────────┘
                                                    ▼
                                     [二次确认对话框 ──> 瞬间切换并重建索引]
```

### 2. 核心功能逻辑
* **知识入库与版本号维护**：支持多格式文件上传，必须/支持手动输入版本号，记录完整变更历史。
* **对比与高亮**：提供双栏对比视图，选中两个版本时高亮显示文本增删差异（新增绿色、删除红色）。
* **快速回滚**：提供“快速回滚至此版本”的安全确认弹窗，一键切回历史稳健版本，保障线上服务零事故。

---

## 三、 人工客服介入机制（Human-in-the-Loop Takeover & Fallback）

在心理咨询与高客单价服务中，AI 无法替代人工深度共情。系统提供无缝的人工接管与回退机制。

### 1. 业务流程设计
```
[AI 触发危机 / 访客情绪崩溃 / 管理员主动监控] ──> [管理员点击【接管会话 (Takeover)】]
                                                        │
                                                        ▼
                                         [会话状态机变更为 HUMAN_TAKEOVER]
                                                        │
                                                        ▼
                                         [微信端平滑下发过渡提示文案]
                                                        │
                                                        ▼
                                         [人工坐席在后台实时文本交互]
                                                        │
                                                        ▼
                                         [问题妥善解决 ──> 点击【恢复 AI 接管】]
                                                        │
                                                        ▼
                                         [生成对话摘要 ──> 注入 AI 记忆缓存 ──> 平滑切回 AI]
```

### 2. 核心功能逻辑
* **会话接管 (Takeover)**：后台一键接管，AI 自动暂停，状态变更为 `HUMAN_TAKEOVER`。
* **人工处理 (Human Workspace)**：坐席端实时协同沟通，查阅访客历史心理档案。
* **平滑回退 (Fallback)**：人工处理完毕后点击“恢复 AI 接管”，系统自动归纳对话摘要注入上下文，AI 无缝接续，访客体验连贯无感。

---

## 四、 意向分级（ABC Lead）漂移监控与分类器对齐逻辑（ABC Drift Monitoring）

针对潜在客户的意向识别，防止业务术语或用户表达方式漂移导致营销与服务错配。

### 1. 业务流程设计
```
[全量对话流量] ──> [ABC 意向分类器 (L4/L5 动态识别层)]
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
    [A类: 高意向/即时转化]    [B类: 潜在咨询/价格观望]    [C类: 科普/闲聊/非目标]
            │                           │
            └─────────────┬─────────────┘
                          ▼
             [ABC 漂移报表 (监控识别准确率与偏移词)]
                          │
                          ▼
             [管理员后台发现高频纠偏词 (如 "15s语音名片")]
                          │
                          ▼
             [点击【一键对齐分类器规则】 ──> 动态注入 L4/L5 识别层]
```

### 2. 核心功能逻辑
* **意向分级定义**：
  * **A 类（高意向）**：明确表达付费咨询意愿、预约时间或强迫/焦虑症状急需干预者。
  * **B 类（潜在咨询）**：询问价格、咨询师资质、流派对比、处于观望期者。
  * **C 类（科普/闲聊）**：纯科普查阅、闲聊、非目标心理咨询受众。
* **漂移监控与对齐逻辑**：
  * 系统定期生成 ABC 漂移报表，捕获未被准确识别的高频新词汇（如“15s语音名片”、“腾讯地图导航”等干扰或垂类词汇）。
  * 管理员在报表中点击**“一键对齐分类器规则”**，将高频纠偏词自动注入底层分类器（L4/L5），实现识别规则的自动化对齐与模型持续进化。

---

## 五、 全链路多维反馈机制优化方案 (Optimized Multi-Dimensional Feedback Mechanism)

为使数据飞轮源头的“Bad Case 发现率”和“访客诉求捕捉率”达到行业领先水平，系统对反馈机制进行了深度优化：

### 1. 访客端多维结构化反馈（Visitor Multi-Dimensional Feedback）
* **痛点**：传统客服仅支持简单的“点赞/点踩”，无法得知用户对回答不满意的原因是“事实错误”、“语气生硬”还是“价格疑问”。
* **优化方案**：
  * **结构化标签选择**：当访客点击“点踩 (Thumb Down)”时，系统弹出一个轻量级标签选择器，支持勾选细分原因：
    * `[事实与医学合规错误]`
    * `[价格/退款政策疑惑]`
    * `[共情不足/机器人语气生硬]`
    * `[危机干预反应迟钝]`
  * **自由评语补充**：支持访客输入 100 字以内的文字补充说明。

### 2. 管理员侧 Bad Case 智能聚类与待办队列（Admin Intelligent Triaging）
* **优化方案**：
  * 访客端提交的细分标签与评语，将直接作为元数据写入 `chat_logs`。
  * 管理员后台的 Bad Case 队列将根据访客反馈的标签自动进行**智能聚类与优先级排序**（如“合规错误”与“危机缺漏”自动置顶为 P0 级待办）。
  * 管理员可在待办队列中一键直达上下文，并完成一键转 FAQ 草稿或转 Few-Shot 范例。

### 3. 算法端闭环加权与自适应调整（Algorithmic Feedback Weighting）
* **优化方案**：
  * 针对获得多次负向反馈的 RAG 召回片段，系统自动降低其知识点权重 (`weight_score`) 或触发自动下架提醒。
  * 针对高频正向反馈的 Few-Shot 范例，系统自动提升其动态挂载优先级，形成良性自适应演进。

---

## 六、 数据飞轮全流程业务时序图 (End-to-End Sequence Flow)

```
访客(Visitor)      AI引擎(AI Engine)      管理员(Admin)      资产库(KB/FewShot)      重训流水线(Pipeline)
    │                     │                     │                     │                     │
    │── 1. 发起心理咨询 ──>│                     │                     │                     │
    │                     │── 2. RAG检索/FewShot─>│                     │                     │
    │<── 3. 返回温情回答 ──│                     │                     │                     │
    │                     │                     │                     │                     │
    │── 4. 提交多维结构化 ─>│                     │                     │                     │
    │   反馈(点踩+标签)   │── 5. 记录结构化日志 ─>│                     │                     │
    │                     │   (标记 Bad Case)   │                     │                     │
    │                     │                     │                     │                     │
    │                     │                     │── 6. 后台审计归因 ──>│                     │
    │                     │                     │   (智能聚类与P0排序) │                     │
    │                     │                     │                     │                     │
    │                     │                     │── 7. 一键转化为 ────>│                     │
    │                     │                     │   FAQ草稿/FewShot   │                     │
    │                     │                     │                     │                     │
    │                     │                     │                     │── 8. 触发自动化 ───>│
    │                     │                     │                     │   重训与向量重建     │
    │                     │                     │                     │                     │
    │                     │<── 9. 实时加载更新后的向量索引与动态范例 ───────────────────────┘
    │                     │                     │                     │                     │
    │── 10. 新咨询发起 ──>│                     │                     │                     │
    │<── 11. 高精度回答 ───│ (飞轮闭环完成，效果显著提升)                                     │
```

---

## 七、 数据飞轮在数据库中的元数据存储结构 (Database Metadata Schema)

支撑全链路反馈机制的核心表结构设计如下：

### 1. `chat_logs` (对话日志与多维反馈表)
```sql
CREATE TABLE chat_logs (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  visitor_id VARCHAR(64) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  retrieved_faq_ids JSONB,
  few_shot_ids JSONB,
  user_feedback VARCHAR(32),        -- 'thumb_up', 'thumb_down'
  feedback_tags JSONB,             -- ['fact_missing', 'tone_bad', 'pricing_friction']
  feedback_comment TEXT,           -- 访客自由评语
  is_bad_case BOOLEAN DEFAULT FALSE,
  attribution_category VARCHAR(64),
  admin_notes TEXT,
  converted_target_type VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `knowledge_base_versions` (知识库版本与文件管理表)
```sql
CREATE TABLE knowledge_base_versions (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  version_number VARCHAR(32) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  content_text TEXT NOT NULL,
  diff_summary JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `faq_items` (FAQ 知识点与权重表)
```sql
CREATE TABLE faq_items (
  id SERIAL PRIMARY KEY,
  kb_version_id INT REFERENCES knowledge_base_versions(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  embedding_vector VECTOR(1536),
  weight_score FLOAT DEFAULT 1.0,      -- 根据用户反馈动态调整的权重
  status VARCHAR(32) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `few_shot_examples` (动态 Few-Shot 范例索引表)
```sql
CREATE TABLE few_shot_examples (
  id SERIAL PRIMARY KEY,
  intent_category VARCHAR(64) NOT NULL,
  user_query TEXT NOT NULL,
  exemplar_response TEXT NOT NULL,
  weight_score FLOAT DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. `classifier_rules` (分类器纠偏与漂移对齐规则表)
```sql
CREATE TABLE classifier_rules (
  id SERIAL PRIMARY KEY,
  rule_type VARCHAR(32) NOT NULL,
  keyword_pattern VARCHAR(255) NOT NULL,
  target_layer VARCHAR(32) NOT NULL,
  action_effect JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
