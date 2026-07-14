def sync_deterministic(api_client, adapter_fn, workspace_id):
    raw_items = api_client.fetch_all()
    records = []
    for item in raw_items:
        record = adapter_fn(item, workspace_id)
        if record:
            records.append(record)
    return records
