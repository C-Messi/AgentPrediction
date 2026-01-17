import argparse
import json
import os
import re
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


REQUIRED_FIELDS = {
    "event_id",
    "title",
    "description",
    "market_type",
    "outcomes",
    "resolution_source",
    "resolution_criteria",
    "end_time",
    "tags",
}


def load_topics(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Input JSON must be a list.")
    return data


def topic_score(topic: dict) -> float:
    for key in ("total_score", "heat_score", "normalized_heat"):
        value = topic.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return 0.0


def select_topics(topics: list[dict], top_n: int) -> list[dict]:
    return sorted(topics, key=topic_score, reverse=True)[:top_n]


def build_messages(topics: list[dict], year: int, count: int) -> list[dict]:
    topics_payload = []
    for idx, t in enumerate(topics, start=1):
        topics_payload.append(
            {
                "index": idx,
                "platform": t.get("platform"),
                "title": t.get("title"),
                "link": t.get("link"),
                "category": t.get("category"),
                "analysis": t.get("llm_analysis", {}),
            }
        )

    now_cn = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d")

    system_prompt = (
        "你是专业预测市场设计师。请基于给定热点话题，生成可验证的二元预测市场。"
        "只允许选择“娱乐新闻”和“体育新闻”和”游戏新闻“等具有饭圈性质的事件；其他类型一律忽略。"
        "严格输出JSON数组，元素遵循以下字段并使用中文："
        "event_id, title, description, market_type, outcomes, resolution_source, "
        "resolution_criteria, end_time, tags。"
        "要求：market_type 固定为 binary；outcomes 仅 YES/NO；"
        "event_id 使用 ENT-{year}-XXX 递增编号；end_time 使用ISO 8601含+08:00时区；"
        "resolution_criteria 必须可操作、可验证；resolution_source 为权威公开来源；"
        "tags 为简短关键词数组；"
        "不要输出除JSON外的任何内容。"
    ).format(year=year)

    user_prompt = {
        "current_date_cn": now_cn,
        "target_count": count,
        "topics": topics_payload,
        "format_example": {
            "event_id": "ENT-2026-001",
            "title": "示例标题",
            "description": "示例描述",
            "market_type": "binary",
            "outcomes": [{"outcome_id": "YES", "label": "是"}, {"outcome_id": "NO", "label": "否"}],
            "resolution_source": ["官方数据源1", "权威数据源2"],
            "resolution_criteria": "以可公开验证的数据为准。",
            "end_time": "2026-12-31T23:59:59+08:00",
            "tags": ["关键词1", "关键词2"],
        },
    }

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
    ]


def _build_session() -> requests.Session:
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("POST",),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _parse_bool_env(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def call_deepseek(
    messages: list[dict],
    temperature: float,
    verify_ssl_override: bool | None = None,
    proxy_override: str | None = None,
) -> str:
    load_dotenv()
    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    verify_ssl_env = _parse_bool_env(os.getenv("DEEPSEEK_VERIFY_SSL"), True)
    proxy_env = os.getenv("DEEPSEEK_PROXY")
    verify_ssl = verify_ssl_env if verify_ssl_override is None else verify_ssl_override
    proxy_url = proxy_env if proxy_override is None else proxy_override

    if not api_key:
        raise RuntimeError("Missing DEEPSEEK_API_KEY in .env")

    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    proxies = {"http": proxy_url, "https": proxy_url} if proxy_url else None
    session = _build_session()
    session.trust_env = True
    response = session.post(
        url,
        headers=headers,
        json=payload,
        timeout=90,
        verify=verify_ssl,
        proxies=proxies,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


def extract_json(text: str) -> list[dict]:
    text = text.strip()
    for candidate in (text,):
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        candidate = match.group(0)
        parsed = json.loads(candidate)
        if isinstance(parsed, list):
            return parsed
    raise ValueError("Model output is not valid JSON array.")


def find_missing_fields(items: list[dict]) -> list[tuple[int, list[str]]]:
    missing_list: list[tuple[int, list[str]]] = []
    for idx, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            missing_list.append((idx, ["__not_object__"]))
            continue
        missing = sorted(REQUIRED_FIELDS - set(item.keys()))
        if missing:
            missing_list.append((idx, missing))
    return missing_list


def validate_items(items: list[dict]) -> None:
    if not items:
        raise ValueError("No items generated.")
    missing_list = find_missing_fields(items)
    if missing_list:
        missing_str = "; ".join(
            f"Item {idx} missing fields: {fields}" for idx, fields in missing_list
        )
        raise ValueError(missing_str)


def build_repair_messages(items: list[dict], missing_list: list[tuple[int, list[str]]]) -> list[dict]:
    system_prompt = (
        "你是JSON修复助手。你将收到一个预测市场JSON数组，以及每个元素缺失的字段列表。"
        "请在不改变已有字段值的前提下，补全缺失字段，输出完整JSON数组。"
        "必须保持数组长度与顺序不变；不得新增或删除元素；不得输出除JSON外的任何内容。"
        "字段要求与原规范一致：event_id, title, description, market_type, outcomes, "
        "resolution_source, resolution_criteria, end_time, tags。"
        "resolution_source 需为权威公开来源数组。"
    )
    user_prompt = {
        "items": items,
        "missing_fields": [
            {"index": idx, "missing": fields} for idx, fields in missing_list
        ],
        "format_example": {
            "event_id": "ENT-2026-001",
            "title": "示例标题",
            "description": "示例描述",
            "market_type": "binary",
            "outcomes": [{"outcome_id": "YES", "label": "是"}, {"outcome_id": "NO", "label": "否"}],
            "resolution_source": ["官方数据源1", "权威数据源2"],
            "resolution_criteria": "以可公开验证的数据为准。",
            "end_time": "2026-12-31T23:59:59+08:00",
            "tags": ["关键词1", "关键词2"],
        },
    }
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate prediction markets via DeepSeek.")
    parser.add_argument(
        "--input",
        default="input/all_topics_20260117_111053.json",
        help="Path to input topics JSON.",
    )
    parser.add_argument(
        "--output",
        default="output/output_generated.json",
        help="Path to output JSON.",
    )
    parser.add_argument("--top-n", type=int, default=6, help="Number of topics to use.")
    parser.add_argument("--temperature", type=float, default=0.4, help="LLM temperature.")
    parser.add_argument(
        "--proxy",
        default=None,
        help="Override proxy URL (e.g. http://127.0.0.1:7890).",
    )
    parser.add_argument(
        "--verify-ssl",
        default=None,
        help="Override SSL verification (true/false).",
    )
    args = parser.parse_args()

    topics = load_topics(args.input)
    selected = select_topics(topics, args.top_n)
    year = datetime.now().year
    messages = build_messages(selected, year, args.top_n)

    verify_override = (
        _parse_bool_env(args.verify_ssl, True) if args.verify_ssl is not None else None
    )
    raw = call_deepseek(
        messages,
        temperature=args.temperature,
        verify_ssl_override=verify_override,
        proxy_override=args.proxy,
    )
    items = extract_json(raw)
    missing_list = find_missing_fields(items)
    if missing_list:
        repair_messages = build_repair_messages(items, missing_list)
        repaired_raw = call_deepseek(
            repair_messages,
            temperature=0.2,
            verify_ssl_override=verify_override,
            proxy_override=args.proxy,
        )
        items = extract_json(repaired_raw)
    validate_items(items)

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(items)} items to {args.output}")


if __name__ == "__main__":
    main()
