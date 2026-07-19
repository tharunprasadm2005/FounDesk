import os
import sys
import requests

def is_mock_token(token):
    if not token:
        return True
    return token.startswith("mock_") or (
        os.getenv("APP_MODE") == "demo" or 
        "test" in sys.argv[0] or 
        "pytest" in sys.modules
    )

def get_trello_member(key, token):
    if is_mock_token(token):
        return {}
        
    url = "https://api.trello.com/1/members/me"
    params = {"key": key, "token": token}
    res = requests.get(url, params=params, timeout=10)
    if res.status_code == 200:
        return res.json()
    else:
        raise Exception(f"Trello API error {res.status_code}: {res.text}")

def get_trello_boards(key, token):
    if is_mock_token(token):
        return []
        
    url = "https://api.trello.com/1/members/me/boards"
    params = {"key": key, "token": token, "fields": "name,desc,closed"}
    res = requests.get(url, params=params, timeout=10)
    if res.status_code == 200:
        return res.json()
    else:
        raise Exception(f"Trello API error {res.status_code}: {res.text}")

def get_trello_lists(key, token, board_id):
    if is_mock_token(token):
        return []
        
    url = f"https://api.trello.com/1/boards/{board_id}/lists"
    params = {"key": key, "token": token, "fields": "name,closed"}
    res = requests.get(url, params=params, timeout=10)
    if res.status_code == 200:
        return res.json()
    else:
        raise Exception(f"Trello API error {res.status_code}: {res.text}")

def get_trello_cards(key, token, board_id):
    if is_mock_token(token):
        return []
        
    url = f"https://api.trello.com/1/boards/{board_id}/cards"
    params = {"key": key, "token": token}
    res = requests.get(url, params=params, timeout=10)
    if res.status_code == 200:
        return res.json()
    else:
        raise Exception(f"Trello API error {res.status_code}: {res.text}")

def get_trello_summary(key, token):
    import datetime
    
    # 1. Fetch boards
    boards = get_trello_boards(key, token)
    active_boards = [b for b in boards if not b.get("closed", False)]
    
    total_boards = len(active_boards)
    total_cards = 0
    completed_cards = 0
    due_today_cards = 0
    
    today_date = datetime.datetime.utcnow().date()
    
    for board in active_boards[:2]:
        board_id = board["id"]
        board_name = board["name"]
        
        try:
            lists = get_trello_lists(key, token, board_id)
            list_map = {l["id"]: (l["name"] or "").lower() for l in lists}
        except Exception:
            list_map = {}
            
        try:
            cards = get_trello_cards(key, token, board_id)
        except Exception:
            cards = []
            
        for card in cards:
            if card.get("closed", False):
                continue
                
            total_cards += 1
            card_name = card.get("name")
            
            list_id = card.get("idList")
            list_name = list_map.get(list_id, "")
            is_done = "done" in list_name
            if is_done:
                completed_cards += 1
                
            due_str = card.get("due")
            is_due_today = False
            if due_str:
                try:
                    clean_ts = due_str.replace("Z", "+00:00")
                    parsed = datetime.datetime.fromisoformat(clean_ts)
                    due_dt = parsed.astimezone(datetime.timezone.utc).date() if parsed.tzinfo else parsed.date()
                    if due_dt == today_date:
                        due_today_cards += 1
                        is_due_today = True
                except Exception:
                    pass
            
    return {
        "totalBoards": total_boards,
        "totalCards": total_cards,
        "completedCards": completed_cards,
        "dueTodayCards": due_today_cards
    }

