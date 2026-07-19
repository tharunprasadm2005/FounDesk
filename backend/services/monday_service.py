import requests

def execute_query(query, variables=None, access_token=None):
    """
    Execute a GraphQL query against Monday.com API v2.
    """
    if not access_token:
        raise Exception("Access token is required for Monday.com API calls")
        
    url = "https://api.monday.com/v2"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
        
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    
    if response.status_code == 200:
        res_data = response.json()
        if "errors" in res_data:
            raise Exception(f"Monday API GraphQL error: {res_data['errors'][0].get('message')}")
        return res_data.get("data", {})
    else:
        # Check if unauthorized
        if response.status_code == 401:
            raise Exception("Monday API error (HTTP 401): Unauthorized access token")
        raise Exception(f"Monday API HTTP error {response.status_code}: {response.text}")

def get_profile(access_token):
    """
    Fetch the current authenticated user profile.
    """
    query = """
    query {
        me {
            id
            name
            email
            photo_thumb
        }
    }
    """
    data = execute_query(query, access_token=access_token)
    return data.get("me", {})

def get_boards(access_token):
    """
    Fetch all active boards in the workspace.
    """
    query = """
    query {
        boards(limit: 50) {
            id
            name
            description
            state
        }
    }
    """
    data = execute_query(query, access_token=access_token)
    return data.get("boards", [])

def get_items(access_token):
    """
    Fetch tasks (items) within active boards, parsing custom columns to standard status, owner and due dates.
    """
    query = """
    query {
        boards(limit: 50) {
            id
            name
            columns {
                id
                title
                type
            }
            items_page(limit: 200) {
                items {
                    id
                    name
                    created_at
                    updated_at
                    group {
                        title
                    }
                    column_values {
                        id
                        text
                        type
                    }
                }
            }
        }
    }
    """
    data = execute_query(query, access_token=access_token)
    boards_data = data.get("boards", [])
    
    parsed_items = []
    for board in boards_data:
        board_name = board.get("name")
        items_page = board.get("items_page", {})
        items = items_page.get("items", []) if items_page else []
        # Build column id sets for this board
        status_col_ids = set()
        priority_col_ids = set()
        progress_col_ids = set()
        risk_col_ids = set()
        for col in board.get("columns", []):
            ctype = (col.get("type") or "").lower()
            ctitle = (col.get("title") or "").lower()
            cid = (col.get("id") or "").lower()
            if ctype == "color" or "status" in ctitle or "status" in cid:
                status_col_ids.add(col["id"])
            if "priority" in ctitle or "priority" in cid:
                priority_col_ids.add(col["id"])
            if "progress" in ctitle or "progress" in cid:
                progress_col_ids.add(col["id"])
            if "risk" in ctitle or "risk" in cid:
                risk_col_ids.add(col["id"])
        for item in items:
            status = "Not Started"
            people = "Unassigned"
            due_date = "No Date"
            priority = None
            progress = None
            risk = None
            
            # Search column values for status, people, timeline, priority, progress, risk
            for col in item.get("column_values", []):
                col_id = col.get("id", "")
                col_type = col.get("type", "").lower()
                col_text = col.get("text")
                
                if col_id in status_col_ids:
                    status = col_text or "Not Started"
                elif col_id in priority_col_ids:
                    priority = col_text
                elif col_id in progress_col_ids:
                    progress = col_text
                elif col_id in risk_col_ids:
                    risk = col_text
                elif "people" in col_type or "multiple-person" in col_type or "person" in col_id.lower():
                    people = col_text or "Unassigned"
                elif "date" in col_type or "timeline" in col_type or "date" in col_id.lower():
                    due_date = col_text or "No Date"
                    
            created_at = item.get("created_at")
            updated_at = item.get("updated_at")
            parsed_items.append({
                "id": item.get("id"),
                "name": item.get("name"),
                "status": status,
                "people": people,
                "due_date": due_date,
                "priority": priority,
                "progress_percentage": progress,
                "risk_level": risk,
                "group": item.get("group", {}).get("title") if item.get("group") else "Default Group",
                "board": board_name,
                "created_at": created_at,
                "updated_at": updated_at
            })
    return parsed_items

def get_updates(access_token):
    """
    Fetch the latest updates / comments feed.
    """
    query = """
    query {
        updates(limit: 50) {
            id
            body
            created_at
            creator {
                name
                photo_thumb
            }
        }
    }
    """
    data = execute_query(query, access_token=access_token)
    return data.get("updates", [])
