"""PDF Parser Service Application Package"""
import os
from pathlib import Path
from dotenv import load_dotenv

_pkg_dir = Path(__file__).resolve().parent
_service_env = _pkg_dir.parent / ".env"
_repo_root = _pkg_dir.parents[2]
_testhub_env = _repo_root / "apps" / "testhub" / ".env"
_root_env = _repo_root / ".env"

if _service_env.exists():
    load_dotenv(dotenv_path=_service_env)
if _testhub_env.exists():
    load_dotenv(dotenv_path=_testhub_env)
if _root_env.exists():
    load_dotenv(dotenv_path=_root_env)
