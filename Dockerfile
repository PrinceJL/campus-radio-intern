FROM python:3.11

WORKDIR /app

COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "app/main.py"]