from sqlalchemy.orm import Session
from app.models import Wallet
from app.schemas.wallet import WalletCreate

def add_wallet(db: Session, user_id: str, payload: WalletCreate) -> Wallet:
    # Wallet exists?
    wallet = db.query(Wallet).get(payload.address.lower())
    if wallet and wallet.user_id != user_id:
        raise ValueError("wallet already linked to another user")

    if not wallet:
        wallet = Wallet(
            address=payload.address.lower(),
            user_id=user_id,
            is_primary=False,
        )
        db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet

def list_wallets(db: Session, user_id: str):
    return db.query(Wallet).filter(Wallet.user_id == user_id).all()

def remove_wallet(db: Session, user_id: str, address: str):
    wallet = db.query(Wallet).get(address.lower())
    if not wallet or wallet.user_id != user_id:
        raise ValueError("wallet not linked")
    db.delete(wallet)
    db.commit()
