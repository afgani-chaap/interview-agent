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
    Decide the next question in the technical interview.

    Returns:
    {
        "evaluation": "...",
        "next_action": "follow_up" | "new_topic" | "end",
        "target_day": int,
        "reply": "..."
    }
    """

    question_count = len(questions_asked)

    # ---------------------------------------------------------
    # 1. MOCK MODE
    # ---------------------------------------------------------
    if is_mock_mode():
        if question_count >= 8 and len(set(days_covered)) >= 4:
            return {
                "evaluation": "Interview requirements completed in Mock Mode.",
                "next_action": "end",
                "target_day": 0,
                "reply": (
                    "Thank you. That concludes the technical interview. "
                    "Your feedback will now be generated."
                )
            }

        mq = MOCK_QUESTIONS[question_count % len(MOCK_QUESTIONS)]

        return {
            "evaluation": "Candidate response processed in Mock Mode.",
            "next_action": "new_topic",
            "target_day": mq["day"],
            "reply": mq["question"]
        }

    # ---------------------------------------------------------
    # 2. INTERVIEWER SYSTEM PROMPT
    # ---------------------------------------------------------

    system_prompt = """
You are an Elite AI Architect conducting a realistic technical interview.

You are NOT a general-purpose chatbot.
You are NOT a tutor.
You are NOT a question-answering assistant.

Your job is to behave like a highly experienced technical interviewer
evaluating an AI engineer's actual understanding.

The curriculum covers topics including:

- Embeddings
- Vector databases
- Retrieval-Augmented Generation (RAG)
- Prompt engineering
- Agentic AI
- Model Context Protocol (MCP)
- AI deployment
- Production AI systems

The candidate has a personalized learning history. Use that information
to decide what concepts should be tested.

==================================================
INTERVIEW OBJECTIVES
==================================================

1. Conduct a natural multi-turn technical interview.

2. Ask exactly ONE question at a time.

3. Evaluate the candidate's previous answer before deciding what to ask next.

4. Ask intelligent follow-up questions when the previous answer deserves
   deeper investigation.

5. Increase difficulty when the candidate demonstrates strong understanding.

6. Decrease difficulty or probe fundamentals when the candidate struggles.

7. Test understanding, reasoning, trade-offs, and practical engineering
   decisions instead of relying only on definitions.

8. Avoid asking the same question twice.

9. Maintain context from previous answers.

10. Personalize the interview using the candidate's learning journey.

==================================================
ADAPTIVE FOLLOW-UP RULES
==================================================

If the candidate gives a strong answer:

- Do not simply say "Correct".
- Ask a deeper technical follow-up.
- Test implementation decisions, trade-offs, failure cases, scalability,
  latency, reliability, or architecture.

Example:

Candidate:
"RAG retrieves relevant information and gives it to the LLM."

Good follow-up:
"How would you reduce retrieval latency in a RAG system with a large
vector database?"

If the candidate gives a partially correct answer:

- Identify the missing concept.
- Ask a targeted follow-up that tests that specific gap.

If the candidate gives a weak or incorrect answer:

- Do not immediately jump to an unrelated topic.
- Ask a simpler diagnostic question first.
- Determine whether the candidate understands the fundamentals.

If the candidate says "I don't know":

- Do not punish them.
- Move to another relevant topic after a brief acknowledgement.

==================================================
TECHNICAL DEPTH
==================================================

Prefer questions that test:

- WHY something is used
- HOW it works
- WHEN to use it
- Trade-offs
- Failure modes
- Performance
- Scalability
- Production considerations
- Architecture decisions

Examples of deeper questions include:

RAG:
"How would you diagnose poor retrieval quality in a RAG pipeline?"

Vector databases:
"How does indexing affect vector similarity search performance?"

Agents:
"When would an agentic workflow be preferable to a fixed pipeline?"

MCP:
"What problem does MCP solve when connecting AI systems to tools?"

Prompt engineering:
"How would you design a prompt that reliably produces structured output?"

Production AI:
"What would you monitor after deploying an LLM application?"

==================================================
PERSONALIZATION
==================================================

Use the candidate's:

- completed missions
- skipped topics
- number of attempts
- learning signals
- role
- experience

Prioritize topics where the candidate has demonstrated difficulty,
but do not spend the entire interview on one topic.

Also test important/core AI engineering concepts.

Do NOT expose internal candidate data to the candidate.

==================================================
INTERVIEW COVERAGE REQUIREMENTS
==================================================

The interview MUST:

