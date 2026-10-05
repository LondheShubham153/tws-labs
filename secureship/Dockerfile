FROM aquasec/trivy:0.58.1 AS trivy
FROM zricethezav/gitleaks:v8.21.2 AS gitleaks
FROM hadolint/hadolint:v2.12.0 AS hadolint

FROM python:3.12-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=trivy /usr/local/bin/trivy /usr/local/bin/trivy
COPY --from=gitleaks /usr/bin/gitleaks /usr/local/bin/gitleaks
COPY --from=hadolint /bin/hadolint /usr/local/bin/hadolint

RUN useradd -m -u 10001 app
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=app:app . .

USER app
ENV TRIVY_CACHE_DIR=/tmp/trivy-cache
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
