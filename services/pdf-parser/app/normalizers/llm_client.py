import os
import re
import json
import time
import logging
from typing import Dict, Any, Optional, List, Tuple

logger = logging.getLogger("pdf_parser.llm")

class LLMClient:
    """
    Robust Multi-LLM Client with automatic provider failover, retry backoff,
    and bulletproof JSON parsing.
    
    Priority Order:
    1. AWS Bedrock Claude 4.5 Haiku
    2. AWS Bedrock Claude 3.5 Sonnet (higher intelligence fallback)
    3. Google Gemini (gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash) if API key present
    4. AWS Bedrock Claude 3.5 Haiku
    """

    BEDROCK_MODELS = [
        "us.anthropic.claude-haiku-4-5-20251001-v1:0",
        "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-haiku-20241022-v1:0",
    ]

    GEMINI_MODELS = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ]

    @classmethod
    def invoke_json_with_retry(
        cls,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 8192,
        temperature: float = 0.1,
        max_retries_per_model: int = 2
    ) -> Dict[str, Any]:
        """
        Invokes LLM with multi-provider fallback and retry logic.
        Guarantees returned result is a parsed JSON dictionary.
        Raises RuntimeError if all LLMs fail.
        """
        errors = []

        # 1. Try AWS Bedrock Models
        aws_region = os.environ.get("AWS_REGION", "us-east-1")
        has_aws = bool(os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_SECRET_ACCESS_KEY"))

        if has_aws:
            for model_id in cls.BEDROCK_MODELS:
                for attempt in range(1, max_retries_per_model + 1):
                    try:
                        logger.info(f"[LLM] Bedrock attempt {attempt}/{max_retries_per_model} via '{model_id}'...")
                        raw_text = cls._call_bedrock(
                            model_id=model_id,
                            prompt=prompt,
                            system_prompt=system_prompt,
                            max_tokens=max_tokens,
                            temperature=temperature,
                            region=aws_region
                        )
                        parsed = cls._clean_and_parse_json(raw_text)
                        if parsed and isinstance(parsed, dict):
                            logger.info(f"[LLM] Success via Bedrock '{model_id}'.")
                            return parsed
                        else:
                            raise ValueError(f"Extracted JSON was empty or not a dict (got {type(parsed)})")
                    except Exception as e:
                        err_msg = f"Bedrock '{model_id}' (attempt {attempt}): {e}"
                        logger.warning(f"[LLM Fallback Note] {err_msg}")
                        errors.append(err_msg)
                        time.sleep(1.0 * attempt)

        # 2. Try Google Gemini API if GEMINI_API_KEY or GOOGLE_API_KEY is available
        gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if gemini_key:
            for model_id in cls.GEMINI_MODELS:
                for attempt in range(1, max_retries_per_model + 1):
                    try:
                        logger.info(f"[LLM] Gemini attempt {attempt}/{max_retries_per_model} via '{model_id}'...")
                        raw_text = cls._call_gemini(
                            model_id=model_id,
                            api_key=gemini_key,
                            prompt=prompt,
                            system_prompt=system_prompt,
                            max_tokens=max_tokens,
                            temperature=temperature
                        )
                        parsed = cls._clean_and_parse_json(raw_text)
                        if parsed and isinstance(parsed, dict):
                            logger.info(f"[LLM] Success via Gemini '{model_id}'.")
                            return parsed
                        else:
                            raise ValueError(f"Extracted JSON was empty or not a dict (got {type(parsed)})")
                    except Exception as e:
                        err_msg = f"Gemini '{model_id}' (attempt {attempt}): {e}"
                        logger.warning(f"[LLM Fallback Note] {err_msg}")
                        errors.append(err_msg)
                        time.sleep(1.0 * attempt)
        else:
            logger.debug("[LLM] GEMINI_API_KEY/GOOGLE_API_KEY not set; skipping Gemini fallback.")

        # If all providers failed
        fail_summary = "\n  • " + "\n  • ".join(errors)
        raise RuntimeError(
            f"All LLM extraction providers failed. To maintain 100% correctness, no partial regex fallback was used.\n"
            f"Failure reasons:{fail_summary}"
        )

    @classmethod
    def _call_bedrock(
        cls,
        model_id: str,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float,
        region: str
    ) -> str:
        import boto3
        client = boto3.client("bedrock-runtime", region_name=region)

        messages = [{"role": "user", "content": [{"text": prompt}]}]
        kwargs: Dict[str, Any] = {
            "modelId": model_id,
            "messages": messages,
            "inferenceConfig": {
                "maxTokens": max_tokens,
                "temperature": temperature
            }
        }
        if system_prompt:
            kwargs["system"] = [{"text": system_prompt}]

        response = client.converse(**kwargs)
        return response.get("output", {}).get("message", {}).get("content", [{}])[0].get("text", "")

    @classmethod
    def _call_gemini(
        cls,
        model_id: str,
        api_key: str,
        prompt: str,
        system_prompt: Optional[str],
        max_tokens: int,
        temperature: float
    ) -> str:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"SYSTEM INSTRUCTIONS:\n{system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly adhere to these instructions and output valid raw JSON."}]})

        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json"
            }
        }

        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini API returned HTTP {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError(f"Gemini returned empty candidates: {data}")
            parts = candidates[0].get("content", {}).get("parts", [])
            return "".join(p.get("text", "") for p in parts)

    @classmethod
    def _clean_and_parse_json(cls, raw: str) -> Dict[str, Any]:
        """
        Cleans markdown wrappers, trailing commas, and extracts valid JSON.
        """
        if not raw:
            raise ValueError("Empty response received from LLM")

        # Strip markdown fences ```json ... ```
        cleaned = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r'\s*```$', '', cleaned.strip(), flags=re.MULTILINE)

        # Locate outermost { ... }
        match = re.search(r'\{[\s\S]*\}', cleaned)
        if match:
            json_str = match.group(0)
        else:
            json_str = cleaned

        # Attempt direct parse first
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        # Clean trailing commas: , followed by } or ]
        repaired = re.sub(r',\s*([\}\]])', r'\1', json_str)

        # Clean literal unescaped control characters in string values
        repaired = re.sub(r'[\x00-\x1f](?<![\r\n\t])', ' ', repaired)

        return json.loads(repaired)
