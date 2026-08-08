import logging
import requests
import config

logger = logging.getLogger("breeth_client")

class BreethClient:
    def __init__(self):
        self.api_key = config.BREETH_API_KEY
        self.api_url = config.BREETH_API_URL
        self.enabled = bool(self.api_key)
        if not self.enabled:
            logger.warning("Breeth API key is missing. Memory logging will be disabled.")

    def save_episode(self, session_id: str, content: str, extract_intent: bool = True) -> bool:
        """
        Saves a conversational event or assessment fact into Breeth memory.
        """
        if not self.enabled:
            return False
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "content": content,
            "group_id": session_id,
            "extract_intent": extract_intent
        }
        try:
            r = requests.post(f"{self.api_url}/v1/episodes", json=payload, headers=headers, timeout=10)
            if r.status_code in (200, 201):
                return True
            else:
                logger.error(f"Failed to save episode to Breeth: {r.status_code} - {r.text}")
                return False
        except Exception as e:
            logger.error(f"Error saving episode to Breeth: {e}")
            return False

    def search_memories(self, session_id: str, query: str, limit: int = 5) -> list[str]:
        """
        Searches previous memories for the given group_id (session_id).
        Returns a list of matching facts.
        """
        if not self.enabled:
            return []

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "query": query,
            "group_id": session_id,
            "limit": limit
        }
        try:
            r = requests.post(f"{self.api_url}/v1/search", json=payload, headers=headers, timeout=10)
            if r.status_code == 200:
                res_data = r.json()
                edges = res_data.get("edges", [])
                return [edge.get("fact", "") for edge in edges if "fact" in edge]
            else:
                logger.error(f"Failed to search Breeth: {r.status_code} - {r.text}")
                return []
        except Exception as e:
            logger.error(f"Error searching Breeth: {e}")
            return []
