"""Backend API tests for GPSC Gujarat PYQ.

Covers: auth (signup/login/me), questions filters/list/search/random/CRUD (admin gating),
attempts scoring, stats, bookmarks, AI explain/generate.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://exam-prep-gujrat.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@gpscpyq.in"
ADMIN_PASSWORD = "Admin@123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def user_creds():
    # unique email per session so reruns work
    uniq = uuid.uuid4().hex[:8]
    return {"email": f"TEST_user_{uniq}@example.com", "name": "Test User", "password": "testpass123"}


@pytest.fixture(scope="session")
def user_token(http, user_creds):
    r = http.post(f"{API}/auth/signup", json=user_creds, timeout=20)
    assert r.status_code == 200, f"Signup failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health / Root ----------
class TestHealth:
    def test_root(self, http):
        r = http.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "message" in body


# ---------- Questions: listing / filters / search / random / get ----------
class TestQuestionsRead:
    def test_filters(self, http):
        r = http.get(f"{API}/questions/filters", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["exams"], list) and len(d["exams"]) >= 3
        assert isinstance(d["years"], list) and len(d["years"]) >= 3
        assert isinstance(d["subjects"], list) and len(d["subjects"]) >= 4

    def test_list_all(self, http):
        r = http.get(f"{API}/questions", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 12
        # ensure proper shape
        q = items[0]
        assert "id" in q and "options" in q and len(q["options"]) == 4
        assert "correct_index" in q

    def test_filter_exam_year(self, http):
        r = http.get(f"{API}/questions", params={"exam": "GPSC Class 1-2", "year": 2023}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        for q in items:
            assert q["exam"] == "GPSC Class 1-2"
            assert q["year"] == 2023

    def test_search_gujarati(self, http):
        r = http.get(f"{API}/questions", params={"q": "ભારત"}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        # at least one match should contain query text in question/topic/subject
        joined = " ".join((q.get("question_text", "") + q.get("topic", "") + q.get("subject", "")) for q in items)
        assert "ભારત" in joined

    def test_random(self, http):
        r = http.get(f"{API}/questions/random", params={"count": 5}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 5

    def test_get_single(self, http):
        r = http.get(f"{API}/questions", timeout=15)
        qid = r.json()[0]["id"]
        r2 = http.get(f"{API}/questions/{qid}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["id"] == qid

    def test_get_single_not_found(self, http):
        r = http.get(f"{API}/questions/does-not-exist-id", timeout=15)
        assert r.status_code == 404


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self, http):
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "admin"
        assert d["user"]["email"] == ADMIN_EMAIL
        assert isinstance(d["token"], str) and len(d["token"]) > 10

    def test_signup_and_me(self, http, user_token, user_creds):
        r = http.get(f"{API}/auth/me", headers=_auth(user_token), timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == user_creds["email"].lower()
        assert u["role"] == "user"

    def test_signup_duplicate(self, http, user_creds):
        r = http.post(f"{API}/auth/signup", json=user_creds, timeout=15)
        assert r.status_code == 400

    def test_login_wrong_password(self, http):
        r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"}, timeout=15)
        assert r.status_code == 401

    def test_me_without_token(self, http):
        r = http.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- Admin question CRUD ----------
class TestAdminQuestions:
    def test_create_as_user_forbidden(self, http, user_token):
        payload = {
            "exam": "PI", "year": 2024, "subject": "ઇતિહાસ", "topic": "TEST",
            "question_text": "TEST question?",
            "options": [
                {"label": "ક", "text": "A"}, {"label": "ખ", "text": "B"},
                {"label": "ગ", "text": "C"}, {"label": "ઘ", "text": "D"},
            ],
            "correct_index": 0,
        }
        r = http.post(f"{API}/questions", json=payload, headers=_auth(user_token), timeout=15)
        assert r.status_code == 403

    def test_admin_create_and_delete(self, http, admin_token):
        payload = {
            "exam": "PI", "year": 2024, "subject": "ઇતિહાસ", "topic": "TEST_topic",
            "question_text": "TEST question by admin?",
            "options": [
                {"label": "ક", "text": "A"}, {"label": "ખ", "text": "B"},
                {"label": "ગ", "text": "C"}, {"label": "ઘ", "text": "D"},
            ],
            "correct_index": 2,
        }
        r = http.post(f"{API}/questions", json=payload, headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        q = r.json()
        assert q["correct_index"] == 2
        qid = q["id"]

        # Verify GET retrieval
        rg = http.get(f"{API}/questions/{qid}", timeout=15)
        assert rg.status_code == 200

        # Delete
        rd = http.delete(f"{API}/questions/{qid}", headers=_auth(admin_token), timeout=15)
        assert rd.status_code == 200

        # Verify gone
        rg2 = http.get(f"{API}/questions/{qid}", timeout=15)
        assert rg2.status_code == 404


# ---------- Attempts + Stats ----------
class TestAttempts:
    def test_submit_attempt_and_score(self, http, user_token):
        # pick 3 questions, answer all correctly
        items = http.get(f"{API}/questions", params={"limit": 5}, timeout=15).json()
        assert len(items) >= 3
        chosen = items[:3]
        payload = {
            "mode": "practice",
            "question_ids": [q["id"] for q in chosen],
            "answers": [q["correct_index"] for q in chosen],
            "time_taken_sec": 42,
        }
        r = http.post(f"{API}/attempts", json=payload, headers=_auth(user_token), timeout=15)
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["score"] == 3
        assert a["total"] == 3

    def test_submit_attempt_partial_score(self, http, user_token):
        items = http.get(f"{API}/questions", params={"limit": 4}, timeout=15).json()
        chosen = items[:3]
        # wrong, correct, None
        answers = [(chosen[0]["correct_index"] + 1) % 4, chosen[1]["correct_index"], None]
        payload = {
            "mode": "mock",
            "question_ids": [q["id"] for q in chosen],
            "answers": answers,
            "time_taken_sec": 100,
        }
        r = http.post(f"{API}/attempts", json=payload, headers=_auth(user_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["score"] == 1

    def test_list_attempts(self, http, user_token):
        r = http.get(f"{API}/attempts", headers=_auth(user_token), timeout=15)
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list) and len(lst) >= 2
        # ordering desc by completed_at
        assert lst[0]["completed_at"] >= lst[-1]["completed_at"]

    def test_stats(self, http, user_token):
        r = http.get(f"{API}/stats", headers=_auth(user_token), timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in ("total_attempts", "accuracy", "best_mock_score", "bookmarks"):
            assert k in s
        assert s["total_attempts"] >= 2
        assert s["best_mock_score"] >= 1


# ---------- Bookmarks ----------
class TestBookmarks:
    def test_bookmark_flow(self, http, user_token):
        items = http.get(f"{API}/questions", params={"limit": 1}, timeout=15).json()
        qid = items[0]["id"]

        r = http.post(f"{API}/bookmarks", json={"question_id": qid}, headers=_auth(user_token), timeout=15)
        assert r.status_code == 200 and r.json()["bookmarked"] is True

        # idempotent
        r2 = http.post(f"{API}/bookmarks", json={"question_id": qid}, headers=_auth(user_token), timeout=15)
        assert r2.status_code == 200

        rl = http.get(f"{API}/bookmarks", headers=_auth(user_token), timeout=15)
        assert rl.status_code == 200
        assert any(q["id"] == qid for q in rl.json())

        rd = http.delete(f"{API}/bookmarks/{qid}", headers=_auth(user_token), timeout=15)
        assert rd.status_code == 200 and rd.json()["bookmarked"] is False

        rl2 = http.get(f"{API}/bookmarks", headers=_auth(user_token), timeout=15)
        assert all(q["id"] != qid for q in rl2.json())


# ---------- AI ----------
class TestAI:
    def test_ai_explain(self, http):
        items = http.get(f"{API}/questions", params={"limit": 1}, timeout=15).json()
        qid = items[0]["id"]
        r = http.post(f"{API}/ai/explain", json={"question_id": qid}, timeout=90)
        if r.status_code != 200:
            pytest.fail(f"AI explain failed: {r.status_code} {r.text[:300]}")
        d = r.json()
        assert "explanation" in d
        assert isinstance(d["explanation"], str) and len(d["explanation"]) > 10

    def test_ai_generate_requires_auth(self, http):
        r = http.post(f"{API}/ai/generate", json={"topic": "ભારતનો ઇતિહાસ", "subject": "ઇતિહાસ", "count": 2}, timeout=20)
        assert r.status_code == 401

    def test_ai_generate(self, http, user_token):
        r = http.post(
            f"{API}/ai/generate",
            json={"topic": "ભારતનો ઇતિહાસ", "subject": "ઇતિહાસ", "count": 2},
            headers=_auth(user_token),
            timeout=120,
        )
        if r.status_code != 200:
            pytest.fail(f"AI generate failed: {r.status_code} {r.text[:300]}")
        d = r.json()
        assert "questions" in d
        # The LLM may sometimes return 0; verify the contract at least
        assert isinstance(d["questions"], list)
