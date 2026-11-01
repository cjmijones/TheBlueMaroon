import argparse
import asyncio
import json
import ssl
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


TABLES = [
    "alembic_version",
    "users",
    "wallets",
    "app_assets",
    "fractional_listings",
    "transactions",
    "user_verification",
    "listings",
    "orders",
    "roles",
    "user_roles",
]

CRITICAL_COLUMNS = {
    "app_assets": ["id", "creator_id", "status", "mint_tx_hash"],
    "fractional_listings": [
        "creator_id",
        "vault_salt",
        "expires_at",
        "status",
        "tx_hash",
        "updated_at",
    ],
    "transactions": ["hash", "wallet_address", "status", "user_id", "updated_at"],
}

QUALITY_CHECKS = [
    {
        "name": "users_without_email",
        "sql": "select count(*) from users where email is null or trim(email) = ''",
        "requires": {"users": ["email"]},
        "warn_if_positive": True,
    },
    {
        "name": "duplicate_user_emails",
        "sql": """
            select count(*) from (
                select lower(email)
                from users
                where email is not null
                group by lower(email)
                having count(*) > 1
            ) dup
        """,
        "requires": {"users": ["email"]},
        "fail_if_positive": True,
    },
    {
        "name": "wallets_without_user",
        "sql": "select count(*) from wallets where user_id is null",
        "requires": {"wallets": ["user_id"]},
        "fail_if_positive": True,
    },
    {
        "name": "wallets_orphaned_user",
        "sql": """
            select count(*)
            from wallets w
            left join users u on u.id = w.user_id
            where w.user_id is not null and u.id is null
        """,
        "requires": {"wallets": ["user_id"], "users": ["id"]},
        "fail_if_positive": True,
    },
    {
        "name": "users_with_multiple_primary_wallets",
        "sql": """
            select count(*)
            from (
                select user_id
                from wallets
                where is_primary is true
                group by user_id
                having count(*) > 1
            ) dup
        """,
        "requires": {"wallets": ["user_id", "is_primary"]},
        "fail_if_positive": True,
    },
    {
        "name": "fractional_listings_orphaned_creator",
        "sql": """
            select count(*)
            from fractional_listings f
            left join users u on u.id = f.creator_id
            where u.id is null
        """,
        "requires": {"fractional_listings": ["creator_id"], "users": ["id"]},
        "fail_if_positive": True,
    },
    {
        "name": "fractional_listings_expired_drafts",
        "sql": """
            select count(*)
            from fractional_listings
            where vault is null and expires_at < now()
        """,
        "requires": {"fractional_listings": ["vault", "expires_at"]},
        "warn_if_positive": True,
    },
    {
        "name": "fractional_listings_active_without_vault",
        "sql": """
            select count(*)
            from fractional_listings
            where status = 'active' and vault is null
        """,
        "requires": {"fractional_listings": ["status", "vault"]},
        "fail_if_positive": True,
    },
    {
        "name": "fractional_listings_vault_without_active_status",
        "sql": """
            select count(*)
            from fractional_listings
            where vault is not null and coalesce(status, '') <> 'active'
        """,
        "requires": {"fractional_listings": ["status", "vault"]},
        "warn_if_positive": True,
    },
    {
        "name": "transactions_orphaned_user",
        "sql": """
            select count(*)
            from transactions t
            left join users u on u.id = t.user_id
            where t.user_id is not null and u.id is null
        """,
        "requires": {"transactions": ["user_id"], "users": ["id"]},
        "fail_if_positive": True,
    },
    {
        "name": "transactions_orphaned_wallet",
        "sql": """
            select count(*)
            from transactions t
            left join wallets w on w.address = t.wallet_address
            where t.wallet_address is not null and w.address is null
        """,
        "requires": {"transactions": ["wallet_address"], "wallets": ["address"]},
        "warn_if_positive": True,
    },
    {
        "name": "kyc_orphaned_user",
        "sql": """
            select count(*)
            from user_verification v
            left join users u on u.id = v.user_id
            where u.id is null
        """,
        "requires": {"user_verification": ["user_id"], "users": ["id"]},
        "fail_if_positive": True,
    },
]


