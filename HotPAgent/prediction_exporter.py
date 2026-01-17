from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Union
import json
import re

from config import Config

PREDICTIVE_KEYWORDS = [
    "是否",
    "会不会",
    "能否",
    "会",
    "将",
    "预计",
    "或将",
    "可能",
    "或将在",
]

MEASURABLE_KEYWORDS = [
    "失业率",
    "CPI",
    "PPI",
    "GDP",
    "金价",
    "油价",
    "房价",
    "汇率",
    "股价",
    "物价",
    "通胀",
    "利率",
]

DIRECTION_KEYWORDS = [
    "上涨",
    "下跌",
    "下降",
    "回升",
    "回落",
    "走高",
    "走低",
    "突破",
    "创新高",
    "刷新纪录",
]

EXCLUDE_KEYWORDS = [
    "已",
    "已经",
    "确认",
    "宣布",
    "发生",
    "现状",
    "走红",
    "身价",
    "首次",
    "联排",
    "回应",
    "被",
]


@dataclass
class PredictionEventConfig:
    """预测事件导出配置"""

    resolve_days: int = 7
    timezone_offset_hours: int = 8


def _get_shanghai_now(config: PredictionEventConfig) -> datetime:
    tz = timezone(timedelta(hours=config.timezone_offset_hours))
    return datetime.now(tz)


def _slugify(text: str) -> str:
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff\-]", "", text)
    return text[:40] if len(text) > 40 else text


def _extract_llm_analysis(topic: Dict[str, Any]) -> Dict[str, Any]:
    analysis = topic.get("llm_analysis") or {}
    if isinstance(analysis, dict):
        return analysis
    return {
        "topic_nature": getattr(analysis, "topic_nature", "未知"),
        "social_impact": getattr(analysis, "social_impact", 0),
        "discussion_depth": getattr(analysis, "discussion_depth", 0),
        "potential_score": getattr(analysis, "potential_score", 0),
        "reason": getattr(analysis, "reason", ""),
    }


def _normalize_topic(topic: Union[Dict[str, Any], Any]) -> Dict[str, Any]:
    if isinstance(topic, dict):
        return topic
    if hasattr(topic, "dict"):
        return topic.dict()
    return dict(topic)


def _build_question(title: str, resolve_days: int) -> str:
    if any(keyword in title for keyword in ["是否", "会不会", "能否"]):
        return f"在未来{resolve_days}天内，{title}？"
    return f"在未来{resolve_days}天内，是否出现以下情况：{title}？"


def _build_resolution_criteria(resolve_days: int) -> str:
    return (
        f"在市场截止时间前（{resolve_days}天内），若有权威来源"
        "（政府/官方机构/主流媒体）发布明确报道或公告，"
        "证明该事件发生或指标达到题目描述的变化，"
        "则判定为“是”；否则判定为“否”。"
    )


def _importance_level(score: float) -> str:
    if score >= 80:
        return "high"
    if score >= 50:
        return "medium"
    return "low"


def _has_predictive_signal(title: str) -> bool:
    title = title.strip()
    if any(keyword in title for keyword in PREDICTIVE_KEYWORDS):
        return True
    if any(keyword in title for keyword in MEASURABLE_KEYWORDS) and any(
        keyword in title for keyword in DIRECTION_KEYWORDS
    ):
        return True
    return False


def _is_predictable_event(title: str, topic_nature: str) -> bool:
    if not title:
        return False
    if topic_nature == "娱乐" and not _has_predictive_signal(title):
        return False
    if any(keyword in title for keyword in EXCLUDE_KEYWORDS) and not _has_predictive_signal(title):
        return False
    return _has_predictive_signal(title)