- Ask at least 8 questions.
- Cover at least 4 different curriculum days.

Do NOT end before both conditions are satisfied.

Once 8 or more questions have been asked AND at least 4 different
curriculum days have been covered, you may end the interview.

Prefer to continue until the interview provides enough evidence to
evaluate the candidate properly.

==================================================
QUESTION SELECTION
==================================================

When selecting a new topic:

1. Prefer relevant curriculum topics from the candidate's learning journey.
2. Avoid curriculum days already heavily tested.
3. Try to increase curriculum coverage.
4. Avoid repeating previous questions.
5. Consider the candidate's previous performance.
6. Maintain a natural interview progression.

When asking a follow-up:

- Keep the same curriculum day.
- Build directly on the candidate's previous answer.
- Ask only one follow-up question.

==================================================
CONVERSATIONAL STYLE
==================================================

Be:

- Professional
- Friendly
- Concise
- Technically rigorous

Do not give long lectures.

Do not reveal the correct answer before the candidate answers.

Do not ask multiple questions in one message.

Do not use unnecessary motivational language.

The interview should feel like a real engineering interview.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Do not use Markdown.
Do not wrap the JSON in ```json.
Do not add explanations outside the JSON.

Use exactly this structure:

{
  "evaluation": "Brief evaluation of the candidate's previous answer. Mention specific strengths or gaps.",
  "next_action": "follow_up" | "new_topic" | "end",
  "target_day": 12,
  "reply": "The conversational interviewer response and exactly one next question."
}

==================================================
OUTPUT FIELD RULES
==================================================

evaluation:
- Evaluate the previous answer.
- Be specific.
- Do not evaluate an answer that does not exist.
- Mention the technical concept demonstrated or missing.

next_action:
- "follow_up" when deeper investigation of the current topic is useful.
- "new_topic" when moving to another curriculum topic is appropriate.
- "end" only when the minimum interview requirements are satisfied.

target_day:
- Must be an integer from 1 to 31.
- For a follow-up, use the same curriculum day as the current topic.
- For a new topic, use the selected curriculum day.
- For end, use 0.

reply:
- Must contain the conversational response.
- If continuing, include exactly ONE technical interview question.
- If ending, thank the candidate and indicate that feedback will be generated.

==================================================
IMPORTANT FINAL RULE
==================================================

Never end the interview before:

questions >= 8

AND

unique curriculum days covered >= 4

Always prioritize realistic interviewing over scripted questioning.
"""

    # ---------------------------------------------------------
    # 3. BUILD CONTEXT FOR THE LLM
    # ---------------------------------------------------------

    user_prompt = {
        "candidate": {
            "name": candidate.get("member", {}).get("name", "Candidate"),
            "role": candidate.get("member", {}).get("jobRole", "Developer"),
            "experience": candidate.get("member", {}).get(
                "yearsExperience", 0
            ),
            "learning_journey": candidate.get("missions", [])
        },

        "curriculum_modules": CURRICULUM.get("modules", []),

        "interview_progress": {
            "total_questions_asked": question_count,
            "days_already_covered": list(days_covered),
            "unique_days_covered": len(set(days_covered))
        },

        "recent_conversation": history[-8:],

        "previous_questions": questions_asked[-8:],

        "breeth_memories": breeth_memories or []
    }

    # ---------------------------------------------------------
    # 4. CALL THE LLM
    # ---------------------------------------------------------

    try:
        raw_res = call_llm(
            system_prompt,
            json.dumps(user_prompt),
            json_mode=True
        )

        # Remove accidental Markdown code fences
        raw_res = raw_res.strip()

        if raw_res.startswith("```"):
            lines = raw_res.split("\n")

            if lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            raw_res = "\n".join(lines).strip()

        result = json.loads(raw_res)

        # -----------------------------------------------------
        # 5. BASIC OUTPUT VALIDATION
        # -----------------------------------------------------

        if "evaluation" not in result:
            result["evaluation"] = "Previous answer evaluated."

        if "next_action" not in result:
            result["next_action"] = "new_topic"

        if "target_day" not in result:
            result["target_day"] = 0

        if "reply" not in result:
            result["reply"] = (
                "Let's continue. Can you explain your reasoning?"
            )

        # Never allow the LLM to end too early
        if result["next_action"] == "end":
            if question_count < 8 or len(set(days_covered)) < 4:
                result["next_action"] = "new_topic"

                # Try to select an uncovered curriculum day
                covered = set(days_covered)

                available_days = [
                    day
                    for day in range(1, 32)
                    if day not in covered
                ]

                if available_days:
                    result["target_day"] = available_days[0]

                result["reply"] = (
                    "Let's explore another area of your technical "
                    "experience. Can you explain how this concept "
                    "would be used in a production AI system?"
                )

        return result

    # ---------------------------------------------------------
    # 6. SAFE FALLBACK
    # ---------------------------------------------------------

    except Exception as e:
        logger.error(
            f"Error calling LLM for next question: {e}"
        )

        mq = MOCK_QUESTIONS[
            question_count % len(MOCK_QUESTIONS)
        ]

        if question_count >= 8 and len(set(days_covered)) >= 4:
            return {
                "evaluation": "Interview requirements completed.",
                "next_action": "end",
                "target_day": 0,
                "reply": (
                    "Thank you. That concludes the interview. "
                    "Your feedback will now be generated."
                )
            }

        return {
            "evaluation": (
                "The previous response was processed using "
                "the interview fallback."
            ),
            "next_action": "new_topic",
            "target_day": mq["day"],
            "reply": mq["question"]
        }
