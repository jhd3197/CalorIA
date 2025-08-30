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
        """Generate personalized meal recommendations using multi-step AI approach."""
        try:
            # Determine if we should generate multi-day plan
            meals_per_day_str = profile.meals_per_day or '3'
            # Handle the case where meals_per_day is stored as "5+"
            if meals_per_day_str == '5+':
                meals_per_day = 5
            else:
                try:
                    meals_per_day = int(meals_per_day_str)
                except (ValueError, TypeError):
                    meals_per_day = 3
            is_multi_day_plan = meals_per_day >= 5

            # Build profile context
            profile_context = f"""
            User Profile:
            - Goal: {profile.goal or 'General health'}
            - Meals per day: {meals_per_day}
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

            # Step 1: Generate basic meal structure
            print("🍽️ Step 1: Generating basic meal structure...")
            basic_meals = self._generate_basic_meal_structure(profile, profile_context, meals_per_day, is_multi_day_plan)
            if not basic_meals:
                print("❌ Failed to generate basic meal structure")
                return None
            print(f"✅ Step 1 complete: Generated {len(basic_meals)} basic meals")

            # Step 2: Get detailed recipes for each meal
            print("🍳 Step 2: Generating detailed recipes...")
            detailed_meals = self._generate_detailed_recipes(profile, profile_context, basic_meals)
            if not detailed_meals:
                print("❌ Failed to generate detailed recipes")
                return None
            print(f"✅ Step 2 complete: Generated {len(detailed_meals)} meals with recipes")

            print("🎉 Meal generation process complete!")
            return detailed_meals

        except Exception as e:
            print(f"❌ Error generating meal recommendations: {e}")
            return None

    def _generate_basic_meal_structure(self, profile: Type.MealPrepProfile, profile_context: str,
                                     meals_per_day: int, is_multi_day_plan: bool) -> Optional[List[Dict[str, Any]]]:
        """Step 1: Generate basic meal structure using batched approach."""
        try:
            if is_multi_day_plan:
                # For multi-day plans, generate in smaller batches
                return self._generate_multi_day_meals_batched(profile, profile_context, meals_per_day)
            else:
                # For single day, generate all at once (usually small number)
                return self._generate_single_day_meals(profile, profile_context, meals_per_day)

        except Exception as e:
            print(f"❌ Error generating basic meal structure: {e}")
            return None

    def _generate_multi_day_meals_batched(self, profile: Type.MealPrepProfile, profile_context: str,
                                        meals_per_day: int) -> Optional[List[Dict[str, Any]]]:
        """Generate multi-day meal plan in small batches to avoid overwhelming the AI."""
        try:
            all_meals = []
            batch_size = 3  # Generate 3 meals at a time
            total_days = 7

            # Track meals per day and type
            meals_by_day = {day: {'Breakfast': 0, 'Lunch': 0, 'Dinner': 0, 'Snack': 0}
                          for day in range(1, total_days + 1)}

            meal_names_used = set()

            # Generate meals day by day
            for current_day in range(1, total_days + 1):
                print(f"📅 Generating meals for Day {current_day}")

                # Calculate how many meals we need for this day
                meals_needed_for_day = meals_per_day
                meals_generated_for_day = sum(meals_by_day[current_day].values())

                while meals_generated_for_day < meals_needed_for_day and len(all_meals) < (meals_per_day * total_days):
                    # Determine what types we still need for this day
                    needed_types = []
                    if meals_by_day[current_day]['Breakfast'] == 0:
                        needed_types.append('Breakfast')
                    if meals_by_day[current_day]['Lunch'] == 0:
                        needed_types.append('Lunch')
                    if meals_by_day[current_day]['Dinner'] == 0:
                        needed_types.append('Dinner')
                    if meals_by_day[current_day]['Snack'] < (meals_per_day - 3) and meals_per_day > 3:
                        needed_types.append('Snack')

                    if not needed_types:
                        break

                    # Limit batch size to what's actually needed
                    actual_batch_size = min(len(needed_types), batch_size, meals_needed_for_day - meals_generated_for_day)

                    print(f"🤖 Day {current_day}: Need {needed_types}, generating {actual_batch_size} meals")

                    # Generate batch for this specific day
                    batch = self._generate_meal_batch(
                        profile, profile_context, actual_batch_size,
                        needed_types, meal_names_used, current_day
                    )

                    if batch:
                        all_meals.extend(batch)
                        # Update tracking for this day
                        for meal in batch:
                            meal_type = meal.get('meal_type', 'General')
                            if meal_type in meals_by_day[current_day]:
                                meals_by_day[current_day][meal_type] += 1
                            meal_names_used.add(meal['name'].lower())

                        meals_generated_for_day = sum(meals_by_day[current_day].values())
                        print(f"✅ Day {current_day}: Generated {len(batch)} meals, total for day: {meals_generated_for_day}")
                    else:
                        print(f"⚠️ Failed to generate batch for day {current_day}, skipping...")
                        break

            print(f"🎉 Completed meal generation: {len(all_meals)} total meals across {total_days} days")
            return all_meals

        except Exception as e:
            print(f"❌ Error generating multi-day meals in batches: {e}")
            return None

    def _generate_meal_batch(self, profile: Type.MealPrepProfile, profile_context: str,
                           batch_size: int, needed_types: List[str], used_names: set,
                           current_day: int) -> Optional[List[Dict[str, Any]]]:
        """Generate a small batch of meals."""
        try:
            types_str = ", ".join(needed_types)
            used_names_str = ", ".join(list(used_names)[:10]) if used_names else "None"

            # Simplified prompt for better compatibility with different AI models
            prompt = f"""Generate {batch_size} meal recommendations for Day {current_day}.
