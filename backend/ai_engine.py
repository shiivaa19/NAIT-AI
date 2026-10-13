"""
AI Orchestration Layer for NIAT AI Admission Copilot.
Direct dynamic LLM generation using OpenAI models on Groq (openai/gpt-oss-120b / 20b).
Works like ChatGPT / OpenAI with dynamic conversational intelligence, multi-turn memory,
and grounded RAG reference evidence. No hardcoded or saved template answers.
"""

import os
import re
import json
import time
import asyncio
import httpx
from typing import List, Dict, Any, Optional
from backend.config import settings
from backend.knowledge_base import kb

SYSTEM_BASE_INSTRUCTIONS = """You are the NIAT AI Admission Copilot, an intelligent, general-purpose educational conversational assistant designed like ChatGPT / OpenAI.
You help prospective students and their parents understand NIAT (NxtWave of Innovation in Advanced Technologies), evaluate undergraduate engineering options, make informed decisions, and progress toward admission.

YOUR BEHAVIOR & PERSONALITY:
- Converse naturally and intelligently just like ChatGPT / OpenAI.
- If the user says a greeting (like 'hi', 'hello', 'hey'), respond warmly, naturally, and conversationally. Do not dump large unprompted paragraphs.
- If the user asks a general question (e.g. general technology, coding, math, career, life, or general conversation), answer it directly, accurately, and naturally.
- Answer the user's ACTUAL question directly. Never repeat rigid templates.
- Maintain multi-turn conversational context. Remember previously mentioned locations, student preferences, and goals within the conversation.
- If the user asks for Telugu (e.g. 'explain to my father in Telugu'), respond in natural, polite Telugu (తెలుగు) while keeping official entity names clear.

ESSENTIAL VERIFIED FACTS ABOUT NIAT:
1. WHAT IS NIAT: NIAT (NxtWave of Innovation in Advanced Technologies) is an industry-ready technology upskilling initiative by NxtWave, launched in 2023. NIAT is NOT a university, physical college, or degree-conferring body.
2. DEGREE CONFERRAL: Students receive their UGC-recognised / AICTE-approved B.Tech degree directly from the collaborating university where they enroll (across 35+ partner institutions like Chaitanya Deemed University, Aurora Deemed University, Yenepoya University, GMRIT, etc.). NIAT provides practical AI/ML labs and an Industry Ready Certificate (IRC).
3. 4-YEAR COSTS: The total 4-year cost typically ranges between ₹8 Lakhs and ₹18 Lakhs depending on the chosen university, degree tuition, and hostel accommodation. University tuition is paid to the university; NIAT fees cover the tech upskilling curriculum.
4. ELIGIBILITY: Students who passed Class 12 with PCM (Maths, Physics, Chemistry) in 2023, 2024, 2025, or 2026 (or 2027 prospective). Pass-outs prior to 2023 are ineligible.
5. NAT (NxtWave Assessment Test): 90-minute assessment (82 questions: Psychometric, Critical Thinking, High School Math), ₹1,200 non-refundable fee. NAT evaluates suitability; it is NOT a university entrance exam.
6. PLACEMENT REALITY: NIAT provides extensive placement assistance with 2,500+ hiring partners and reports a ₹80 LPA highest package across NxtWave programs, but DOES NOT guarantee 100% jobs or placements.
7. CITATIONS: When citing NIAT facts, provide clickable markdown links to official sources (e.g. [NIAT Official](https://www.niatindia.com/), [Assessment Test](https://www.niatindia.com/assessment-test), [Campuses](https://www.niatindia.com/campus), [Placements](https://www.niatindia.com/placements)).

VISUAL FLOWCHART & DIAGRAM GUIDELINES:
- WHEN ASKED FOR A FLOWCHART OR ROADMAP, OR WHEN EXPLAINING MULTI-STEP PROCESSES (such as admission journey, NAT exam stages, 4-year curriculum roadmap, decision tree, fee payment structure, placement timeline):
  * DO NOT output endless boring definitions or long paragraphs.
  * ALWAYS provide a visual flowchart using a Mermaid diagram code block:
    ```mermaid
    flowchart TD
        A["1. Class 12 PCM (2023-2027)"] --> B["2. Register for NAT Exam (₹1,200)"]
        B --> C["3. Take Online NAT (90 Min, 82 Qs)"]
        C --> D["4. Career Counselling & Track Selection"]
        D --> E["5. University B.Tech Admission"]
        D --> F["6. NIAT Tech Upskilling Enrollment"]
        E & F --> G["🎓 Dual Advantage: Degree + IRC"]
    ```
  * Keep Mermaid syntax clean and standard (`flowchart TD` or `flowchart LR`). Always wrap node labels in double quotes like `A["Step Description"]`.
  * Accompany the flowchart with concise, bulleted key takeaways rather than walls of text.

COLLEGE / CAMPUS & PLACEMENT INFORMATION GUIDELINES:
- When discussing colleges, campuses, courses, placements, or companies:
  * Provide rich, structured highlights rather than plain definitions:
  * 🏢 **College / Campus Details**: Mention Collaborating University, City & State, and direct link: `[🔗 Visit Official Campus Portal](https://www.niatindia.com/campus/...)`.
  * 🖼️ **Visual Image**: You can include relevant campus / technology lab images using markdown: `![Collaborating Campus](https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80)` or `![NextGen AI Lab](https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80)`.
  * 📚 **Courses & Specialisations**:
    - B.Tech CSE in Artificial Intelligence & Machine Learning
    - B.Tech CSE in Data Science
    - B.Tech NextGen Engineering
    - IIT Kharagpur OCN Micro-Specialisations (Generative AI & Agentic AI) for qualifying learners.
  * 💼 **Placement & Company Statistics (Official Verified Figures)**:
    - **Hiring Companies**: 2,500+ companies have hired from NxtWave (including Fortune 500 giants & top tech innovators like Google, Microsoft, Amazon, TCS, Infosys, Cognizant, Wipro, Accenture, Swiggy, etc.). Over 100+ hiring companies reach out each month!
    - **Highest Package**: ₹80 LPA highest package achieved across NxtWave programs.
    - **Paid Internships**: 200+ NIATians secured internships with stipends (up to ₹30,000/month in early years). ₹2.92 Crore total stipends secured.
    - **Hands-on Projects**: 50+ industry-inspired projects, 1,200+ AI-powered projects built.
  * Format data into tables or structured bullet cards so the user gets crystal-clear understanding at a single glance.
"""