def audit_columns_for(table: str) -> list[str]:
    columns = set(CRITICAL_COLUMNS.get(table, []))
    for check in QUALITY_CHECKS:
        columns.update(check["requires"].get(table, []))
    return sorted(columns)


def database_target(db_url: str, env_type: str) -> dict[str, Any]:
    parsed = urlparse(db_url or "")
    return {
        "env_type": env_type,
        "driver": parsed.scheme or "unset",
        "host": parsed.hostname or "unset",
        "database": (parsed.path or "/unset").lstrip("/") or "unset",
        "uses_neon": "neon.tech" in (parsed.hostname or ""),
    }


def schema_status(db_current: str | None, local_head: str | None) -> str:
    if not db_current:
        return "missing_alembic_version"
    if not local_head:
        return "unknown_local_head"
    if db_current == local_head:
        return "current"
    return "drift"


def exit_code_for(result: dict[str, Any], fail_on_drift: bool) -> int:
    schema = result.get("schema", {})
    if fail_on_drift and schema.get("status") != "current":
        return 1
    checks = result.get("checks", [])
    if any(check.get("status") == "fail" for check in checks):
        return 1
    tables = result.get("tables", {})
    for info in tables.values():
        if info.get("required") and not info.get("present"):
            return 1
        for column in info.get("columns", {}).values():
            if column.get("required") and not column.get("present"):
                return 1
    return 0


def get_local_head(backend_dir: Path) -> str | None:
    config = Config(str(backend_dir / "alembic.ini"))
    script = ScriptDirectory.from_config(config)
    return script.get_current_head()


def make_engine(db_url: str):
    ssl_ctx = ssl.create_default_context()
    connect_args = {"ssl": ssl_ctx} if "neon.tech" in db_url else {}
    return create_async_engine(
        db_url,
        echo=False,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_size=1,
        max_overflow=0,
    )


async def scalar(conn, sql: str, params: dict[str, Any] | None = None) -> Any:
    result = await conn.execute(text(sql), params or {})
    return result.scalar()


async def safe_scalar(conn, sql: str, params: dict[str, Any] | None = None) -> tuple[Any, str | None]:
    try:
        return await scalar(conn, sql, params), None
    except SQLAlchemyError as exc:
        await conn.rollback()
        return None, exc.__class__.__name__


async def table_present(conn, table: str) -> bool:
    return bool(
        await scalar(
            conn,
            """
            select exists (
                select 1
                from information_schema.tables
                where table_schema = 'public' and table_name = :table
            )
            """,
            {"table": table},
        )
    )


async def column_present(conn, table: str, column: str) -> bool:
    return bool(
        await scalar(
            conn,
            """
            select exists (
                select 1
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = :table
                  and column_name = :column
            )
            """,
            {"table": table, "column": column},
        )
    )


def requirements_met(tables: dict[str, Any], requirements: dict[str, list[str]]) -> bool:
    for table, columns in requirements.items():
        table_info = tables.get(table, {})
        if not table_info.get("present"):
            return False
        for column in columns:
            if not table_info.get("columns", {}).get(column, {}).get("present"):
                return False
    return True


