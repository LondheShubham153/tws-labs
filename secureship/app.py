import uuid

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from scanner import ScanError, scan_repo, valid_url

app = FastAPI(title="SecureShip")
templates = Jinja2Templates(directory="templates")
RESULTS: dict[str, dict] = {}  # in-memory for now; swap for DynamoDB + SQS worker later


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request, "index.html", {"error": ""})


@app.post("/scan")
def scan(request: Request, repo_url: str = Form(...)):
    # Plain `def` so FastAPI runs this blocking scan in its threadpool.
    repo_url = repo_url.strip()
    if not valid_url(repo_url):
        msg = "Enter a public URL like https://github.com/owner/repo"
        return templates.TemplateResponse(request, "index.html", {"error": msg}, status_code=400)
    try:
        result = scan_repo(repo_url)
    except ScanError as e:
        return templates.TemplateResponse(request, "index.html", {"error": str(e)}, status_code=400)
    rid = uuid.uuid4().hex[:10]
    RESULTS[rid] = result
    return RedirectResponse(f"/report/{rid}", status_code=303)


@app.get("/report/{rid}", response_class=HTMLResponse)
def report(request: Request, rid: str):
    result = RESULTS.get(rid)
    if not result:
        return RedirectResponse("/", status_code=303)
    return templates.TemplateResponse(request, "report.html", {"r": result})