STUDENT_MODE_ADDITION = """
[CURRENT MODE: STUDENT MODE]
Adopt an engaging, tech-forward tone. Focus on hands-on technology skills (Generative AI, Agentic workflows, full-stack development, Python, DSA), 50+ real-world projects, campus life, peer learning, and preparing for top tech roles.
"""

PARENT_MODE_ADDITION = """
[CURRENT MODE: PARENT MODE]
Adopt a respectful, calm, transparent, and reassuring tone. Emphasize degree recognition (UGC/AICTE), complete 4-year cost transparency, hostel safety & security, attendance, and realistic career preparation without hype. Help parents understand questions to ask counsellors before making any financial commitment.
"""

import time

class AIEngine:
    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_MODEL or "openai/gpt-oss-120b"
        self.groq_fallbacks = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
        self.gemini_api_key = settings.GEMINI_API_KEY
        self.gemini_models = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

    async def generate_response(
        self,
        message: str,
        session_id: str,
        mode: str = "student",
        language: str = "en",
        history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Dynamically calls the Dual-Engine AI (Groq + Gemini).
        Runs fast concurrent race so the fastest response returns in milliseconds.
        If one fails, the other responds immediately.
        """
        history = history or []
        
        # 1. Retrieve supporting evidence for NIAT queries
        retrieved_docs = kb.search(message, top_k=4)
        citations = []
        rag_context = ""
        
        is_greeting_or_general = message.strip().lower() in [
            "hi", "hello", "hey", "hola", "namaste", "good morning", "good evening", "good afternoon"
        ]
        
        if not is_greeting_or_general and retrieved_docs:
            evidence_lines = []
            for doc in retrieved_docs:
                citations.append({
                    "source_name": doc.get("source_name", "NIAT Official Documentation"),
                    "source_url": doc.get("source_url", "https://www.niatindia.com/"),
                    "verification_status": "verified_official",
                    "snippet": doc.get("content", "")[:200] + "...",
                    "applicability": doc.get("applicability", "2023-2027 Cohorts")
                })
                evidence_lines.append(f"- **{doc.get('title')}** (Source: {doc.get('source_url')}): {doc.get('content')}")
            
            seen_urls = set()
            dedup_citations = []
            for c in citations:
                if c["source_url"] not in seen_urls:
                    seen_urls.add(c["source_url"])
                    dedup_citations.append(c)
            citations = dedup_citations[:4]
            
            rag_context = "\n\nVERIFIED REFERENCE EVIDENCE (Use this to answer factual NIAT claims accurately):\n" + "\n".join(evidence_lines)

        # 2. Build system prompt
        system_prompt = SYSTEM_BASE_INSTRUCTIONS
        if mode == "parent":
            system_prompt += PARENT_MODE_ADDITION
        else:
            system_prompt += STUDENT_MODE_ADDITION

        if language == "te":
            system_prompt += "\nUSER PREFERENCE: Please respond in natural, polite Telugu (తెలుగు) while maintaining official terms (e.g. NIAT, B.Tech, UGC, NAT)."
        elif language == "hi":
            system_prompt += "\nUSER PREFERENCE: Please respond in polite Hindi (हिंदी)."

        if rag_context:
            system_prompt += rag_context

        # 3. Construct message array for LLM (including multi-turn memory)
        messages_payload = [{"role": "system", "content": system_prompt}]
        
        for h in history[-8:]:
            if h.get("role") in ["user", "assistant"] and h.get("content"):
                messages_payload.append({"role": h["role"], "content": h["content"]})
                
        messages_payload.append({"role": "user", "content": message})

        # 4. Call Dual-Engine API (Gemini + Groq race with millisecond fallback)
        reply_text, engine_used, latency_ms = await self._call_dual_engine_api(messages_payload)

        # 5. Suggested follow-up actions
        suggested_actions = self._generate_suggested_actions(message, mode, language)

        return {
            "session_id": session_id,
            "message": reply_text,
            "mode": mode,
            "language": language,
            "citations": citations,
            "tools_used": ["search_verified_knowledge"] if citations else [],
            "suggested_actions": suggested_actions,
            "engine_used": engine_used,
            "latency_ms": latency_ms
        }

    async def _call_dual_engine_api(self, messages_payload: List[Dict[str, str]]) -> tuple[str, str, int]:
        """
        Executes concurrent dual-engine race between Google Gemini and Groq (OpenAI models).
        The fastest sub-second response wins in milliseconds.
        If either engine fails, the other succeeds seamlessly.
        """
        start_time = time.time()
        
        # Concurrent tasks for both Gemini and Groq
        tasks = [
            asyncio.create_task(self._call_gemini_api(messages_payload)),
            asyncio.create_task(self._call_groq_api(messages_payload))
        ]

        # Wait for the first successful completion
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        
        for t in done:
            try:
                reply, engine_name = t.result()
                if reply and reply.strip():
                    elapsed_ms = int((time.time() - start_time) * 1000)
                    for p in pending:
                        p.cancel()
                    return reply.strip(), engine_name, elapsed_ms
            except Exception:
                pass

        # If the first completed task threw an exception, await the remaining pending task
        for p in pending:
            try:
                reply, engine_name = await p
                if reply and reply.strip():
                    elapsed_ms = int((time.time() - start_time) * 1000)
                    return reply.strip(), engine_name, elapsed_ms
            except Exception:
                pass

        # Fallback polite conversational reply if completely offline
        elapsed_ms = int((time.time() - start_time) * 1000)
        user_msg = ""
        for m in reversed(messages_payload):
            if m.get("role") == "user":
                user_msg = m.get("content", "").lower()
                break

        if any(w in user_msg for w in ["hi", "hello", "hey", "namaste", "hola"]):
            return "Hello! I am your NIAT AI Admission Copilot. How can I help you today with admissions, campus comparisons, fees, or degree recognitions?", "offline_fallback", elapsed_ms
        
        return "Hello! I'm here to assist you with all information regarding NIAT admissions, partner universities, curriculum, and fees. Please ask your question or select one of the topics below!", "offline_fallback", elapsed_ms

    async def _call_gemini_api(self, messages_payload: List[Dict[str, str]]) -> tuple[str, str]:
        """
        Calls Google Gemini API (gemini-3.5-flash / gemini-3.1-flash-lite).
        Fast, lightweight, sub-second responses.
        """
        if not self.gemini_api_key:
            raise ValueError("No Gemini API key configured")

        # Extract system prompt
        system_text = ""
        contents = []
        for m in messages_payload:
            if m["role"] == "system":
                system_text += m["content"] + "\n"
            else:
                role = "model" if m["role"] == "assistant" else "user"
                contents.append({"role": role, "parts": [{"text": m["content"]}]})

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.6,
                "maxOutputTokens": 1200
            }
        }
        if system_text.strip():
            payload["systemInstruction"] = {"parts": [{"text": system_text.strip()}]}

        transport = httpx.AsyncHTTPTransport(retries=2)
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        async with httpx.AsyncClient(transport=transport, timeout=12.0) as client:
            for model_name in self.gemini_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.gemini_api_key}"
                try:
                    response = await client.post(url, json=payload, headers=headers)
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and parts[0].get("text"):
                                return parts[0]["text"].strip(), f"Gemini ({model_name})"
                except Exception:
                    continue

        raise RuntimeError("All Gemini models failed")

    async def _call_groq_api(self, messages_payload: List[Dict[str, str]]) -> tuple[str, str]:
        """
        Calls Groq OpenAI models API (openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b).
        Fast inference in milliseconds.
        """
        if not self.groq_api_key:
            raise ValueError("No Groq API key configured")

        models_to_try = [self.groq_model] + [m for m in self.groq_fallbacks if m != self.groq_model]
        
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        transport = httpx.AsyncHTTPTransport(retries=2)
        async with httpx.AsyncClient(transport=transport, timeout=12.0) as client:
            for model_name in models_to_try:
                try:
                    payload = {
                        "model": model_name,
                        "messages": messages_payload,
                        "temperature": 0.6,
                        "max_tokens": 1200
                    }
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    if response.status_code == 200:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"]
                        if content and content.strip():
                            return content.strip(), f"Groq ({model_name})"
                except Exception:
                    continue

        raise RuntimeError("All Groq models failed")

    def _generate_suggested_actions(self, message: str, mode: str, language: str) -> List[str]:
        if language == "te":
            return [
                "4 సంవత్సరాల మొత్తం ఫీజు ఎంత?",
                "B.Tech డిగ్రీ ఎవరిస్తారు?",
                "హైదరాబాద్ క్యాంపస్‌లను పోల్చండి",
                "కౌన్సెలింగ్ బుక్ చేసుకోండి"
            ]
        if mode == "parent":
            return [
                "Calculate total 4-year cost breakdown",
                "Is the B.Tech degree UGC recognised?",
                "What are hostel security arrangements?",
                "Questions to ask counsellor before paying"
            ]
        return [
            "What exactly is NIAT?",
            "Who awards my B.Tech degree?",
            "What is the NAT assessment pattern?",
            "Compare Hyderabad collaborating campuses"
        ]

ai_engine = AIEngine()
