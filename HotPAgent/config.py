import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """全局配置类"""
    
    # LLM 配置
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4-turbo-preview")
    
    # 评分阈值
    SCORE_THRESHOLD = int(os.getenv("SCORE_THRESHOLD", 80))
    
    # 调度间隔（小时）
    SCHEDULE_INTERVAL = int(os.getenv("SCHEDULE_INTERVAL", 1))
    
    # 输出目录
    OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./output")
    PREDICT_DIR = os.getenv("PREDICT_DIR", "./predict")
    PREDICT_RESOLVE_DAYS = int(os.getenv("PREDICT_RESOLVE_DAYS", 7))
    
    # 爬取数量配置
    FETCH_LIMIT = 20
    
    # 内容抓取配置
    FETCH_CONTENT = True  # 是否抓取话题详细内容（仅微博）
    MAX_CONTENT_ITEMS = 5  # 每个话题抓取最多几条内容
    MAX_CONTENT_LENGTH = 2000  # 内容最大长度限制
    
    # 评分权重
    WEIGHT_HEAT = 0.5
    WEIGHT_DISCUSSION = 0.3
    WEIGHT_LLM = 0.2
    
    # 平台配置
    PLATFORMS = {
        "weibo": {
            "name": "微博",
            "url": "https://s.weibo.com/top/summary",
            "enabled": True
        },
        "douyin": {
            "name": "抖音",
            "url": "https://www.douyin.com/hot",
            "enabled": True
        },
        "zhihu": {
            "name": "知乎",
            "url": "https://www.zhihu.com/hot",
            "enabled": True
        }
    }
    
    @classmethod
    def validate(cls):
        """验证配置"""
        if not cls.OPENAI_API_KEY:
            raise ValueError("未设置 OPENAI_API_KEY，请在 .env 文件中配置")
        
        os.makedirs(cls.OUTPUT_DIR, exist_ok=True)
        os.makedirs(cls.PREDICT_DIR, exist_ok=True)