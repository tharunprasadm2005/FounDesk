import subprocess, json

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo1OTMsImV4cCI6MTc4MjExNjkzNn0.s6Bi6jGt6YOnu_HksCStt22zqMdFN9e-UBiW1rrtU5A'
headers = {'Authorization': f'Bearer {token}'}

tests = [
    ('Asana', 'http://127.0.0.1:5000/api/asana/profile'),
    ('Calendly', 'http://127.0.0.1:5000/api/calendly/profile'),
    ('Linear', 'http://127.0.0.1:5000/api/linear/issues'),
]

for name, url in tests:
    try:
        result = subprocess.run(['curl.exe', '-s', '--max-time', '15', url, '-H', f'Authorization: Bearer {token}'],
                              capture_output=True, text=True, timeout=20)
        d = json.loads(result.stdout)
        if name == 'Linear':
            print(f'{name}: {len(d)} issues')
            for i in d[:3]:
                print(f'  [{i.get("identifier","?")}] {i.get("title","?")[:40]}')
        elif name == 'Asana':
            print(f'{name}: {d.get("name","?")} | email: {d.get("email","?")}')
        elif name == 'Calendly':
            print(f'{name}: {d.get("name","?")} | email: {d.get("email","?")}')
    except Exception as e:
        print(f'{name}: ERROR - {e}')

# Test priority actions
result = subprocess.run(['curl.exe', '-s', '--max-time', '15', 'http://127.0.0.1:5000/api/priority-actions', '-H', f'Authorization: Bearer {token}'],
                       capture_output=True, text=True, timeout=20)
d = json.loads(result.stdout)
acts = d.get('actions', [])
print(f'\nPriority actions: {len(acts)}')
for a in acts:
    print(f'  [{a.get("type","?")}] {a.get("title","?")[:120]}')
