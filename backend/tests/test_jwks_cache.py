from unittest.mock import Mock

from app.auth import deps


def test_signing_keys_refresh_after_cache_expiry(monkeypatch):
    deps._jwks.__dict__.clear()
    clock = Mock(side_effect=[1000, 1001, 1301, 1302, 1303])
    response = Mock()
    response.json.side_effect = [{"keys": ["old"]}, {"keys": ["new"]}]
    fetch = Mock(return_value=response)
    monkeypatch.setattr(deps.time, "time", clock)
    monkeypatch.setattr(deps.httpx, "get", fetch)

    assert deps._jwks() == {"keys": ["old"]}
    assert deps._jwks() == {"keys": ["old"]}
    assert deps._jwks() == {"keys": ["new"]}
    assert fetch.call_count == 2
    deps._jwks.__dict__.clear()
