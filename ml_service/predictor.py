import torch
import joblib
import numpy as np
from sentence_transformers import SentenceTransformer
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List
import os
import base64
from io import BytesIO
from PIL import Image
from transformers import (
    DistilBertTokenizerFast, 
    DistilBertForSequenceClassification,
    ViTImageProcessor, 
    ViTForImageClassification
)

app = FastAPI(title="Grievance AI Engine")

# --- CONFIGURATION ---
MODEL_DIR = "models"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

PATHS = {
    # Advanced Model Folders (DistilBERT)
    "cat_bert": os.path.join(MODEL_DIR, "cat_model"),
    "prio_bert": os.path.join(MODEL_DIR, "prio_model"),
    "sent_bert": os.path.join(MODEL_DIR, "sent_model"),
    
    # Fast Model Files (GBM/Sklearn)
    "cat_model": os.path.join(MODEL_DIR, "category_model.pkl"),
    "prio_model": os.path.join(MODEL_DIR, "priority_model.pkl"),
    "dept_model": os.path.join(MODEL_DIR, "department_model.pkl"),
    "sent_model": os.path.join(MODEL_DIR, "sentiment_model.pkl"),
    "urg_model": os.path.join(MODEL_DIR, "urgency_model.pkl"),
    
    # Encoders & Embedders
    "cat_enc": os.path.join(MODEL_DIR, "category_encoder.pkl"),
    "prio_enc": os.path.join(MODEL_DIR, "priority_encoder.pkl"),
    "dept_enc": os.path.join(MODEL_DIR, "department_encoder.pkl"),
    "sent_enc": os.path.join(MODEL_DIR, "sentiment_encoder.pkl"),
    "embedder": os.path.join(MODEL_DIR, "sentence_embedder")
}

MODELS = {}

def load_system():
    print("Loading AI Models...")
    try:
        # 1. Load Common Embedder
        if os.path.exists(PATHS["embedder"]):
            MODELS["embedder"] = SentenceTransformer(PATHS["embedder"])
        else:
            MODELS["embedder"] = SentenceTransformer("all-MiniLM-L6-v2")

        # 2. Load Classifiers (Advanced BERT or Fast GBM)
        # Category
        if os.path.exists(PATHS["cat_bert"]):
            print("Using Advanced BERT for Category")
            MODELS["cat_tok"] = DistilBertTokenizerFast.from_pretrained(PATHS["cat_bert"])
            MODELS["cat"] = DistilBertForSequenceClassification.from_pretrained(PATHS["cat_bert"]).to(device)
            MODELS["cat_mode"] = "bert"
        else:
            print("Using Fast GBM for Category")
            MODELS["cat"] = joblib.load(PATHS["cat_model"])
            MODELS["cat_mode"] = "gbm"

        # Priority
        if os.path.exists(PATHS["prio_bert"]):
            print("Using Advanced BERT for Priority")
            MODELS["prio_tok"] = DistilBertTokenizerFast.from_pretrained(PATHS["prio_bert"])
            MODELS["prio"] = DistilBertForSequenceClassification.from_pretrained(PATHS["prio_bert"]).to(device)
            MODELS["prio_mode"] = "bert"
        else:
            print("Using Fast GBM for Priority")
            MODELS["prio"] = joblib.load(PATHS["prio_model"])
            MODELS["prio_mode"] = "gbm"

        # Sentiment
        if os.path.exists(PATHS["sent_bert"]):
            print("Using Advanced BERT for Sentiment")
            MODELS["sent_tok"] = DistilBertTokenizerFast.from_pretrained(PATHS["sent_bert"])
            MODELS["sent"] = DistilBertForSequenceClassification.from_pretrained(PATHS["sent_bert"]).to(device)
            MODELS["sent_mode"] = "bert"
        else:
            print("Using Fast GBM for Sentiment")
            MODELS["sent"] = joblib.load(PATHS["sent_model"])
            MODELS["sent_mode"] = "gbm"

        # Department & Urgency (Always GBM/Sklearn for now)
        MODELS["dept"] = joblib.load(PATHS["dept_model"])
        MODELS["urg"] = joblib.load(PATHS["urg_model"])

        # Encoders
        MODELS["cat_enc"] = joblib.load(PATHS["cat_enc"])
        MODELS["prio_enc"] = joblib.load(PATHS["prio_enc"])
        MODELS["dept_enc"] = joblib.load(PATHS["dept_enc"])
        MODELS["sent_enc"] = joblib.load(PATHS["sent_enc"])
        print("✅ Core ML models loaded.")
    except Exception as e:
        print(f"❌ Model load error: {e}")

    try:
        MODELS["vision_proc"] = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224")
        MODELS["vision_model"] = ViTForImageClassification.from_pretrained("google/vit-base-patch16-224").to(device)
        print("✅ Vision model loaded.")
    except Exception as e:
        print(f"⚠️ Vision model error: {e}")


