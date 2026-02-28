from __future__ import annotations

from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from .config import settings

bearer_scheme = HTTPBearer(auto_error=False)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client

    jwks_url = settings.supabase_jwks_url
    if not jwks_url and settings.supabase_project_url:
        jwks_url = settings.supabase_project_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"

    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase JWT verification is not configured",
        )

    _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def verify_token(token: str) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")

        # If you're using the legacy HS256 secret, only use it when token alg is HS*
        if settings.supabase_jwt_secret and alg and alg.startswith("HS"):
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        else:
            jwks_client = _get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token).key

            # Supabase tokens can be ES256 (and sometimes RS256 depending on config)
            allowed_algs = ["ES256", "RS256"]

            payload = jwt.decode(
                token,
                signing_key,
                algorithms=allowed_algs,
                options={"verify_aud": False},  # keep simple for now
            )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid auth token: {exc}",
        ) from exc

    return payload


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if settings.dev_auth_bypass:
        return "dev-user"

    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub claim")
    return str(user_id)
