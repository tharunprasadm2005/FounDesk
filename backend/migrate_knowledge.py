"""Migrate knowledge_items table: clear old data, add new columns, add constraint."""
import psycopg2, os
from dotenv import load_dotenv; load_dotenv()
from urllib.parse import unquote
import re

url = os.environ['DATABASE_URL']
m = re.match(r'postgresql://(\w+):([^@]+)@(.+)$', url)
user = m.group(1)
password = unquote(m.group(2))
rest = m.group(3)
host = rest.split(':')[0]
port_db = rest.split(':')[1]
port = port_db.split('/')[0]
dbname = port_db.split('/')[1]

conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password)
cur = conn.cursor()

# 1. Delete ALL existing rows
cur.execute("DELETE FROM knowledge_items")
print(f"Deleted all existing knowledge_items rows")

# 2. Get current columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='knowledge_items' ORDER BY ordinal_position")
existing_cols = [r[0] for r in cur.fetchall()]
print(f"Current columns: {existing_cols}")

# 3. Add new columns if missing
new_cols = {
    'knowledge_type': "VARCHAR(50)",
    'summary': "TEXT",
    'key_points': "JSON DEFAULT '[]'::json",
    'applicable_to': "VARCHAR(255)",
    'confidence': "FLOAT",
    'integration_event_id': "VARCHAR(255)",
    'raw_content': "TEXT",
}

for col, col_type in new_cols.items():
    if col not in existing_cols:
        cur.execute(f'ALTER TABLE knowledge_items ADD COLUMN {col} {col_type}')
        print(f"  Added column: {col}")

# 4. Add uniqueness constraint on integration_event_id
cur.execute("""
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name='knowledge_items' AND constraint_type='UNIQUE'
""")
existing_constraints = [r[0] for r in cur.fetchall()]
if 'uq_knowledge_event_id' not in existing_constraints:
    try:
        cur.execute("ALTER TABLE knowledge_items ADD CONSTRAINT uq_knowledge_event_id UNIQUE (integration_event_id)")
        print("  Added uniqueness constraint on integration_event_id")
    except Exception as e:
        print(f"  Could not add constraint (maybe some rows have NULL): {e}")

# 5. Drop old unused columns if they exist
for old_col in ['content', 'category', 'tags']:
    if old_col in existing_cols:
        try:
            cur.execute(f'ALTER TABLE knowledge_items DROP COLUMN {old_col}')
            print(f"  Dropped old column: {old_col}")
        except Exception as e:
            print(f"  Could not drop {old_col}: {e}")

conn.commit()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='knowledge_items' ORDER BY ordinal_position")
print(f"\nFinal columns: {[r[0] for r in cur.fetchall()]}")
cur.execute("SELECT COUNT(*) FROM knowledge_items")
print(f"Rows: {cur.fetchone()[0]}")

conn.close()
print("Migration complete.")