# --- REQUEST / RESPONSE ---
class GrievanceRequest(BaseModel):
    description: str
    image: Optional[str] = None
    category: Optional[str] = None

class GrievanceResponse(BaseModel):
    category: str
    priority: str
    department: str
    urgencyScore: int
    sentiment: str
    clusterId: int
    keywords: List[str]
    detectedObjects: Optional[List[str]] = None


@app.on_event("startup")
def startup():
    load_system()

@app.post("/reload")
def reload():
    load_system()
    return {"status": "Reloaded"}


# --- CATEGORY KEYWORDS (comprehensive) ---
CAT_KEYWORDS = {
    "Electricity": [
        "power", "light", "voltage", "wire", "pole", "electric", "current", "outage",
        "blackout", "shock", "transformer", "meter", "bulb", "fuse", "spark", "grid",
        "inverter", "generator", "mcb", "wiring", "short circuit", "electricity"
    ],
    "Water Supply": [
        "water", "pipe", "leak", "tap", "supply", "dry", "drinking", "sewer",
        "drainage", "pump", "tank", "faucet", "pressure", "overflow", "borewell",
        "contaminated", "dirty water", "pipeline", "waterlogging"
    ],
    "Sanitation": [
        "garbage", "trash", "waste", "smell", "dirty", "sewage", "cleaning", "dustbin",
        "dump", "filth", "rubbish", "debris", "litter", "hygiene", "sanitary", "foul",
        "stinking", "compost", "sweeping", "drain clogged"
    ],
    "Roads & Infrastructure": [
        "road", "pothole", "street", "pavement", "bridge", "traffic", "signal",
        "asphalt", "repair", "construction", "highway", "footpath", "lane", "divider",
        "crossing", "streetlight", "flyover", "speed breaker", "crater", "manhole"
    ],
    "Law & Order": [
        "theft", "crime", "police", "fight", "noise", "loud", "harassment", "drunk",
        "robbery", "assault", "security", "illegal", "threat", "brawl", "trespassing",
        "vandalism", "eve teasing", "stalking", "kidnapping", "murder"
    ],
    "Public Transport": [
        "bus", "train", "metro", "station", "stop", "driver", "ticket", "delay",
        "route", "conductor", "platform", "schedule", "transport", "auto", "rickshaw",
        "cab", "fare", "overcrowding"
    ],
    "Healthcare": [
        "hospital", "doctor", "medicine", "ambulance", "sick", "clinic", "health",
        "patient", "nurse", "treatment", "ward", "medical", "disease", "infection",
        "vaccination", "pharmacy", "dispensary", "icu", "surgery"
    ],
    "Education": [
        "school", "teacher", "student", "class", "book", "college", "exam",
        "university", "syllabus", "fees", "admission", "playground", "library",
        "scholarship", "tuition", "principal", "hostel", "lab"
    ]
}

