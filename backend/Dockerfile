FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir gunicorn==23.0.0 && pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "300", "--max-requests", "1000", "--max-requests-jitter", "200", "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]
