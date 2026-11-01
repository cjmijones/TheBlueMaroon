from pathlib import Path

from app.auth import deps
from app.main import app


BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_auth0_refresh_routes_are_not_mounted():
    paths = {getattr(route, "path", "") for route in app.routes}

    assert "/api/token/refresh" not in paths
    assert "/api/test-tokens/refresh-and-validate" not in paths


def test_auth0_refresh_helper_is_removed_from_auth_deps():
    assert not hasattr(deps, "exchange_refresh_token")


def test_auth0_token_route_files_are_removed():
    assert not (BACKEND_DIR / "app/api/routes_token.py").exists()
    assert not (BACKEND_DIR / "app/api/routes_test_tokens.py").exists()