Focus on these meal types: {types_str}
Do NOT use these meal names: {used_names_str}

Return ONLY a JSON array in this exact format:
[
  {{
    "name": "Meal Name",
    "meal_type": "Breakfast",
    "day": {current_day},
    "calories": 300,
    "protein": 20,
    "carbs": 30,
    "fat": 10,
    "prepTime": 15,
    "difficulty": "Easy",
    "servings": 1,
    "tags": ["Healthy", "Quick"]
  }}
]

IMPORTANT: Return ONLY the JSON array, no other text or explanation."""

            print(f"🤖 Generating batch for day {current_day}, types: {types_str}")
            response = self.query_ai(prompt)
            if not response:
                print(f"❌ No response from AI for day {current_day}")
                return None

            print(f"📄 AI Response length: {len(response)} chars")
            print(f"📄 AI Response preview: {response[:200]}...")

            batch = self._parse_simple_json_response(response, f"meal batch for day {current_day}")
            if isinstance(batch, list) and len(batch) > 0:
                print(f"✅ Successfully parsed {len(batch)} meals for day {current_day}")
                # Ensure all meals have the correct day
                for meal in batch:
                    if 'day' not in meal:
                        meal['day'] = current_day
                return batch
            else:
                print(f"❌ Failed to parse valid meal batch for day {current_day}, trying fallback...")

                # Try fallback with simpler prompt
                fallback_batch = self._generate_meal_batch_fallback(profile, profile_context, batch_size, needed_types, current_day)
                if fallback_batch:
                    print(f"✅ Fallback successful for day {current_day}")
                    return fallback_batch

                print(f"❌ All parsing attempts failed for day {current_day}")
                return None

        except Exception as e:
            print(f"❌ Error generating meal batch for day {current_day}: {e}")
            return None

    def _generate_meal_batch_fallback(self, profile: Type.MealPrepProfile, profile_context: str,
                                    batch_size: int, needed_types: List[str],
                                    current_day: int) -> Optional[List[Dict[str, Any]]]:
        """Fallback method for generating meal batches with simpler prompts."""
        try:
            # Use the first needed type for simplicity
            primary_type = needed_types[0] if needed_types else "General"

            # Ultra-simple prompt for better compatibility
            prompt = f"""Create {batch_size} {primary_type} meal for day {current_day}.

Format: name|calories|protein|carbs|fat|prepTime|difficulty|tags

Example: Chicken Salad|350|35|15|18|20|Easy|High Protein,Quick,Healthy

