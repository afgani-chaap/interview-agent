import json
import logging
from fastapi.testclient import TestClient

# Configure basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("test_interview")

from main import app

client = TestClient(app)

def run_e2e_interview_test():
    # 1. Load candidate profile
    try:
        with open("candidates.json", "r", encoding="utf-8") as f:
            candidates_data = json.load(f)
            # Find the first candidate
            candidates = candidates_data.get("candidates", []) if isinstance(candidates_data, dict) else candidates_data
            if not candidates:
                raise ValueError("No candidates found in candidates.json")
            candidate = candidates[0]
            candidate_name = candidate.get("member", {}).get("name", "Test Candidate")
    except Exception as e:
        logger.error(f"Failed to load candidate for testing: {e}")
        return False

    session_id = "test-session-xyz"
    logger.info(f"--- Starting Test Interview for {candidate_name} (Session: {session_id}) ---")

    # 2. Start Interview
    payload = {
        "sessionId": session_id,
        "candidate": candidate
    }
    response = client.post("/api/interview", json=payload)
    if response.status_code != 200:
        logger.error(f"Failed to start interview: {response.status_code} - {response.text}")
        return False
    
    res_data = response.json()
    logger.info(f"Start Response: {json.dumps(res_data, indent=2)}")
    
    reply = res_data.get("reply")
    done = res_data.get("done")
    
    assert reply is not None, "Reply should not be None"
    assert done is False, "Interview should not be done on start"
    
    # 3. Simulated Candidate Answers (8 turns)
    mock_answers = [
        "In Day 7, we learned how vector embeddings map high-dimensional words or chunks into floating-point vectors, preserving semantic meaning.",
        "We compared ChromaDB as a local disk/in-memory DB and Pinecone as a managed cloud-native vector database, which is better for production scaling.",
        "The RAG matching engine retrieves the top K chunks using cosine similarity before feeding the retrieved context to the LLM context window.",
        "To prevent hallucinations, we use prompt engineering with clear guidelines, system instructions, XML tags, and few-shot examples.",
        "We implemented streaming responses in FastAPI by yielding chunks with StreamingResponse and Server-Sent Events (SSE).",
        "Multi-agent orchestration coordinates multiple agents using frameworks like AutoGen or LangGraph to solve complex, sub-divided tasks.",
        "Model Context Protocol is a standard protocol by Anthropic that allows LLMs to query external servers, databases, and filesystem tools safely.",
        "Docker containerizes the application and Kubernetes orchestrates deployment, scaling, load balancing, and self-healing across nodes."
    ]
    
    turn = 1
    while not done:
        logger.info(f"\n--- Turn {turn} ---")
        logger.info(f"Agent Question: {reply}")
        
        # Get simulated candidate response
        candidate_msg = mock_answers[(turn - 1) % len(mock_answers)]
        logger.info(f"Candidate Answer: {candidate_msg}")
        
        # Send next turn
        turn_payload = {
            "sessionId": session_id,
            "message": candidate_msg
        }
        response = client.post("/api/interview", json=turn_payload)
        if response.status_code != 200:
            logger.error(f"Failed turn {turn}: {response.status_code} - {response.text}")
            return False
            
        res_data = response.json()
        reply = res_data.get("reply")
        done = res_data.get("done")
        
        logger.info(f"Done Status: {done}")
        if done:
            logger.info(f"\nFeedback Generated: {json.dumps(res_data.get('feedback'), indent=2)}")
            # Validate feedback schema
            feedback = res_data.get("feedback", {})
            assert "summary" in feedback, "Feedback missing 'summary'"
            assert "strengths" in feedback and isinstance(feedback["strengths"], list), "Feedback missing or invalid 'strengths'"
            assert "gaps" in feedback and isinstance(feedback["gaps"], list), "Feedback missing or invalid 'gaps'"
            assert "next" in feedback and isinstance(feedback["next"], list), "Feedback missing or invalid 'next'"
            
            logger.info("\n--- E2E Interview Test Passed Successfully! ---")
            return True
            
        turn += 1
        
    return False

if __name__ == "__main__":
    run_e2e_interview_test()
