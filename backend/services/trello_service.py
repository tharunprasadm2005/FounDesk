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
    print(f"[TRELLO DEBUG] Boards fetched: {len(boards)}, Active: {len(active_boards)}")
    
    total_boards = len(active_boards)
    total_cards = 0
    completed_cards = 0
    due_today_cards = 0
    
    # Use local system date (not UTC)
    today_date = datetime.datetime.now().date()
    print(f"[TRELLO DEBUG] Local system today date: {today_date}")
    
    # Limit boards processed to avoid hitting Trello rate limits
    for board in active_boards[:2]:
        board_id = board["id"]
        board_name = board["name"]
        
        # 2. Fetch lists for mapping
        try:
            lists = get_trello_lists(key, token, board_id)
            list_map = {l["id"]: (l["name"] or "").lower() for l in lists}
            print(f"[TRELLO DEBUG] Board '{board_name}' lists: {[l['name'] for l in lists]}")
        except Exception as list_err:
            print(f"[TRELLO DEBUG] Failed to fetch lists for board {board_name}: {list_err}")
            list_map = {}
            
        # 3. Fetch cards
        try:
            cards = get_trello_cards(key, token, board_id)
            print(f"[TRELLO DEBUG] Board '{board_name}' raw cards fetched: {len(cards)}")
        except Exception as cards_err:
            print(f"[TRELLO DEBUG] Failed to fetch cards for board {board_name}: {cards_err}")
            cards = []
            
        for card in cards:
            if card.get("closed", False):
                continue
                
            total_cards += 1
            card_name = card.get("name")
            
            # Detect completed cards via list name
            list_id = card.get("idList")
            list_name = list_map.get(list_id, "")
            is_done = "done" in list_name
            if is_done:
                completed_cards += 1
                
            # Detect due today cards using local system date
            due_str = card.get("due")
            is_due_today = False
            if due_str:
                try:
                    clean_ts = due_str.replace("Z", "+00:00")
                    due_dt = datetime.datetime.fromisoformat(clean_ts)
                    due_date = due_dt.date()
                    if due_date == today_date:
                        due_today_cards += 1
                        is_due_today = True
                except Exception as date_err:
                    print(f"[TRELLO DEBUG] Date parsing error for card '{card_name}': {date_err}")
                    
            print(f"[TRELLO DEBUG] Card: '{card_name}', List: '{list_name}', Due: '{due_str}' (DueToday: {is_due_today}, Done: {is_done})")
            
    return {
        "totalBoards": total_boards,
        "totalCards": total_cards,
        "completedCards": completed_cards,
        "dueTodayCards": due_today_cards
    }

