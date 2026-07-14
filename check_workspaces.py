import json
with open('C:/Users/tharu/FounDesk/workspaces.json', 'r', encoding='utf-8-sig') as f:
    d = json.load(f)
for w in d:
    members = w.get('members', [])
    print(f'WS {w["id"]}: {w["name"]}')
    print(f'  role={w.get("role","?")} | stage={w.get("stage","?")} | phase={w.get("active_phase","N/A")}')
    print(f'  members={len(members)}')
    for m in members[:5]:
        print(f'    [{m.get("role","?")}] {m.get("user_name","?")} <{m.get("email","?")}> status={m.get("status","?")} user_id={m.get("user_id","?")}')
    print()
