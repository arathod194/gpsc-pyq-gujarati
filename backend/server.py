"""GPSC Gujarat PYQ - FastAPI backend."""
import os
import uuid
import logging
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional, Annotated

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
    created_at: str = Field(default_factory=utcnow_iso)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
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


# ---------------------- Routes: Auth ----------------------
@api_router.post("/auth/signup", response_model=AuthRes)
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = User(
        email=req.email.lower(),
        name=req.name.strip(),
        password_hash=hash_password(req.password),
        role="user",
    )
    await db.users.insert_one(user.model_dump())
    token = create_token(user.id, user.role)
    return AuthRes(
        token=token,
        user=UserPublic(id=user.id, email=user.email, name=user.name, role=user.role, created_at=user.created_at),
    )


@api_router.post("/auth/login", response_model=AuthRes)
async def login(req: LoginReq):
    doc = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not doc or not verify_password(req.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    u = User(**doc)
    token = create_token(u.id, u.role)
    return AuthRes(
        token=token,
        user=UserPublic(id=u.id, email=u.email, name=u.name, role=u.role, created_at=u.created_at),
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: User = Depends(require_user)):
    return UserPublic(id=user.id, email=user.email, name=user.name, role=user.role, created_at=user.created_at)


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
    return {
        "total_attempts": total_attempts,
        "total_questions_attempted": total_questions,
        "total_correct": total_correct,
        "accuracy": accuracy,
        "best_mock_score": best_mock,
        "mock_attempts": len(mock_attempts),
        "bookmarks": bookmarks_count,
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
async def _get_llm_chat(session_id: str, system_msg: str) -> LlmChat:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg,
    ).with_model("gemini", "gemini-3-flash-preview")


@api_router.post("/ai/explain")
async def ai_explain(req: ExplainReq):
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
async def ai_generate(req: GenerateReq, _: User = Depends(require_user)):
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
    await db.questions.create_index([("exam", 1), ("year", -1)])
    await db.questions.create_index("subject")
    await db.attempts.create_index([("user_id", 1), ("completed_at", -1)])
    await db.bookmarks.create_index([("user_id", 1), ("question_id", 1)], unique=True)

    # Seed admin
    admin_doc = await db.users.find_one({"email": SEED_ADMIN_EMAIL})
    if not admin_doc:
        admin = User(
            email=SEED_ADMIN_EMAIL,
            name="GPSC Admin",
            password_hash=hash_password(SEED_ADMIN_PASSWORD),
            role="admin",
        )
        await db.users.insert_one(admin.model_dump())
        logger.info("Seeded admin user: %s", SEED_ADMIN_EMAIL)

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
