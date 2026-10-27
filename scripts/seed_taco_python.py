import os
import sys
import json
import re
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(__file__), "../apps/backend/.env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/ai-interviewer")

print(f"Connecting to MongoDB...")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client.get_default_database()
    # Ping
    db.command("ping")
    print(f"✅ Connected to MongoDB database: {db.name}")
except Exception as e:
    print(f"⚠️ Falling back to local MongoDB (127.0.0.1:27017)...")
    client = MongoClient("mongodb://127.0.0.1:27017/ai-interviewer", serverSelectionTimeoutMS=5000)
    db = client.get_database("ai-interviewer")
    print(f"✅ Connected to local MongoDB: {db.name}")

problems_col = db["problems"]
testcases_col = db["testcases"]

COMPANY_POOL = ["Google", "Amazon", "Microsoft", "Meta", "TCS", "Infosys", "Accenture", "Wipro", "Flipkart", "Uber", "Apple", "Goldman Sachs"]

def map_difficulty(diff_str):
    if not diff_str:
        return "Medium"
    upper = str(diff_str).upper()
    if "EASY" in upper:
        return "Easy"
    if "HARD" in upper:
        return "Hard"
    return "Medium"

def clean_slug(title, idx):
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    return f"taco-{idx+1}-{slug[:50]}"

def extract_title(question, name, idx):
    if name and len(str(name).strip()) > 3:
        return str(name).strip()[:80]
    lines = [l.strip() for l in question.split("\n") if l.strip()]
    if lines:
        first_line = re.sub(r'[^a-zA-Z0-9\s\-_]', '', lines[0]).strip()
        if len(first_line) > 5:
            return first_line[:80]
    return f"TACO Algorithmic Problem #{idx+1}"

def seed_taco():
    try:
        from datasets import load_dataset
        print("\n📥 Fetching BAAI/TACO dataset from HuggingFace Hub...")
        dataset = load_dataset("BAAI/TACO", trust_remote_code=True, split="train")
        print(f"✅ Loaded TACO dataset with {len(dataset)} total problems.")
    except Exception as err:
        print(f"❌ Failed to load TACO dataset via HuggingFace `datasets`: {err}")
        sys.exit(1)

    seeded_count = 0
    skipped_count = 0

    print("\nProcessing and seeding 100 TACO problems into MongoDB...")
    
    # Pick 100 sample problems across dataset
    sample_indices = list(range(0, min(len(dataset), 500), 5))

    for idx, row in enumerate(dataset):
        if idx not in sample_indices and seeded_count < 100:
            continue
        if seeded_count >= 100:
            break

        question = row.get("question", "")
        if not question or len(question.strip()) < 10:
            continue

        title = extract_title(question, row.get("name"), idx)
        slug = clean_slug(title, idx)
        difficulty = map_difficulty(row.get("difficulty"))

        # Parse test cases (inputs / outputs)
        raw_io = row.get("input_output")
        tc_list = []
        
        if raw_io:
            try:
                if isinstance(raw_io, str):
                    io_obj = json.loads(raw_io)
                else:
                    io_obj = raw_io
                
                inputs = io_obj.get("inputs", [])
                outputs = io_obj.get("outputs", [])
                
                for j in range(min(len(inputs), len(outputs), 6)):
                    tc_list.append({
                        "input": str(inputs[j]).strip(),
                        "expectedOutput": str(outputs[j]).strip(),
                        "isHidden": j >= 2
                    })
            except Exception:
                pass

        if not tc_list:
            tc_list.append({"input": "1\n5", "expectedOutput": "5", "isHidden": False})

        # Tags / Topics
        raw_tags = row.get("raw_tags", [])
        topics = []
        if isinstance(raw_tags, str):
            try:
                topics = json.loads(raw_tags)
            except:
                topics = ["Algorithms"]
        elif isinstance(raw_tags, list):
            topics = raw_tags
        if not topics:
            topics = ["Algorithms", "Data Structures"]

        python_starter = row.get("starter_code") or "import sys\n\ndef solve():\n    # Write your solution here\n    pass\n\nif __name__ == '__main__':\n    solve()"
        js_starter = "// JavaScript Solution\nconst readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on('line', (line) => {\n  // Process input\n});"
        cpp_starter = "#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Solution here\n    return 0;\n}"

        company = COMPANY_POOL[idx % len(COMPANY_POOL)]
        points = 10 if difficulty == "Easy" else (25 if difficulty == "Medium" else 50)

        prob_doc = {
            "title": title,
            "slug": slug,
            "difficulty": difficulty,
            "description": question.strip(),
            "inputFormat": "Read from standard input (stdin)",
            "outputFormat": "Write to standard output (stdout)",
            "constraints": [
                "Time Limit: 2.0 seconds",
                "Memory Limit: 256 MB",
                "Refer to problem statement for value ranges"
            ],
            "examples": [
                {
                    "input": tc_list[0]["input"],
                    "output": tc_list[0]["expectedOutput"],
                    "explanation": "Refer to problem description for complete walkthrough."
                }
            ],
            "starterCode": {
                "python": python_starter,
                "javascript": js_starter,
                "cpp": cpp_starter
            },
            "supportedLanguages": ["python", "javascript", "cpp"],
            "topics": topics[:5],
            "companies": [company],
            "points": points,
            "timeLimit": 2000,
            "memoryLimit": 256,
            "isPublished": True
        }

        # Upsert into MongoDB
        res = problems_col.update_one({"slug": slug}, {"$set": prob_doc}, upsert=True)
        prob_id = problems_col.find_one({"slug": slug})["_id"]

        testcases_col.delete_many({"problemId": prob_id})
        for tc in tc_list:
            testcases_col.insert_one({
                "problemId": prob_id,
                "input": tc["input"],
                "expectedOutput": tc["expectedOutput"],
                "isHidden": tc["isHidden"]
            })

        seeded_count += 1
        print(f" [{seeded_count}/100] [{difficulty}] Seeded: {title}")

    print(f"\n🎉 Done! Successfully seeded {seeded_count} real TACO benchmark problems into MongoDB.")

if __name__ == "__main__":
    seed_taco()
