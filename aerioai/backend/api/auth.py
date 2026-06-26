from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User, UserRole, AuditLog
from schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse, PasswordChange
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole(payload.role) if payload.role in [r.value for r in UserRole] else UserRole.OPERATOR,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(user_id=user.id, action="register", details=f"User {user.username} registered")
    db.add(audit)
    db.commit()

    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})

    audit = AuditLog(user_id=user.id, action="login", details=f"User {user.username} logged in")
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role.value,
            is_active=user.is_active,
            created_at=str(user.created_at),
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()

    audit = AuditLog(user_id=current_user.id, action="password_change", details="Password changed")
    db.add(audit)
    db.commit()

    return {"message": "Password updated successfully"}
