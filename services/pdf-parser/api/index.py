import sys
from pathlib import Path

# Add the service root directory to sys.path so 'app' and its submodules are discoverable
service_root = Path(__file__).resolve().parent.parent
if str(service_root) not in sys.path:
    sys.path.insert(0, str(service_root))

from app.main import app