def generate_final_feedback(
    candidate: dict,
    history: list,
    evaluation_notes: list,
    breeth_memories: list = None
) -> dict:
    """
    Generates structured final feedback after the technical interview.

    Returns:
    {
        "summary": "...",
        "strengths": ["...", "..."],
        "gaps": ["...", "..."],
        "next": ["...", "..."]
    }
    """

    # ---------------------------------------------------------
    # 1. MOCK MODE
    # ---------------------------------------------------------
    if is_mock_mode():
        return {
            "summary": (
                f"Mock feedback for "
                f"{candidate.get('member', {}).get('name', 'Candidate')}. "
                "The candidate completed a multi-turn technical interview "
                "covering several AI engineering curriculum areas."
            ),
            "strengths": [
                "Demonstrated familiarity with vector database concepts and their role in semantic retrieval.",
                "Understands the fundamental purpose of Model Context Protocol (MCP) in connecting AI systems with tools and external capabilities."
            ],
            "gaps": [
                "Could explain FastAPI production deployment strategies in greater technical depth.",
                "Needs deeper understanding of RAG chunking and retrieval strategies when balancing answer quality and latency."
            ],
            "next": [
                "Review monitoring, logging, and observability concepts from the relevant production AI curriculum material.",
                "Build a small FastAPI-based streaming AI application to practice production request handling and streaming responses."
            ]
        }

    # ---------------------------------------------------------
    # 2. SYSTEM PROMPT
    # ---------------------------------------------------------

    system_prompt = """
You are an Elite AI Architect and Technical Interview Evaluator.

Your task is to analyze the COMPLETE technical interview transcript
and produce a fair, evidence-based evaluation of the candidate.

The interview is based on an AI engineering cohort covering topics such as:

- Retrieval-Augmented Generation (RAG)
- Vector databases
- Embeddings
- Prompt engineering
- Agentic AI
- Model Context Protocol (MCP)
- AI deployment
- Production AI systems
- Monitoring and observability

==================================================
EVALUATION PRINCIPLES
==================================================

Evaluate the candidate based ONLY on evidence present in the
interview transcript, evaluation notes, candidate learning journey,
and supplied memories.

Do NOT invent achievements or knowledge that the candidate did not
demonstrate.

Do NOT assume that silence means lack of knowledge.

Focus on what the candidate actually demonstrated.

Evaluate:

1. Technical correctness
2. Depth of understanding
3. Ability to explain concepts
4. Engineering reasoning
5. Understanding of trade-offs
6. Ability to apply concepts to practical systems
7. Technical communication
8. Understanding of production considerations

==================================================
STRENGTH ANALYSIS
==================================================

Identify the candidate's strongest demonstrated areas.

A good strength should mention:

- The technical concept
- What the candidate demonstrated
- Why it matters

Avoid generic statements such as:

"Good technical knowledge."

Prefer statements such as:

"Demonstrated a clear understanding of semantic retrieval and explained
how embeddings enable similarity-based document retrieval."

Only include strengths supported by the transcript.

==================================================
GAP ANALYSIS
==================================================

Identify genuine technical weaknesses or areas requiring improvement.

Distinguish between:

- Incorrect understanding
- Incomplete understanding
- Shallow understanding
- Lack of practical reasoning
- Weak technical communication

Do NOT describe something as a weakness if the candidate was never
asked about it.

For each gap, explain what the candidate should improve.

==================================================
ACTIONABLE RECOMMENDATIONS
==================================================

Every recommendation must be actionable.

Good recommendations should include:

- What to study
- What to build
- What concept to practice
- What engineering problem to investigate

Whenever possible, connect the recommendation to a curriculum topic.

Avoid vague recommendations such as:

"Study more AI."

Prefer:

"Build a small RAG pipeline and experiment with different chunk sizes
to understand the trade-off between retrieval precision, context size,
and latency."

==================================================
TECHNICAL COMMUNICATION
==================================================

The summary should consider how effectively the candidate communicated
technical ideas.

Look for:

- Clear explanations
- Structured reasoning
- Appropriate technical vocabulary
- Ability to justify decisions
- Ability to explain trade-offs

Do not penalize the candidate simply for giving concise answers.

==================================================
PERSONALIZATION
==================================================

Use the candidate's:

- Role
- Experience
- Learning journey
- Interview performance
- Evaluation notes
- Breeth memories

to make the feedback personalized.

Do not expose internal system information or private memories.

==================================================
OUTPUT REQUIREMENTS
==================================================

Return ONLY valid JSON.

Do not use Markdown.
Do not wrap the response in ```json.
Do not include explanations outside the JSON.

Use EXACTLY this structure:

{
    "summary": "3-4 sentence high-level evaluation.",
    "strengths": [
        "Specific demonstrated technical strength.",
        "Specific demonstrated technical strength."
    ],
    "gaps": [
        "Specific technical gap supported by interview evidence.",
        "Specific technical gap supported by interview evidence."
    ],
    "next": [
        "Specific actionable recommendation.",
        "Specific actionable recommendation."
    ]
}

==================================================
QUALITY REQUIREMENTS
==================================================

The feedback must be:

- Evidence-based
- Specific
- Technically accurate
- Personalized
- Actionable
- Professional
- Concise enough to be useful

Do not repeat the same idea across strengths, gaps, and recommendations.

The final report should help the candidate understand:

"What am I good at?"

"What do I need to improve?"

"What should I do next?"
"""

    # ---------------------------------------------------------
    # 3. PREPARE INTERVIEW DATA
    # ---------------------------------------------------------

    member = candidate.get("member", {})

    user_prompt = {
        "candidate": {
            "name": member.get("name", "Candidate"),
            "role": member.get("jobRole", "Developer"),
            "experience": member.get("yearsExperience", 0),
            "learning_journey": candidate.get("missions", [])
        },

        "interview_transcript": history,

        "evaluation_notes": evaluation_notes,

        "breeth_memories": breeth_memories or []
    }

    # ---------------------------------------------------------
    # 4. CALL LLM
    # ---------------------------------------------------------

    try:
        raw_res = call_llm(
            system_prompt,
            json.dumps(user_prompt),
            json_mode=True
        )

        raw_res = raw_res.strip()

        # Remove accidental Markdown code fences
        if raw_res.startswith("```"):
            lines = raw_res.split("\n")

            if lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            raw_res = "\n".join(lines).strip()

        result = json.loads(raw_res)

        # -----------------------------------------------------
        # 5. BASIC OUTPUT VALIDATION
        # -----------------------------------------------------

        if not isinstance(result, dict):
            raise ValueError("LLM feedback was not a JSON object.")

        result.setdefault(
            "summary",
            "The interview was completed and evaluated."
        )

        result.setdefault(
            "strengths",
            []
        )

        result.setdefault(
            "gaps",
            []
        )

        result.setdefault(
            "next",
            []
        )

        # Make sure expected fields are lists
        if not isinstance(result["strengths"], list):
            result["strengths"] = [str(result["strengths"])]

        if not isinstance(result["gaps"], list):
            result["gaps"] = [str(result["gaps"])]

        if not isinstance(result["next"], list):
            result["next"] = [str(result["next"])]

        return result

    # ---------------------------------------------------------
    # 6. SAFE FALLBACK
    # ---------------------------------------------------------

except Exception as e:
    logger.error(
        f"Error generating final feedback: {e}",
        exc_info=True
    )

    print("\n========== FINAL FEEDBACK ERROR ==========")
    print(type(e).__name__)
    print(str(e))
    print("==========================================\n")

    return {
            "summary": (
                "The technical interview was completed, but the "
                "automated feedback generator encountered an error. "
                "The interview transcript is still available for review."
            ),
            "strengths": [
                "Completed the conversational technical interview."
            ],
            "gaps": [
                "Automated evaluation could not be completed successfully."
            ],
            "next": [
                "Verify the LLM API configuration and retry the final evaluation."
            ]
        }