Return only the meals, one per line."""

            print(f"🔄 Trying fallback prompt for day {current_day}")
            response = self.query_ai(prompt)
            if not response:
                return None

            print(f"📄 Fallback response: {response[:200]}...")

            # Parse the simple format
            meals = []
            lines = response.strip().split('\n')

            for line in lines[:batch_size]:  # Limit to requested batch size
                line = line.strip()
                if '|' in line and len(line.split('|')) >= 8:
                    parts = line.split('|')
                    if len(parts) >= 8:
                        try:
                            meal = {
                                "name": parts[0].strip(),
                                "meal_type": primary_type,
                                "day": current_day,
                                "calories": int(parts[1].strip()),
                                "protein": int(parts[2].strip()),
                                "carbs": int(parts[3].strip()),
                                "fat": int(parts[4].strip()),
                                "prepTime": int(parts[5].strip()),
                                "difficulty": parts[6].strip(),
                                "servings": 1,
                                "tags": [tag.strip() for tag in parts[7].split(',') if tag.strip()]
                            }
                            meals.append(meal)
                        except (ValueError, IndexError) as e:
                            print(f"⚠️ Failed to parse fallback meal line: {line} - {e}")
                            continue

            if meals:
                print(f"✅ Fallback generated {len(meals)} meals for day {current_day}")
                return meals
            else:
                print(f"❌ Fallback failed to generate valid meals for day {current_day}")
                return None

        except Exception as e:
            print(f"❌ Error in fallback meal generation for day {current_day}: {e}")
            return None

    def _generate_single_day_meals(self, profile: Type.MealPrepProfile, profile_context: str,
                                 meals_per_day: int) -> Optional[List[Dict[str, Any]]]:
        """Generate meals for a single day."""
        try:
            prompt = f"""
            {profile_context}

            Generate {meals_per_day} meal recommendations for a single day.

            Return ONLY a JSON array:
            [
                {{
                    "name": "Grilled Chicken Salad",
                    "calories": 350,
                    "protein": 35,
                    "carbs": 15,
                    "fat": 18,
                    "prepTime": 20,
                    "difficulty": "Easy",
                    "servings": 1,
                    "tags": ["High Protein", "Quick", "Healthy"]
                }}
            ]

            IMPORTANT: Return ONLY the JSON array, no additional text or formatting.
            """

            response = self.query_ai(prompt)
            if not response:
                return None

            return self._parse_simple_json_response(response, "single day meals")

        except Exception as e:
            print(f"❌ Error generating single day meals: {e}")
            return None

    def _generate_detailed_recipes(self, profile: Type.MealPrepProfile, profile_context: str,
                                 basic_meals: List[Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
        """Step 2: Generate detailed recipes for each basic meal."""
        try:
            print(f"🍳 Starting detailed recipe generation for {len(basic_meals)} meals")
            detailed_meals = []

            for i, meal in enumerate(basic_meals):
                meal_name = meal.get('name', 'Unknown')
                print(f"📝 Generating recipe {i+1}/{len(basic_meals)}: {meal_name}")

                # Generate detailed recipe for this specific meal
                recipe_details = self._generate_single_recipe(profile, profile_context, meal)
                if recipe_details:
                    # Merge basic meal info with detailed recipe
                    detailed_meal = {**meal, **recipe_details}
                    detailed_meals.append(detailed_meal)
                    print(f"✅ Recipe generated for: {meal_name}")
                else:
                    # If detailed recipe fails, use basic meal with empty recipe fields
                    detailed_meal = {
                        **meal,
                        "ingredients": [],
                        "instructions": []
                    }
                    detailed_meals.append(detailed_meal)
                    print(f"⚠️ Recipe generation failed for: {meal_name}, using basic info only")

            print(f"🎉 Completed recipe generation: {len(detailed_meals)} meals with recipes")
            return detailed_meals

        except Exception as e:
            print(f"❌ Error generating detailed recipes: {e}")
            import traceback
            print(f"❌ Full traceback: {traceback.format_exc()}")
            return None

    def _generate_single_recipe(self, profile: Type.MealPrepProfile, profile_context: str,
                              meal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate detailed recipe for a single meal."""
        try:
            prompt = f"""
            {profile_context}

            Generate detailed recipe information for this specific meal:
            Meal: {meal['name']}
            Type: {meal.get('meal_type', 'General')}
            Target calories: {meal.get('calories', 'Not specified')}

            Return ONLY a JSON object with recipe details:
            {{
                "ingredients": [
                    {{"name": "Chicken breast", "quantity": "6 oz"}},
                    {{"name": "Mixed greens", "quantity": "2 cups"}}
                ],
                "instructions": [
                    "Grill chicken for 10 minutes",
                    "Toss with greens and tomatoes"
                ]
            }}

            IMPORTANT: Return ONLY the JSON object, no additional text or formatting.
            """

            response = self.query_ai(prompt)
            if not response:
                return None

            recipe_data = self._parse_simple_json_response(response, f"recipe for {meal['name']}")
            return recipe_data if isinstance(recipe_data, dict) else None

        except Exception as e:
            print(f"❌ Error generating recipe for {meal['name']}: {e}")
            return None

    def _parse_simple_json_response(self, response: str, context: str = "response") -> Optional[Any]:
        """Parse a simple JSON response with improved error handling."""
        try:
            # Clean the response
            response = response.strip()

            # Remove markdown formatting
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]

            response = response.strip()

            # Try to parse as JSON
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                # Try to extract JSON from the response
                json_patterns = [
                    r'\[.*\]',  # Array pattern first (more common for our use case)
                    r'\{.*\}',  # Object pattern
                ]

                for pattern in json_patterns:
                    json_match = re.search(pattern, response, re.DOTALL)
                    if json_match:
                        json_str = json_match.group()
                        # Clean up common issues
                        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)  # Remove trailing commas
                        json_str = re.sub(r',\s*}', '}', json_str)  # Remove trailing commas before closing brace
                        json_str = re.sub(r',\s*]', ']', json_str)  # Remove trailing commas before closing bracket

                        try:
                            return json.loads(json_str)
                        except json.JSONDecodeError as e:
                            print(f"⚠️ JSON parsing attempt failed for {context}: {e}")
                            print(f"Attempted to parse: {json_str[:200]}...")
                            continue

                print(f"❌ Could not parse JSON for {context}")
                print(f"Response: {response[:500]}...")

                # Try AI-assisted JSON repair as last resort
                print(f"🔧 Attempting AI-assisted JSON repair for {context}...")
                repaired_json = self._repair_json_with_ai(response, context)
                if repaired_json:
                    print(f"✅ AI-assisted JSON repair successful for {context}")
                    return repaired_json

                return None

        except Exception as e:
            print(f"❌ Error parsing {context}: {e}")
            return None

    def _repair_json_with_ai(self, malformed_response: str, context: str = "response") -> Optional[Any]:
        """Use AI to repair malformed JSON responses."""
        try:
            # Limit the response length to avoid token limits
            truncated_response = malformed_response[:2000] if len(malformed_response) > 2000 else malformed_response

            prompt = f"""
            I have a malformed JSON response that needs to be fixed. Please parse and correct this JSON:

            Malformed Response:
            {truncated_response}

            Instructions:
            1. Extract the valid JSON structure from the response
            2. Fix any syntax errors (missing commas, quotes, brackets, etc.)
            3. Ensure the JSON is valid and complete
            4. Return ONLY the corrected JSON, no additional text or explanation

            The response should be either:
            - A valid JSON array [...] if it's a list of items
            - A valid JSON object {{...}} if it's a single object

            IMPORTANT: Return ONLY the JSON, nothing else.
            """

            repair_response = self.query_ai(prompt)
            if not repair_response:
                print(f"❌ AI repair failed for {context} - no response from AI")
                return None

            # Clean the repair response
            repair_response = repair_response.strip()
            if repair_response.startswith('```json'):
                repair_response = repair_response[7:]
            if repair_response.startswith('```'):
                repair_response = repair_response[3:]
            if repair_response.endswith('```'):
                repair_response = repair_response[:-3]
            repair_response = repair_response.strip()

            # Try to parse the repaired JSON
            try:
                return json.loads(repair_response)
            except json.JSONDecodeError as e:
                print(f"❌ AI repair failed for {context} - repaired JSON still invalid: {e}")
                print(f"Repaired response: {repair_response[:300]}...")
                return None

        except Exception as e:
            print(f"❌ Error during AI JSON repair for {context}: {e}")
            return None

    def generate_basic_meals(self, profile_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Generate only the basic meal structure (no recipes)."""
        try:
            print("🍽️ Generating basic meal structure...")

            # Get the meal prep profile
            profile = self.get_meal_prep_profile_by_id(profile_id)
            if not profile:
                return None

            # Determine if we should generate multi-day plan
            meals_per_day_str = profile.meals_per_day or '3'
            if meals_per_day_str == '5+':
                meals_per_day = 5
            else:
                try:
                    meals_per_day = int(meals_per_day_str)
                except (ValueError, TypeError):
                    meals_per_day = 3
            is_multi_day_plan = meals_per_day >= 5

            # Build profile context
            profile_context = f"""
            User Profile:
            - Goal: {profile.goal or 'General health'}
            - Meals per day: {meals_per_day}
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

            # Generate basic meal structure
            basic_meals = self._generate_basic_meal_structure(profile, profile_context, meals_per_day, is_multi_day_plan)
            if not basic_meals:
                return None

            print(f"✅ Basic meal generation complete: {len(basic_meals)} meals")

            # Create response record
            request_data = {
                "profile_id": str(profile_id),
                "basic_meals_only": True,
                "meals_count": len(basic_meals)
            }

            ai_response = json.dumps(basic_meals)
            record = self.create_ai_response_record(
                user_id=user_id,
                profile_id=profile_id,
                request_type="basic_meals",
                request_data=request_data,
                ai_response=ai_response
            )

            return {
                "meals": basic_meals,
                "record_id": str(record.id) if record else None,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "step": "basic_meals",
                "total_meals": len(basic_meals)
            }

        except Exception as e:
            print(f"❌ Error generating basic meals: {e}")
            return None

    def generate_recipes_for_meals(self, profile_id: UUID, user_id: UUID, meals_data: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Generate detailed recipes for existing meals."""
        try:
            print(f"🍳 Generating recipes for {len(meals_data)} meals...")

            # Get the meal prep profile
            profile = self.get_meal_prep_profile_by_id(profile_id)
            if not profile:
                return None

            # Build profile context
            profile_context = f"""
            User Profile:
            - Goal: {profile.goal or 'General health'}
            - Dietary preference: {profile.dietary_preference or 'Balanced'}
            - Allergies: {', '.join(profile.allergies) if profile.allergies else 'None'}
            - Intolerances: {', '.join(profile.intolerances) if profile.intolerances else 'None'}
            - Excluded ingredients: {', '.join(profile.excluded_ingredients) if profile.excluded_ingredients else 'None'}
            - Cooking time preference: {profile.cooking_time or 'Moderate'}
            - Skill level: {profile.skill_level or 'Intermediate'}
            """

            # Generate detailed recipes
            detailed_meals = self._generate_detailed_recipes(profile, profile_context, meals_data)
            if not detailed_meals:
                return None

            print(f"✅ Recipe generation complete: {len(detailed_meals)} meals with recipes")

            # Create response record
            request_data = {
                "profile_id": str(profile_id),
                "recipes_only": True,
                "meals_count": len(detailed_meals)
            }

            ai_response = json.dumps(detailed_meals)
            record = self.create_ai_response_record(
                user_id=user_id,
                profile_id=profile_id,
                request_type="meal_recipes",
                request_data=request_data,
                ai_response=ai_response
            )

            return {
                "meals": detailed_meals,
                "record_id": str(record.id) if record else None,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "step": "recipes",
                "total_meals": len(detailed_meals)
            }

        except Exception as e:
            print(f"❌ Error generating recipes for meals: {e}")
            return None

    def generate_shopping_list_for_meals(self, profile_id: UUID, user_id: UUID, meals_data: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Generate shopping list for existing meals."""
        try:
            print(f"🛒 Generating shopping list for {len(meals_data)} meals...")

            # Get the meal prep profile
            profile = self.get_meal_prep_profile_by_id(profile_id)
            if not profile:
                return None

            # Generate shopping list
            shopping_list = self.generate_shopping_list(profile, meals_data)
            if not shopping_list:
                return None

            print(f"✅ Shopping list generation complete: {len(shopping_list)} categories")

            # Create response record
            request_data = {
                "profile_id": str(profile_id),
                "shopping_list_only": True,
                "meals_count": len(meals_data),
                "budget": profile.weekly_budget
            }

            ai_response = json.dumps(shopping_list)
            record = self.create_ai_response_record(
                user_id=user_id,
                profile_id=profile_id,
                request_type="shopping_list",
                request_data=request_data,
                ai_response=ai_response
            )

            return {
                "shopping_list": shopping_list,
                "record_id": str(record.id) if record else None,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "step": "shopping_list",
                "total_categories": len(shopping_list),
                "budget_optimized": profile.weekly_budget is not None
            }

        except Exception as e:
            print(f"❌ Error generating shopping list for meals: {e}")
            return None

    def generate_shopping_list(self, profile: Type.MealPrepProfile, meals: List[Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
        """Generate a shopping list based on recommended meals and user profile."""
        try:
            # Check if this is a multi-day plan
            is_multi_day_plan = any('day' in meal for meal in meals)

            if is_multi_day_plan:
                # Group meals by day and type for multi-day plan
                days_meals = {}
                for meal in meals:
                    day = meal.get('day', 1)
                    meal_type = meal.get('meal_type', 'General')
                    if day not in days_meals:
                        days_meals[day] = {}
                    if meal_type not in days_meals[day]:
                        days_meals[day][meal_type] = []
                    days_meals[day][meal_type].append(meal['name'])

                meals_context = "7-Day Meal Plan:\n"
                for day in range(1, 8):
                    if day in days_meals:
                        meals_context += f"Day {day}:\n"
                        for meal_type, meal_names in days_meals[day].items():
                            meals_context += f"  {meal_type}: {', '.join(meal_names)}\n"
                        meals_context += "\n"
            else:
                # Single day meal list (existing logic)
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
            For each category, list specific items with quantities that would be needed for {'7 days' if is_multi_day_plan else '3-4 days'} of meal prep.

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

            # Use the improved JSON parsing method
            shopping_list = self._parse_simple_json_response(response, "shopping list")
            return shopping_list if isinstance(shopping_list, list) else None

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