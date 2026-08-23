import importlib.util
from pathlib import Path


def load_db_audit_module():
    module_path = Path(__file__).resolve().parents[1] / "scripts" / "db_audit.py"
    spec = importlib.util.spec_from_file_location("db_audit", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_database_target_masks_credentials():
    db_audit = load_db_audit_module()

    target = db_audit.database_target(
        "postgresql+asyncpg://app_user:secret-password@example.neon.tech:5432/neondb?sslmode=require",
        env_type="dev",
    )

    assert target["env_type"] == "dev"
    assert target["driver"] == "postgresql+asyncpg"
    assert target["host"] == "example.neon.tech"
    assert target["database"] == "neondb"
    assert target["uses_neon"] is True
    assert "secret-password" not in str(target)
    assert "app_user" not in str(target)


def test_schema_status_detects_drift_and_clean_state():
    db_audit = load_db_audit_module()

    assert db_audit.schema_status("abc", "abc") == "current"
    assert db_audit.schema_status("old", "new") == "drift"
    assert db_audit.schema_status(None, "new") == "missing_alembic_version"
    assert db_audit.schema_status("old", None) == "unknown_local_head"


def test_audit_columns_include_quality_check_dependencies():
    db_audit = load_db_audit_module()

    assert "email" in db_audit.audit_columns_for("users")
    assert "user_id" in db_audit.audit_columns_for("wallets")
    assert "mint_tx_hash" in db_audit.audit_columns_for("app_assets")


def test_audit_result_exit_code_respects_fail_on_drift():
    db_audit = load_db_audit_module()

    clean = {"schema": {"status": "current"}, "checks": []}
    drift = {"schema": {"status": "drift"}, "checks": []}
    failed_check = {"schema": {"status": "current"}, "checks": [{"status": "fail"}]}

    assert db_audit.exit_code_for(clean, fail_on_drift=True) == 0
    assert db_audit.exit_code_for(drift, fail_on_drift=False) == 0
    assert db_audit.exit_code_for(drift, fail_on_drift=True) == 1
    assert db_audit.exit_code_for(failed_check, fail_on_drift=False) == 1
