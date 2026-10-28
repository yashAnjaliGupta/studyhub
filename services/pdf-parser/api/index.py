import sys
import json
import traceback
from pathlib import Path

# Add the service root directory to sys.path
service_root = Path(__file__).resolve().parent.parent
if str(service_root) not in sys.path:
    sys.path.insert(0, str(service_root))

try:
    from app.main import app
except Exception as e:
    tb = traceback.format_exc()

    # Zero-dependency ASGI fallback to expose real initialization errors in the browser/response
    async def app(scope, receive, send):
        if scope["type"] == "http":
            response_body = json.dumps({
                "status": "initialization_failed",
                "error": str(e),
                "traceback": tb.splitlines(),
                "sys_path": sys.path,
                "files_in_service_root": [p.name for p in service_root.glob("*")]
            }, indent=2).encode("utf-8")

            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(response_body)).encode("utf-8")),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": response_body,
            })
