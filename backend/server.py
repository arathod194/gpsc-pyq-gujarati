"""GPSC Gujarat PYQ - FastAPI backend."""
import os
import uuid
import logging
import json
import asyncio
import secrets
import hashlib
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from typing import List, Optional, Annotated

import bcrypt
import jwt
import resend
import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Config ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")

# Emergent managed email proxy (constant — never read from env so it survives deploy)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMERGENT_EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "GPSC Gujarat PYQ")
CONTACT_NOTIFY_EMAIL = os.environ.get("CONTACT_NOTIFY_EMAIL", "")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="GPSC Gujarat PYQ API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------------------- Models ----------------------
def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: str
    role: str = "user"  # user | admin
    email_verified: bool = False
    verification_token: Optional[str] = None
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[str] = None
    current_streak: int = 0
    longest_streak: int = 0
    last_streak_date: Optional[str] = None  # YYYY-MM-DD
    created_at: str = Field(default_factory=utcnow_iso)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    email_verified: bool = False
    current_streak: int = 0
    longest_streak: int = 0
    created_at: str


class SignupReq(BaseModel):
    email: EmailStr
    name: str
    password: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class AuthRes(BaseModel):
    token: str
    user: UserPublic


class Option(BaseModel):
    label: str  # "ક", "ખ", "ગ", "ઘ" or "A","B","C","D"
    text: str


