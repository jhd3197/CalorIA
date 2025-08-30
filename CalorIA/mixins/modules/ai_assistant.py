#!/usr/bin/env python3
"""
CalorIA AI Assistant Module
Provides AI-powered functionality for meal planning and recommendations.
"""

import os
import json
import re
import requests
from typing import List, Dict, Optional, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone

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

from ... import types as Type
from ..mongo import MongoMixin


class AIAssistantMixin:
    """Mixin class that provides AI-powered meal planning functionality."""

    def __init__(self, **kwargs):
        # Initialize AI configuration
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
                print("⚠️  OpenAI not properly configured.")
                if not OPENAI_AVAILABLE:
                    print("⚠️  OpenAI package not installed. Install with: pip install openai")
                if not self.openai_api_key:
                    print("⚠️  OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
        elif self.ai_provider == 'ollama':
            if not REQUESTS_AVAILABLE:
                print("⚠️  Requests package not installed. Install with: pip install requests")

        super().__init__(**kwargs)

    def _query_openai(self, prompt: str, model: Optional[str] = None) -> Optional[str]:
        """Query OpenAI for AI assistance."""
        try:
            model_to_use = model or self.openai_model
            response = openai.ChatCompletion.create(
                model=model_to_use,
                messages=[
                    {"role": "system", "content": "You are a helpful AI assistant specializing in nutrition, meal planning, and healthy cooking. Provide structured, practical advice."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )

            content = response.choices[0].message.content.strip()
            return content

        except Exception as e:
            print(f"❌ OpenAI API error: {e}")
            return None

    def _query_ollama(self, prompt: str, model: Optional[str] = None) -> Optional[str]:
        """Query Ollama for AI assistance."""
        try:
            model_to_use = model or self.ollama_model

            # Prepare the request payload for Ollama
            system_prompt = "You are a helpful AI assistant specializing in nutrition, meal planning, and healthy cooking. Provide structured, practical advice."

            full_prompt = f"{system_prompt}\n\n{prompt}"

            payload = {
                "model": model_to_use,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_predict": 1500
                }
            }

            # Make the request to Ollama
            response = requests.post(
                f"{self.ollama_base_url}/api/generate",
                json=payload,
                timeout=120
            )

            if response.status_code != 200:
                print(f"❌ Ollama API error: {response.status_code} - {response.text}")
                return None

            result = response.json()
            content = result.get('response', '').strip()

            return content

        except requests.exceptions.RequestException as e:
            print(f"❌ Ollama request error: {e}")
            return None
        except Exception as e:
            print(f"❌ Ollama API error: {e}")
            return None

    def query_ai(self, prompt: str, model: Optional[str] = None) -> Optional[str]:
        """Query AI provider for assistance."""
        try:
            if self.ai_provider == 'openai':
                if OPENAI_AVAILABLE and self.openai_api_key:
                    return self._query_openai(prompt, model)
                else:
                    print(f"❌ OpenAI not properly configured")
                    return None
            elif self.ai_provider == 'ollama':
                if REQUESTS_AVAILABLE:
                    return self._query_ollama(prompt, model)
                else:
                    print(f"❌ Requests package not available for Ollama")
                    return None
            else:
                print(f"❌ Unsupported AI provider '{self.ai_provider}'. Supported: openai, ollama")
                return None

        except Exception as e:
            print(f"❌ Error querying AI: {e}")
            return None

    def generate_meal_recommendations(self, profile: Type.MealPrepProfile, num_meals: int = 3) -> Optional[List[Dict[str, Any]]]:
        """Generate personalized meal recommendations based on user profile."""
        try:
            # Build profile context
            profile_context = f"""
            User Profile:
            - Goal: {profile.goal or 'General health'}
            - Meals per day: {profile.meals_per_day or '3'}
            - Dietary preference: {profile.dietary_preference or 'Balanced'}
            - Allergies: {', '.join(profile.allergies) if profile.allergies else 'None'}
            - Intolerances: {', '.join(profile.intolerances) if profile.intolerances else 'None'}
            - Excluded ingredients: {', '.join(profile.excluded_ingredients) if profile.excluded_ingredients else 'None'}
            - Loved meals: {', '.join(profile.loved_meals) if profile.loved_meals else 'Not specified'}
            - Hated meals: {', '.join(profile.hated_meals) if profile.hated_meals else 'Not specified'}
            - Cooking time preference: {profile.cooking_time or 'Moderate'}
            - Skill level: {profile.skill_level or 'Intermediate'}
            - Weekly budget: ${profile.weekly_budget or 'Not specified'}
            - Target calories: {profile.target_calories or 'Not specified'}
            - Macro preferences: {profile.macro_preference.protein}g protein, {profile.macro_preference.fat}g fat, {profile.macro_preference.carbs}g carbs
            """

            prompt = f"""
            Based on this user's meal prep profile, generate {num_meals} personalized meal recommendations.
            Each meal should be practical, nutritious, and aligned with their preferences and constraints.

            {profile_context}

            For each meal recommendation, provide:
            1. Meal name
            2. Estimated calories
            3. Macronutrient breakdown (protein, carbs, fat in grams)
            4. Preparation time in minutes
            5. Difficulty level (Easy, Medium, Hard)
            6. 2-3 relevant tags (e.g., "High Protein", "Quick", "Vegetarian")

            Format the response as a JSON array of meal objects.
            Example format:
            [
                {{
                    "name": "Grilled Chicken Salad",
                    "calories": 350,
                    "protein": 35,
                    "carbs": 15,
                    "fat": 18,
                    "prepTime": 20,
                    "difficulty": "Easy",
                    "tags": ["High Protein", "Quick", "Healthy"]
                }}
            ]

            Ensure meals are varied, nutritionally balanced, and respect all dietary restrictions.
            """

            response = self.query_ai(prompt)
            if not response:
                return None

            # Try to parse JSON response
            try:
                # Clean the response to extract JSON
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    meals = json.loads(json_str)
                    return meals
                else:
                    print("❌ Could not find JSON array in AI response")
                    return None
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse AI response as JSON: {e}")
                return None

        except Exception as e:
            print(f"❌ Error generating meal recommendations: {e}")
            return None

    def generate_shopping_list(self, profile: Type.MealPrepProfile, meals: List[Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
        """Generate a shopping list based on recommended meals and user profile."""
        try:
            meals_context = "\n".join([f"- {meal['name']}" for meal in meals])

            prompt = f"""
            Based on these recommended meals and the user's profile, generate a comprehensive shopping list.

            Recommended Meals:
            {meals_context}

            User Profile:
            - Weekly budget: ${profile.weekly_budget or 'Not specified'}
            - Dietary preferences: {profile.dietary_preference or 'Balanced'}
            - Excluded ingredients: {', '.join(profile.excluded_ingredients) if profile.excluded_ingredients else 'None'}

            Organize the shopping list by categories (Proteins, Vegetables, Grains, Dairy, Pantry, etc.).
            For each category, list specific items with quantities that would be needed for 3-4 days of meal prep.

            Consider the user's budget and suggest cost-effective options where appropriate.
            Respect all dietary restrictions and preferences.

            Format the response as a JSON array of category objects.
            Example format:
            [
                {{
                    "category": "Proteins",
                    "items": ["Chicken breast (1.5 lbs)", "Salmon fillets (0.75 lbs)", "Greek yogurt (32 oz)"]
                }},
                {{
                    "category": "Vegetables",
                    "items": ["Broccoli (2 heads)", "Bell peppers (4)", "Spinach (10 oz)"]
                }}
            ]
            """

            response = self.query_ai(prompt)
            if not response:
                return None

            # Try to parse JSON response
            try:
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    shopping_list = json.loads(json_str)
                    return shopping_list
                else:
                    print("❌ Could not find JSON array in shopping list response")
                    return None
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse shopping list response as JSON: {e}")
                return None

        except Exception as e:
            print(f"❌ Error generating shopping list: {e}")
            return None

    def create_ai_response_record(self, user_id: UUID, profile_id: UUID, request_type: str,
                                request_data: Dict[str, Any], ai_response: str) -> Optional[Type.AIResponse]:
        """Create a record of AI interaction for tracking and analytics."""
        try:
            # Create AI response record
            ai_record = Type.AIResponse(
                user_id=user_id,
                profile_id=profile_id,
                response_type=Type.AIResponseType(request_type),
                request_data=request_data,
                ai_response=ai_response,
                ai_provider=self.ai_provider
            )

            # Store in database
            result = self.create_document("ai_responses", ai_record)
            if result:
                print(f"✅ AI response saved with ID: {ai_record.id}")
                return ai_record
            else:
                print("❌ Failed to save AI response to database")
                return None

        except Exception as e:
            print(f"❌ Error creating AI response record: {e}")
            return None

    def get_ai_response_history(self, user_id: UUID, profile_id: Optional[UUID] = None,
                              limit: int = 10) -> List[Type.AIResponse]:
        """Get AI response history for a user."""
        try:
            # Build query
            query = {"user_id": str(user_id), "is_active": True}
            if profile_id:
                query["profile_id"] = str(profile_id)

            # Query database for AI response records
            responses = []
            db = self.get_db_connection()
            if db is not None:
                collection = db["ai_responses"]
                cursor = collection.find(query).sort("created_at", -1).limit(limit)

                for doc in cursor:
                    try:
                        # Remove MongoDB _id field
                        if '_id' in doc:
                            del doc['_id']
                        # Convert to AIResponse model
                        response = Type.AIResponse.from_dict(doc)
                        responses.append(response)
                    except Exception as e:
                        print(f"❌ Error parsing AI response document: {e}")
                        continue

            return responses

        except Exception as e:
            print(f"❌ Error getting AI response history: {e}")
            return []

    def get_latest_ai_responses(self, profile_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """Get the latest AI responses for a profile to restore state on page load."""
        try:
            # Build query
            query = {
                "profile_id": str(profile_id),
                "user_id": str(user_id),
                "is_active": True
            }

            # Query database for latest responses of each type
            latest_responses = {}
            db = self.get_db_connection()
            if db is not None:
                collection = db["ai_responses"]

                # Get latest meal recommendations
                meal_rec_doc = collection.find_one(
                    {**query, "response_type": "meal_recommendations"},
                    sort=[("created_at", -1)]
                )
                if meal_rec_doc and '_id' in meal_rec_doc:
                    del meal_rec_doc['_id']
                    latest_responses["meal_recommendations"] = Type.AIResponse.from_dict(meal_rec_doc)

                # Get latest shopping list
                shopping_doc = collection.find_one(
                    {**query, "response_type": "shopping_list"},
                    sort=[("created_at", -1)]
                )
                if shopping_doc and '_id' in shopping_doc:
                    del shopping_doc['_id']
                    latest_responses["shopping_list"] = Type.AIResponse.from_dict(shopping_doc)

                # Get latest AI insights
                insights_doc = collection.find_one(
                    {**query, "response_type": "ai_insights"},
                    sort=[("created_at", -1)]
                )
                if insights_doc and '_id' in insights_doc:
                    del insights_doc['_id']
                    latest_responses["ai_insights"] = Type.AIResponse.from_dict(insights_doc)

            return latest_responses

        except Exception as e:
            print(f"❌ Error getting latest AI responses: {e}")
            return {}