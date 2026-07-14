import json
with open('C:/Users/tharu/FounDesk/priority2.json', 'r', encoding='utf-8-sig') as f:
    d = json.load(f)
acts = d.get('actions', [])
print('Count:', len(acts))
for a in acts:
    t = a.get('type', '?')
    title = a.get('title', '?')[:100]
    print(f'  [{t}] {title}')
