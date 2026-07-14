import json
# Fetch feed items directly
import subprocess, sys
result = subprocess.run([
    'curl.exe', '-s', '--max-time', '15',
    'http://127.0.0.1:5000/api/unified-feed',
    '-H', 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1OTMsImV4cCI6MTc4MjExNjkzNn0.s6Bi6jGt6YOnu_HksCStt22zqMdFN9e-UBiW1rrtU5A'
], capture_output=True, text=True)
d = json.loads(result.stdout)
feed = d.get('feed', [])
# Find high-priority Gmail items
for item in feed:
    if item.get('priority') == 'high' and item.get('source') == 'gmail':
        print(f'Title: {item.get("title","?")[:60]}')
        print(f'Actor: {item.get("actor","?")}')
        print(f'Snippet: {item.get("details","?")[:80]}')
        print('---')
