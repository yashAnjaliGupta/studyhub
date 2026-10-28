"""PDF Parser Service Application Package"""
import os
from pathlib import Path
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        pass

_pkg_dir = Path(__file__).resolve().parent
_service_env = _pkg_dir.parent / ".env"
_repo_parents = _pkg_dir.parents
_repo_root = _repo_parents[2] if len(_repo_parents) > 2 else _pkg_dir.parent
_testhub_env = _repo_root / "apps" / "testhub" / ".env"
_root_env = _repo_root / ".env"

if _service_env.exists():
    load_dotenv(dotenv_path=_service_env)
if _testhub_env.exists():
    load_dotenv(dotenv_path=_testhub_env)
if _root_env.exists():
    load_dotenv(dotenv_path=_root_env)
