# 🔥 HotPAgent - 多平台热榜爆点分析 Agent

<div align="center">

**自动化抓取抖音、微博、知乎热榜，结合 LLM 语义分析，智能识别社会级爆点话题**

[![Python Version](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

[快速开始](QUICKSTART.md) • [完整文档](README.md) • [架构设计](ARCHITECTURE.md) • [API 文档](API_USAGE.md)

</div>

---

## ✨ 核心功能

- **多源数据爬取**: 并发抓取微博、抖音、知乎热榜前 50 条数据
- **LLM 智能分析**: 使用 GPT-4 分析话题性质、社会影响力和讨论深度
- **综合评分算法**: 归一化处理热度值，结合 LLM 评分计算综合得分
- **自动化调度**: 支持定时执行（默认每小时一次）
- **数据持久化**: JSON 格式保存所有话题、爆点话题和统计信息

## 🏗️ 技术架构

```
HotPAgent/
├── scrapers/              # 爬虫模块
│   ├── base_scraper.py   # 爬虫基类
│   ├── weibo_scraper.py  # 微博爬虫
│   ├── douyin_scraper.py # 抖音爬虫
│   └── zhihu_scraper.py  # 知乎爬虫
├── models.py              # 数据模型
├── llm_analyzer.py        # LLM 分析器
├── scoring_engine.py      # 评分引擎
├── agent.py               # Agent 主控制器
├── scheduler.py           # 调度器
├── config.py              # 配置管理
├── main.py                # 程序入口
└── output/                # 输出目录
```

## 🚀 快速开始

### 1. 环境准备

```bash
# Python 3.10+
pip install -r requirements.txt

# 安装 Playwright 浏览器
playwright install chromium
```

### 2. 配置

复制 `.env.example` 为 `.env` 并填写配置:

```bash
cp .env.example .env
```

编辑 `.env`:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1
LLM_MODEL=gpt-4-turbo-preview
SCORE_THRESHOLD=80
SCHEDULE_INTERVAL=1
```

### 3. 运行

```bash
python main.py
```

选择运行模式:
- **模式 1**: 单次执行（运行一次后退出）
- **模式 2**: 定时调度（每隔 N 小时自动执行）

## 📊 输出结果

所有结果保存在 `output/` 目录:

### 1. `all_topics_YYYYMMDD_HHMMSS.json`
包含所有话题的完整数据和评分

```json
[
  {
    "platform": "weibo",
    "title": "某重大事件",
    "heat_score": 4521234,
    "link": "https://...",
    "normalized_heat": 95.6,
    "normalized_discussion": 88.3,
    "total_score": 92.4,
    "is_breakout": true,
    "llm_analysis": {
      "topic_nature": "社会新闻",
      "social_impact": 9,
      "discussion_depth": 8,
      "potential_score": 9,
      "reason": "..."
    }
  }
]
```

### 2. `breakout_topics_YYYYMMDD_HHMMSS.json`
仅包含评分 ≥ 阈值的爆点话题

### 3. `statistics_YYYYMMDD_HHMMSS.json`
统计信息（总数、平均分、平台分布等）

### 4. `predict/predict_events_YYYYMMDD_HHMMSS.json`
预测市场事件格式输出（每条话题生成一个可预测事件）

## ⚙️ 核心算法

### 综合评分公式

```
TotalScore = (归一化热度 × 0.5) + (归一化讨论量 × 0.3) + (LLM潜力分×10 × 0.2)
```

- **归一化热度**: 将各平台热度值归一化到 0-100
- **归一化讨论量**: 评论数、回答数归一化到 0-100
- **LLM 潜力分**: GPT-4 评估的 1-10 分乘以 10

### LLM 分析维度

1. **话题性质**: 娱乐/社会新闻/科技/虚假信息等
2. **社会影响力** (1-10): 影响范围和深度
3. **讨论深度** (1-10): 引发思考的潜力
4. **综合潜力分** (1-10): 成为"社会级爆点"的可能性

## 🛠️ 配置说明

### config.py 主要参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `SCORE_THRESHOLD` | 80 | 爆点话题评分阈值 |
| `FETCH_LIMIT` | 50 | 每平台抓取数量 |
| `WEIGHT_HEAT` | 0.5 | 热度权重 |
| `WEIGHT_DISCUSSION` | 0.3 | 讨论量权重 |
| `WEIGHT_LLM` | 0.2 | LLM 评分权重 |
| `SCHEDULE_INTERVAL` | 1 | 调度间隔（小时） |

## 📝 注意事项

1. **爬虫稳定性**: 网站页面结构可能变化，需要定期维护爬虫代码
2. **反爬机制**: 建议设置合理的请求间隔，避免 IP 被封
3. **API 成本**: LLM 分析会产生 API 调用费用，注意控制频率
4. **数据准确性**: 评分算法可根据实际需求调整权重

## 🔧 扩展建议

- [ ] 添加更多平台（小红书、B站等）
- [ ] 支持话题趋势追踪（历史数据对比）
- [ ] 集成推送通知（邮件/微信/钉钉）
- [ ] 可视化 Dashboard
- [ ] 话题关联分析

## 📄 许可证

MIT License
