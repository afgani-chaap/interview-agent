import json
import logging
import requests
import random
import config

logger = logging.getLogger("llm_client")

# Load curriculum
def load_curriculum():
    try:
        with open(config.CURRICULUM_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Could not load curriculum from {config.CURRICULUM_PATH}: {e}")
        return {"days": []}

# Load candidates
def load_candidates():
    try:
        with open(config.CANDIDATES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data.get("candidates", [])
            return data
    except Exception as e:
        logger.warning(f"Could not load candidates from {config.CANDIDATES_PATH}: {e}")
        return []

CURRICULUM = load_curriculum()
CANDIDATES = load_candidates()

def is_mock_mode() -> bool:
    return not config.GEMINI_API_KEY and not config.ANTHROPIC_API_KEY

def call_llm(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """
    Calls the LLM (Gemini or Claude) via HTTP requests based on configured keys and model.
    """
    model = config.MODEL_NAME
    
    if "gemini" in model.lower():
        if not config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set.")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={config.GEMINI_API_KEY}"
        
        contents = [
            {
                "role": "user",
                "parts": [{"text": f"System Instruction: {system_prompt}\n\nUser Input: {user_prompt}"}]
            }
        ]
        
        payload = {
            "contents": contents,
        }
        if json_mode:
            payload["generationConfig"] = {"responseMimeType": "application/json"}
            
        headers = {"Content-Type": "application/json"}
        
        r = requests.post(url, json=payload, headers=headers, timeout=35)
        if r.status_code != 200:
            logger.error(f"Gemini API returned error: {r.status_code} - {r.text}")
            raise Exception(f"Gemini API Error: {r.text}")
            
        res_data = r.json()
        try:
            return res_data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse Gemini response: {res_data}")
            raise Exception(f"Gemini response parsing error: {e}")
            
    else: # Claude
        if not config.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not set.")
            
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": config.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        user_content = user_prompt
        if json_mode:
            user_content += "\nReturn your response as a valid JSON object ONLY. Do not include markdown code block formatting (like ```json ... ```) or conversational preamble."
            
        payload = {
            "model": model,
            "max_tokens": 4000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_content}
            ]
        }
        
        r = requests.post(url, json=payload, headers=headers, timeout=35)
        if r.status_code != 200:
            logger.error(f"Claude API returned error: {r.status_code} - {r.text}")
            raise Exception(f"Claude API Error: {r.text}")
            
        res_data = r.json()
        try:
            return res_data["content"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to parse Claude response: {res_data}")
            raise Exception(f"Claude response parsing error: {e}")

# MOCK INTERVIEW STATE GENERATOR (For offline testing)
MOCK_QUESTIONS = [
    {"day": 7, "question": "Could you explain what vector embeddings are, and how they convert textual concepts into numbers?"},
    {"day": 8, "question": "What is the difference between a local vector database like ChromaDB and a managed one like Pinecone?"},
    {"day": 10, "question": "How does the retrieval matching engine work inside a Retrieval-Augmented Generation (RAG) system?"},
    {"day": 12, "question": "What are some best practices for Prompt Engineering when trying to prevent LLM hallucinations?"},
    {"day": 16, "question": "How would you design a FastAPI endpoint to support streaming LLM responses in real-time?"},
    {"day": 22, "question": "Can you describe multi-agent orchestration? How do different agents collaborate to solve a task?"},
    {"day": 23, "question": "What is the Model Context Protocol (MCP), and how does it help connect tools to LLM agents?"},
    {"day": 28, "question": "What is the benefit of deploying an LLM application inside a Docker container using Kubernetes?"}
]

def get_next_question(
    candidate: dict, 
    history: list, 
    questions_asked: list, 
    days_covered: list, 
    breeth_memories: list = None
) -> dict:
    """
    Decides the next question to ask.
    Returns a dict: {
        "evaluation": "...",
        "next_action": "follow_up" | "new_topic" | "end",
        "target_day": int,
        "reply": "..."
    }
    """
    question_count = len(questions_asked)
    
    # 1. Fallback Mock Mode
    if is_mock_mode():
        if question_count >= 8:
            return {
                "evaluation": "End of interview reached (Mock Mode).",
                "next_action": "end",
                "target_day": 0,
                "reply": "Thank you. That concludes the interview. Generating feedback..."
            }
        
        # Select mock question matching the index
        mq = MOCK_QUESTIONS[question_count % len(MOCK_QUESTIONS)]
        return {
            "evaluation": "Candidate response accepted (Mock Mode).",
            "next_action": "new_topic",
            "target_day": mq["day"],
            "reply": mq["question"]
        }

    # 2. Live LLM Mode
    system_prompt = (
        "You are an Elite AI Architect Technical Interviewer. Your role is to conduct a professional, "
        "engaging, and highly technical multi-turn interview. You evaluate the candidate's understanding "
        "of Retrieval-Augmented Generation (RAG), vector databases, prompt engineering, agentic AI, MCP, "
        "and production deployment.\n\n"
        "Your task is to analyze the candidate's learning history, look at the current interview progress, "
        "evaluate their last answer (if any), and decide whether to ask a technical follow-up or move to a new day.\n\n"
        "CRITICAL RULES:\n"
        "- You must ask at least 8 questions covering at least 4 different curriculum days.\n"
        "- Use the candidate's learning signals: focus on skipped days (they need validation), struggles (days with > 2 attempts), or core AI days (days 7, 8, 10, 12, 13, 21, 22, 23, 28).\n"
        "- Respond strictly in JSON format matching this schema:\n"
        "{\n"
        "  \"evaluation\": \"Brief assessment of their previous answer (strengths/gaps)\",\n"
        "  \"next_action\": \"follow_up\" | \"new_topic\" | \"end\",\n"
        "  \"target_day\": 12,  // The curriculum day (1-31) that this question evaluates. If follow-up, use the current day. If ending, use 0.\n"
        "  \"reply\": \"Your conversational response. If continuing, ask the next question. If ending, say thank you.\"\n"
        "}\n"
        "- If you decide to end the interview, set \"next_action\": \"end\". Only do this if question count is at least 8 and days covered is at least 4."
    )
    
    user_prompt = {
        "candidate": {
            "name": candidate.get("member", {}).get("name", "Candidate"),
            "role": candidate.get("member", {}).get("jobRole", "Developer"),
            "experience": candidate.get("member", {}).get("yearsExperience", 0),
            "learning_journey": candidate.get("missions", [])
        },
        "curriculum_modules": CURRICULUM.get("modules", []),
        "days_already_covered": list(days_covered),
        "total_questions_asked": question_count,
        "history": history[-4:], # Send last 4 turns to keep it efficient but contextual
        "breeth_memories": breeth_memories or []
    }
    
    try:
        raw_res = call_llm(system_prompt, json.dumps(user_prompt), json_mode=True)
        # Strip any potential markdown wrappers around the JSON
        if raw_res.strip().startswith("```"):
            lines = raw_res.strip().split("\n")
            if lines[0].startswith("```json"):
                raw_res = "\n".join(lines[1:-1])
            elif lines[0].startswith("```"):
                raw_res = "\n".join(lines[1:-1])
                
        return json.loads(raw_res)
    except Exception as e:
        logger.error(f"Error calling LLM for next question: {e}")
        # Secure Fallback to Mock
        mq = MOCK_QUESTIONS[question_count % len(MOCK_QUESTIONS)]
        return {
            "evaluation": f"Error calling LLM, fallback to mock. Error: {e}",
            "next_action": "new_topic" if question_count < 8 else "end",
            "target_day": mq["day"] if question_count < 8 else 0,
            "reply": mq["question"] if question_count < 8 else "Thank you, that ends our interview session."
        }

def generate_final_feedback(candidate: dict, history: list, evaluation_notes: list, breeth_memories: list = None) -> dict:
    """
    Generates structured final feedback.
    Returns a dict matching the spec:
    {
       "summary": "...",
       "strengths": ["...", "..."],
       "gaps": ["...", "..."],
       "next": ["...", "..."]
    }
    """
    if is_mock_mode():
        return {
            "summary": f"Mock feedback for {candidate.get('member', {}).get('name', 'Candidate')}. The candidate answered questions across several curriculum modules.",
            "strengths": [
                "Demonstrated familiarity with vector database concepts (ChromaDB vs Pinecone).",
                "Understands fundamental role of Model Context Protocol (MCP) in Agentic AI."
            ],
            "gaps": [
                "Could elaborate more on FastAPI production deployment strategies.",
                "Needs deeper understanding of RAG chunking strategies under latency constraints."
            ],
            "next": [
                "Review Day 29 material on Monitoring, Logging & Observability.",
                "Implement a streaming chatbot project with FastAPI to practice chunks and connection handling."
            ]
        }
        
    system_prompt = (
        "You are an Elite AI Architect Technical Interviewer. Your job is to analyze the complete interview transcript "
        "and produce a comprehensive, structured evaluation report.\n\n"
        "Format your output strictly as a JSON object matching this schema:\n"
        "{\n"
        "  \"summary\": \"A high-level synthesis of their performance, technical communication, and cohort learning journey (3-4 sentences).\",\n"
        "  \"strengths\": [\n"
        "    \"Detailed technical strength 1\",\n"
        "    \"Detailed technical strength 2\"\n"
        "  ],\n"
        "  \"gaps\": [\n"
        "    \"Technical gap or misunderstanding 1\",\n"
        "    \"Technical gap or misunderstanding 2\"\n"
        "  ],\n"
        "  \"next\": [\n"
        "    \"Actionable next step/recommendation 1\",\n"
        "    \"Actionable next step/recommendation 2\"\n"
        "  ]\n"
        "}\n"
        "All bullets must be professional, detailed, and directly related to the cohort curriculum topics discussed in the interview."
    )
    
    user_prompt = {
        "candidate": candidate.get("member", {}),
        "transcript": history,
        "evaluations": evaluation_notes,
        "breeth_memories": breeth_memories or []
    }
    
    try:
        raw_res = call_llm(system_prompt, json.dumps(user_prompt), json_mode=True)
        if raw_res.strip().startswith("```"):
            lines = raw_res.strip().split("\n")
            if lines[0].startswith("```json"):
                raw_res = "\n".join(lines[1:-1])
            elif lines[0].startswith("```"):
                raw_res = "\n".join(lines[1:-1])
        return json.loads(raw_res)
    except Exception as e:
        logger.error(f"Error generating final feedback: {e}")
        # Default fallback
        return {
            "summary": f"Could not generate LLM feedback due to an error: {e}. However, the candidate completed all stages of the technical interview.",
            "strengths": ["Completed 8+ conversational technical interview turns successfully."],
            "gaps": ["LLM feedback generator encountered an exception during generation."],
            "next": ["Please verify API credentials and retry evaluation."]
        }