def build_prediction_events(
    topics: Iterable[Union[Dict[str, Any], Any]],
    timestamp: str,
    config: Optional[PredictionEventConfig] = None,
) -> List[Dict[str, Any]]:
    """将话题列表转换为预测市场事件列表"""

    config = config or PredictionEventConfig(resolve_days=Config.PREDICT_RESOLVE_DAYS)
    created_at = _get_shanghai_now(config)
    resolve_time = created_at + timedelta(days=config.resolve_days)

    events: List[Dict[str, Any]] = []
    for index, raw_topic in enumerate(topics, 1):
        topic = _normalize_topic(raw_topic)
        analysis = _extract_llm_analysis(topic)

        title = topic.get("title", "").strip()
        platform = topic.get("platform", "unknown")
        total_score = float(topic.get("total_score") or 0)
        slug = _slugify(title) or f"topic-{index}"
        topic_nature = analysis.get("topic_nature", "未知")

        if not _is_predictable_event(title, topic_nature):
            continue

        question = _build_question(title, config.resolve_days)
        description_parts = [title]
        if topic.get("content"):
            description_parts.append(str(topic.get("content")))
        if analysis.get("reason"):
            description_parts.append(str(analysis.get("reason")))

        description = "。".join([p for p in description_parts if p])
        tags = [platform]
        if topic_nature:
            tags.append(topic_nature)
        if topic.get("category"):
            tags.append(str(topic.get("category")))

        event = {
            "event_id": f"{platform}_{timestamp}_{index:03d}",
            "slug": slug,
            "language": "zh-CN",
            "title": title,
            "question": question,
            "description": description,
            "category": topic_nature,
            "market_type": "binary",
            "outcomes": [
                {
                    "id": "yes",
                    "label": "是",
                    "description": "在截止时间前满足判定条件",
                },
                {
                    "id": "no",
                    "label": "否",
                    "description": "在截止时间前未满足判定条件",
                },
            ],
            "resolution_criteria": _build_resolution_criteria(config.resolve_days),
            "resolution_sources": [topic.get("link")] if topic.get("link") else [],
            "status": "open",
            "timezone": f"UTC+{config.timezone_offset_hours:02d}:00",
            "created_at": created_at.isoformat(),
            "close_time": resolve_time.isoformat(),
            "resolve_time": resolve_time.isoformat(),
            "importance_level": _importance_level(total_score),
            "probability_hint": round(total_score / 100, 4),
            "analysis": {
                "social_impact": analysis.get("social_impact"),
                "discussion_depth": analysis.get("discussion_depth"),
                "potential_score": analysis.get("potential_score"),
            },
            "metrics": {
                "heat_score": topic.get("heat_score"),
                "discussion_volume": topic.get("discussion_volume"),
                "normalized_heat": topic.get("normalized_heat"),
                "normalized_discussion": topic.get("normalized_discussion"),
                "total_score": topic.get("total_score"),
                "is_breakout": topic.get("is_breakout"),
            },
            "origin": {
                "platform": platform,
                "source_link": topic.get("link"),
                "category": topic.get("category"),
            },
            "tags": list(dict.fromkeys([t for t in tags if t])),
        }
        events.append(event)

    return events


def export_prediction_events(
    topics: Iterable[Union[Dict[str, Any], Any]],
    timestamp: str,
    output_dir: Optional[Path] = None,
) -> Path:
    """导出预测市场事件 JSON 文件"""

    predict_dir = output_dir or Path(Config.PREDICT_DIR)
    predict_dir.mkdir(exist_ok=True)

    events = build_prediction_events(topics, timestamp)
    output_file = predict_dir / f"predict_events_{timestamp}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)

    return output_file


def export_prediction_events_from_file(
    input_file: Path,
    output_dir: Optional[Path] = None,
) -> Path:
    """从 all_topics 文件导出预测市场事件"""

    with open(input_file, "r", encoding="utf-8") as f:
        topics = json.load(f)

    match = re.search(r"all_topics_(\d{8}_\d{6})", input_file.name)
    timestamp = match.group(1) if match else _get_shanghai_now(
        PredictionEventConfig(resolve_days=Config.PREDICT_RESOLVE_DAYS)
    ).strftime("%Y%m%d_%H%M%S")

    return export_prediction_events(topics, timestamp, output_dir=output_dir)