# --- VISION OBJECT LISTS ---
CRITICAL_OBJECTS = [
    "fire", "flame", "smoke", "blood", "weapon", "gun", "knife", "crash",
    "accident", "disaster", "flood", "ambulance", "police", "wreck", "ruin",
    "volcano", "lava", "bomb", "explosion", "chainsaw", "torch"
]
HIGH_OBJECTS = [
    "garbage", "trash", "waste", "pothole", "crack", "damage", "broken",
    "sewage", "leak", "debris", "rubble"
]

# --- TEXT KEYWORD LISTS ---
CRIT_TEXT = [
    "fire", "blood", "dying", "accident", "trapped", "explosion", "urgent",
    "immediate", "unsafe", "collapsed", "danger", "emergency"
]
HIGH_TEXT = [
    "delayed", "blocked", "overflowing", "broken", "damage", "leak",
    "exposed", "hazard", "flooded", "cracked"
]
LOW_TEXT = [
    "minor", "request", "suggestion", "feedback", "inquiry", "question",
    "small", "general"
]

STOP_WORDS = {
    "about", "again", "all", "almost", "also", "and", "are", "been", "but",
    "can", "for", "from", "had", "has", "have", "here", "how", "into",
    "issue", "its", "just", "more", "not", "our", "out", "over", "own",
    "please", "problem", "some", "than", "that", "the", "them", "then",
    "there", "these", "they", "this", "very", "was", "were", "what",
    "when", "where", "which", "while", "who", "will", "with", "would",
    "your", "help", "need", "area", "near", "since", "many", "being"
}


