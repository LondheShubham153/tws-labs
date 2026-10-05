# SecureShip

Paste a public GitHub repo URL and get a security report: Hadolint (Dockerfiles), Gitleaks (secrets), Trivy (vulnerabilities and misconfigurations). Static scanning only; repo code is never built or run.

## Run locally
    docker build -t secureship .
    docker run --rm -p 8000:8000 secureship
Open http://localhost:8000

## Notes
- Tool versions and binary paths in the Dockerfile are pinned but untested; adjust if the build fails.
- First scan is slow while Trivy downloads its DB.
- Results are in memory (lost on restart). Next: SQS worker + DynamoDB.
