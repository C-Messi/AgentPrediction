from abc import ABC, abstractmethod
from typing import List
from models import HotTopic
from loguru import logger


class BaseScraper(ABC):
    """爬虫基类"""
    
    def __init__(self, platform: str):
        self.platform = platform
        logger.info(f"初始化 {platform} 爬虫")
    
    @abstractmethod
    async def fetch_hot_topics(self, limit: int = 20) -> List[HotTopic]:
        """
        抓取热榜数据
        
        Args:
            limit: 抓取数量限制
            
        Returns:
            热榜话题列表
        """
        pass
    
    def _clean_title(self, title: str) -> str:
        """清洗标题文本"""
        return title.strip().replace('\n', ' ').replace('\r', '')
    
    def _is_valid_topic(self, topic: HotTopic) -> bool:
        """
        验证话题是否有效（去除广告等）
        
        Args:
            topic: 话题对象
            
        Returns:
            是否有效
        """
        # 基础验证
        if not topic.title or len(topic.title) < 3:
            return False
        
        # 过滤广告关键词
        ad_keywords = ['广告', '推广', '赞助', 'AD']
        if any(keyword in topic.title for keyword in ad_keywords):
            return False
        
        return True
