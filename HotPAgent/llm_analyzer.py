from typing import List
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from models import HotTopic, LLMAnalysis
from config import Config
from loguru import logger
import json


class LLMAnalyzer:
    """LLM 语义分析器"""

    def __init__(self):
        self.llm = ChatOpenAI(
            model=Config.LLM_MODEL,
            openai_api_key=Config.OPENAI_API_KEY,
            openai_api_base=Config.OPENAI_API_BASE,
            temperature=0.3,
        )

        self.parser = PydanticOutputParser(pydantic_object=LLMAnalysis)

        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """你是一个专业的社会热点分析专家，擅长判断网络话题的性质和影响力。
            
你需要分析话题标题和具体内容，评估其：
1. 话题性质（娱乐/社会新闻/科技/虚假信息/其他）
2. 社会影响力（1-10分）：话题对社会的影响范围和深度
3. 讨论深度（1-10分）：话题引发深度思考和讨论的潜力
4. 综合潜力分（1-10分）：综合评估话题成为"社会级爆点"的潜力

评分标准：
- 9-10分：全民关注的重大事件，具有深远影响
- 7-8分：引发广泛讨论的热点事件
- 5-6分：有一定关注度的普通话题
- 3-4分：娱乐性话题或影响力较小
- 1-2分：小范围关注的话题

注意：如果提供了具体内容，请结合内容进行深度分析，而不仅仅依赖标题。

{format_instructions}""",
                ),
                (
                    "user",
                    """请分析以下热榜话题：

平台：{platform}
标题：{title}
原始热度：{heat_score}
{content_section}

请返回严格的JSON格式分析结果。""",
                ),
            ]
        )

    async def analyze_topic(self, topic: HotTopic) -> LLMAnalysis:
        """
        分析单个话题

        Args:
            topic: 热榜话题对象

        Returns:
            LLM分析结果
        """
        try:
            # 构建内容部分
            content_section = ""
            if topic.content:
                content_section = f"\n具体内容：\n{topic.content}"
            else:
                content_section = "\n具体内容：暂无"
            
            chain = self.prompt | self.llm

            response = await chain.ainvoke(
                {
                    "platform": topic.platform,
                    "title": topic.title,
                    "heat_score": topic.heat_score,
                    "content_section": content_section,
                    "format_instructions": self.parser.get_format_instructions(),
                }
            )

            # 解析 LLM 返回的 JSON
            content = response.content

            # 尝试提取 JSON（处理可能的markdown代码块）
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            analysis_dict = json.loads(content)
            analysis = LLMAnalysis(**analysis_dict)

            logger.info(
                f"LLM分析完成: {topic.title} -> 潜力分: {analysis.potential_score}"
            )
            return analysis

        except Exception as e:
            logger.error(f"LLM分析失败: {topic.title}, 错误: {e}")
            # 返回默认分析结果
            return LLMAnalysis(
                topic_nature="未知",
                social_impact=5,
                discussion_depth=5,
                potential_score=5,
                reason="分析失败，使用默认值",
            )

    async def batch_analyze(
        self, topics: List[HotTopic], batch_size: int = 5
    ) -> List[LLMAnalysis]:
        """
        批量分析话题

        Args:
            topics: 话题列表
            batch_size: 批处理大小

        Returns:
            分析结果列表
        """
        results = []

        for i in range(0, len(topics), batch_size):
            batch = topics[i : i + batch_size]
            logger.info(f"正在分析第 {i+1}-{min(i+batch_size, len(topics))} 条话题...")

            for topic in batch:
                analysis = await self.analyze_topic(topic)
                results.append(analysis)

        return results
