from typing import List
from playwright.async_api import async_playwright
from models import HotTopic
from .base_scraper import BaseScraper
from loguru import logger
import asyncio


class DouyinScraper(BaseScraper):
    """抖音热榜爬虫"""
    
    def __init__(self):
        super().__init__("douyin")
        self.base_url = "https://www.douyin.com/hot"
    
    async def fetch_hot_topics(self, limit: int = 50) -> List[HotTopic]:
        """抓取抖音热榜"""
        topics = []
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                logger.info(f"正在访问抖音热榜: {self.base_url}")
                await page.goto(self.base_url, timeout=30000)
                await asyncio.sleep(3)  # 等待页面动态加载
                
                # 查找热榜条目（注意：抖音页面结构可能变化，需要实际调试）
                items = await page.query_selector_all('ul li[class*="item"]')
                
                for idx, item in enumerate(items[:limit]):
                    try:
                        # 提取标题
                        title_elem = await item.query_selector('a[class*="title"]')
                        if not title_elem:
                            continue
                        
                        title = await title_elem.inner_text()
                        title = self._clean_title(title)
                        
                        # 提取链接
                        link = await title_elem.get_attribute('href')
                        if link and not link.startswith('http'):
                            link = f"https://www.douyin.com{link}"
                        
                        # 提取热度（点赞量/热度值）
                        heat_elem = await item.query_selector('span[class*="hot-value"]')
                        heat_score = 0
                        if heat_elem:
                            heat_text = await heat_elem.inner_text()
                            # 处理 "1.2万" 等格式
                            heat_text = heat_text.replace('万', '0000').replace('亿', '00000000')
                            heat_score = int(float(''.join(filter(lambda x: x.isdigit() or x == '.', heat_text)) or '0'))
                        
                        topic = HotTopic(
                            platform="douyin",
                            title=title,
                            heat_score=heat_score,
                            link=link or ""
                        )
                        
                        if self._is_valid_topic(topic):
                            topics.append(topic)
                            logger.debug(f"抓取到抖音话题: {title} (热度: {heat_score})")
                    
                    except Exception as e:
                        logger.warning(f"解析抖音话题失败: {e}")
                        continue
                
                await browser.close()
                logger.success(f"抖音爬虫完成，抓取到 {len(topics)} 条有效数据")
        
        except Exception as e:
            logger.error(f"抖音爬虫出错: {e}")
        
        return topics
