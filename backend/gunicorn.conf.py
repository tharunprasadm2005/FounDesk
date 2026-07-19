import os

bind = "0.0.0.0:8000"
workers = 1
worker_class = "sync"
timeout = 120
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = "info"
capture_output = True
