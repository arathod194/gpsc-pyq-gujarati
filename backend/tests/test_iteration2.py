"""Iteration 2 backend tests for GPSC Gujarat PYQ — new features:
- Daily question + streak
- Email verification + password reset (Resend dev-fallback)
- Subject-wise stats
- Leaderboard (mock / weekly / streak)
- Bulk JSON + CSV import (admin)
"""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://exam-prep-gujrat.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@gpscpyq.in"
ADMIN_PASSWORD = "Admin@123"


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(http):
    r = http.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_creds():
    uniq = uuid.uuid4().hex[:8]
    return {"email": f"TEST_it2_{uniq}@example.com", "name": "Iter2 User", "password": "testpass123"}


@pytest.fixture(scope="module")
def user_token(http, user_creds):
    r = http.post(f"{API}/auth/signup", json=user_creds, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- Daily Question + Streak ----------
class TestDaily:
    def test_daily_anonymous(self, http):
        r = http.get(f"{API}/daily", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "date" in d and "question" in d
        assert d["question"]["id"] and len(d["question"]["options"]) == 4
        assert d.get("attempted") is None
        assert d["current_streak"] == 0
        assert d["longest_streak"] == 0

    def test_daily_authed_then_answer(self, http, user_token):
        r = http.get(f"{API}/daily", headers=_auth(user_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("attempted") is None
        correct_idx = d["question"]["correct_index"]

        # First answer: correct
        r2 = http.post(f"{API}/daily/answer", json={"selected_index": correct_idx},
                       headers=_auth(user_token), timeout=20)
        assert r2.status_code == 200, r2.text
        a = r2.json()
        assert a["already_attempted"] is False
        assert a["correct"] is True
        assert a["correct_index"] == correct_idx
        assert a["current_streak"] >= 1
        assert a["longest_streak"] >= a["current_streak"]

        # Second answer: already attempted (idempotent)
        r3 = http.post(f"{API}/daily/answer", json={"selected_index": correct_idx},
                       headers=_auth(user_token), timeout=20)
        assert r3.status_code == 200
        a3 = r3.json()
        assert a3["already_attempted"] is True

        # GET /daily now should show attempted with streak
        r4 = http.get(f"{API}/daily", headers=_auth(user_token), timeout=20)
        d4 = r4.json()
        assert d4["attempted"] is not None
        assert d4["attempted"]["correct"] is True
        assert d4["current_streak"] >= 1

    def test_daily_answer_requires_auth(self, http):
        r = http.post(f"{API}/daily/answer", json={"selected_index": 0}, timeout=15)
        assert r.status_code == 401


# ---------- Stats subject_breakdown + streak ----------
class TestStatsExtended:
    def test_stats_has_subject_breakdown_and_streak(self, http, user_token):
        # Submit a practice attempt first so subject_breakdown is non-empty
        items = http.get(f"{API}/questions", params={"limit": 3}, timeout=15).json()
        chosen = items[:3]
        http.post(f"{API}/attempts", json={
            "mode": "practice",
            "question_ids": [q["id"] for q in chosen],
            "answers": [q["correct_index"] for q in chosen],
            "time_taken_sec": 30,
        }, headers=_auth(user_token), timeout=20)

        r = http.get(f"{API}/stats", headers=_auth(user_token), timeout=15)
        assert r.status_code == 200
        s = r.json()
        assert "subject_breakdown" in s and isinstance(s["subject_breakdown"], list)
        assert len(s["subject_breakdown"]) >= 1
        sb = s["subject_breakdown"][0]
        for k in ("subject", "total", "correct", "accuracy"):
            assert k in sb
        assert "current_streak" in s and "longest_streak" in s
        assert s["current_streak"] >= 1  # set by daily test before


# ---------- Email Verification ----------
class TestEmailVerification:
    def test_resend_verification_returns_dev_link(self, http, user_token):
        r = http.post(f"{API}/auth/resend-verification", headers=_auth(user_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["sent"] is True
        # RESEND_API_KEY is empty → dev_link should be present
        assert d.get("dev_link"), f"Expected dev_link in response: {d}"
        assert "token=" in d["dev_link"]
        # store token for next test
        token = d["dev_link"].split("token=")[-1]
        # verify
        r2 = http.post(f"{API}/auth/verify", json={"token": token}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["verified"] is True

        # me now shows verified
        r3 = http.get(f"{API}/auth/me", headers=_auth(user_token), timeout=15)
        assert r3.status_code == 200
        assert r3.json()["email_verified"] is True

    def test_verify_invalid_token(self, http):
        r = http.post(f"{API}/auth/verify", json={"token": "invalid-xyz"}, timeout=15)
        assert r.status_code == 400


# ---------- Forgot / Reset Password ----------
class TestPasswordReset:
    def test_forgot_and_reset(self, http, user_creds):
        r = http.post(f"{API}/auth/forgot-password", json={"email": user_creds["email"]}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["sent"] is True
        assert d.get("dev_link"), f"Expected dev_link, got {d}"
        token = d["dev_link"].split("token=")[-1]

        new_pw = "newpass456"
        r2 = http.post(f"{API}/auth/reset-password", json={"token": token, "new_password": new_pw}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["reset"] is True

        # Old password no longer works
        ro = http.post(f"{API}/auth/login",
                       json={"email": user_creds["email"], "password": user_creds["password"]}, timeout=15)
        assert ro.status_code == 401

        # New password works
        rn = http.post(f"{API}/auth/login",
                       json={"email": user_creds["email"], "password": new_pw}, timeout=15)
        assert rn.status_code == 200

        # Reset token cannot be reused
        rr = http.post(f"{API}/auth/reset-password",
                       json={"token": token, "new_password": "another123"}, timeout=15)
        assert rr.status_code == 400

    def test_forgot_unknown_email_silent_success(self, http):
        r = http.post(f"{API}/auth/forgot-password",
                      json={"email": "TEST_doesnotexist_zzz@example.com"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["sent"] is True


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_mock_scope(self, http, user_token):
        # ensure at least one mock attempt
        items = http.get(f"{API}/questions", params={"limit": 3}, timeout=15).json()
        http.post(f"{API}/attempts", json={
            "mode": "mock",
            "question_ids": [q["id"] for q in items[:3]],
            "answers": [q["correct_index"] for q in items[:3]],
            "time_taken_sec": 60,
        }, headers=_auth(user_token), timeout=20)

        r = http.get(f"{API}/leaderboard", params={"scope": "mock"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["scope"] == "mock"
        assert isinstance(d["entries"], list)
        assert len(d["entries"]) >= 1
        e = d["entries"][0]
        for k in ("user_id", "name", "score", "extra"):
            assert k in e
        assert e["score"] >= 1

    def test_weekly_scope(self, http):
        r = http.get(f"{API}/leaderboard", params={"scope": "weekly"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["scope"] == "weekly"
        assert isinstance(d["entries"], list)
        assert len(d["entries"]) >= 1
        e = d["entries"][0]
        assert "score" in e and "name" in e

    def test_streak_scope(self, http):
        r = http.get(f"{API}/leaderboard", params={"scope": "streak"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["scope"] == "streak"
        assert isinstance(d["entries"], list)
        # daily test should have created at least 1 streak user
        assert len(d["entries"]) >= 1
        e = d["entries"][0]
        assert e["score"] >= 1
        assert "current:" in e["extra"]


# ---------- Bulk import (JSON + CSV) ----------
class TestBulkImport:
    def test_bulk_import_non_admin_forbidden(self, http, user_token):
        # Need a logged-in non-admin user; re-create one since previous reset changed pw
        uniq = uuid.uuid4().hex[:6]
        creds = {"email": f"TEST_bulk_{uniq}@example.com", "name": "B", "password": "abc123"}
        ru = http.post(f"{API}/auth/signup", json=creds, timeout=15)
        assert ru.status_code == 200
        tok = ru.json()["token"]
        payload = {"questions": []}
        r = http.post(f"{API}/questions/bulk_import", json=payload, headers=_auth(tok), timeout=15)
        assert r.status_code == 403

    def test_bulk_import_admin_json(self, http, admin_token):
        uniq = uuid.uuid4().hex[:6]
        payload = {"questions": [
            {
                "exam": "GPSC Class 1-2", "year": 2024, "subject": "ઇતિહાસ",
                "topic": f"TEST_bulk_{uniq}",
                "question_text": f"TEST_bulk_q1_{uniq}",
                "options": [
                    {"label": "ક", "text": "A"}, {"label": "ખ", "text": "B"},
                    {"label": "ગ", "text": "C"}, {"label": "ઘ", "text": "D"},
                ],
                "correct_index": 0,
            },
            {
                "exam": "PI", "year": 2024, "subject": "ભૂગોળ",
                "topic": f"TEST_bulk_{uniq}",
                "question_text": f"TEST_bulk_q2_{uniq}",
                "options": [
                    {"label": "ક", "text": "1"}, {"label": "ખ", "text": "2"},
                    {"label": "ગ", "text": "3"}, {"label": "ઘ", "text": "4"},
                ],
                "correct_index": 2,
            },
        ]}
        r = http.post(f"{API}/questions/bulk_import", json=payload,
                      headers=_auth(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["inserted"] == 2
        assert d["total_submitted"] == 2
        assert d["errors"] == []

        # Verify persistence via list with search
        rg = http.get(f"{API}/questions", params={"q": f"TEST_bulk_q1_{uniq}"}, timeout=15)
        assert rg.status_code == 200
        assert any(f"TEST_bulk_q1_{uniq}" in q["question_text"] for q in rg.json())

    def test_csv_import_admin(self, http, admin_token):
        uniq = uuid.uuid4().hex[:6]
        csv_content = (
            "exam,year,subject,topic,question_text,opt_a,opt_b,opt_c,opt_d,correct_index,official_explanation\n"
            f"GPSC Class 1-2,2024,ઇતિહાસ,TEST_csv_{uniq},TEST_csv_q1_{uniq},વ૧,વ૨,વ૩,વ૪,B,exp text\n"
            f"PI,2024,ભૂગોળ,TEST_csv_{uniq},TEST_csv_q2_{uniq},A1,A2,A3,A4,2,explain\n"
        )
        files = {"file": ("sample.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
        # don't send default JSON Content-Type
        headers = _auth(admin_token)
        r = requests.post(f"{API}/questions/import_csv", files=files, headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["inserted"] == 2, d
        assert d["errors"] == []

        # Verify: B → correct_index 1
        rg = http.get(f"{API}/questions", params={"q": f"TEST_csv_q1_{uniq}"}, timeout=15)
        items = rg.json()
        assert len(items) >= 1
        q1 = next(q for q in items if f"TEST_csv_q1_{uniq}" in q["question_text"])
        assert q1["correct_index"] == 1

    def test_csv_import_non_admin_forbidden(self, http, user_token):
        # user_token's password was reset, so re-signup quickly for a fresh user
        uniq = uuid.uuid4().hex[:6]
        creds = {"email": f"TEST_csv_user_{uniq}@example.com", "name": "C", "password": "abc123"}
        ru = http.post(f"{API}/auth/signup", json=creds, timeout=15)
        tok = ru.json()["token"]
        files = {"file": ("x.csv", io.BytesIO(b"a,b\n1,2"), "text/csv")}
        r = requests.post(f"{API}/questions/import_csv", files=files, headers=_auth(tok), timeout=15)
        assert r.status_code == 403
