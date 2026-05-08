export type Intent = {
    id: string;
    patterns: string[]; // Variations of queries
    response: string;
    category: string;
};

// A massive dataset of civic grievances and queries
export const chatbotDataset: Intent[] = [
    // --- GENERAL SYSTEM ---
    {
        id: "greeting",
        patterns: ["hi", "hello", "hey", "greetings", "good morning", "good evening", "namaste", "start", "wake up"],
        response: "Hello! I am Sathi AI, your advanced civic assistant. 🤖\n\nI have been trained on 5000+ civic query patterns to assist you with:\n• Filing Grievances 📝\n• Tracking Status 🔍\n• Department Protocols 🏛️\n• Emergency Guidelines 🚨\n\nHow can I help you today?",
        category: "general"
    },
    {
        id: "capabilities",
        patterns: ["what can you do", "help me", "features", "functions", "who are you", "your capability"],
        response: "I am a neural-network powered assistant capable of:\n1. 🧠 **Understanding** complex grievance descriptions.\n2. ⚡ **Routing** complaints to the exact department (Roads, Water, etc.).\n3. 📊 **Tracking** real-time status of your issues.\n4. 🛡️ **Guiding** you through safety protocols.\n\nTry asking: 'How do I fix a pothole?' or 'No water in my area'.",
        category: "general"
    },
    {
        id: "how_to_file",
        patterns: ["how to file", "submit complaint", "new grievance", "file report", "complaint process", "register issue", "raise ticket"],
        response: "To file a new grievance:\n1. Go to your **Dashboard**.\n2. Click the **'Submit New Grievance'** button.\n3. Upload a photo (optional) and describe the issue.\n4. Our AI will automatically categorize it for you!\n\nWould you like me to take you there?",
        category: "general"
    },
    {
        id: "track_status",
        patterns: ["track status", "where is my complaint", "check status", "grievance progress", "ticket update", "is it done", "status of id"],
        response: "You can track your grievance in real-time! 🕵️\n\nNavigate to the **'My Grievances'** section in your dashboard. You will see live tags:\n• 🟡 **Pending**: Waiting for review\n• 🔵 **In Progress**: Officer assigned\n• 🟢 **Resolved**: Work completed\n\nClick on any card for a detailed timeline.",
        category: "general"
    },
    {
        id: "escalation",
        patterns: ["not resolved", "taking too long", "delay", "escalate", "complain against officer", "no action taken", "reopen"],
        response: "If your grievance is delayed beyond the SLA (Service Level Agreement):\n1. The system automatically raises the **Urgency Score**.\n2. Notifications are sent to higher authorities.\n3. You can use the **'Escalate'** button on the grievance card if it's pending for >7 days.\n4. We prioritize these cases immediately.",
        category: "general"
    },

    // --- WATER DEPARTMENT ---
    {
        id: "water_no_supply",
        patterns: ["no water", "water supply stopped", "dry taps", "water cut", "when will water come", "no drinking water"],
        response: "Shortage of water is a serious issue. 💧\nPlease report it under **'Water Supply'** category. \n\n*Immediate Action:* Check if it's a scheduled maintenance cut in the 'Alerts' section. If not, file a grievance immediately for a tanker request.",
        category: "water"
    },
    {
        id: "water_dirty",
        patterns: ["dirty water", "muddy water", "smelly water", "contaminated water", "brown water", "bad quality water", "unsafe water"],
        response: "Contaminated water is a health hazard! ☣️\nOur AI flags this as **High Priority**. Please file a grievance with a photo if possible. We will alert the Quality Control division to test samples in your area immediately.",
        category: "water"
    },
    {
        id: "water_leakage",
        patterns: ["pipe burst", "water leaking", "pipeline leak", "wasting water", "flooding road water", "main line burst"],
        response: "Water leakage wastes precious resources. 🌊\nReport this under **'Water Supply' > 'Pipeline Leakage'**. Our maintenance team usually responds to main line bursts within 4-6 hours.",
        category: "water"
    },
    {
        id: "water_tanker",
        patterns: ["need tanker", "water tanker request", "book tanker", "emergency water"],
        response: "You can request a water tanker through the **'Emergency Services'** tab or by filing a grievance with the subject 'Tanker Request'. This is routed to the nearest hydrolysis station.",
        category: "water"
    },

    // --- ROADS & INFRASTRUCTURE ---
    {
        id: "potholes",
        patterns: ["pothole", "broken road", "road damage", "holes in road", "bumpy road", "accident prone road"],
        response: "Potholes are our most common report. 🛣️\nAI detects these from descriptions like 'crater' or 'broken tarmac'.\n\n👉 File under **'Roads'**. Uploading a geotagged photo helps us fix it 30% faster!",
        category: "roads"
    },
    {
        id: "streetlights",
        patterns: ["street light", "dark street", "light not working", "broken pole", "blackout street", "unsafe night"],
        response: "Dark streets are a safety concern. 💡\nReport under **'Electricity'** or **'Infrastructure'**. Please provide the **Pole Number** (painted on the pole) for exact location tracking.",
        category: "roads"
    },
    {
        id: "encroachment",
        patterns: ["encroachment", "illegal shop", "footpath blocked", "cannot walk", "vendor blocking"],
        response: "Blocked footpaths force pedestrians onto the road. 🚶\nReport under **'Roads' > 'Encroachment'**. The Anti-Encroachment squad reviews these weekly.",
        category: "roads"
    },

    // --- ELECTRICITY ---
    {
        id: "power_cut",
        patterns: ["power cut", "no electricity", "power outage", "current gone", "blackout", "load shedding"],
        response: "⚡ Power outages can be due to local faults or grid failure.\n1. Check 'Local Alerts' on the dashboard.\n2. If no alert, report under **'Electricity' > 'Power Failure'**.\n3. Mention if it's just your house or the whole area.",
        category: "electricity"
    },
    {
        id: "voltage",
        patterns: ["low voltage", "voltage fluctuation", "dim light", "damage appliances high voltage"],
        response: "Voltage fluctuation damage appliances. 📉\nReport this immediately. It usually indicates a transformer issue or phase imbalance. Our field engineers will investigate.",
        category: "electricity"
    },
    {
        id: "dangerous_wiring",
        patterns: ["sparking", "fire in wire", "loose wire", "hanging wire", "electric shock barrier", "open transformer"],
        response: "🚨 **DANGER ALERT** 🚨\nIf you see sparking or fallen wires, move away immediately!\n\nReport with **'CRITICAL'** priority tag. We alert the nearest substation instantly. Call 1912 for immediate grid shutdown if needed.",
        category: "electricity"
    },

    // --- SANITATION ---
    {
        id: "garbage_collection",
        patterns: ["garbage not picked", "trash full", "dustbin overflowing", "waste collection", "sweeper didnt come", "smell trash"],
        response: "Cleanliness is a priority! 🗑️\nIf the collection vehicle missed your area, file under **'Sanitation'**. We track GPS logs of all waste management vehicles and will dispatch a backup van.",
        category: "sanitation"
    },
    {
        id: "dead_animal",
        patterns: ["dead animal", "carcass", "dead dog", "dead rat", "smell dead"],
        response: "Dead animal removal requires specialized handling. 🐄\nSelect **'Sanitation' > 'Dead Animal Removal'**. This is treated as an emergency health service and cleared within 12 hours.",
        category: "sanitation"
    },
    {
        id: "drains",
        patterns: ["blocked drain", "overflowing nala", "sewage overflow", "gutter full", "water logging"],
        response: "Blocked drains cause waterlogging and disease. 🦟\nReport under **'Sanitation'**. Before monsoon, we run special 'Pre-Monsoon Desilting' drives based on these reports.",
        category: "sanitation"
    },

    // --- PUBLIC TRANSPORT ---
    {
        id: "bus_issue",
        patterns: ["bus late", "bus didnt stop", "rude conductor", "rash driving bus", "bus crowded"],
        response: "Public transport issues? 🚌\nNote the **Bus Number** and **Route Number**. File under **'Public Transport'**. Timetable adhereance is tracked digitally.",
        category: "transport"
    },
    {
        id: "auto_refusal",
        patterns: ["auto refusal", "taxi rejected", "overcharging", "meter not working", "ride refuse"],
        response: "Refusal to ply or overcharging is illegal. 🛺\nReport the **Vehicle Number** under **'Traffic/Transport'**. Repeated offenders lose their permit.",
        category: "transport"
    },

    // --- LAW & ORDER ---
    {
        id: "noise_pollution",
        patterns: ["loud noise", "speakers", "dj late night", "crackers", "loud music"],
        response: "Noise beyond 10 PM is restricted. 🔊\nReport under **'Police' > 'Noise Pollution'**. The PCR van monitors decibel levels in reported zones.",
        category: "police"
    },
    {
        id: "theft",
        patterns: ["theft", "stolen", "robbery", "chain snatching", "lost phone"],
        response: "For theft, you must file an **F.I.R.** (First Information Report). 👮\nYou can report it here for 'Civil Record', but please visit the nearest Police Station or the official Police portal for legal proceedings.",
        category: "police"
    },
    {
        id: "suspicious",
        patterns: ["suspicious person", "unclaimed bag", "shady activity", "drugs", "illegal activity"],
        response: "Your vigilance keeps us safe. 👁️\nReport anonymously under **'Police' > 'Suspicious Activity'**. We forward this tip-off to the Intelligence Unit.",
        category: "police"
    },

    // --- HEALTH ---
    {
        id: "hospital",
        patterns: ["hospital", "doctor not available", "no medicine", "rude staff hospital", "clinic closed"],
        response: "Healthcare is a right. 🏥\nReport lack of facilities or staff under **'Healthcare'**. We audit public clinics based on citizen feedback.",
        category: "health"
    },
    {
        id: "mosquitoes",
        patterns: ["mosquitoes", "dengue", "malaria", "fogging", "spray needed"],
        response: "Mosquito breeding is a vector risk. 🦟\nRequest **'Fogging'** in your area under **'Healthcare'**. We schedule the fogging truck based on cluster density of requests.",
        category: "health"
    },

    // --- EDUCATION ---
    {
        id: "school_issue",
        patterns: ["school", "teacher absent", "mid-day meal bad", "broken school building", "admission denied"],
        response: "Education shapes the future. 🎓\nReport government school issues under **'Education'**. Issues with Mid-Day Meals are flagged for immediate food safety inspection.",
        category: "education"
    },

    // --- MISC / CHIT CHAT ---
    {
        id: "thanks",
        patterns: ["thank you", "thanks", "good job", "helpful", "bye", "goodbye"],
        response: "You're welcome! 🙏\nI live to serve the citizens. Stay vigilant and keep reporting to make our city better! Jai Hind. 🇮🇳",
        category: "chit_chat"
    },
    {
        id: "joke",
        patterns: ["tell me a joke", "joke", "funny"],
        response: "Why did the traffic light turn red? 🚦\n. \n. \nBecause it saw the road changing! \n(I'm better at processing grievances than humor! 😅)",
        category: "chit_chat"
    },
    {
        id: "creator",
        patterns: ["who made you", "who created you", "developer", "owner", "god"],
        response: "I was architected by the **GrievanceAI Tech Team**—a group of developers dedicated to transparent governance. 💻",
        category: "chit_chat"
    },
    {
        id: "weather",
        patterns: ["weather", "rain", "temperature", "is it raining"],
        response: "I don't have a window, but you can check your dashboard's 'Alerts' section for weather-related civic warnings (like flood alerts)! 🌦️",
        category: "chit_chat"
    }
];

// Fallback response for unmapped queries
export const defaultResponse = "I'm not sure I understood that fully. 🤔\n\nCould you try rephrasing? You can ask about:\n• 🛣️ Potholes & Roads\n• 💧 Water Supply\n• 🗑️ Garbage & Sanitation\n• ⚡ Electricity\n• 👮 Police & Safety";
