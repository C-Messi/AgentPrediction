"""
使用示例 - 演示如何单独使用各个模块
"""
import asyncio
from scrapers import WeiboScraper, ZhihuScraper
from llm_analyzer import LLMAnalyzer
from scoring_engine import ScoringEngine


async def example_1_single_platform():
    """示例 1: 单独抓取某个平台"""
    print("=" * 60)
    print("示例 1: 抓取微博热搜")
    print("=" * 60)
    
    scraper = WeiboScraper()
    topics = await scraper.fetch_hot_topics(limit=10)
    
    print(f"\n抓取到 {len(topics)} 条话题:")
    for i, topic in enumerate(topics, 1):
        print(f"{i}. {topic.title} (热度: {topic.heat_score})")


async def example_2_llm_analysis():
    """示例 2: 单独使用 LLM 分析"""
    print("\n" + "=" * 60)
    print("示例 2: LLM 语义分析")
    print("=" * 60)
    
    from models import HotTopic
    
    # 模拟一个话题
    topic = HotTopic(
        platform="weibo",
        title="某重大社会事件引发全民讨论",
        heat_score=5000000,
        link="https://example.com",
        discussion_volume=None,
        category=None
    )
    
    analyzer = LLMAnalyzer()
    analysis = await analyzer.analyze_topic(topic)
    
    print(f"\n话题: {topic.title}")
    print(f"性质: {analysis.topic_nature}")
    print(f"社会影响力: {analysis.social_impact}/10")
    print(f"讨论深度: {analysis.discussion_depth}/10")
    print(f"潜力评分: {analysis.potential_score}/10")
    print(f"理由: {analysis.reason}")


async def example_3_scoring():
    """示例 3: 评分系统"""
    print("\n" + "=" * 60)
    print("示例 3: 综合评分")
    print("=" * 60)
    
    from models import HotTopic, LLMAnalysis
    
    # 模拟数据
    topics = [
        HotTopic(platform="weibo", title="娱乐新闻", heat_score=1000000, link="", discussion_volume=None, category=None),
        HotTopic(platform="zhihu", title="科技突破", heat_score=2000000, link="", discussion_volume=5000, category=None),
        HotTopic(platform="douyin", title="社会热点", heat_score=3000000, link="", discussion_volume=None, category=None)
    ]
    
    analyses = [
        LLMAnalysis(topic_nature="娱乐", social_impact=3, discussion_depth=2, potential_score=3, reason="娱乐性话题"),
        LLMAnalysis(topic_nature="科技", social_impact=7, discussion_depth=8, potential_score=8, reason="重要科技进展"),
        LLMAnalysis(topic_nature="社会新闻", social_impact=9, discussion_depth=9, potential_score=9, reason="全民关注事件")
    ]
    
    engine = ScoringEngine()
    enriched = engine.calculate_scores(topics, analyses)
    
    print("\n评分结果:")
    for topic in enriched:
        print(f"\n标题: {topic.title}")
        print(f"  平台: {topic.platform}")
        print(f"  归一化热度: {topic.normalized_heat:.2f}")
        print(f"  综合评分: {topic.total_score:.2f}")
        print(f"  是否爆点: {'✅ 是' if topic.is_breakout else '❌ 否'}")


async def example_4_full_pipeline():
    """示例 4: 完整流程"""
    print("\n" + "=" * 60)
    print("示例 4: 完整 Agent 流程")
    print("=" * 60)
    
    from agent import HotTopicAgent
    
    agent = HotTopicAgent()
    await agent.run()


async def main():
    """主函数"""
    print("\n🎯 HotPAgent 使用示例\n")
    print("请选择要运行的示例:")
    print("1. 单独抓取某个平台")
    print("2. LLM 语义分析")
    print("3. 评分系统")
    print("4. 完整 Agent 流程")
    
    choice = input("\n请输入选项 (1-4): ").strip()
    
    if choice == "1":
        await example_1_single_platform()
    elif choice == "2":
        await example_2_llm_analysis()
    elif choice == "3":
        await example_3_scoring()
    elif choice == "4":
        await example_4_full_pipeline()
    else:
        print("无效选项")


if __name__ == "__main__":
    asyncio.run(main())
