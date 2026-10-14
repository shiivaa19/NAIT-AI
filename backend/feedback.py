"""
Post-Counselling Feedback Bot and Sentiment Recalibration Service.
Handles:
- Post-counselling WhatsApp survey dispatch
- Ingestion of rating (1-5) and follow-up qualitative feedback
- Groq-powered sentiment classification and explanation
- Score recalibration feedback loop: adjusts lead score and tag dynamically
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from backend.config import settings
from backend.database import get_db_connection, get_lead_by_id, update_lead_score

logger = logging.getLogger("niat.feedback")


async def trigger_post_counselling_feedback(lead_id: int) -> Dict[str, Any]:
    """Sends the initial WhatsApp feedback survey request to a lead."""
    lead = await get_lead_by_id(lead_id)
    if not lead or lead.get("opted_out"):
        return {"success": False, "error": "Lead not eligible for feedback"}

    from backend.messaging import messaging_service
    res = await messaging_service.send_sequence_message(lead, step="post_feedback_survey")
    return res


async def analyze_feedback_sentiment(
    rating: int,
    q1_clarity: str = "",
    q2_concerns: str = ""
) -> Dict[str, Any]:
    """
    Analyzes student feedback using Groq LLM (with deterministic fallback).
    Returns sentiment (positive, neutral, negative), sentiment_score (-1.0 to 1.0), and score_delta.
    """
    combined_text = f"Rating: {rating}/5. Clarity response: {q1_clarity}. Concerns/Next steps: {q2_concerns}."

    if settings.GROQ_API_KEY:
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            prompt = f"""You are an educational feedback analytics system.
Analyze the following post-counselling student feedback:
"{combined_text}"

Output a JSON object ONLY with the exact keys:
{{
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": float between -1.0 and 1.0,
  "score_delta": integer between -20 and +20 (e.g. +15 for high satisfaction, -15 for dissatisfaction),
  "analysis_summary": "brief rationale"
}}
"""
            resp = await client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            raw = resp.choices[0].message.content
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Groq sentiment analysis notice (using rule-based fallback): {e}")

    # Rule-based deterministic fallback
    if rating >= 4:
        sentiment = "positive"
        score = 0.85 if rating == 5 else 0.65
        delta = 15 if rating == 5 else 10
        summary = f"High satisfaction rating ({rating}/5). Student confirmed positive counselling experience."
    elif rating == 3:
        sentiment = "neutral"
        score = 0.1
        delta = 3
        summary = "Neutral rating (3/5). Student has moderate interest and pending family evaluation."
    else:
        sentiment = "negative"
        score = -0.7
        delta = -15
        summary = f"Low satisfaction rating ({rating}/5). Unresolved concerns or mismatched expectations."

    return {
        "sentiment": sentiment,
        "sentiment_score": score,
        "score_delta": delta,
        "analysis_summary": summary
    }


async def process_rating_reply(
    lead_id: int,
    rating: int,
    q1_clarity: str = "Addressed main academic questions",
    q2_concerns: str = "Discussing with parents"
) -> Dict[str, Any]:
    """
    Processes a rating response, runs sentiment analysis, updates counselling_feedback table,
    and recalculates the lead's final score and HOT/WARM/COLD tag.
    """
    lead = await get_lead_by_id(lead_id)
    if not lead:
        return {"success": False, "error": "Lead not found"}

    analysis = await analyze_feedback_sentiment(rating, q1_clarity, q2_concerns)
    sentiment = analysis.get("sentiment", "positive")
    sentiment_score = float(analysis.get("sentiment_score", 0.5))
    score_delta = int(analysis.get("score_delta", 10))

    # Calculate new score and tag
    current_score = lead.get("score", 50)
    new_score = max(0, min(100, current_score + score_delta))
    new_tag = "HOT" if new_score >= 70 else ("WARM" if new_score >= 40 else "COLD")

    reasons = lead.get("score_reasons", [])
    reasons.append({
        "dimension": "Post-Counselling Feedback",
        "points": score_delta,
        "max_points": 20,
        "reason": f"Rated session {rating}/5 stars. Sentiment: {sentiment.upper()} ({analysis.get('analysis_summary')})"
    })

    async with get_db_connection() as conn:
        # Record feedback
        await conn.execute("""
        INSERT INTO counselling_feedback (lead_id, counselling_session_id, rating, q1_clarity_response, q2_concerns_response, sentiment, sentiment_score, score_delta)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (lead_id, f"cs_{lead_id}_{datetime.utcnow().strftime('%Y%m%d')}", rating, q1_clarity, q2_concerns, sentiment, sentiment_score, score_delta))

        # Update lead record
        await conn.execute("""
        UPDATE leads 
        SET score = ?, tag = ?, score_reasons = ?, counselling_attended = 1, status = 'contacted', last_interaction_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """, (new_score, new_tag, json.dumps(reasons), lead_id))
        await conn.commit()

    logger.info(f"Feedback recorded for lead {lead_id}: Rating {rating}/5 -> Score {current_score} -> {new_score} [{new_tag}]")

    return {
        "success": True,
        "lead_id": lead_id,
        "rating": rating,
        "sentiment": sentiment,
        "old_score": current_score,
        "new_score": new_score,
        "new_tag": new_tag,
        "summary": analysis.get("analysis_summary")
    }
