import asyncio
import schedule
import time
from agent import HotTopicAgent
from config import Config
from loguru import logger


class AgentScheduler:
    """Agent 调度器"""
    
    def __init__(self):
        self.agent = HotTopicAgent()
        self.is_running = False
    
    def run_agent_job(self):
        """调度任务包装函数"""
        if self.is_running:
            logger.warning("上一次任务仍在运行中，跳过本次调度")
            return
        
        self.is_running = True
        try:
            asyncio.run(self.agent.run())
        except Exception as e:
            logger.exception(f"任务执行异常: {e}")
        finally:
            self.is_running = False
    
    def start(self, run_immediately: bool = True):
        """
        启动调度器
        
        Args:
            run_immediately: 是否立即执行一次
        """
        logger.info(f"🕐 调度器启动，间隔: {Config.SCHEDULE_INTERVAL} 小时")
        
        # 设置定时任务
        schedule.every(Config.SCHEDULE_INTERVAL).hours.do(self.run_agent_job)
        
        # 立即执行一次
        if run_immediately:
            logger.info("立即执行首次任务...")
            self.run_agent_job()
        
        # 调度循环
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # 每分钟检查一次
        except KeyboardInterrupt:
            logger.info("收到退出信号，调度器停止")
