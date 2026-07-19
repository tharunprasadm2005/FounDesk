import os
import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gevent"
timeout = 120
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = "info"
capture_output = True
