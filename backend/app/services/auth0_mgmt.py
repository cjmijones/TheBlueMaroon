# app/services/auth0_mgmt.py
import logging
async def add_role_to_user(user_id: str, role_slug: str):
    logging.getLogger("auth0").info(
        "🛈 [stub] would add role %s to user %s", role_slug, user_id
    )