class Question(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    exam: str  # e.g. "GPSC Class 1-2", "Dy.SO/Nayab Mamlatdar", "PI"
    year: int
    subject: str  # e.g. "ઇતિહાસ", "ભૂગોળ"
    topic: Optional[str] = None
    question_text: str
    options: List[Option]
    correct_index: int  # 0..3
    official_explanation: Optional[str] = None
    created_at: str = Field(default_factory=utcnow_iso)


class QuestionCreate(BaseModel):
    exam: str
    year: int
    subject: str
    topic: Optional[str] = None
    question_text: str
    options: List[Option]
    correct_index: int
    official_explanation: Optional[str] = None


class Attempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    mode: str  # practice | mock
    exam: Optional[str] = None
    year: Optional[int] = None
    question_ids: List[str]
    answers: List[Optional[int]]  # selected index per question (None if skipped)
    score: int
    total: int
    time_taken_sec: int
    completed_at: str = Field(default_factory=utcnow_iso)


class AttemptCreate(BaseModel):
    mode: str
    exam: Optional[str] = None
    year: Optional[int] = None
    question_ids: List[str]
    answers: List[Optional[int]]
    time_taken_sec: int


class BookmarkReq(BaseModel):
    question_id: str


class ExplainReq(BaseModel):
    question_id: str


class GenerateReq(BaseModel):
    topic: str
    subject: str
    count: int = 5


class VerifyTokenReq(BaseModel):
    token: str


class ForgotPwReq(BaseModel):
    email: EmailStr


class ResetPwReq(BaseModel):
    token: str
    new_password: str


class DailyAnswerReq(BaseModel):
    selected_index: int


class BulkImportReq(BaseModel):
    questions: List[QuestionCreate]


class ContactMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    message: str
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    message: str


def user_to_public(u: User) -> UserPublic:
    return UserPublic(
        id=u.id,
        email=u.email,
        name=u.name,
        role=u.role,
        email_verified=u.email_verified,
        current_streak=u.current_streak,
        longest_streak=u.longest_streak,
        created_at=u.created_at,
    )


# ---------------------- Auth helpers ----------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, pw_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), pw_hash.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
        if not user_id:
            return None
        doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not doc:
            return None
        return User(**doc)
    except jwt.PyJWTError:
        return None


async def require_user(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def require_admin(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------------------- Email helpers ----------------------
async def _send_email(to_email: str, subject: str, html: str) -> Optional[str]:
    """Send email via Resend. Returns email id or None (when key not configured / dev mode)."""
    if not RESEND_API_KEY:
        logger.info("[email-mock] to=%s subject=%s", to_email, subject)
        return None
    params = {"from": SENDER_EMAIL, "to": [to_email], "subject": subject, "html": html}
    try:
        res = await asyncio.to_thread(resend.Emails.send, params)
        return res.get("id") if isinstance(res, dict) else None
    except Exception:
        logger.exception("Resend send failed")
        return None


async def _send_email_proxy(
    to_email: str, subject: str, html: str, reply_to: Optional[str] = None
) -> Optional[str]:
    """Send email via Emergent managed email proxy. Returns email id or None on failure."""
    if not EMERGENT_EMAIL_KEY:
        logger.info("[email-proxy-mock] to=%s subject=%s", to_email, subject)
        return None
    payload = {
        "to": [to_email],
        "subject": subject,
        "html": html,
        "from_name": EMAIL_FROM_NAME,
    }
    if reply_to:
        payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=30) as http_client:
            resp = await http_client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMERGENT_EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error("Email proxy send failed: %s", str(e))
        return None


def _verify_link(token: str) -> str:
    return f"{FRONTEND_URL}/verify-email?token={token}" if FRONTEND_URL else f"/verify-email?token={token}"


def _reset_link(token: str) -> str:
    return f"{FRONTEND_URL}/reset-password?token={token}" if FRONTEND_URL else f"/reset-password?token={token}"


def _email_template(title: str, body_html: str, cta_label: str, cta_url: str) -> str:
    return f"""
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, sans-serif; background: #F9FAFB; padding: 32px 0;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#fff; border:1px solid #E5E7EB; border-radius:8px; padding: 40px;">
          <tr><td style="color:#111827; font-size:22px; font-weight:600;">{title}</td></tr>
          <tr><td style="color:#4B5563; font-size:15px; line-height:1.6; padding-top:12px;">{body_html}</td></tr>
          <tr><td style="padding-top:24px;">
            <a href="{cta_url}" style="display:inline-block; background:#2563EB; color:#fff; padding:12px 20px; border-radius:6px; text-decoration:none; font-weight:500;">{cta_label}</a>
          </td></tr>
          <tr><td style="color:#9CA3AF; font-size:12px; padding-top:24px;">જો બટન કામ ન કરે, આ link copy કરો:<br/><span style="color:#2563EB; word-break:break-all;">{cta_url}</span></td></tr>
          <tr><td style="color:#9CA3AF; font-size:12px; padding-top:24px; border-top:1px solid #E5E7EB; margin-top:24px;">— GPSC Gujarat PYQ</td></tr>
        </table>
      </td></tr>
    </table>
    """


# ---------------------- Routes: Auth ----------------------
@api_router.post("/auth/signup", response_model=AuthRes)
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    verification_token = secrets.token_urlsafe(32)
    user = User(
        email=req.email.lower(),
        name=req.name.strip(),
        password_hash=hash_password(req.password),
        role="user",
        verification_token=verification_token,
    )
    await db.users.insert_one(user.model_dump())

    # Fire verification email (non-blocking in caller's path; we await but it's fast)
    link = _verify_link(verification_token)
    html = _email_template(
        "GPSC PYQ — Verify your email",
        f"નમસ્તે <b>{user.name}</b>,<br/><br/>GPSC Gujarat PYQ માં join કરવા બદલ આભાર. નીચે ક્લિક કરી તમારો email વેરિફાય કરો.",
        "Verify Email",
        link,
    )
    await _send_email(user.email, "Verify your email — GPSC PYQ", html)

    token = create_token(user.id, user.role)
    return AuthRes(token=token, user=user_to_public(user))


@api_router.post("/auth/login", response_model=AuthRes)
async def login(req: LoginReq):
    doc = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not doc or not verify_password(req.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    u = User(**doc)
    token = create_token(u.id, u.role)
    return AuthRes(token=token, user=user_to_public(u))


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: User = Depends(require_user)):
    return user_to_public(user)


@api_router.post("/auth/verify")
async def verify_email(req: VerifyTokenReq):
    doc = await db.users.find_one({"verification_token": req.token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    await db.users.update_one(
        {"id": doc["id"]},
        {"$set": {"email_verified": True, "verification_token": None}},
    )
    return {"verified": True}


@api_router.post("/auth/resend-verification")
async def resend_verification(user: User = Depends(require_user)):
    if user.email_verified:
        return {"sent": False, "reason": "already verified"}
    token = secrets.token_urlsafe(32)
    await db.users.update_one({"id": user.id}, {"$set": {"verification_token": token}})
    link = _verify_link(token)
    html = _email_template(
        "GPSC PYQ — Verify your email",
        f"નમસ્તે <b>{user.name}</b>,<br/><br/>નીચે ક્લિક કરી તમારો email વેરિફાય કરો.",
        "Verify Email",
        link,
    )
    eid = await _send_email(user.email, "Verify your email — GPSC PYQ", html)
    return {"sent": True, "email_id": eid, "dev_link": link if not RESEND_API_KEY else None}


@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPwReq):
    doc = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not doc:
        # Don't reveal account existence
        return {"sent": True}
    token = secrets.token_urlsafe(32)
    expiry = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    await db.users.update_one(
        {"id": doc["id"]},
        {"$set": {"reset_token": token, "reset_token_expiry": expiry}},
    )
    link = _reset_link(token)
    html = _email_template(
        "Password reset",
        f"નમસ્તે <b>{doc['name']}</b>,<br/><br/>નીચે ક્લિક કરી તમારો password reset કરો. આ link 2 કલાક માટે valid છે.",
        "Reset Password",
        link,
    )
    eid = await _send_email(doc["email"], "Password reset — GPSC PYQ", html)
    return {"sent": True, "email_id": eid, "dev_link": link if not RESEND_API_KEY else None}


@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPwReq):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    doc = await db.users.find_one({"reset_token": req.token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if doc.get("reset_token_expiry"):
        try:
            exp = datetime.fromisoformat(doc["reset_token_expiry"])
            if exp < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Reset token expired")
        except (TypeError, ValueError):
            pass
    await db.users.update_one(
        {"id": doc["id"]},
        {
            "$set": {
                "password_hash": hash_password(req.new_password),
                "reset_token": None,
                "reset_token_expiry": None,
            }
        },
    )
    return {"reset": True}


# ---------------------- Routes: Questions ----------------------
@api_router.get("/questions/filters")
async def get_filters():
    exams = await db.questions.distinct("exam")
    years = await db.questions.distinct("year")
    subjects = await db.questions.distinct("subject")
    return {
        "exams": sorted(exams),
        "years": sorted([y for y in years if isinstance(y, int)], reverse=True),
        "subjects": sorted(subjects),
    }


@api_router.get("/questions", response_model=List[Question])
async def list_questions(
    exam: Optional[str] = None,
    year: Optional[int] = None,
    subject: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
):
    filt: dict = {}
    if exam:
        filt["exam"] = exam
    if year:
        filt["year"] = year
    if subject:
        filt["subject"] = subject
    if q:
        filt["$or"] = [
            {"question_text": {"$regex": q, "$options": "i"}},
            {"topic": {"$regex": q, "$options": "i"}},
            {"subject": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.questions.find(filt, {"_id": 0}).limit(min(limit, 500)).to_list(500)
    return [Question(**d) for d in docs]


@api_router.get("/questions/random", response_model=List[Question])
async def random_questions(
    count: int = 10,
    exam: Optional[str] = None,
    subject: Optional[str] = None,
):
    match: dict = {}
    if exam:
        match["exam"] = exam
    if subject:
        match["subject"] = subject
    pipeline = []
    if match:
        pipeline.append({"$match": match})
    pipeline.append({"$sample": {"size": max(1, min(count, 100))}})
    pipeline.append({"$project": {"_id": 0}})
    docs = await db.questions.aggregate(pipeline).to_list(100)
    return [Question(**d) for d in docs]


@api_router.get("/questions/{qid}", response_model=Question)
async def get_question(qid: str):
    doc = await db.questions.find_one({"id": qid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")
    return Question(**doc)


@api_router.post("/questions", response_model=Question)
async def create_question(req: QuestionCreate, _: User = Depends(require_admin)):
    if len(req.options) != 4:
        raise HTTPException(status_code=400, detail="Exactly 4 options required")
    if not (0 <= req.correct_index <= 3):
        raise HTTPException(status_code=400, detail="correct_index must be 0..3")
    q = Question(**req.model_dump())
    await db.questions.insert_one(q.model_dump())
    return q


@api_router.delete("/questions/{qid}")
async def delete_question(qid: str, _: User = Depends(require_admin)):
    res = await db.questions.delete_one({"id": qid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"deleted": True}


# ---------------------- Routes: Attempts ----------------------
@api_router.post("/attempts", response_model=Attempt)
async def submit_attempt(req: AttemptCreate, user: User = Depends(require_user)):
    if len(req.answers) != len(req.question_ids):
        raise HTTPException(status_code=400, detail="answers length must match question_ids")
    qs = await db.questions.find({"id": {"$in": req.question_ids}}, {"_id": 0}).to_list(500)
    qmap = {q["id"]: q for q in qs}
    score = 0
    for qid, ans in zip(req.question_ids, req.answers):
        q = qmap.get(qid)
        if q and ans is not None and ans == q["correct_index"]:
            score += 1
    attempt = Attempt(
        user_id=user.id,
        mode=req.mode,
        exam=req.exam,
        year=req.year,
        question_ids=req.question_ids,
        answers=req.answers,
        score=score,
        total=len(req.question_ids),
        time_taken_sec=req.time_taken_sec,
    )
    await db.attempts.insert_one(attempt.model_dump())
    return attempt


@api_router.get("/attempts", response_model=List[Attempt])
async def list_attempts(user: User = Depends(require_user)):
    docs = await db.attempts.find({"user_id": user.id}, {"_id": 0}).sort("completed_at", -1).limit(50).to_list(50)
    return [Attempt(**d) for d in docs]


@api_router.get("/stats")
async def user_stats(user: User = Depends(require_user)):
    docs = await db.attempts.find({"user_id": user.id}, {"_id": 0}).to_list(1000)
    total_attempts = len(docs)
    total_questions = sum(a["total"] for a in docs)
    total_correct = sum(a["score"] for a in docs)
    accuracy = round((total_correct / total_questions) * 100, 1) if total_questions else 0.0
    mock_attempts = [a for a in docs if a["mode"] == "mock"]
    best_mock = max([a["score"] for a in mock_attempts], default=0)
    bookmarks_count = await db.bookmarks.count_documents({"user_id": user.id})

    # Subject-wise breakdown across all answered questions
    subject_map: dict = {}
    qid_to_subject: dict = {}
    all_qids = list({qid for a in docs for qid in a["question_ids"]})
    if all_qids:
        qdocs = await db.questions.find({"id": {"$in": all_qids}}, {"_id": 0, "id": 1, "subject": 1, "correct_index": 1}).to_list(2000)
        for qd in qdocs:
            qid_to_subject[qd["id"]] = (qd["subject"], qd["correct_index"])
    for a in docs:
        for qid, ans in zip(a["question_ids"], a["answers"]):
            meta = qid_to_subject.get(qid)
            if not meta:
                continue
            subj, correct_idx = meta
            entry = subject_map.setdefault(subj, {"subject": subj, "total": 0, "correct": 0})
            entry["total"] += 1
            if ans is not None and ans == correct_idx:
                entry["correct"] += 1
    subject_breakdown = []
    for s in subject_map.values():
        s["accuracy"] = round((s["correct"] / s["total"]) * 100, 1) if s["total"] else 0.0
        subject_breakdown.append(s)
    subject_breakdown.sort(key=lambda x: x["total"], reverse=True)

    return {
        "total_attempts": total_attempts,
        "total_questions_attempted": total_questions,
        "total_correct": total_correct,
        "accuracy": accuracy,
        "best_mock_score": best_mock,
        "mock_attempts": len(mock_attempts),
        "bookmarks": bookmarks_count,
        "subject_breakdown": subject_breakdown,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
    }


@api_router.get("/me/streak-calendar")
async def streak_calendar(days: int = 60, user: User = Depends(require_user)):
    """Returns a heatmap of daily-question activity for the last N days."""
    days = max(7, min(days, 180))
    today = datetime.now(timezone.utc).date()
    since = today - timedelta(days=days - 1)
    rows = await db.daily_attempts.find(
        {"user_id": user.id, "date": {"$gte": since.strftime("%Y-%m-%d")}},
        {"_id": 0, "date": 1, "correct": 1},
    ).to_list(days)
    by_date = {r["date"]: bool(r.get("correct")) for r in rows}
    cells = []
    for i in range(days):
        d = since + timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        cells.append({
            "date": key,
            "answered": key in by_date,
            "correct": by_date.get(key, False),
        })
    return {
        "days": days,
        "cells": cells,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
    }


@api_router.get("/me/next-step")
async def next_step(user: User = Depends(require_user)):
    """
    Returns ONE suggested next action for the user — drives engagement.
    Pure logic, no AI / external calls.
    """
    today = _today_str()
    # Has the user answered today's daily?
    daily_today = await db.daily_attempts.find_one(
        {"user_id": user.id, "date": today}, {"_id": 0}
    )

    # 1) Highest priority: do today's daily question
    if not daily_today:
        if user.current_streak > 0:
            return {
                "key": "daily_streak",
                "title": f"Keep your {user.current_streak}-day streak 🔥",
                "subtitle": "આજનો daily question બાકી છે",
                "cta_label": "Answer Daily Question",
                "cta_url": "/daily",
                "tone": "amber",
            }
        return {
            "key": "daily_first",
            "title": "Start a streak today",
            "subtitle": "આજનો પ્રશ્ન જવાબ આપો — daily streak શરૂ કરો",
            "cta_label": "Daily Question",
            "cta_url": "/daily",
            "tone": "amber",
        }

    # Build subject-breakdown to find weakest area (>=5 attempts, <60% accuracy)
    attempts = await db.attempts.find({"user_id": user.id}, {"_id": 0}).to_list(500)
    qids = list({qid for a in attempts for qid in a["question_ids"]})
    qmap: dict = {}
    if qids:
        qdocs = await db.questions.find({"id": {"$in": qids}}, {"_id": 0, "id": 1, "subject": 1, "correct_index": 1}).to_list(2000)
        qmap = {q["id"]: q for q in qdocs}
    subj_stats: dict = {}
    for a in attempts:
        for qid, ans in zip(a["question_ids"], a["answers"]):
            q = qmap.get(qid)
            if not q:
                continue
            s = subj_stats.setdefault(q["subject"], {"total": 0, "correct": 0})
            s["total"] += 1
            if ans is not None and ans == q["correct_index"]:
                s["correct"] += 1

    weakest = None
    for subj, s in subj_stats.items():
        if s["total"] < 5:
            continue
        acc = s["correct"] / s["total"]
        if acc < 0.6 and (weakest is None or acc < weakest[1]):
            weakest = (subj, acc)

    # 2) Weak subject → suggest targeted practice
    if weakest:
        subj, acc = weakest
        return {
            "key": "weak_subject",
            "title": f"Strengthen {subj}",
            "subtitle": f"Current accuracy: {round(acc * 100)}%",
            "cta_label": "Practice this subject",
            "cta_url": f"/practice?subject={subj}",
            "tone": "blue",
        }

    # 3) No mock yet → suggest one
    has_mock = any(a["mode"] == "mock" for a in attempts)
    if not has_mock:
        return {
            "key": "try_mock",
            "title": "Try your first Mock Test",
            "subtitle": "Real exam જેવો અનુભવ — ટાઈમર સાથે",
            "cta_label": "Start Mock Test",
            "cta_url": "/mock",
            "tone": "emerald",
        }

    # 4) Default: keep practicing
    return {
        "key": "keep_going",
        "title": "Keep going — you're doing great",
        "subtitle": "આજે થોડી practice વધારે",
        "cta_label": "Continue Practice",
        "cta_url": "/practice",
        "tone": "blue",
    }


# ---------------------- Routes: Bookmarks ----------------------
@api_router.post("/bookmarks")
async def add_bookmark(req: BookmarkReq, user: User = Depends(require_user)):
    q = await db.questions.find_one({"id": req.question_id}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    existing = await db.bookmarks.find_one({"user_id": user.id, "question_id": req.question_id})
    if existing:
        return {"bookmarked": True}
    await db.bookmarks.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "question_id": req.question_id,
        "created_at": utcnow_iso(),
    })
    return {"bookmarked": True}


@api_router.delete("/bookmarks/{question_id}")
async def remove_bookmark(question_id: str, user: User = Depends(require_user)):
    await db.bookmarks.delete_one({"user_id": user.id, "question_id": question_id})
    return {"bookmarked": False}


@api_router.get("/bookmarks", response_model=List[Question])
async def list_bookmarks(user: User = Depends(require_user)):
    bms = await db.bookmarks.find({"user_id": user.id}, {"_id": 0}).to_list(500)
    qids = [b["question_id"] for b in bms]
    if not qids:
        return []
    docs = await db.questions.find({"id": {"$in": qids}}, {"_id": 0}).to_list(500)
    return [Question(**d) for d in docs]


# ---------------------- Routes: AI ----------------------
# MongoDB-backed rate limiter (works across replicas; resets per minute/day bucket).
async def _check_ai_rate(key: str, max_per_minute: int = 8, max_per_day: int = 80) -> None:
    """Raise HTTPException 429 if caller exceeds AI usage limits."""
    now = datetime.now(timezone.utc)
    minute_bucket = now.strftime("%Y%m%d%H%M")
    day_bucket = now.strftime("%Y%m%d")
    minute_id = f"{key}:m:{minute_bucket}"
    day_id = f"{key}:d:{day_bucket}"
    # Atomic increment + read
    minute_doc = await db.ai_rate.find_one_and_update(
        {"_id": minute_id},
        {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": now + timedelta(minutes=2)}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    day_doc = await db.ai_rate.find_one_and_update(
        {"_id": day_id},
        {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": now + timedelta(days=2)}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if minute_doc and minute_doc.get("count", 0) > max_per_minute:
        raise HTTPException(status_code=429, detail="Too many AI requests — please wait a minute.")
    if day_doc and day_doc.get("count", 0) > max_per_day:
        raise HTTPException(status_code=429, detail="Daily AI limit reached. Try again tomorrow.")


async def _get_llm_chat(session_id: str, system_msg: str) -> LlmChat:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg,
    ).with_model("gemini", "gemini-3-flash-preview")


@api_router.post("/ai/explain")
async def ai_explain(req: ExplainReq, request: Request, user: Optional[User] = Depends(get_current_user)):
    # Rate limit per-user (tighter when anon, looser when logged in)
    if user:
        await _check_ai_rate(f"user:{user.id}", max_per_minute=10, max_per_day=200)
    else:
        # Prefer real client IP from forwarded headers (we sit behind ingress)
        fwd = request.headers.get("x-forwarded-for", "")
        ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "anon")
        await _check_ai_rate(f"ip:{ip}", max_per_minute=4, max_per_day=20)

    q = await db.questions.find_one({"id": req.question_id}, {"_id": 0})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    correct_opt = q["options"][q["correct_index"]]
    prompt = (
        f"નીચે GPSC પરીક્ષાનો પ્રશ્ન અને જવાબ આપેલો છે. "
        f"કૃપા કરી સરળ ગુજરાતી ભાષામાં 4-6 વાક્યમાં વિગતવાર સમજૂતી આપો, "
        f"કે શા માટે આ જવાબ સાચો છે અને બીજા વિકલ્પો કેમ ખોટા છે.\n\n"
        f"વિષય: {q['subject']}\n"
        f"પ્રશ્ન: {q['question_text']}\n"
        f"વિકલ્પો:\n"
        + "\n".join([f"  {o['label']}. {o['text']}" for o in q["options"]])
        + f"\nસાચો જવાબ: {correct_opt['label']}. {correct_opt['text']}\n"
    )
    try:
        chat = await _get_llm_chat(f"explain-{req.question_id}", "તમે GPSC પરીક્ષાના નિષ્ણાત શિક્ષક છો. તમે હંમેશા સ્પષ્ટ, સચોટ ગુજરાતી ભાષામાં જવાબ આપો છો.")
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        return {"explanation": text.strip()}
    except Exception as e:
        logger.exception("AI explain failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)[:200]}")


@api_router.post("/ai/generate")
async def ai_generate(req: GenerateReq, user: User = Depends(require_user)):
    await _check_ai_rate(f"gen:{user.id}", max_per_minute=2, max_per_day=15)
    count = max(1, min(req.count, 10))
    prompt = (
        f"GPSC (ગુજરાત જાહેર સેવા આયોગ) પરીક્ષાની તૈયારી માટે ગુજરાતી ભાષામાં "
        f"વિષય \"{req.subject}\" અને ટોપિક \"{req.topic}\" પર {count} MCQ પ્રશ્નો બનાવો.\n\n"
        f"ફક્ત JSON આપો, બીજું કંઈ નહીં. ફોર્મેટ:\n"
        f'[{{"question_text":"...","options":[{{"label":"ક","text":"..."}},{{"label":"ખ","text":"..."}},{{"label":"ગ","text":"..."}},{{"label":"ઘ","text":"..."}}],"correct_index":0,"official_explanation":"..."}}]\n'
        f"દરેક પ્રશ્ન માટે ચાર વિકલ્પો અને એક સાચો જવાબ (correct_index 0-3) જરૂરી છે."
    )
    try:
        chat = await _get_llm_chat(f"gen-{uuid.uuid4()}", "તમે GPSC પરીક્ષાના નિષ્ણાત છો. માત્ર માન્ય JSON આપો.")
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        # Strip code fences if present
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```", 2)[1] if "```" in cleaned else cleaned
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip().rstrip("`").strip()
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start == -1 or end == -1:
            raise ValueError("No JSON array found in response")
        data = json.loads(cleaned[start : end + 1])
        questions = []
        for item in data[:count]:
            if not isinstance(item, dict):
                continue
            opts = item.get("options", [])
            if len(opts) != 4:
                continue
            questions.append({
                "question_text": item.get("question_text", ""),
                "options": opts,
                "correct_index": int(item.get("correct_index", 0)),
                "official_explanation": item.get("official_explanation", ""),
                "ai_generated": True,
                "subject": req.subject,
                "topic": req.topic,
            })
        return {"questions": questions}
    except Exception as e:
        logger.exception("AI generate failed")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)[:200]}")


# ---------------------- Routes: Daily Question & Streak ----------------------
def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _yesterday_str() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")


async def _pick_daily_question() -> Optional[dict]:
    today = _today_str()
    pinned = await db.daily_pins.find_one({"date": today}, {"_id": 0})
    if pinned:
        q = await db.questions.find_one({"id": pinned["question_id"]}, {"_id": 0})
        if q:
            return q
    # Deterministic pick by date hash
    qids = await db.questions.distinct("id")
    if not qids:
        return None
    qids.sort()
    h = int(hashlib.sha256(today.encode()).hexdigest(), 16)
    chosen_id = qids[h % len(qids)]
    await db.daily_pins.update_one(
        {"date": today}, {"$set": {"date": today, "question_id": chosen_id}}, upsert=True
    )
    q = await db.questions.find_one({"id": chosen_id}, {"_id": 0})
    return q


@api_router.get("/daily")
async def daily_question(user: Optional[User] = Depends(get_current_user)):
    q = await _pick_daily_question()
    if not q:
        raise HTTPException(status_code=404, detail="No questions available")
    today = _today_str()
    attempted = None
    if user:
        att = await db.daily_attempts.find_one(
            {"user_id": user.id, "date": today}, {"_id": 0}
        )
        if att:
            attempted = {
                "selected_index": att.get("selected_index"),
                "correct": att.get("correct"),
            }
    return {
        "date": today,
        "question": Question(**q).model_dump(),
        "attempted": attempted,
        "current_streak": user.current_streak if user else 0,
        "longest_streak": user.longest_streak if user else 0,
    }


@api_router.post("/daily/answer")
async def daily_answer(req: DailyAnswerReq, user: User = Depends(require_user)):
    q = await _pick_daily_question()
    if not q:
        raise HTTPException(status_code=404, detail="No daily question")
    today = _today_str()
    existing = await db.daily_attempts.find_one(
        {"user_id": user.id, "date": today}, {"_id": 0}
    )
    if existing:
        return {
            "already_attempted": True,
            "correct": existing["correct"],
            "correct_index": q["correct_index"],
            "current_streak": user.current_streak,
            "longest_streak": user.longest_streak,
        }
    correct = req.selected_index == q["correct_index"]
    await db.daily_attempts.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "date": today,
            "question_id": q["id"],
            "selected_index": req.selected_index,
            "correct": correct,
            "created_at": utcnow_iso(),
        }
    )

    # Update streak
    new_streak = 1
    if user.last_streak_date == _yesterday_str():
        new_streak = user.current_streak + 1
    elif user.last_streak_date == today:
        new_streak = user.current_streak  # idempotent
    longest = max(user.longest_streak, new_streak)
    await db.users.update_one(
        {"id": user.id},
        {
            "$set": {
                "current_streak": new_streak,
                "longest_streak": longest,
                "last_streak_date": today,
            }
        },
    )

    return {
        "already_attempted": False,
        "correct": correct,
        "correct_index": q["correct_index"],
        "current_streak": new_streak,
        "longest_streak": longest,
    }


# ---------------------- Routes: Leaderboard ----------------------
@api_router.get("/leaderboard")
async def leaderboard(scope: str = "mock", limit: int = 20):
    """
    scope: 'mock' = best mock score per user
           'weekly' = total correct answers in last 7 days
           'streak' = longest streak
    """
    limit = max(1, min(limit, 100))
    if scope == "streak":
        users = await db.users.find(
            {"longest_streak": {"$gt": 0}}, {"_id": 0, "id": 1, "name": 1, "longest_streak": 1, "current_streak": 1}
        ).sort("longest_streak", -1).limit(limit).to_list(limit)
        return {
            "scope": "streak",
            "entries": [
                {"user_id": u["id"], "name": u["name"], "score": u["longest_streak"], "extra": f"current: {u.get('current_streak', 0)}"}
                for u in users
            ],
        }

    if scope == "weekly":
        since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        pipeline = [
            {"$match": {"completed_at": {"$gte": since}}},
            {"$group": {"_id": "$user_id", "correct": {"$sum": "$score"}, "total": {"$sum": "$total"}, "attempts": {"$sum": 1}}},
            {"$sort": {"correct": -1}},
            {"$limit": limit},
        ]
    else:  # mock (default)
        pipeline = [
            {"$match": {"mode": "mock"}},
            {"$group": {"_id": "$user_id", "best_score": {"$max": "$score"}, "best_total": {"$max": "$total"}, "attempts": {"$sum": 1}}},
            {"$sort": {"best_score": -1}},
            {"$limit": limit},
        ]
    rows = await db.attempts.aggregate(pipeline).to_list(limit)
    if not rows:
        return {"scope": scope, "entries": []}
    user_ids = [r["_id"] for r in rows]
    user_docs = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(limit)
    name_map = {u["id"]: u["name"] for u in user_docs}
    entries = []
    for r in rows:
        name = name_map.get(r["_id"], "Anonymous")
        if scope == "weekly":
            entries.append({
                "user_id": r["_id"],
                "name": name,
                "score": r["correct"],
                "extra": f"{r['attempts']} attempts · {r['total']} total Qs",
            })
        else:
            entries.append({
                "user_id": r["_id"],
                "name": name,
                "score": r["best_score"],
                "extra": f"out of {r['best_total']} · {r['attempts']} attempts",
            })
    return {"scope": scope, "entries": entries}


# ---------------------- Routes: Bulk Import ----------------------
@api_router.post("/questions/bulk_import")
async def bulk_import(req: BulkImportReq, _: User = Depends(require_admin)):
    """Import a JSON array of questions (admin only)."""
    if not req.questions:
        raise HTTPException(status_code=400, detail="No questions provided")
    inserted = 0
    errors = []
    for i, item in enumerate(req.questions):
        try:
            if len(item.options) != 4:
                raise ValueError("Exactly 4 options required")
            if not (0 <= item.correct_index <= 3):
                raise ValueError("correct_index must be 0..3")
            q = Question(**item.model_dump())
            await db.questions.insert_one(q.model_dump())
            inserted += 1
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    return {"inserted": inserted, "errors": errors, "total_submitted": len(req.questions)}


@api_router.post("/questions/import_csv")
async def import_csv(file: UploadFile = File(...), _: User = Depends(require_admin)):
    """Import questions from a CSV file (admin only).
    Expected columns: exam,year,subject,topic,question_text,opt_a,opt_b,opt_c,opt_d,correct_index,official_explanation
    correct_index can be 0..3 OR a letter A/B/C/D (case-insensitive).
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files supported")
    content = (await file.read()).decode("utf-8")
    import csv
    from io import StringIO
    reader = csv.DictReader(StringIO(content))
    inserted = 0
    errors = []
    labels = ["ક", "ખ", "ગ", "ઘ"]
    for i, row in enumerate(reader):
        try:
            ci = str(row.get("correct_index", "")).strip().upper()
            ci_int = {"A": 0, "B": 1, "C": 2, "D": 3}.get(ci, None)
            if ci_int is None:
                ci_int = int(ci)
            opts = [
                {"label": labels[j], "text": (row.get(f"opt_{c}") or "").strip()}
                for j, c in enumerate(["a", "b", "c", "d"])
            ]
            q = Question(
                exam=row["exam"].strip(),
                year=int(row["year"]),
                subject=row["subject"].strip(),
                topic=(row.get("topic") or "").strip() or None,
                question_text=row["question_text"].strip(),
                options=[Option(**o) for o in opts],
                correct_index=ci_int,
                official_explanation=(row.get("official_explanation") or "").strip() or None,
            )
            await db.questions.insert_one(q.model_dump())
            inserted += 1
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})
    return {"inserted": inserted, "errors": errors}


# ---------------------- Routes: Contact ----------------------
@api_router.post("/contact")
async def submit_contact(req: ContactCreate):
    """Public: store a contact message and notify the site owner by email."""
    name = req.name.strip()
    email = req.email.strip()
    message = req.message.strip()
    if not name or not message:
        raise HTTPException(status_code=400, detail="Name and message are required")
    msg = ContactMessage(name=name, email=email, message=message)
    await db.contact_messages.insert_one(msg.model_dump())

    if CONTACT_NOTIFY_EMAIL:
        safe_msg = message.replace("\n", "<br/>")
        html = f"""
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, sans-serif; background:#F9FAFB; padding:32px 0;">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#fff; border:1px solid #E5E7EB; border-radius:8px; padding:32px;">
              <tr><td style="color:#111827; font-size:20px; font-weight:600;">New contact message</td></tr>
              <tr><td style="color:#4B5563; font-size:14px; padding-top:16px;"><strong>Name:</strong> {name}</td></tr>
              <tr><td style="color:#4B5563; font-size:14px; padding-top:4px;"><strong>Email:</strong> {email}</td></tr>
              <tr><td style="color:#111827; font-size:15px; line-height:1.6; padding-top:16px; border-top:1px solid #E5E7EB; margin-top:8px;">{safe_msg}</td></tr>
              <tr><td style="color:#9CA3AF; font-size:12px; padding-top:24px;">— GPSC Gujarat PYQ contact form</td></tr>
            </table>
          </td></tr>
        </table>
        """
        await _send_email_proxy(
            CONTACT_NOTIFY_EMAIL,
            f"New contact message from {name}",
            html,
            reply_to=email,
        )
    return {"ok": True}


# ---------------------- Routes: Admin ----------------------
@api_router.get("/admin/messages")
async def admin_messages(_: User = Depends(require_admin)):
    """Admin: list all contact messages, newest first."""
    docs = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.post("/admin/messages/{mid}/read")
async def admin_mark_read(mid: str, _: User = Depends(require_admin)):
    await db.contact_messages.update_one({"id": mid}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.delete("/admin/messages/{mid}")
async def admin_delete_message(mid: str, _: User = Depends(require_admin)):
    await db.contact_messages.delete_one({"id": mid})
    return {"ok": True}


@api_router.get("/admin/overview")
async def admin_overview(_: User = Depends(require_admin)):
    """Admin: high-level data counts for the app."""
    total_questions = await db.questions.count_documents({})
    total_users = await db.users.count_documents({"role": "user"})
    total_attempts = await db.attempts.count_documents({})
    total_bookmarks = await db.bookmarks.count_documents({})
    total_messages = await db.contact_messages.count_documents({})
    unread_messages = await db.contact_messages.count_documents({"read": False})
    # subject breakdown of the question bank
    subj_pipeline = [
        {"$group": {"_id": "$subject", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    subjects = [
        {"subject": d["_id"], "count": d["count"]}
        async for d in db.questions.aggregate(subj_pipeline)
    ]
    return {
        "total_questions": total_questions,
        "total_users": total_users,
        "total_attempts": total_attempts,
        "total_bookmarks": total_bookmarks,
        "total_messages": total_messages,
        "unread_messages": unread_messages,
        "subjects": subjects,
    }



# ---------------------- Seed ----------------------
SEED_ADMIN_EMAIL = "admin@gpscpyq.in"
SEED_ADMIN_PASSWORD = "Admin@123"

SEED_QUESTIONS = [
    {
        "exam": "GPSC Class 1-2",
        "year": 2023,
        "subject": "ઇતિહાસ",
        "topic": "ભારતનો સ્વાતંત્ર્ય સંગ્રામ",
        "question_text": "'ભારત છોડો' ચળવળ (Quit India Movement) કયા વર્ષે શરૂ થઈ હતી?",
        "options": [
            {"label": "ક", "text": "1940"},
            {"label": "ખ", "text": "1942"},
            {"label": "ગ", "text": "1945"},
            {"label": "ઘ", "text": "1947"},
        ],
        "correct_index": 1,
        "official_explanation": "8 ઑગસ્ટ 1942 ના રોજ મહાત્મા ગાંધીજીના નેતૃત્વમાં ભારત છોડો ચળવળ શરૂ થઈ.",
    },
    {
        "exam": "GPSC Class 1-2",
        "year": 2023,
        "subject": "ભૂગોળ",
        "topic": "ગુજરાતની ભૂગોળ",
        "question_text": "ગુજરાતનું સૌથી મોટું જિલ્લો (વિસ્તાર પ્રમાણે) કયું છે?",
        "options": [
            {"label": "ક", "text": "અમદાવાદ"},
            {"label": "ખ", "text": "સુરત"},
            {"label": "ગ", "text": "કચ્છ"},
            {"label": "ઘ", "text": "બનાસકાંઠા"},
        ],
        "correct_index": 2,
        "official_explanation": "કચ્છ જિલ્લો વિસ્તાર પ્રમાણે ગુજરાતનો સૌથી મોટો જિલ્લો છે, જે લગભગ 45,674 ચોરસ કિ.મી. વિસ્તાર ધરાવે છે.",
    },
    {
        "exam": "GPSC Class 1-2",
        "year": 2022,
        "subject": "બંધારણ",
        "topic": "મૂળભૂત અધિકારો",
        "question_text": "ભારતીય બંધારણમાં મૂળભૂત અધિકારો કયા ભાગમાં આપેલા છે?",
        "options": [
            {"label": "ક", "text": "ભાગ-II"},
            {"label": "ખ", "text": "ભાગ-III"},
            {"label": "ગ", "text": "ભાગ-IV"},
            {"label": "ઘ", "text": "ભાગ-V"},
        ],
        "correct_index": 1,
        "official_explanation": "ભારતીય બંધારણના ભાગ-III (કલમ 12 થી 35) માં મૂળભૂત અધિકારોની જોગવાઈ કરવામાં આવી છે.",
    },
    {
        "exam": "Dy.SO/Nayab Mamlatdar",
        "year": 2022,
        "subject": "સામાન્ય જ્ઞાન",
        "topic": "ગુજરાતી સાહિત્ય",
        "question_text": "'સરસ્વતીચંદ્ર' નવલકથાના લેખક કોણ છે?",
        "options": [
            {"label": "ક", "text": "ગોવર્ધનરામ ત્રિપાઠી"},
            {"label": "ખ", "text": "મુનશી"},
            {"label": "ગ", "text": "ઉમાશંકર જોશી"},
            {"label": "ઘ", "text": "ઝવેરચંદ મેઘાણી"},
        ],
        "correct_index": 0,
        "official_explanation": "ગોવર્ધનરામ ત્રિપાઠી દ્વારા લખાયેલ 'સરસ્વતીચંદ્ર' ગુજરાતી સાહિત્યની ઐતિહાસિક નવલકથા છે, જે ચાર ભાગમાં પ્રકાશિત થઈ.",
    },
    {
        "exam": "Dy.SO/Nayab Mamlatdar",
        "year": 2023,
        "subject": "વિજ્ઞાન",
        "topic": "ભૌતિકશાસ્ત્ર",
        "question_text": "પ્રકાશનો વેગ શૂન્યાવકાશમાં લગભગ કેટલો છે?",
        "options": [
            {"label": "ક", "text": "3 × 10⁵ km/s"},
            {"label": "ખ", "text": "3 × 10⁸ m/s"},
            {"label": "ગ", "text": "3 × 10⁶ m/s"},
            {"label": "ઘ", "text": "3 × 10¹⁰ m/s"},
        ],
        "correct_index": 1,
        "official_explanation": "શૂન્યાવકાશમાં પ્રકાશનો વેગ આશરે 3 × 10⁸ મીટર પ્રતિ સેકન્ડ (299,792,458 m/s) છે.",
    },
    {
        "exam": "GPSC Class 1-2",
        "year": 2021,
        "subject": "અર્થશાસ્ત્ર",
        "topic": "ભારતીય અર્થતંત્ર",
        "question_text": "ભારતની રિઝર્વ બેંકની સ્થાપના કયા વર્ષે થઈ હતી?",
        "options": [
            {"label": "ક", "text": "1934"},
            {"label": "ખ", "text": "1935"},
            {"label": "ગ", "text": "1947"},
            {"label": "ઘ", "text": "1949"},
        ],
        "correct_index": 1,
        "official_explanation": "ભારતીય રિઝર્વ બેંકની સ્થાપના 1 એપ્રિલ 1935 ના રોજ રિઝર્વ બેંક ઑફ ઈન્ડિયા એક્ટ, 1934 અંતર્ગત થઈ.",
    },
    {
        "exam": "PI",
        "year": 2022,
        "subject": "ઇતિહાસ",
        "topic": "ગુજરાતનો ઇતિહાસ",
        "question_text": "સોલંકી વંશની રાજધાની કયા સ્થળે હતી?",
        "options": [
            {"label": "ક", "text": "પાટણ"},
            {"label": "ખ", "text": "દ્વારકા"},
            {"label": "ગ", "text": "ધોળાવીરા"},
            {"label": "ઘ", "text": "જૂનાગઢ"},
        ],
        "correct_index": 0,
        "official_explanation": "સોલંકી વંશ (ચૌલુક્ય વંશ) ની રાજધાની અણહિલવાડ પાટણ હતી, જે મૂળરાજ સોલંકી દ્વારા સ્થાપવામાં આવી.",
    },
    {
        "exam": "PI",
        "year": 2023,
        "subject": "ભૂગોળ",
        "topic": "ગુજરાતની નદીઓ",
        "question_text": "ગુજરાતની સૌથી લાંબી નદી કઈ છે?",
        "options": [
            {"label": "ક", "text": "તાપી"},
            {"label": "ખ", "text": "નર્મદા"},
            {"label": "ગ", "text": "સાબરમતી"},
            {"label": "ઘ", "text": "મહી"},
        ],
        "correct_index": 1,
        "official_explanation": "નર્મદા નદી ગુજરાતની સૌથી લાંબી નદી છે; તેની કુલ લંબાઈ 1312 કિ.મી. છે, જેમાંથી લગભગ 161 કિ.મી. ગુજરાતમાં વહે છે.",
    },
    {
        "exam": "GPSC Class 1-2",
        "year": 2022,
        "subject": "બંધારણ",
        "topic": "પંચાયતી રાજ",
        "question_text": "73મો બંધારણીય સુધારો કયા સંબંધિત છે?",
        "options": [
            {"label": "ક", "text": "નગરપાલિકા"},
            {"label": "ખ", "text": "પંચાયતી રાજ"},
            {"label": "ગ", "text": "શિક્ષણ અધિકાર"},
            {"label": "ઘ", "text": "GST"},
        ],
        "correct_index": 1,
        "official_explanation": "73મો બંધારણીય સુધારો (1992) પંચાયતી રાજ વ્યવસ્થાને બંધારણીય દરજ્જો આપે છે અને ભાગ-IX તથા 11મું પરિશિષ્ટ ઉમેરે છે.",
    },
    {
        "exam": "Dy.SO/Nayab Mamlatdar",
        "year": 2021,
        "subject": "સામાન્ય જ્ઞાન",
        "topic": "રમતગમત",
        "question_text": "ઑલિમ્પિક રમતો કેટલા વર્ષે યોજાય છે?",
        "options": [
            {"label": "ક", "text": "બે વર્ષે"},
            {"label": "ખ", "text": "ત્રણ વર્ષે"},
            {"label": "ગ", "text": "ચાર વર્ષે"},
            {"label": "ઘ", "text": "પાંચ વર્ષે"},
        ],
        "correct_index": 2,
        "official_explanation": "આધુનિક ઑલિમ્પિક રમતો દર ચાર વર્ષે યોજાય છે; શિયાળુ અને ઉનાળુ ઑલિમ્પિક અલગ-અલગ ચક્રમાં થાય છે.",
    },
    {
        "exam": "GPSC Class 1-2",
        "year": 2023,
        "subject": "વિજ્ઞાન",
        "topic": "જીવવિજ્ઞાન",
        "question_text": "માનવ શરીરમાં લાલ રક્તકણો કયા સ્થળે બને છે?",
        "options": [
            {"label": "ક", "text": "લીવર"},
            {"label": "ખ", "text": "બરોળ"},
            {"label": "ગ", "text": "અસ્થિ મજ્જા"},
            {"label": "ઘ", "text": "કિડની"},
        ],
        "correct_index": 2,
        "official_explanation": "પુખ્ત માનવમાં લાલ રક્તકણો મુખ્યત્વે અસ્થિ મજ્જા (Bone Marrow) માં બને છે, જે હેમેટોપોએસિસ પ્રક્રિયા કહેવાય છે.",
    },
    {
        "exam": "PI",
        "year": 2021,
        "subject": "અર્થશાસ્ત્ર",
        "topic": "GST",
        "question_text": "ભારતમાં GST કયા તારીખે અમલમાં આવ્યો?",
        "options": [
            {"label": "ક", "text": "1 એપ્રિલ 2017"},
            {"label": "ખ", "text": "1 જુલાઈ 2017"},
            {"label": "ગ", "text": "1 જાન્યુઆરી 2018"},
            {"label": "ઘ", "text": "1 એપ્રિલ 2016"},
        ],
        "correct_index": 1,
        "official_explanation": "GST (Goods and Services Tax) ભારતમાં 1 જુલાઈ 2017 ના રોજ અમલમાં આવ્યો; આ 101મા બંધારણીય સુધારા હેઠળ લાગુ થયો.",
    },
]


@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("verification_token")
    await db.users.create_index("reset_token")
    await db.questions.create_index([("exam", 1), ("year", -1)])
    await db.questions.create_index("subject")
    await db.attempts.create_index([("user_id", 1), ("completed_at", -1)])
    await db.attempts.create_index("completed_at")
    await db.attempts.create_index([("mode", 1), ("score", -1)])
    await db.bookmarks.create_index([("user_id", 1), ("question_id", 1)], unique=True)
    await db.daily_pins.create_index("date", unique=True)
    await db.daily_attempts.create_index([("user_id", 1), ("date", 1)], unique=True)
    await db.ai_rate.create_index("expires_at", expireAfterSeconds=0)

    # Seed admin
    admin_doc = await db.users.find_one({"email": SEED_ADMIN_EMAIL})
    if not admin_doc:
        admin = User(
            email=SEED_ADMIN_EMAIL,
            name="GPSC Admin",
            password_hash=hash_password(SEED_ADMIN_PASSWORD),
            role="admin",
            email_verified=True,
        )
        await db.users.insert_one(admin.model_dump())
        logger.info("Seeded admin user: %s", SEED_ADMIN_EMAIL)
    else:
        # Ensure existing admin has email_verified flag
        await db.users.update_one(
            {"email": SEED_ADMIN_EMAIL},
            {"$set": {"email_verified": True}},
        )

    # Seed questions
    count = await db.questions.count_documents({})
    if count == 0:
        for q in SEED_QUESTIONS:
            qobj = Question(**q)
            await db.questions.insert_one(qobj.model_dump())
        logger.info("Seeded %d sample questions", len(SEED_QUESTIONS))


@api_router.get("/")
async def root():
    return {"message": "GPSC Gujarat PYQ API", "version": "1.0"}


@api_router.get("/stats/public")
async def public_stats():
    """Public, anonymous stats for landing-page social proof. No PII."""
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    total_questions = await db.questions.count_documents({})
    total_users = await db.users.count_documents({"role": "user"})
    # Sum attempts and total answered questions in last 7 days
    pipeline = [
        {"$match": {"completed_at": {"$gte": week_ago}}},
        {"$group": {"_id": None, "attempts": {"$sum": 1}, "answered": {"$sum": "$total"}, "correct": {"$sum": "$score"}}},
    ]
    agg = await db.attempts.aggregate(pipeline).to_list(1)
    weekly = agg[0] if agg else {"attempts": 0, "answered": 0, "correct": 0}
    # Distinct exams + years
    years = await db.questions.distinct("year")
    exams = await db.questions.distinct("exam")
    return {
        "total_questions": total_questions,
        "total_users": total_users,
        "weekly_attempts": weekly.get("attempts", 0),
        "weekly_questions_answered": weekly.get("answered", 0),
        "weekly_correct": weekly.get("correct", 0),
        "exam_count": len(exams),
        "year_range": [min(years), max(years)] if years else None,
    }


@api_router.get("/sitemap.xml")
async def sitemap():
    """Dynamic sitemap for SEO. Includes static routes + all question detail pages."""
    from fastapi.responses import Response
    base = FRONTEND_URL.rstrip("/") if FRONTEND_URL else ""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    static_routes = ["/", "/browse", "/practice", "/mock", "/daily", "/leaderboard", "/login", "/signup", "/about", "/contact", "/privacy", "/terms"]
    urls = []
    for r in static_routes:
        urls.append(
            f"  <url><loc>{base}{r}</loc><changefreq>weekly</changefreq><priority>{'1.0' if r == '/' else '0.8'}</priority></url>"
        )
    qdocs = await db.questions.find({}, {"_id": 0, "id": 1}).limit(5000).to_list(5000)
    for q in qdocs:
        urls.append(
            f"  <url><loc>{base}/question/{q['id']}</loc><lastmod>{today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>"
        )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
