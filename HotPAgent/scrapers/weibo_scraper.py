from typing import List
from playwright.async_api import async_playwright
from models import HotTopic
from .base_scraper import BaseScraper
from config import Config
from loguru import logger
import asyncio


class WeiboScraper(BaseScraper):
    """微博热搜爬虫"""
    
    def __init__(self):
        super().__init__("weibo")
        self.base_url = "https://s.weibo.com/top/summary"
        self.fetch_content = Config.FETCH_CONTENT  # 从配置读取
        self.max_content_items = Config.MAX_CONTENT_ITEMS
        self.max_content_length = Config.MAX_CONTENT_LENGTH
    
    async def fetch_hot_topics(self, limit: int = 20) -> List[HotTopic]:
        """抓取微博热搜榜"""
        topics = []
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                logger.info(f"正在访问微博热搜: {self.base_url}")
                await page.goto(self.base_url, timeout=30000)
                await asyncio.sleep(2)  # 等待页面加载
                
                # 查找热搜条目
                items = await page.query_selector_all('tbody tr')
                
                for idx, item in enumerate(items[:limit]):
                    try:
                        # 提取标题
                        title_elem = await item.query_selector('td.td-02 a')
                        if not title_elem:
                            continue
                        
                        title = await title_elem.inner_text()
                        title = self._clean_title(title)
                        
                        # 提取链接
                        link = await title_elem.get_attribute('href')
                        if link and not link.startswith('http'):
                            link = f"https://s.weibo.com{link}"
                        
                        # 提取热度
                        heat_elem = await item.query_selector('td.td-02 span')
                        heat_score = 0
                        if heat_elem:
                            heat_text = await heat_elem.inner_text()
                            heat_score = int(''.join(filter(str.isdigit, heat_text)) or '0')
                        
                        # 提取分类
                        category_elem = await item.query_selector('td.td-03')
                        category = None
                        if category_elem:
                            category = await category_elem.inner_text()
                        
                        # 创建话题对象（先不抓取内容）
                        topic = HotTopic(
                            platform="weibo",
                            title=title,
                            heat_score=heat_score,
                            link=link or "",
                            discussion_volume=None,
                            category=category,
                            content=None
                        )
                        
                        if self._is_valid_topic(topic):
                            topics.append(topic)
                            logger.debug(f"抓取到微博话题: {title} (热度: {heat_score})")
                    
                    except Exception as e:
                        logger.warning(f"解析微博话题失败: {e}")
                        continue
                
                # 如果需要抓取内容，对每个话题进行内容抓取
                if self.fetch_content and topics:
                    logger.info(f"开始抓取 {len(topics)} 个话题的内容...")
                    for topic in topics:
                        content = await self._fetch_topic_content(page, topic.link)
                        topic.content = content
                        await asyncio.sleep(1)  # 防止请求过快
                
                await browser.close()
                logger.success(f"微博爬虫完成，抓取到 {len(topics)} 条有效数据")
        
        except Exception as e:
            logger.error(f"微博爬虫出错: {e}")
        
        return topics
    
    async def _fetch_topic_content(self, page, topic_link: str) -> str:
        """
        抓取话题的具体内容（前几条热门微博）
        
        Args:
            page: Playwright 页面对象
            topic_link: 话题链接
            
        Returns:
            内容摘要字符串
        """
        try:
            if not topic_link:
                return ""
            
            # 尝试移动端页面（可能不需要登录）
            # 将 s.weibo.com 替换为 m.weibo.cn
            mobile_link = topic_link.replace('s.weibo.com', 'm.weibo.cn')
            mobile_link = mobile_link.replace('/weibo?q=', '/search?containerid=100103type%3D1%26q%3D')
            
            logger.debug(f"正在访问话题页面: {mobile_link}")
            
            # 设置移动设备UA
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
            })
            
            try:
                await page.goto(mobile_link, timeout=15000)
            except Exception:
                # 如果移动端失败，尝试原链接
                logger.debug("移动端访问失败，尝试原链接")
                await page.goto(topic_link, timeout=15000)
            
            await asyncio.sleep(2)
            
            # 检查是否需要登录
            page_content = await page.content()
            if '登录' in page_content and '扫描二维码' in page_content:
                logger.warning("页面需要登录，无法抓取内容。请设置 WEIBO_COOKIE 环境变量")
                return ""
            
            contents = []
            
            # 尝试多种选择器方案
            selectors = [
                # PC端选择器
                '.card-wrap .txt',
                'p[class*="txt"]',
                '.WB_text',
                'div[node-type="feed_list_content"]',
                # 移动端选择器
                '.weibo-text',
                'article .content',
                '.card-main .content',
                'div.content',
            ]
            
            for selector in selectors:
                weibo_cards = await page.query_selector_all(selector)
                if weibo_cards:
                    logger.debug(f"使用选择器 {selector} 找到 {len(weibo_cards)} 个元素")
                    
                    for idx, card in enumerate(weibo_cards[:self.max_content_items]):
                        try:
                            text = await card.inner_text()
                            text = self._clean_title(text)
                            if text and len(text) > 10:  # 过滤过短内容
                                contents.append(text)
                                logger.debug(f"提取到内容片段 {idx+1}: {text[:50]}...")
                        except Exception as e:
                            logger.debug(f"提取内容失败: {e}")
                            continue
                    
                    if contents:
                        break  # 找到内容就退出
            
            if contents:
                # 将多条内容合并，限制总长度
                combined = "\n---\n".join(contents)
                if len(combined) > self.max_content_length:
                    combined = combined[:self.max_content_length] + "..."
                logger.info(f"成功抓取到 {len(contents)} 条内容，总长度: {len(combined)}")
                return combined
            else:
                logger.warning(f"未能抓取到话题内容: {topic_link}")
                return ""
                
        except Exception as e:
            logger.warning(f"抓取话题内容失败: {e}")
            return ""

