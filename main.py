import logging
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from pydantic import BaseModel

import config
import llm_client
from breeth_client import BreethClient

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("main")

app = FastAPI(
    title="AI Interview Agent API",
    description="Conversational backend for technical interview assessments.",
    version="1.0.0"
)

# Enable CORS for frontend flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Breeth Client
breeth_client = BreethClient()

# Session memory (In-Memory Dictionary)
# session_id -> {
#    "candidate": dict,
#    "history": [{"role": "assistant"|"user", "content": str}],
#    "questions_asked": [{"question": str, "day": int}],
#    "days_covered": set(int),
#    "evaluations": [str]
# }
sessions: Dict[str, Dict[str, Any]] = {}

# Serve frontend static assets (CSS, JS)
if os.path.isdir("assets"):
    app.mount("/assets", StaticFiles(directory="assets"), name="assets")

class InterviewRequest(BaseModel):
    sessionId: str
    candidate: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

class InterviewResponse(BaseModel):
    reply: str
    done: bool
    feedback: Optional[Dict[str, Any]] = None

# In-Memory Users DB for Authentication
users_db: Dict[str, Dict[str, Any]] = {
    "demo@talentai.com": {
        "id": "usr-demo",
        "name": "Demo Candidate",
        "email": "demo@talentai.com",
        "password": "password123"
    }
}

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    status: str
    user: Dict[str, Any]
    token: str

@app.get("/")
def read_root():
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    return {
        "status": "online",
        "api_docs": "/docs",
        "model_configured": config.MODEL_NAME,
        "breeth_enabled": breeth_client.enabled
    }

@app.get("/api/candidates")
def get_candidates():
    return llm_client.CANDIDATES

@app.post("/api/auth/register", response_model=AuthResponse)
def register_user(req: RegisterRequest):
    email_clean = req.email.strip().lower()
    if email_clean in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account with this email already exists."
        )
    user_id = f"usr-{len(users_db) + 1}"
    user_data = {
        "id": user_id,
        "name": req.name.strip(),
        "email": email_clean,
        "password": req.password
    }
    users_db[email_clean] = user_data
    logger.info(f"New user registered: {req.name} ({email_clean})")
    return AuthResponse(
        status="success",
        user={"id": user_id, "name": user_data["name"], "email": email_clean},
        token=f"jwt-token-{user_id}"
    )

@app.post("/api/auth/login", response_model=AuthResponse)
def login_user(req: LoginRequest):
    email_clean = req.email.strip().lower()
    user = users_db.get(email_clean)
    if not user or user["password"] != req.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please try again."
        )
    logger.info(f"User logged in: {user['name']} ({email_clean})")
    return AuthResponse(
        status="success",
        user={"id": user["id"], "name": user["name"], "email": user["email"]},
        token=f"jwt-token-{user['id']}"
    )

