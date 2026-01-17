import asyncio
from typing import List
from datetime import datetime
import json
from pathlib import Path

from scrapers import WeiboScraper, DouyinScraper, ZhihuScraper
from llm_analyzer import LLMAnalyzer
from scoring_engine import ScoringEngine
from models import EnrichedTopic
from config import Config
from loguru import logger
from prediction_exporter import export_prediction_events


class HotTopicAgent:
    """热榜分析 Agent 主控制器"""
    
    def __init__(self):
        self.scrapers = {
            "weibo": WeiboScraper(),
            # "douyin": DouyinScraper(),
            # "zhihu": ZhihuScraper()
        }
        self.analyzer: LLMAnalyzer = LLMAnalyzer()
        self.scoring_engine = ScoringEngine()
        
        logger.info("热榜 Agent 初始化完成")
    
    async def scrape_all_platforms(self) -> List:
        """并发抓取所有平台数据"""
        logger.info("=" * 60)
        logger.info("🚀 开始抓取多平台热榜数据")
        logger.info("=" * 60)
        
        tasks = []
        for platform, scraper in self.scrapers.items():
            if Config.PLATFORMS[platform]["enabled"]:
                tasks.append(scraper.fetch_hot_topics(limit=Config.FETCH_LIMIT))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_topics = []
        for result in results:
            if isinstance(result, list):
                all_topics.extend(result)
            else:
                logger.error(f"抓取出错: {result}")
        
        logger.info(f"✅ 抓取完成，共获得 {len(all_topics)} 条话题")
        return all_topics
    
    def deduplicate_topics(self, topics: List) -> List:
        """去重：移除重复话题"""
        seen_titles = set()
        unique_topics = []
        
        for topic in topics:
            title_lower = topic.title.lower()
            if title_lower not in seen_titles:
                seen_titles.add(title_lower)
                unique_topics.append(topic)
        
        removed_count = len(topics) - len(unique_topics)
        if removed_count > 0:
            logger.info(f"🧹 去重完成，移除 {removed_count} 条重复话题")
        
        return unique_topics
    
    async def analyze_and_score(self, topics: List) -> List[EnrichedTopic]:
        """分析并评分"""
        logger.info("=" * 60)
        logger.info("🤖 开始 LLM 语义分析")
        logger.info("=" * 60)
        
        analyses = await self.analyzer.batch_analyze(topics)
        
        logger.info("=" * 60)
        logger.info("📊 开始计算综合评分")
        logger.info("=" * 60)
        
        enriched_topics = self.scoring_engine.calculate_scores(topics, analyses)
        
        return enriched_topics
    
    def save_results(self, topics: List[EnrichedTopic], timestamp: str):
        """保存结果到 JSON 文件"""
        output_dir = Path(Config.OUTPUT_DIR)
        output_dir.mkdir(exist_ok=True)
        
        # 保存所有话题
        all_file = output_dir / f"all_topics_{timestamp}.json"
        with open(all_file, 'w', encoding='utf-8') as f:
            data = [t.dict() for t in topics]
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"💾 所有话题已保存: {all_file}")

        # 导出预测市场事件
        try:
            predict_file = export_prediction_events(topics, timestamp)
            logger.info(f"🧭 预测事件已保存: {predict_file}")
        except Exception as e:
            logger.error(f"预测事件导出失败: {e}")
        
        # 保存爆点话题
        breakout_topics = [t for t in topics if t.is_breakout]
        if breakout_topics:
            breakout_file = output_dir / f"breakout_topics_{timestamp}.json"
            with open(breakout_file, 'w', encoding='utf-8') as f:
                data = [t.dict() for t in breakout_topics]
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.success(f"🔥 爆点话题已保存: {breakout_file} (共 {len(breakout_topics)} 条)")
        
        # 保存统计信息
        stats = self.scoring_engine.get_statistics(topics)
        stats_file = output_dir / f"statistics_{timestamp}.json"
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        logger.info(f"📈 统计信息已保存: {stats_file}")
        
        return breakout_topics
    
    async def run(self):
        """执行一次完整的抓取-分析-评分流程"""
        try:
            start_time = datetime.now()
            timestamp = start_time.strftime("%Y%m%d_%H%M%S")
            
            logger.info(f"\n{'='*60}")
            logger.info(f"🎯 热榜 Agent 开始执行 - {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"{'='*60}\n")
            
            # 1. 抓取数据
            all_topics = await self.scrape_all_platforms()
            
            if not all_topics:
                logger.warning("⚠️ 未抓取到任何数据，本次任务结束")
                return
            
            # 2. 去重
            unique_topics = self.deduplicate_topics(all_topics)
            
            # 3. 分析和评分
            enriched_topics = await self.analyze_and_score(unique_topics)
            
            # 4. 保存结果
            breakout_topics = self.save_results(enriched_topics, timestamp)
            
            # 5. 输出摘要
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"\n{'='*60}")
            logger.info("📋 执行摘要")
            logger.info(f"{'='*60}")
            logger.info(f"总话题数: {len(enriched_topics)}")
            logger.info(f"爆点话题数: {len(breakout_topics)}")
            logger.info(f"执行耗时: {duration:.2f} 秒")
            logger.info(f"{'='*60}\n")
            
            # 显示 Top 5 爆点话题
            if breakout_topics:
                logger.info("🏆 Top 5 爆点话题:")
                for i, topic in enumerate(breakout_topics[:5], 1):
                    logger.info(
                        f"{i}. [{topic.platform}] {topic.title} "
                        f"(评分: {topic.total_score:.2f}, 性质: {topic.llm_analysis.topic_nature})"
                    )
        
        except Exception as e:
            logger.exception(f"❌ Agent 执行出错: {e}")
