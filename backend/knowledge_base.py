"""
Verified Knowledge Base Manager for NIAT AI Admission Copilot.
Handles hybrid retrieval over 50+ official knowledge chunks and 41 partner campuses.
"""

import json
import os
import re
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
KB_FILE = os.path.join(DATA_DIR, "knowledge_base.json")
CAMPUSES_FILE = os.path.join(DATA_DIR, "campuses.json")

class KnowledgeBase:
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.campuses: List[Dict[str, Any]] = []
        self._load_data()
        
    def _load_data(self):
        if os.path.exists(KB_FILE):
            with open(KB_FILE, "r", encoding="utf-8") as f:
                self.documents = json.load(f)
        if os.path.exists(CAMPUSES_FILE):
            with open(CAMPUSES_FILE, "r", encoding="utf-8") as f:
                self.campuses = json.load(f)
                
    def get_all_campuses(self, state: Optional[str] = None, city: Optional[str] = None) -> List[Dict[str, Any]]:
        results = self.campuses
        if state:
            results = [c for c in results if state.lower() in c.get("state", "").lower()]
        if city:
            results = [c for c in results if city.lower() in c.get("city", "").lower()]
        return results

    def get_campus_by_id(self, campus_id: str) -> Optional[Dict[str, Any]]:
        campus_id_clean = campus_id.lower().replace("/campus/", "").strip("/")
        for c in self.campuses:
            if c["id"].lower() == campus_id_clean or campus_id_clean in c["id"].lower():
                return c
            if campus_id_clean in c["name"].lower():
                return c
        return None

    def search(self, query: str, category: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Hybrid search combining keyword frequency, category matching, and token overlap.
        """
        if not query or not self.documents:
            return []
            
        q_tokens = set(re.findall(r'\b[a-z0-9]{3,}\b', query.lower()))
        scored_docs = []
        
        for doc in self.documents:
            if category and doc.get("category") != category:
                continue
                
            title = doc.get("title", "").lower()
            content = doc.get("content", "").lower()
            tags = [t.lower() for t in doc.get("tags", [])]
            doc_text = f"{title} {content} {' '.join(tags)}"
            
            score = 0.0
            
            # Exact phrase match in title
            if query.lower() in title:
                score += 8.0
            # Exact phrase match in content
            if query.lower() in content:
                score += 5.0
                
            # Token matches
            doc_tokens = set(re.findall(r'\b[a-z0-9]{3,}\b', doc_text))
            intersection = q_tokens.intersection(doc_tokens)
            score += len(intersection) * 2.0
            
            # Key priority terms weighting
            priority_terms = {
                "degree": 3.0, "university": 2.5, "b.tech": 3.0, "btech": 3.0,
                "nat": 3.5, "exam": 2.5, "test": 2.0, "syllabus": 3.0,
                "fee": 3.0, "fees": 3.0, "cost": 3.0, "scholarship": 3.0,
                "hostel": 3.0, "placement": 4.0, "internship": 4.0, "package": 3.5,
                "hyderabad": 3.0, "bangalore": 3.0, "eligibility": 3.5, "pcm": 3.0,
                "iit": 3.0, "nxtwave": 2.0, "flowchart": 4.0, "flow": 3.5,
                "roadmap": 3.5, "company": 4.0, "companies": 4.0, "college": 3.0, "campus": 3.0
            }
            for term, weight in priority_terms.items():
                if term in q_tokens and term in doc_tokens:
                    score += weight
                    
            if score > 0:
                doc_copy = dict(doc)
                doc_copy["score"] = score
                scored_docs.append(doc_copy)
                
        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:top_k]

# Global knowledge base instance
kb = KnowledgeBase()