async def run_audit(db_url: str, env_type: str, backend_dir: Path) -> dict[str, Any]:
    engine = make_engine(db_url)
    target = database_target(db_url, env_type)
    local_head = get_local_head(backend_dir)
    result: dict[str, Any] = {
        "target": target,
        "schema": {
            "database_version": None,
            "local_head": local_head,
            "status": "unknown",
        },
        "tables": {},
        "checks": [],
    }

    async with engine.connect() as conn:
        try:
            await conn.execute(text("set transaction read only"))
        except SQLAlchemyError:
            await conn.rollback()

        db_current, current_error = await safe_scalar(
            conn,
            "select version_num from alembic_version limit 1",
        )
        result["schema"]["database_version"] = db_current
        result["schema"]["status"] = schema_status(db_current, local_head)
        if current_error:
            result["schema"]["error"] = current_error

        for table in TABLES:
            present = await table_present(conn, table)
            table_info: dict[str, Any] = {
                "present": present,
                "required": table in {"users", "wallets", "app_assets", "fractional_listings", "transactions"},
                "rows": None,
                "columns": {},
            }
            if present and table != "alembic_version":
                rows, row_error = await safe_scalar(conn, f'select count(*) from "{table}"')
                table_info["rows"] = rows
                if row_error:
                    table_info["row_count_error"] = row_error
            for column in audit_columns_for(table):
                column_is_present = present and await column_present(conn, table, column)
                table_info["columns"][column] = {
                    "present": column_is_present,
                    "required": column in CRITICAL_COLUMNS.get(table, []),
                }
            result["tables"][table] = table_info

        for check in QUALITY_CHECKS:
            if not requirements_met(result["tables"], check["requires"]):
                result["checks"].append(
                    {
                        "name": check["name"],
                        "status": "skip",
                        "reason": "missing_required_table_or_column",
                    }
                )
                continue

            value, error = await safe_scalar(conn, check["sql"])
            status = "pass"
            if error:
                status = "fail"
            elif value and check.get("fail_if_positive"):
                status = "fail"
            elif value and check.get("warn_if_positive"):
                status = "warn"
            check_result = {
                "name": check["name"],
                "status": status,
                "count": value,
            }
            if error:
                check_result["error"] = error
            result["checks"].append(check_result)

    await engine.dispose()
    return result


def print_text(result: dict[str, Any]) -> None:
    target = result["target"]
    schema = result["schema"]
    print("database audit")
    print(f"target env={target['env_type']} driver={target['driver']} host={target['host']} database={target['database']} neon={target['uses_neon']}")
    print(
        "schema "
        f"database_version={schema.get('database_version')} "
        f"local_head={schema.get('local_head')} "
        f"status={schema.get('status')}"
    )

    print("tables")
    for table, info in result["tables"].items():
        if info["present"]:
            row_text = "" if info["rows"] is None else f" rows={info['rows']}"
            print(f"- {table}: present{row_text}")
        else:
            print(f"- {table}: missing")
        for column, column_info in info.get("columns", {}).items():
            status = "present" if column_info["present"] else "missing"
            print(f"  - {column}: {status}")

    print("checks")
    for check in result["checks"]:
        if check["status"] == "skip":
            print(f"- {check['name']}: SKIP {check.get('reason')}")
        elif check["status"] == "pass":
            print(f"- {check['name']}: PASS count={check.get('count')}")
        elif check["status"] == "warn":
            print(f"- {check['name']}: WARN count={check.get('count')}")
        else:
            detail = check.get("error") or f"count={check.get('count')}"
            print(f"- {check['name']}: FAIL {detail}")


async def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only database cleanliness audit.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of text.")
    parser.add_argument("--fail-on-drift", action="store_true", help="Exit 1 when DB Alembic version differs from local head.")
    args = parser.parse_args()

    from app.core.config import get_settings

    backend_dir = Path(__file__).resolve().parents[1]
    settings = get_settings()
    db_url = settings.get_db_url()
    if not db_url:
        result = {
            "target": database_target("", settings.env_type),
            "schema": {"database_version": None, "local_head": get_local_head(backend_dir), "status": "missing_database_url"},
            "tables": {},
            "checks": [{"name": "database_url_configured", "status": "fail", "count": None}],
        }
        if args.json:
            print(json.dumps(result, indent=2, sort_keys=True))
        else:
            print_text(result)
        return 1

    result = await run_audit(db_url, settings.env_type, backend_dir)
    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True, default=str))
    else:
        print_text(result)
    return exit_code_for(result, args.fail_on_drift)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
