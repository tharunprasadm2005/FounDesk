import requests

def get_recent_documents(access_token):
    """
    Fetch the 10 most recent Google Documents from Google Drive.
    """
    url = "https://www.googleapis.com/drive/v3/files"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "q": "mimeType='application/vnd.google-apps.document' and trashed=false",
        "orderBy": "modifiedTime desc",
        "pageSize": 50,
        "fields": "files(id, name, modifiedTime, owners, webViewLink)"
    }
    res = requests.get(url, headers=headers, params=params, timeout=10)
    
    if res.status_code == 401:
        raise Exception("401: Google authorization expired.")
    if res.status_code != 200:
        raise Exception(f"Drive API returned error code {res.status_code}: {res.text}")
        
    data = res.json()
    files = data.get("files", [])
    
    documents = []
    for f in files:
        owners = f.get("owners", [])
        owner_name = owners[0].get("displayName") if owners else "Unknown Owner"
        documents.append({
            "id": f.get("id"),
            "title": f.get("name"),
            "modifiedTime": f.get("modifiedTime"),
            "owner": owner_name,
            "url": f.get("webViewLink")
        })
        
    return documents

def get_document(document_id, access_token):
    """
    Fetch and parse the raw text content of a specific Google Document.
    """
    url = f"https://docs.googleapis.com/v1/documents/{document_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    res = requests.get(url, headers=headers, timeout=10)
    
    if res.status_code == 401:
        raise Exception("401: Google authorization expired.")
    if res.status_code != 200:
        raise Exception(f"Docs API returned error code {res.status_code}: {res.text}")
        
    doc_data = res.json()
    title = doc_data.get("title", "Untitled Document")
    
    # Extract plain text content from the document structure
    text = ""
    body = doc_data.get("body", {})
    content = body.get("content", [])
    for element in content:
        if "paragraph" in element:
            elements = element["paragraph"].get("elements", [])
            for el in elements:
                if "textRun" in el:
                    text += el["textRun"].get("content", "")
                    
    return {
        "title": title,
        "content": text.strip()
    }
