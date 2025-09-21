import json
import uuid
from datetime import datetime
from prompture import extract_and_jsonify
from prompture.drivers import get_driver

# 1. Instantiate the driver
# Ollama driver usually works out-of-the-box if Ollama is running locally
# You may need to set OLLAMA_HOST environment variable if Ollama is running on a different host
ollama_driver = get_driver("ollama")

# 2. Create a sample user profile
user_profile = {
    "id": str(uuid.uuid4()),
    "goal": "Weight loss",
    "meals_per_day": "3",
    "dietary_preference": "Balanced",
    "allergies": ["Peanuts", "Shellfish"],
    "intolerances": ["Lactose"],
    "excluded_ingredients": ["Cilantro", "Beets"],
    "loved_meals": ["Grilled chicken", "Salmon", "Stir fry"],
    "hated_meals": ["Lima beans", "Liver"],
    "cooking_time": "Moderate",
    "skill_level": "Intermediate",
    "weekly_budget": "150",
    "target_calories": "2000",
    "macro_preference": {
        "protein": 150,
        "fat": 70,
        "carbs": 200
    }
}

# 3. Determine meals per day and if multi-day plan
meals_per_day_str = user_profile.get("meals_per_day", "3")
if meals_per_day_str == '5+':
    meals_per_day = 5
else:
    try:
        meals_per_day = int(meals_per_day_str)
    except (ValueError, TypeError):
        meals_per_day = 3
is_multi_day_plan = meals_per_day >= 5

# 4. Build profile context
profile_context = f"""
User Profile:
- Goal: {user_profile.get('goal', 'General health')}
- Meals per day: {meals_per_day}
- Dietary preference: {user_profile.get('dietary_preference', 'Balanced')}
- Allergies: {', '.join(user_profile.get('allergies', [])) or 'None'}
- Intolerances: {', '.join(user_profile.get('intolerances', [])) or 'None'}
- Excluded ingredients: {', '.join(user_profile.get('excluded_ingredients', [])) or 'None'}
- Loved meals: {', '.join(user_profile.get('loved_meals', [])) or 'Not specified'}
- Hated meals: {', '.join(user_profile.get('hated_meals', [])) or 'Not specified'}
- Cooking time preference: {user_profile.get('cooking_time', 'Moderate')}
- Skill level: {user_profile.get('skill_level', 'Intermediate')}
- Weekly budget: ${user_profile.get('weekly_budget', 'Not specified')}
- Target calories: {user_profile.get('target_calories', 'Not specified')}
- Macro preferences: {user_profile.get('macro_preference', {}).get('protein', 0)}g protein, 
                    {user_profile.get('macro_preference', {}).get('fat', 0)}g fat, 
                    {user_profile.get('macro_preference', {}).get('carbs', 0)}g carbs
"""

# 5. Define JSON schema for meal plans
meal_plan_schema = {
    "type": "object",
    "properties": {
        "meals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "type": {"type": "string", "enum": ["Breakfast", "Lunch", "Dinner", "Snack"]},
                    "description": {"type": "string"},
                    "estimated_calories": {"type": "number"},
                    "estimated_macros": {
                        "type": "object",
                        "properties": {
                            "protein": {"type": "number"},
                            "carbs": {"type": "number"},
                            "fat": {"type": "number"}
                        }
                    },
                    "main_ingredients": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "suitable_for_goals": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "cooking_time_minutes": {"type": "number"},
                    "day": {"type": "integer"}
                },
                "required": ["name", "type", "description", "estimated_calories", "main_ingredients", "day"]
            }
        },
        "total_meals": {"type": "integer"},
        "generated_at": {"type": "string", "format": "date-time"},
        "step": {"type": "string"},
        "is_multi_day_plan": {"type": "boolean"}
    },
    "required": ["meals", "total_meals", "generated_at", "step"]
}

# 6. Create prompt for meal plan generation
prompt = f"""
Please create a meal plan based on the following user profile:

{profile_context}

The meal plan should consist of {meals_per_day} meals per day for {1 if not is_multi_day_plan else 3} day(s).
Each meal should include a name, type (breakfast, lunch, dinner, snack), description, estimated calories,
main ingredients, cooking time, and which day it's for.

Please take into account all dietary preferences, allergies, intolerances, and excluded ingredients.
Structure your response as a JSON object with the schema provided.
"""

# 7. Call extract_and_jsonify with default instruction
print("Generating meal plan with default instruction...")
result = extract_and_jsonify(
    driver=ollama_driver,
    text=prompt,
    json_schema=meal_plan_schema
)

# 8. Extract JSON output and usage metadata
json_output = result["json_string"]
json_object = result["json_object"]
usage = result["usage"]

# 9. Print and validate the output
print("\nRaw JSON output from model:")
print(json_output)

print("\nSuccessfully parsed meal plan:")
print(json.dumps(json_object, indent=2))

# 10. Display token usage information
print("\n=== TOKEN USAGE STATISTICS ===")
print(f"Prompt tokens: {usage['prompt_tokens']}")
print(f"Completion tokens: {usage['completion_tokens']}")
print(f"Total tokens: {usage['total_tokens']}")
print(f"Model name: {usage.get('model_name', 'N/A')}")

# 11. Example with custom instruction template
print("\n\n=== SECOND EXAMPLE - CUSTOM INSTRUCTION TEMPLATE ===")
print("Generating meal plan with custom instruction...")
custom_result = extract_and_jsonify(
    driver=ollama_driver,
    text=prompt,
    json_schema=meal_plan_schema,
    instruction_template="Create a personalized meal plan based on this user information:"
)

# 12. Extract JSON output and usage metadata for custom example
custom_json_output = custom_result["json_string"]
custom_json_object = custom_result["json_object"]
custom_usage = custom_result["usage"]

print("\nRaw JSON output with custom instruction:")
print(custom_json_output)

print("\nSuccessfully parsed meal plan (custom instruction):")
print(json.dumps(custom_json_object, indent=2))

print("\n=== TOKEN USAGE STATISTICS (Custom Template) ===")
print(f"Prompt tokens: {custom_usage['prompt_tokens']}")
print(f"Completion tokens: {custom_usage['completion_tokens']}")
print(f"Total tokens: {custom_usage['total_tokens']}")
print(f"Model name: {custom_usage.get('model_name', 'N/A')}")