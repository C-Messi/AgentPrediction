from typing import List
from playwright.async_api import async_playwright
from models import HotTopic
from .base_scraper import BaseScraper
from loguru import logger
import asyncio


class ZhihuScraper(BaseScraper):
    """知乎热榜爬虫"""
    
    def __init__(self):
        super().__init__("zhihu")
        self.base_url = "https://www.zhihu.com/hot"
    
    async def fetch_hot_topics(self, limit: int = 50) -> List[HotTopic]:
        """抓取知乎热榜"""
        topics = []
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                logger.info(f"正在访问知乎热榜: {self.base_url}")
                await page.goto(self.base_url, timeout=30000)
                await asyncio.sleep(2)
                
                # 查找热榜条目
                items = await page.query_selector_all('section.HotItem')
                
                for idx, item in enumerate(items[:limit]):
                    try:
                        # 提取标题
                        title_elem = await item.query_selector('h2.HotItem-title a')
                        if not title_elem:
                            continue
                        
                        title = await title_elem.inner_text()
                        title = self._clean_title(title)
                        
                        # 提取链接
                        link = await title_elem.get_attribute('href')
                        if link and not link.startswith('http'):
                            link = f"https://www.zhihu.com{link}"
                        
                        # 提取热度
                        heat_elem = await item.query_selector('div.HotItem-metrics span')
                        heat_score = 0
                        if heat_elem:
                            heat_text = await heat_elem.inner_text()
                            heat_text = heat_text.replace('万', '0000').replace('热度', '').strip()
                            heat_score = int(float(''.join(filter(lambda x: x.isdigit() or x == '.', heat_text)) or '0'))
                        
                        # 提取回答数
                        answer_elem = await item.query_selector('div.HotItem-content span')
                        discussion_volume = None
                        if answer_elem:
                            answer_text = await answer_elem.inner_text()
                            if '回答' in answer_text:
                                discussion_volume = int(''.join(filter(str.isdigit, answer_text)) or '0')
                        
                        topic = HotTopic(
                            platform="zhihu",
                            title=title,
                            heat_score=heat_score,
                            link=link or "",
                            discussion_volume=discussion_volume
                        )
                        
                        if self._is_valid_topic(topic):
                            topics.append(topic)
                            logger.debug(f"抓取到知乎话题: {title} (热度: {heat_score})")
                    
                    except Exception as e:
                        logger.warning(f"解析知乎话题失败: {e}")
                        continue
                
                await browser.close()
                logger.success(f"知乎爬虫完成，抓取到 {len(topics)} 条有效数据")
        
        except Exception as e:
            logger.error(f"知乎爬虫出错: {e}")
        
        return topics
