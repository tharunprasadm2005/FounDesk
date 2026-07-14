import requests


def getAnalyticsReport(access_token, property_id):
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    body = {
        "dateRanges": [
            {"startDate": "7daysAgo", "endDate": "today"}
        ],
        "metrics": [
            {"name": "activeUsers"}
        ],
        "dimensions": [
            {"name": "date"}
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=body, timeout=8)
        if response.status_code != 200:
            print(f"GA4 Api Error: {response.status_code} - {response.text}")
            return []
        
        data = response.json()
        results = []

        if "rows" in data:
            for row in data["rows"]:
                results.append({
                    "date": row["dimensionValues"][0]["value"],
                    "users": int(row["metricValues"][0]["value"])
                })
        return results
    except Exception as e:
        print("Error fetching Google Analytics report:", e)
        return []
