from typing import List
import pandas as pd
from models import HotTopic, LLMAnalysis, EnrichedTopic
from config import Config
from loguru import logger


class ScoringEngine:
    """热度综合评分引擎"""
    
    def __init__(self):
        self.weight_heat = Config.WEIGHT_HEAT
        self.weight_discussion = Config.WEIGHT_DISCUSSION
        self.weight_llm = Config.WEIGHT_LLM
    
    def normalize(self, values: List) -> List[float]:
        """
        归一化到 0-100 区间
        
        Args:
            values: 原始数值列表
            
        Returns:
            归一化后的列表
        """
        if not values or max(values) == 0:
            return [0.0] * len(values)
        
        min_val = min(values)
        max_val = max(values)
        
        if max_val == min_val:
            return [50.0] * len(values)
        
        return [(v - min_val) / (max_val - min_val) * 100 for v in values]
    
    def calculate_scores(
        self, 
        topics: List[HotTopic], 
        analyses: List[LLMAnalysis]
    ) -> List[EnrichedTopic]:
        """
        计算综合评分
        
        Args:
            topics: 原始话题列表
            analyses: LLM分析结果列表
            
        Returns:
            经过评分的话题列表
        """
        if len(topics) != len(analyses):
            logger.error("话题数量与分析结果数量不匹配")
            return []
        
        # 提取所有热度值和讨论量
        heat_scores = [t.heat_score for t in topics]
        discussion_volumes = [t.discussion_volume or 0 for t in topics]
        
        # 归一化
        normalized_heats = self.normalize(heat_scores)
        normalized_discussions = self.normalize(discussion_volumes)
        
        enriched_topics = []
        
        for i, (topic, analysis) in enumerate(zip(topics, analyses)):
            # 计算综合评分
            total_score = (
                normalized_heats[i] * self.weight_heat +
                normalized_discussions[i] * self.weight_discussion +
                (analysis.potential_score * 10) * self.weight_llm
            )
            
            # 判断是否为爆点话题
            is_breakout = total_score >= Config.SCORE_THRESHOLD
            
            enriched_topic = EnrichedTopic(
                platform=topic.platform,
                title=topic.title,
                heat_score=topic.heat_score,
                link=topic.link,
                discussion_volume=topic.discussion_volume,
                category=topic.category,
                llm_analysis=analysis,
                normalized_heat=round(normalized_heats[i], 2),
                normalized_discussion=round(normalized_discussions[i], 2),
                total_score=round(total_score, 2),
                is_breakout=is_breakout
            )
            
            enriched_topics.append(enriched_topic)
            
            if is_breakout:
                logger.success(
                    f"🔥 发现爆点话题: {topic.title} "
                    f"(综合评分: {total_score:.2f}, LLM潜力分: {analysis.potential_score})"
                )
        
        # 按评分排序
        enriched_topics.sort(key=lambda x: x.total_score, reverse=True)
        
        return enriched_topics
    
    def get_statistics(self, topics: List[EnrichedTopic]) -> dict:
        """
        获取统计信息
        
        Args:
            topics: 评分后的话题列表
            
        Returns:
            统计字典
        """
        df = pd.DataFrame([t.dict() for t in topics])
        
        # 从 llm_analysis 中提取话题性质，兼容 dict 和对象两种情况
        nature_series = df["llm_analysis"].apply(
            lambda x: (
                x.get("topic_nature", "未知")
                if isinstance(x, dict)
                else getattr(x, "topic_nature", "未知")
            )
        )
        
        stats = {
            "total_count": len(topics),
            "breakout_count": sum(1 for t in topics if t.is_breakout),
            "avg_score": df['total_score'].mean(),
            "max_score": df['total_score'].max(),
            "min_score": df['total_score'].min(),
            "platform_distribution": df['platform'].value_counts().to_dict(),
            "nature_distribution": nature_series.value_counts().to_dict()
        }
        
        return stats
