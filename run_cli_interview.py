import json
import requests
import sys

def run_cli_interview():
    server_url = "http://localhost:8000/api/interview"
    
    # 1. Load candidates
    try:
        with open("candidates.json", "r", encoding="utf-8") as f:
            data = json.load(f)
            candidates = data.get("candidates", []) if isinstance(data, dict) else data
    except Exception as e:
        print(f"Error loading candidates.json: {e}")
        sys.exit(1)
        
    if not candidates:
        print("No candidates found in candidates.json.")
        sys.exit(1)
        
    print("Available Candidate Profiles:")
    for idx, c in enumerate(candidates):
        member = c.get("member", {})
        print(f"[{idx}] {member.get('name')} - {member.get('jobRole')} ({member.get('yearsExperience')} years exp)")
        
    try:
        selection = int(input("\nSelect candidate index to start: "))
        candidate = candidates[selection]
    except Exception:
        print("Invalid selection. Defaulting to index 0.")
        candidate = candidates[0]
        
    session_id = f"cli-session-{candidate.get('member', {}).get('id', '000')}"
    print(f"\nInitializing interview session '{session_id}' for {candidate.get('member', {}).get('name')}...")
    
    # Start Interview
    try:
        r = requests.post(server_url, json={"sessionId": session_id, "candidate": candidate})
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Could not connect to the server at http://localhost:8000")
        print("Please start the FastAPI server first by running: python main.py")
        sys.exit(1)
        
    if r.status_code != 200:
        print(f"Error starting interview: {r.status_code} - {r.text}")
        sys.exit(1)
        
    res = r.json()
    reply = res.get("reply")
    done = res.get("done")
    
    print("\n================ INTERVIEW STARTED ================")
    
    while not done:
        print(f"\n[Interviewer]: {reply}")
        user_answer = input("\n[Your Answer]: ")
        if not user_answer.strip():
            print("Answer cannot be empty.")
            continue
            
        r = requests.post(server_url, json={"sessionId": session_id, "message": user_answer})
        if r.status_code != 200:
            print(f"Error sending message: {r.status_code} - {r.text}")
            sys.exit(1)
            
        res = r.json()
        reply = res.get("reply")
        done = res.get("done")
        
    print("\n================ INTERVIEW COMPLETED ================")
    print(f"[Interviewer]: {reply}")
    
    feedback = res.get("feedback", {})
    print("\n================ EVALUATION & FEEDBACK ================")
    print(f"Summary:\n{feedback.get('summary', 'No summary generated.')}\n")
    
    print("Strengths:")
    for strength in feedback.get("strengths", []):
        print(f" - {strength}")
        
    print("\nGaps/Weaknesses:")
    for gap in feedback.get("gaps", []):
        print(f" - {gap}")
        
    print("\nRecommended Next Steps:")
    for step in feedback.get("next", []):
        print(f" - {step}")
    print("======================================================")

if __name__ == "__main__":
    run_cli_interview()
