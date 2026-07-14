import requests

def get_github_repositories(access_token):
    """
    Fetch public and private repositories for the authenticated GitHub user.
    """
    url = "https://api.github.com/user/repos"
    headers = {
        "Authorization": f"token {access_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    response = requests.get(url, headers=headers, timeout=10)
    
    if response.status_code == 200:
        return response.json()
    else:
        # Return error details or raise exception
        try:
            err_detail = response.json()
        except Exception:
            err_detail = response.text
        raise Exception(f"GitHub API error (HTTP {response.status_code}): {err_detail}")
