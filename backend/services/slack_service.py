import requests

def get_channels(token):
    url = "https://slack.com/api/conversations.list"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"types": "public_channel,private_channel", "limit": 100, "exclude_archived": True}
    response = requests.get(url, headers=headers, params=params, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        if not data.get("ok"):
            raise Exception(f"Slack conversations.list API error: {data.get('error')}")
        return data.get("channels", [])
    else:
        raise Exception(f"Slack API request failed with status code {response.status_code}: {response.text}")

def get_messages(channel_id, token):
    url = "https://slack.com/api/conversations.history"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"channel": channel_id, "limit": 50}
    response = requests.get(url, headers=headers, params=params, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        if not data.get("ok"):
            raise Exception(f"Slack conversations.history API error: {data.get('error')}")
        return data.get("messages", [])
    else:
        raise Exception(f"Slack API request failed with status code {response.status_code}: {response.text}")

def get_users(token):
    url = "https://slack.com/api/users.list"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        if not data.get("ok"):
            raise Exception(f"Slack users.list API error: {data.get('error')}")
        return data.get("members", [])
    else:
        raise Exception(f"Slack API request failed with status code {response.status_code}: {response.text}")