@app.post("/analyze", response_model=GrievanceResponse)
def analyze_grievance(request: GrievanceRequest):
    text = request.description
    image_b64 = request.image

    if not MODELS.get("embedder"):
        load_system()

    # ========== 1. EMBEDDING ==========
    embedding = MODELS["embedder"].encode([text])

    # ========== 2. CATEGORY ==========
    # Priority: User Selection > Keyword Match > BERT/GBM
    if request.category and request.category.strip() not in ["", "Other", "Select", "Auto-detect"]:
        category = request.category.strip()
        print(f"Category: Using user selection -> {category}")
    else:
        # Keyword matching first
        text_lower = text.lower()
        matched_cat = None
        best_score = 0
        for cat_name, kws in CAT_KEYWORDS.items():
            score = sum(1 for kw in kws if kw in text_lower)
            if score > best_score:
                best_score = score
                matched_cat = cat_name

        if matched_cat and best_score > 0:
            category = matched_cat
        else:
            try:
                if MODELS.get("cat_mode") == "bert":
                    inputs = MODELS["cat_tok"](text, return_tensors="pt", truncation=True, padding=True, max_length=128).to(device)
                    with torch.no_grad():
                        logits = MODELS["cat"](**inputs).logits
                    cat_idx = torch.argmax(logits, dim=1).item()
                else:
                    cat_idx = MODELS["cat"].predict(embedding)[0]
                
                category = MODELS["cat_enc"].inverse_transform([cat_idx])[0]
            except Exception:
                category = "Other"

    # ========== 3. PRIORITY / DEPT / SENTIMENT / URGENCY ==========
    try:
        # Priority
        if MODELS.get("prio_mode") == "bert":
            inputs = MODELS["prio_tok"](text, return_tensors="pt", truncation=True, padding=True, max_length=128).to(device)
            with torch.no_grad():
                logits = MODELS["prio"](**inputs).logits
            prio_idx = torch.argmax(logits, dim=1).item()
        else:
            prio_idx = MODELS["prio"].predict(embedding)[0]
        priority = MODELS["prio_enc"].inverse_transform([prio_idx])[0].lower()

        # Sentiment
        if MODELS.get("sent_mode") == "bert":
            inputs = MODELS["sent_tok"](text, return_tensors="pt", truncation=True, padding=True, max_length=128).to(device)
            with torch.no_grad():
                logits = MODELS["sent"](**inputs).logits
            sent_idx = torch.argmax(logits, dim=1).item()
        else:
            sent_idx = MODELS["sent"].predict(embedding)[0]
        sentiment = MODELS["sent_enc"].inverse_transform([sent_idx])[0].lower()

        # Dept & Urgency (Always Embedding/GBM)
        dept_idx = MODELS["dept"].predict(embedding)[0]
        department = MODELS["dept_enc"].inverse_transform([dept_idx])[0]

        urgency_score = int(round(float(MODELS["urg"].predict(embedding)[0])))
        urgency_score = max(1, min(9, urgency_score))
    except Exception as e:
        print(f"Model prediction error: {e}")
        priority = priority if 'priority' in locals() else "medium"
        department = department if 'department' in locals() else (category if category != "Other" else "General")
        urgency_score = urgency_score if 'urgency_score' in locals() else 4
        sentiment = sentiment if 'sentiment' in locals() else "neutral"

    print(f"Model Output -> Priority: {priority}, Urgency: {urgency_score}, Sentiment: {sentiment}")

    # ========== 4. VISION ANALYSIS ==========
    detected_objects = []
    if image_b64 and MODELS.get("vision_model"):
        try:
            image_data = base64.b64decode(image_b64)
            image = Image.open(BytesIO(image_data)).convert("RGB")
            inputs = MODELS["vision_proc"](images=image, return_tensors="pt").to(device)
            with torch.no_grad():
                outputs = MODELS["vision_model"](**inputs)
            idxs = outputs.logits.topk(5).indices.squeeze().tolist()
            detected_objects = [MODELS["vision_model"].config.id2label[idx] for idx in idxs]
            print(f"Vision detected: {detected_objects}")
        except Exception as e:
            print(f"Vision error: {e}")

    # ========== 5. KEYWORD EXTRACTION ==========
    words = [w.strip(".,!?:;\"'()[]") for w in text.split() if w.lower() not in STOP_WORDS and len(w) > 3]
    keywords = list(dict.fromkeys(words))[:6]  # Preserve order, deduplicate

    # ========== 6. HEURISTIC OVERRIDES ==========
    text_l = text.lower()
    word_count = len(text.split())

    # 6a. Vision overrides (highest priority)
    vision_boosted = False
    for obj in detected_objects:
        obj_l = obj.lower()
        if any(c in obj_l for c in CRITICAL_OBJECTS):
            print(f"⚠️ CRITICAL vision object: {obj}")
            priority = "critical"
            urgency_score = max(urgency_score + 2, 8)
            sentiment = "critical"
            vision_boosted = True
            break
        elif any(h in obj_l for h in HIGH_OBJECTS):
            print(f"⚠️ HIGH vision object: {obj}")
            if priority not in ["critical"]:
                priority = "high"
                urgency_score = max(urgency_score + 1, 6)
            vision_boosted = True

    # 6b. Text overrides (only if vision didn't already set critical)
    if not vision_boosted or priority != "critical":
        if any(k in text_l for k in CRIT_TEXT):
            priority = "critical"
            urgency_score = max(urgency_score + 1, 7)
            sentiment = "critical"
        elif any(k in text_l for k in HIGH_TEXT):
            if priority != "critical":
                priority = "high"
                urgency_score = max(urgency_score, 6)
                sentiment = "negative"
        elif word_count < 8 and not vision_boosted:
            # Short text without vision = likely low severity
            if priority not in ["critical", "high"]:
                priority = "low"
                urgency_score = min(urgency_score, 4)
                sentiment = "neutral"

    # Final cap
    urgency_score = max(1, min(9, urgency_score))

    print(f"Final -> Cat: {category}, Pri: {priority}, Urg: {urgency_score}, Sent: {sentiment}")

    return {
        "category": category,
        "priority": priority,
        "department": department,
        "urgencyScore": urgency_score,
        "sentiment": sentiment,
        "clusterId": 101,
        "keywords": keywords,
        "detectedObjects": detected_objects
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
