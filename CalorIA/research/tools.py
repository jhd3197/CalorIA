#!/usr/bin/env python3
"""
CalorIA Research Tools
Common utilities and base classes for AI-powered research functionality.
"""

import os
import json
import re
import click
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from uuid import uuid4

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

from ..types import Ingredient, IngredientUnit
from .. import Client


class BaseResearcher:
    """Base class for AI-powered research functionality."""

    def __init__(self):
        self.client = Client()
        self.ai_provider = os.getenv('AI_PROVIDER', 'openai').lower()
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.openai_model = os.getenv('OPENAI_MODEL', 'gpt-4')
        self.ollama_base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.ollama_model = os.getenv('OLLAMA_MODEL', 'llama2')

        # Initialize AI client
        if self.ai_provider == 'openai':
            if OPENAI_AVAILABLE and self.openai_api_key:
                openai.api_key = self.openai_api_key
            else:
                click.echo("⚠️  OpenAI not properly configured.")
                if not OPENAI_AVAILABLE:
                    click.echo("⚠️  OpenAI package not installed. Install with: pip install openai")
                if not self.openai_api_key:
                    click.echo("⚠️  OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
        elif self.ai_provider == 'ollama':
            if not REQUESTS_AVAILABLE:
                click.echo("⚠️  Requests package not installed. Install with: pip install requests")

    def _query_openai(self, prompt: str, model: Optional[str] = None) -> Optional[str]:
        """Query OpenAI for research data."""

        try:
            model_to_use = model or self.openai_model
            response = openai.ChatCompletion.create(
                model=model_to_use,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that provides structured data in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=4000
            )

            content = response.choices[0].message.content.strip()
            return content

        except Exception as e:
            click.echo(f"❌ OpenAI API error: {e}")
            return None

    def _query_ollama(self, prompt: str, model: Optional[str] = None) -> Optional[str]:
        """Query Ollama for research data."""

        try:
            model_to_use = model or self.ollama_model

            # Prepare the request payload for Ollama
            system_prompt = "You are a helpful assistant that provides structured data in JSON format."

            full_prompt = f"{system_prompt}\n\n{prompt}"

            payload = {
                "model": model_to_use,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.01,
                    "top_p": 0.1,
                    "num_predict": 3000
                }
            }

            # Make the request to Ollama
            response = requests.post(
                f"{self.ollama_base_url}/api/generate",
                json=payload,
                timeout=120
            )

            if response.status_code != 200:
                click.echo(f"❌ Ollama API error: {response.status_code} - {response.text}")
                return None

            result = response.json()
            content = result.get('response', '').strip()

            # Handle thinking models (like DeepSeek) that include reasoning
            original_content = content

            # Strategy 1: Look for properly closed thinking blocks
            if '<think>' in content and '</think>' in content:
                think_end = content.find('</think>')
                if think_end != -1:
                    content = content[think_end + 8:].strip()
                    click.echo(f"📝 Removed properly closed thinking block, cleaned length: {len(content)}")

            # Strategy 2: Look for JSON within thinking content
            elif '<think>' in content:
                think_start = content.find('<think>')
                thinking_content = content[think_start + 7:]

                # Look for JSON patterns in the thinking content
                json_indicators = ['[', 'Here is', 'The JSON', 'JSON array', 'should be']

                best_json = None
                best_score = 0

                for indicator in json_indicators:
                    indicator_pos = thinking_content.find(indicator)
                    if indicator_pos != -1:
                        search_area = thinking_content[indicator_pos:indicator_pos + 2000]

                        array_start = search_area.find('[')
                        if array_start != -1:
                            potential_json = search_area[array_start:]
                            array_end = potential_json.find(']') + 1

                            if array_end > 1:
                                extracted = potential_json[:array_end].strip()

                                score = 0
                                if '{' in extracted and '}' in extracted:
                                    score += 2
                                if extracted.count('{') > 3:
                                    score += 1
                                if len(extracted) > 100:
                                    score += 1

                                if score > best_score:
                                    best_json = extracted
                                    best_score = score

                if best_json:
                    content = best_json
                    click.echo(f"📝 Extracted JSON from thinking (score: {best_score}), length: {len(content)}")
                else:
                    json_start = thinking_content.find('[')
                    if json_start != -1:
                        json_end = thinking_content.find(']', json_start) + 1
                        if json_end > json_start:
                            content = thinking_content[json_start:json_end].strip()
                            click.echo(f"📝 Fallback JSON extraction, length: {len(content)}")

            # Strategy 3: Look for any JSON in the entire response
            if not (content.startswith('[') and '{' in content) and not content.startswith('{'):
                json_start = content.find('[')
                if json_start != -1:
                    json_end = content.find(']', json_start) + 1
                    if json_end > json_start:
                        potential_json = content[json_start:json_end].strip()
                        if '{' in potential_json and '}' in potential_json:
                            content = potential_json
                            click.echo(f"📝 Found JSON array in response, extracted length: {len(content)}")
                        else:
                            click.echo(f"⚠️  Found brackets but no objects inside: {repr(potential_json)}")

            # Debug: Show what we have after cleaning
            click.echo(f"🔍 Final cleaned response preview: {repr(content[:200])}")
            click.echo(f"🔍 Full cleaned content: {repr(content)}")

            # Save debug response if needed
            if len(original_content) < 10000:
                debug_file = "ollama_response_debug.txt"
                try:
                    with open(debug_file, 'w', encoding='utf-8') as f:
                        f.write(f"=== ORIGINAL RESPONSE ===\n{original_content}\n\n")
                        f.write(f"=== CLEANED RESPONSE ===\n{content}\n")
                    click.echo(f"💾 Debug response saved to {debug_file}")
                except Exception as e:
                    click.echo(f"⚠️  Could not save debug file: {e}")

            return content

        except requests.exceptions.RequestException as e:
            click.echo(f"❌ Ollama request error: {e}")
            return None
        except Exception as e:
            click.echo(f"❌ Ollama API error: {e}")
            return None

    def query_ai(self, prompt: str, model: Optional[str] = None) -> Optional[str]:
        """Query AI provider for research data."""

        try:
            if self.ai_provider == 'openai':
                if OPENAI_AVAILABLE and self.openai_api_key:
                    return self._query_openai(prompt, model)
                else:
                    click.echo(f"❌ OpenAI not properly configured")
                    return None
            elif self.ai_provider == 'ollama':
                if REQUESTS_AVAILABLE:
                    return self._query_ollama(prompt, model)
                else:
                    click.echo(f"❌ Requests package not available for Ollama")
                    return None
            else:
                click.echo(f"❌ Unsupported AI provider '{self.ai_provider}'. Supported: openai, ollama")
                return None

        except Exception as e:
            click.echo(f"❌ Error querying AI: {e}")
            return None

    def parse_json_response(self, content: str) -> Optional[Any]:
        """Parse JSON response with multiple strategies."""

        if not content:
            return None

        # Try to parse JSON response with multiple strategies
        try:
            # Strategy 1: Look for complete JSON array
            json_start = content.find('[')
            json_end = content.rfind(']') + 1

            if json_start != -1 and json_end > json_start:
                json_content = content[json_start:json_end]

                # Clean up any trailing content after the JSON
                end_markers = ['\n\n', '\n```', '```', '\n\r\n']
                for marker in end_markers:
                    marker_pos = json_content.find(marker)
                    if marker_pos != -1:
                        json_content = json_content[:marker_pos]

                # Try to parse the JSON
                try:
                    ingredients_data = json.loads(json_content)
                    if isinstance(ingredients_data, list):
                        click.echo(f"✅ Successfully parsed {len(ingredients_data)} items from JSON")
                        return ingredients_data
                    else:
                        click.echo("❌ Response is not a JSON array")
                except json.JSONDecodeError as e:
                    click.echo(f"⚠️  JSON array parsing failed: {e}")

            # Strategy 2: Try to parse the entire content as JSON
            try:
                ingredients_data = json.loads(content.strip())
                if isinstance(ingredients_data, list):
                    click.echo(f"✅ Successfully parsed {len(ingredients_data)} items from full content")
                    return ingredients_data
            except json.JSONDecodeError:
                pass

            # Strategy 3: Extract individual JSON objects
            click.echo("🔄 Attempting to extract individual JSON objects...")

            extracted_items = []
            search_content = content
            max_objects = 50
            objects_found = 0
            object_start = search_content.find('{')

            while object_start != -1 and objects_found < max_objects:
                brace_count = 0
                object_end = object_start
                found_end = False
                search_limit = min(object_start + 10000, len(search_content))

                for i in range(object_start, search_limit):
                    if search_content[i] == '{':
                        brace_count += 1
                    elif search_content[i] == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            object_end = i + 1
                            found_end = True
                            break

                if found_end and object_end > object_start:
                    try:
                        obj_content = search_content[object_start:object_end]
                        item_obj = json.loads(obj_content)

                        if isinstance(item_obj, dict):
                            extracted_items.append(item_obj)
                            objects_found += 1
                            click.echo(f"📦 Extracted item {objects_found}: {item_obj.get('name', 'Unknown')}")
                    except json.JSONDecodeError:
                        pass

                next_start = search_content.find('{', object_end if found_end else object_start + 1)
                if next_start == object_start:
                    break
                object_start = next_start

            click.echo(f"🔍 Finished searching for items. Found {len(extracted_items)} potential objects.")

            if extracted_items:
                click.echo(f"✅ Successfully extracted {len(extracted_items)} valid items")
                return extracted_items
            else:
                click.echo("❌ Could not extract any valid items")
                click.echo(f"Content analysis - Length: {len(content)}")
                click.echo(f"Contains '[': { '[' in content}")
                click.echo(f"Contains '{{': {'{' in content}")
                return None

        except Exception as e:
            click.echo(f"❌ Unexpected error during parsing: {e}")
            click.echo(f"Raw response length: {len(content)} characters")
            click.echo(f"Raw response preview: {content[:500]}...")
            return None


class ResearchResult:
    """Container for research operation results."""

    def __init__(self):
        self.researched = 0
        self.added = 0
        self.duplicates = 0
        self.errors = 0

    def to_dict(self) -> Dict[str, int]:
        """Convert results to dictionary."""
        return {
            'researched': self.researched,
            'added': self.added,
            'duplicates': self.duplicates,
            'errors': self.errors
        }

    def summary(self) -> str:
        """Generate a summary string."""
        return (f"Researched: {self.researched}, "
                f"Added: {self.added}, "
                f"Duplicates: {self.duplicates}, "
                f"Errors: {self.errors}")