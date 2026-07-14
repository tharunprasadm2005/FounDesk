import requests
import os
import sys

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


def is_mock_token(token):
    if not token:
        return True
    return token.startswith("mock_") or (
        os.getenv("APP_MODE") == "demo" or
        "test" in sys.argv[0] or
        "pytest" in sys.modules
    )


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
    }


def _get(token, path, timeout=10):
    res = requests.get(f"{NOTION_API}{path}", headers=_headers(token), timeout=timeout)
    if res.status_code != 200:
        raise Exception(f"Notion API GET {path} error {res.status_code}: {res.text}")
    return res.json()


def _post(token, path, json_body=None, timeout=10):
    res = requests.post(f"{NOTION_API}{path}", headers=_headers(token), json=json_body or {}, timeout=timeout)
    if res.status_code != 200:
        raise Exception(f"Notion API POST {path} error {res.status_code}: {res.text}")
    return res.json()


def validate_token(token):
    if is_mock_token(token):
        return False, "Mock token - not a real Notion integration"
    try:
        data = _get(token, "/users/me")
        bot = data.get("bot", data)
        return True, {
            "id": data.get("id"),
            "name": bot.get("workspace_name", bot.get("name", "Notion Bot")),
            "type": data.get("type", "bot"),
            "workspace_name": bot.get("workspace_name")
        }
    except Exception as e:
        return False, str(e)


def get_user_info(token):
    if is_mock_token(token):
        return {}
    return _get(token, "/users/me")


def search_pages(token, query_filter=None):
    if is_mock_token(token):
        return []
    body = {}
    if query_filter:
        body["filter"] = query_filter
    data = _post(token, "/search", body)
    return data.get("results", [])


def get_page(token, page_id):
    if is_mock_token(token):
        return {}
    return _get(token, f"/pages/{page_id}")


def get_block_children(token, block_id, page_size=50):
    if is_mock_token(token):
        return []
    data = _get(token, f"/blocks/{block_id}/children?page_size={page_size}")
    return data.get("results", [])


def get_database(token, database_id):
    if is_mock_token(token):
        return {}
    return _get(token, f"/databases/{database_id}")


def query_database(token, database_id, page_size=20):
    if is_mock_token(token):
        return []
    data = _post(token, f"/databases/{database_id}/query", {"page_size": page_size})
    return data.get("results", [])


def get_comments(token, block_id, page_size=30):
    if is_mock_token(token):
        return []
    try:
        data = _get(token, f"/comments?block_id={block_id}&page_size={page_size}")
        return data.get("results", [])
    except Exception:
        return []


def extract_title(page):
    props = page.get("properties", {})
    for key in props:
        if isinstance(props[key], dict) and props[key].get("type") == "title":
            title_arr = props[key].get("title", [])
            if title_arr and isinstance(title_arr, list):
                return title_arr[0].get("plain_text", "Untitled")
    return "Untitled"


def get_notion_items(token):
    if is_mock_token(token):
        return []
    pages = search_pages(token)
    results = []
    for page in pages:
        title = extract_title(page)
        page_id = page.get("id")
        # Fetch actual page body content via block children
        body_text = ""
        try:
            blocks = get_block_children(token, page_id, page_size=100)
            flat = flatten_blocks(blocks, token=token)
            texts = [b["text"] for b in flat if b.get("text", "").strip()]
            body_text = "\n".join(texts)[:5000] if texts else ""
        except Exception as e:
            print(f"Notion: error fetching blocks for {title}: {e}")
        content = f"{title}\n\n{body_text}" if body_text else title
        results.append({
            "id": page_id,
            "type": page.get("object", "page"),
            "source": "notion",
            "title": title,
            "content": content,
            "user": "Notion",
            "timestamp": page.get("last_edited_time"),
            "url": page.get("url"),
            "created_time": page.get("created_time"),
            "object": page.get("object")
        })
    return results


def flatten_blocks(blocks, depth=0, token=None):
    result = []
    for block in blocks:
        block_type = block.get("type", "unsupported")
        text = ""
        if block_type in ("paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "to_do", "toggle", "callout", "quote", "code", "column_list", "column"):
            rich = block.get(block_type, {}).get("rich_text", [])
            text = "".join(r.get("plain_text", "") for r in rich)
        elif block_type == "child_page":
            text = block.get("child_page", {}).get("title", "")
        elif block_type == "child_database":
            text = block.get("child_database", {}).get("title", "")
        result.append({
            "id": block.get("id"),
            "type": block_type,
            "text": text,
            "depth": depth,
            "has_children": block.get("has_children", False)
        })
        if block.get("has_children") and depth < 3 and token:
            try:
                child_blocks = get_block_children(token, block["id"], page_size=50)
                result.extend(flatten_blocks(child_blocks, depth + 1, token))
            except Exception:
                pass
    return result
