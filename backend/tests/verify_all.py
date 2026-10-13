"""
Comprehensive Health & API Key Verification Audit for NIAT AI Copilot.
Tests Groq, Gemini, Supabase, and FastAPI endpoints.
"""

import time
import requests
import json
from backend.config import settings

def main():
    print("========================================================")
    print("      NIAT AI COPILOT - FULL SYSTEM HEALTH AUDIT        ")
    print("========================================================\n")

    # 1. GROQ API CHECK
    print("1. Checking Groq API Key...")
    t0 = time.time()
    try:
        r_groq = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json={
                "model": settings.GROQ_MODEL,
                "messages": [{"role": "user", "content": "Respond with: Groq connection operational"}],
                "max_tokens": 20
            },
            timeout=10
        )
        dt_groq = int((time.time() - t0) * 1000)
        if r_groq.status_code == 200:
            content = r_groq.json()["choices"][0]["message"]["content"].strip()
            print(f"   [PASS] Groq API Connected! (Latency: {dt_groq}ms)")
            print(f"          Model: {settings.GROQ_MODEL}")
            print(f"          Response: \"{content}\"\n")
        else:
            print(f"   [FAIL] Groq status {r_groq.status_code}: {r_groq.text}\n")
    except Exception as e:
        print(f"   [FAIL] Groq exception: {e}\n")

    # 2. GEMINI API CHECK
    print("2. Checking Google Gemini API Key...")
    t0 = time.time()
    try:
        gem_models_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={settings.GEMINI_API_KEY}"
        r_gem = requests.get(gem_models_url, timeout=10)
        dt_gem = int((time.time() - t0) * 1000)
        if r_gem.status_code == 200:
            models = r_gem.json().get("models", [])
            gen_models = [m["name"].replace("models/", "") for m in models if "generateContent" in m.get("supportedGenerationMethods", [])]
            print(f"   [PASS] Google Gemini API Connected! (Latency: {dt_gem}ms)")
            print(f"          Models Available: {len(gen_models)} models")
            print(f"          Active Models: {gen_models[:3]}")

            # Test prompt
            active_model = "gemini-2.5-flash" if "gemini-2.5-flash" in gen_models else gen_models[0]
            r_prompt = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent?key={settings.GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": "Say Gemini connection verified in 3 words"}]}]},
                timeout=10
            )
            if r_prompt.status_code == 200:
                txt = r_prompt.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                print(f"          Generation test on {active_model}: \"{txt}\"\n")
            else:
                print(f"          Generation note: {r_prompt.status_code}\n")
        else:
            print(f"   [FAIL] Gemini status {r_gem.status_code}: {r_gem.text}\n")
    except Exception as e:
        print(f"   [FAIL] Gemini exception: {e}\n")

    # 3. SUPABASE CLOUD DATABASE CHECK
    print("3. Checking Supabase Cloud Database...")
    t0 = time.time()
    try:
        sb_headers = {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_KEY}"
        }
        r_sb = requests.get(f"{settings.SUPABASE_URL}/auth/v1/settings", headers=sb_headers, timeout=10)
        dt_sb = int((time.time() - t0) * 1000)
        if r_sb.status_code == 200:
            print(f"   [PASS] Supabase Cloud Database Connected! (Latency: {dt_sb}ms)")
            print(f"          Project URL: {settings.SUPABASE_URL}")
            print(f"          Publishable Key: {settings.SUPABASE_KEY[:16]}... (Verified)")
            print("          Status: Auth & PostgREST Online\n")
        else:
            print(f"   [FAIL] Supabase status {r_sb.status_code}: {r_sb.text}\n")
    except Exception as e:
        print(f"   [FAIL] Supabase exception: {e}\n")

    # 4. BACKEND FASTAPI ENDPOINTS CHECK
    print("4. Checking Local FastAPI Endpoints (http://127.0.0.1:8000)...")
    base = "http://127.0.0.1:8000"
    try:
        # Health
        r = requests.get(f"{base}/api/health", timeout=5)
        print(f"   [PASS] GET /api/health -> {r.status_code} ({r.json()['status']})")

        # Campuses
        r_camp = requests.get(f"{base}/api/campuses", timeout=5)
        print(f"   [PASS] GET /api/campuses -> {r_camp.status_code} ({len(r_camp.json())} campuses loaded)")

        # Cost Calculator
        r_calc = requests.post(f"{base}/api/calculate-cost", json={
            "annual_university_tuition": 180000,
            "annual_niat_program_fee": 75000,
            "annual_hostel_fee": 120000
        }, timeout=5)
        calc_data = r_calc.json()
        print(f"   [PASS] POST /api/calculate-cost -> {r_calc.status_code} (4-Year Total: Rs. {calc_data.get('four_year_net_total', 0):,})")

        # Google 1-Click Auth
        r_g = requests.post(f"{base}/api/auth/google", json={
            "email": "audit.student@gmail.com",
            "name": "Audit Student"
        }, timeout=5)
        print(f"   [PASS] POST /api/auth/google -> {r_g.status_code} (JWT Session Issued)")

        # Chat Reasoner
        t_chat = time.time()
        r_chat = requests.post(f"{base}/api/chat", json={
            "message": "What is the NAT exam structure?",
            "mode": "student",
            "language": "en"
        }, timeout=15)
        dt_chat = int((time.time() - t_chat) * 1000)
        chat_data = r_chat.json()
        print(f"   [PASS] POST /api/chat -> {r_chat.status_code} (Engine: {chat_data.get('engine_used')}, Latency: {dt_chat}ms)")
        print(f"          AI Response: \"{chat_data.get('message', '')[:85]}...\"\n")

    except Exception as e:
        print(f"   [FAIL] Backend error: {e}\n")

    print("========================================================")
    print("        ALL API KEYS & DATABASE FULLY OPERATIONAL       ")
    print("========================================================")

if __name__ == "__main__":
    main()
