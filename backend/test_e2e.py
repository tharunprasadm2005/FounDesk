import os, sys, jwt, json
from datetime import datetime, timedelta
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app import app
from config.database import db
from models.user import User
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.task import Task
from models.goal import Goal

with app.test_client() as client:
    with app.app_context():
        db.create_all()

        u = User.query.filter_by(email='e2e@test.com').first()
        if not u:
            u = User(email='e2e@test.com', name='E2E Tester', google_id='e2e_mock')
            db.session.add(u)
        ws = Workspace.query.filter_by(name='E2E Test').first()
        if not ws:
            ws = Workspace(name='E2E Test', stage='Launch', creator_id=u.id)
            db.session.add(ws)
        db.session.commit()

        for role in ['founder']:
            m = WorkspaceMember.query.filter_by(workspace_id=ws.id, user_id=u.id).first()
            if not m:
                db.session.add(WorkspaceMember(workspace_id=ws.id, user_id=u.id, email=u.email, role=role, status='active'))
        db.session.commit()

        token = jwt.encode({'user_id': u.id, 'email': u.email, 'exp': datetime.utcnow() + timedelta(days=1)},
                           app.config['SECRET_KEY'], algorithm='HS256')
        headers = {'Authorization': f'Bearer {token}', 'X-Workspace-Id': str(ws.id), 'Content-Type': 'application/json'}

        Task.query.filter_by(workspace_id=ws.id).delete()
        Goal.query.filter_by(workspace_id=ws.id).delete()
        from models.recurring_workflow import RecurringWorkflow
        RecurringWorkflow.query.filter_by(workspace_id=ws.id).delete()
        from models.ai_feedback import AiFeedback
        AiFeedback.query.filter_by(workspace_id=ws.id).delete()
        db.session.commit()

        # 1. Empty insights
        r = client.get('/api/ai/insights', headers=headers)
        assert r.status_code == 200, f'insights failed: {r.data}'
        data = r.get_json()
        print(f'1. Insights empty: gb={len(data["goal_binding"])} wf={len(data["recurring_workflow"])} dec={len(data["inferred_decision"])} bp={len(data["blocker_prediction"])} active={len(data["active_workflows"])}')

        # 2. Create goal + unlinked task
        g = Goal(title='Close investor round', description='Finalize pitch deck', goal_type='weekly', status='pending', user_id=u.id, workspace_id=ws.id)
        db.session.add(g)
        db.session.commit()
        t = Task(title='Send investor pitch deck', description='Share valuation', status='Not Started', priority='P1', workspace_id=ws.id, user_id=u.id)
        db.session.add(t)
        db.session.commit()

        # 3. Insights with data
        r = client.get('/api/ai/insights', headers=headers)
        assert r.status_code == 200
        data = r.get_json()
        gb = data['goal_binding']
        assert len(gb) >= 1, f'Expected goal binding, got {len(gb)}'
        assert gb[0]['task_id'] == t.id
        assert gb[0]['recommended_goal_id'] == g.id
        print(f'2. Goal binding: {len(gb)} (task {gb[0]["task_id"]} -> goal {gb[0]["recommended_goal_id"]})')

        # 4. Create workflow
        r = client.post('/api/ai/workflows/create', json={'title': 'Weekly sync', 'frequency': 'weekly', 'day_of_week': datetime.utcnow().weekday()}, headers=headers)
        assert r.status_code == 201, f'create failed: {r.data}'
        wf = r.get_json()
        print(f'3. Workflow created: {wf["title"]} (id={wf["id"]})')

        # 5. Active workflows
        r = client.get('/api/ai/insights', headers=headers)
        assert len(r.get_json()['active_workflows']) == 1
        print('4. Active workflows: 1')

        # 6. Trigger workflow
        r = client.post('/api/ai/workflows/trigger', headers=headers)
        assert r.status_code == 200
        print(f'5. Workflow triggered: {r.get_json()["generated"]} task(s)')

        # 7. Feedback
        r = client.post('/api/ai/feedback', json={'suggestion_type': 'goal_binding', 'suggestion_key': str(t.id), 'action': 'rejected'}, headers=headers)
        assert r.status_code == 201
        r = client.get('/api/ai/insights', headers=headers)
        assert len(r.get_json()['goal_binding']) == 0
        print('6. Feedback: rejected suggestion hidden')

        # 8. Confirm decision
        r = client.post('/api/ai/decisions/confirm', json={'decision': 'We decided to use PostgreSQL', 'context': 'Test decision'}, headers=headers)
        assert r.status_code == 201, f'decision confirm failed: {r.data}'
        print(f'7. Decision confirmed: id={r.get_json()["id"]}')

        # 9. Goal breakdown
        r = client.post(f'/api/goals/{g.id}/breakdown', headers=headers)
        assert r.status_code == 201, f'breakdown failed: {r.data}'
        print(f'8. Goal breakdown: {len(r.get_json()["tasks"])} daily buckets')

        # 10. Auto-load template
        r = client.post('/api/workspaces/auto-load-template', headers=headers)
        print(f'9. Auto-load template: {r.status_code} (expected 400, no active phase)')

        # 11. Suggest context
        r = client.post('/api/tasks/suggest-context', json={'title': 'investor', 'description': ''}, headers=headers)
        assert r.status_code == 200
        print(f'10. Context suggestions: {len(r.get_json())} items')

        # 12. Notifications routing
        r = client.get('/api/notifications', headers=headers)
        assert r.status_code == 200
        n = r.get_json()
        assert 'routing' in n, f'Expected routing key in notifications, got {list(n.keys())}'
        print(f'11. Notifications routing: urgent={len(n["routing"]["urgent"])} today={len(n["routing"]["today"])} info={len(n["routing"]["info"])}')

        print()
        print('=== ALL E2E CHECKS PASSED ===')