@app.post("/api/interview", response_model=InterviewResponse)
def handle_interview_turn(request: InterviewRequest):
    session_id = request.sessionId
    
    # CASE 1: Start Interview (request contains candidate profile)
    if request.candidate is not None:
        candidate_data = request.candidate
        member_name = candidate_data.get("member", {}).get("name", "Candidate")
        member_role = candidate_data.get("member", {}).get("jobRole", "Developer")
        
        logger.info(f"Initializing new interview session '{session_id}' for {member_name} ({member_role})")
        
        # Reset/initialize session state
        sessions[session_id] = {
            "candidate": candidate_data,
            "history": [],
            "questions_asked": [],
            "days_covered": set(),
            "evaluations": []
        }
        
        # Log start to Breeth AI memory
        start_message = f"Interview session {session_id} started for candidate {member_name}, role: {member_role}."
        breeth_client.save_episode(session_id, start_message, extract_intent=False)
        
        # Select first question
        next_q_data = llm_client.get_next_question(
            candidate=candidate_data,
            history=[],
            questions_asked=[],
            days_covered=[],
            breeth_memories=[]
        )
        
        # Save assistant question in history
        sessions[session_id]["history"].append({"role": "assistant", "content": next_q_data["reply"]})
        sessions[session_id]["questions_asked"].append({
            "question": next_q_data["reply"], 
            "day": next_q_data["target_day"]
        })
        if next_q_data["target_day"] > 0:
            sessions[session_id]["days_covered"].add(next_q_data["target_day"])
            
        # Log first question to Breeth AI memory
        first_q_memory = f"Interviewer asked Day {next_q_data['target_day']} question: {next_q_data['reply']}"
        breeth_client.save_episode(session_id, first_q_memory, extract_intent=True)

        return InterviewResponse(
            reply=next_q_data["reply"],
            done=False
        )
        
    # CASE 2: Conversation Turn (request contains candidate's message)
    elif request.message is not None:
        if session_id not in sessions:
            logger.error(f"Session '{session_id}' not found. Cannot process turn.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Interview session {session_id} has not been started. Start the session first by passing the candidate profile."
            )
            
        session = sessions[session_id]
        candidate_message = request.message
        candidate_name = session["candidate"].get("member", {}).get("name", "Candidate")
        
        # Append candidate answer to history
        session["history"].append({"role": "user", "content": candidate_message})
        
        # Retrieve last question details
        last_question = session["questions_asked"][-1]["question"] if session["questions_asked"] else "No previous question"
        
        # Save candidate answer to Breeth AI memory
        answer_memory = f"Day {session['questions_asked'][-1].get('day', 0)} Question: {last_question}. Candidate {candidate_name} answered: {candidate_message}"
        breeth_client.save_episode(session_id, answer_memory, extract_intent=True)
        
        # Search Breeth for context/memories of past turns to guide LLM
        memories = breeth_client.search_memories(session_id, f"Candidate {candidate_name}'s weak areas, gaps, or skipped topics")
        
        # Generate next question (or decision to end)
        next_q_data = llm_client.get_next_question(
            candidate=session["candidate"],
            history=session["history"],
            questions_asked=session["questions_asked"],
            days_covered=list(session["days_covered"]),
            breeth_memories=memories
        )
        
        # Store LLM evaluation of last answer
        evaluation = next_q_data.get("evaluation", "No evaluation notes.")
        session["evaluations"].append(evaluation)
        eval_memory = f"Interviewer evaluation of answer: {evaluation}"
        breeth_client.save_episode(session_id, eval_memory, extract_intent=True)
        
        # Check termination constraints
        questions_asked_count = len(session["questions_asked"])
        days_covered_count = len(session["days_covered"])
        
        should_end = (
            next_q_data.get("next_action") == "end" or 
            questions_asked_count >= 12  # Hard safety cap
        ) and (
            questions_asked_count >= config.MIN_QUESTIONS and 
            days_covered_count >= config.MIN_DAYS_COVERED
        )
        
        if should_end:
            logger.info(f"Interview session '{session_id}' completed. Generating final feedback.")
            # Search Breeth for overall performance facts
            feedback_memories = breeth_client.search_memories(session_id, "Candidate strengths, technical gaps, and scores")
            
            # Generate final feedback JSON
            feedback = llm_client.generate_final_feedback(
                candidate=session["candidate"],
                history=session["history"],
                evaluation_notes=session["evaluations"],
                breeth_memories=feedback_memories
            )
            
            # Cleanup session state (or keep it if needed, but here we can clean up to save memory)
            # sessions.pop(session_id, None)
            
            return InterviewResponse(
                reply="Interview completed. Thank you for your time!",
                done=True,
                feedback=feedback
            )
        
        # Continue interview: Save assistant question
        session["history"].append({"role": "assistant", "content": next_q_data["reply"]})
        session["questions_asked"].append({
            "question": next_q_data["reply"],
            "day": next_q_data["target_day"]
        })
        if next_q_data["target_day"] > 0:
            session["days_covered"].add(next_q_data["target_day"])
            
        # Log next question to Breeth AI memory
        next_q_memory = f"Interviewer asked Day {next_q_data['target_day']} question: {next_q_data['reply']}"
        breeth_client.save_episode(session_id, next_q_memory, extract_intent=True)
        
        return InterviewResponse(
            reply=next_q_data["reply"],
            done=False
        )

    else:
        logger.error("Request received without candidate or message")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request must contain either a 'candidate' profile (to start the interview) or a 'message' (to respond to a question)."
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
