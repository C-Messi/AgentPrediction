from typing import Optional, Literal
from pydantic import BaseModel, Field


class HotTopic(BaseModel):
    """热榜话题数据模型"""
    platform: Literal["weibo", "douyin", "zhihu"] = Field(..., description="平台名称")
    title: str = Field(..., description="话题标题")
    heat_score: int = Field(..., description="原始热度值")
    link: str = Field(..., description="话题链接")
    discussion_volume: Optional[int] = Field(None, description="讨论量（评论/回答数）")
    category: Optional[str] = Field(None, description="分类标签")
    content: Optional[str] = Field(None, description="话题内容摘要（前几条热门内容）")
    

class LLMAnalysis(BaseModel):
    """LLM 分析结果模型"""
    topic_nature: str = Field(..., description="话题性质：娱乐/社会新闻/科技/虚假信息等")
    social_impact: int = Field(..., ge=1, le=10, description="社会影响力评分 1-10")
    discussion_depth: int = Field(..., ge=1, le=10, description="讨论深度评分 1-10")
    potential_score: int = Field(..., ge=1, le=10, description="综合潜力分 1-10")
    reason: str = Field(..., description="评分理由")


class EnrichedTopic(HotTopic):
    """经过 LLM 分析和评分后的话题"""
    llm_analysis: LLMAnalysis = Field(..., description="LLM 分析结果")
    normalized_heat: float = Field(..., description="归一化热度 0-100")
    normalized_discussion: float = Field(..., description="归一化讨论量 0-100")
    total_score: float = Field(..., description="综合评分 0-100")
    is_breakout: bool = Field(..., description="是否为爆点话题")
