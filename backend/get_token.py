import os, sys, jwt
from datetime import datetime, timedelta

# Must load .env BEFORE importing app
from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, 'C:/Users/tharu/FounDesk/backend')
os.environ['APP_ENV'] = 'development'
os.environ['SKIP_SCHEDULER'] = '1'

from app import app

with app.app_context():
    secret = app.config['SECRET_KEY']
    token = jwt.encode({'user_id': 653, 'email': 'tharunprasadm2005@gmail.com', 'exp': datetime.utcnow() + timedelta(days=1)}, secret, algorithm='HS256')
    print(f'TOKEN: {token}')
