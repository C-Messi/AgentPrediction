import sys
import asyncio
from typing import Any, ForwardRef

from loguru import logger

from config import Config


def patch_pydantic_v1_forwardref():
    """兼容 Python 3.12 的 ForwardRef._evaluate 调用签名。"""
    if sys.version_info < (3, 12):
        return
    try:
        import pydantic.v1.typing as pydantic_v1_typing
    except Exception:
        return

    def evaluate_forwardref(type_: ForwardRef, globalns: Any, localns: Any) -> Any:
        return type_._evaluate(globalns, localns, recursive_guard=set())

    pydantic_v1_typing.evaluate_forwardref = evaluate_forwardref


patch_pydantic_v1_forwardref()

from agent import HotTopicAgent
from scheduler import AgentScheduler


def setup_logger():
    """配置日志"""
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>"
    )
    logger.add(
        "logs/agent_{time:YYYY-MM-DD}.log",
        rotation="00:00",
        retention="30 days",
        encoding="utf-8",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}"
    )


def main():
    """主入口"""
    setup_logger()
    
    logger.info("=" * 60)
    logger.info("🤖 热榜分析 Agent 启动")
    logger.info("=" * 60)
    
    try:
        # 验证配置
        Config.validate()
        logger.info("✅ 配置验证通过")
        
        # 选择运行模式
        mode = input("\n请选择运行模式:\n1. 单次执行\n2. 定时调度\n请输入(1/2): ").strip()
        
        if mode == "1":
            # 单次执行模式
            logger.info("📌 单次执行模式")
            agent = HotTopicAgent()
            asyncio.run(agent.run())
        
        elif mode == "2":
            # 定时调度模式
            logger.info("📌 定时调度模式")
            scheduler = AgentScheduler()
            scheduler.start(run_immediately=True)
        
        else:
            logger.error("无效的选择，程序退出")
            sys.exit(1)
    
    except KeyboardInterrupt:
        logger.info("\n👋 程序已停止")
    except Exception as e:
        logger.exception(f"❌ 程序异常: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
