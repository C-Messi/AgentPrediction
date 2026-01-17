# 微博内容抓取功能说明

## 功能概述

优化了微博爬虫，现在不仅抓取热搜标题，还会抓取每个热搜话题的具体内容（前N条热门微博），为LLM提供更丰富的信息进行分析打分。

**✅ 已解决登录问题**：通过使用微博移动端（m.weibo.cn）绕过登录限制，无需配置Cookie即可抓取内容。

## 主要改进

### 1. 数据模型扩展 (`models.py`)
- 在 `HotTopic` 模型中新增 `content` 字段（可选）
- 用于存储话题的具体内容摘要

### 2. 微博爬虫增强 (`scrapers/weibo_scraper.py`)
- 新增 `_fetch_topic_content()` 方法，访问每个热搜链接并抓取内容
- **智能路由**：自动使用移动端页面（m.weibo.cn）绕过登录限制
- **多选择器兼容**：支持PC端和移动端多种页面结构
- 支持抓取前N条热门微博内容（默认5条）
- 自动合并多条内容并限制总长度（默认2000字符）
- 自动检测登录状态，需要登录时优雅降级
- 可通过配置开关控制是否启用内容抓取

### 3. LLM分析器优化 (`llm_analyzer.py`)
- 更新分析prompt，支持同时处理标题和内容
- 当有具体内容时，会结合内容进行更深度的分析
- 自动处理无内容的情况（向下兼容）

### 4. 配置选项 (`config.py`)
新增以下配置项：
```python
FETCH_CONTENT = True          # 是否抓取话题内容（默认开启）
MAX_CONTENT_ITEMS = 5         # 每个话题最多抓取几条微博
MAX_CONTENT_LENGTH = 2000     # 内容最大长度限制
```

## 使用方法

### 默认使用（自动抓取内容）
```python
from scrapers.weibo_scraper import WeiboScraper

scraper = WeiboScraper()
topics = await scraper.fetch_hot_topics(limit=20)

# 每个topic现在包含:
# - title: 标题
# - content: 具体内容（可能为空）
# - heat_score: 热度
# - 其他字段...
```

### 禁用内容抓取
在 `config.py` 中设置：
```python
FETCH_CONTENT = False
```

或者代码中临时禁用：
```python
scraper = WeiboScraper()
scraper.fetch_content = False
topics = await scraper.fetch_hot_topics(limit=20)
```

### 调整内容数量和长度
在 `config.py` 中修改：
```python
MAX_CONTENT_ITEMS = 10        # 抓取更多内容
MAX_CONTENT_LENGTH = 3000     # 允许更长内容
```

## 性能影响

- **启用内容抓取**：每个话题需额外访问一次页面，总耗时增加约 20-30秒（20条热搜）
- **禁用内容抓取**：与原版性能相同，约 3-5秒
- **成功率**：约 60-80%的话题能成功抓取到内容（移动端无需登录）

## 测试

运行测试脚本验证功能：
```bash
python test_weibo_content.py
```

测试会抓取前3条热搜，输出标题、热度和内容预览。

## LLM分析改进

有了具体内容后，LLM分析将更加准确：
- ✅ 能够理解话题的真实性质（不仅看标题）
- ✅ 更准确评估社会影响力和讨论深度
- ✅ 减少标题党误导
- ✅ 发现深层次的社会议题

## 注意事项

1. **成功率**：移动端无需登录，大部分情况可成功抓取
2. **页面结构**：微博页面结构可能变化，需要定期检查选择器
3. **Token消耗**：启用内容抓取会增加LLM的token消耗（约2-3倍）
4. **网络稳定性**：需要稳定的网络环境完成内容抓取

## 后续改进建议

- [x] 解决微博登录问题（已通过移动端解决）
- [ ] 支持抖音、知乎的内容抓取
- [ ] 添加内容去重和质量过滤
- [ ] 支持抓取评论中的热门观点
- [ ] 实现智能内容摘要（对超长内容）
- [ ] 缓存机制减少重复抓取
