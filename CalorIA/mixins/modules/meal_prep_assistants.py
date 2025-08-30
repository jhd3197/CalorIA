#!/usr/bin/env python3
"""
CalorIA Meal Prep AI Assistants
Specialized AI functionality for meal planning and preparation assistance.
"""

import json
import re
from typing import List, Dict, Optional, Any
from uuid import UUID
from datetime import datetime, timezone

from ... import types as Type


class MealPrepAssistantMixin:
    """Specialized mixin for meal prep AI assistance functionality."""

    def get_meal_recommendations(self, profile_id: UUID, user_id: UUID, num_meals: int = 3) -> Optional[Dict[str, Any]]:
        """Get AI-powered meal recommendations for a specific profile."""
        try:
            # Get the meal prep profile
            profile = self.get_meal_prep_profile_by_id(profile_id)
            if not profile:
                return None

            # Generate recommendations using AI
            recommendations = self.generate_meal_recommendations(profile, num_meals)
            if not recommendations:
                return None

            # Create response record
            request_data = {
                "profile_id": str(profile_id),
                "num_meals": num_meals,
                "profile_name": profile.profile_name
            }

            ai_response = json.dumps(recommendations)
            record = self.create_ai_response_record(
                user_id=user_id,
                profile_id=profile_id,
                request_type="meal_recommendations",
                request_data=request_data,
                ai_response=ai_response
            )

            return {
                "recommendations": recommendations,
                "record_id": str(record.id) if record else None,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            print(f"❌ Error getting meal recommendations: {e}")
            return None

    def get_shopping_list(self, profile_id: UUID, user_id: UUID, meals_data: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
        """Get AI-generated shopping list for a specific profile."""
        try:
            # Get the meal prep profile
            profile = self.get_meal_prep_profile_by_id(profile_id)
            if not profile:
                return None

            # If no meals data provided, generate recommendations first
            if not meals_data:
                recommendations = self.generate_meal_recommendations(profile, 3)
                if not recommendations:
                    return None
                meals_data = recommendations

            # Generate shopping list
            shopping_list = self.generate_shopping_list(profile, meals_data)
            if not shopping_list:
                return None

            # Create response record
            request_data = {
                "profile_id": str(profile_id),
                "meals_count": len(meals_data) if meals_data else 0,
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
                "budget_optimized": profile.weekly_budget is not None,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            print(f"❌ Error getting shopping list: {e}")
            return None

    def get_meal_plan_overview(self, profile_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get a comprehensive meal plan overview with recommendations and shopping list."""
        try:
            # Get the meal prep profile
            profile = self.get_meal_prep_profile_by_id(profile_id)
            if not profile:
                return None

            # Generate meal recommendations
            recommendations = self.generate_meal_recommendations(profile, 4)
            if not recommendations:
                return None

            # Generate shopping list based on recommendations
            shopping_list = self.generate_shopping_list(profile, recommendations)

            # Create comprehensive response
            meal_plan = {
                "profile": {
                    "id": str(profile.id),
                    "name": profile.profile_name,
                    "goal": profile.goal,
                    "meals_per_day": profile.meals_per_day,
                    "budget": profile.weekly_budget
                },
                "recommendations": recommendations,
                "shopping_list": shopping_list or [],
                "nutrition_summary": self._calculate_nutrition_summary(recommendations),
                "generated_at": datetime.now(timezone.utc).isoformat()
            }

            # Create response record
            request_data = {
                "profile_id": str(profile_id),
                "comprehensive_plan": True
            }

            ai_response = json.dumps(meal_plan)
            record = self.create_ai_response_record(
                user_id=user_id,
                profile_id=profile_id,
                request_type="meal_plan_overview",
                request_data=request_data,
                ai_response=ai_response
            )

            meal_plan["record_id"] = str(record.id) if record else None
            return meal_plan

        except Exception as e:
            print(f"❌ Error getting meal plan overview: {e}")
            return None

    def _calculate_nutrition_summary(self, meals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate nutrition summary from meal recommendations."""
        try:
            if not meals:
                return {}

            total_calories = sum(meal.get("calories", 0) for meal in meals)
            total_protein = sum(meal.get("protein", 0) for meal in meals)
            total_carbs = sum(meal.get("carbs", 0) for meal in meals)
            total_fat = sum(meal.get("fat", 0) for meal in meals)

            avg_calories = total_calories / len(meals) if meals else 0
            avg_protein = total_protein / len(meals) if meals else 0
            avg_carbs = total_carbs / len(meals) if meals else 0
            avg_fat = total_fat / len(meals) if meals else 0

            return {
                "total_meals": len(meals),
                "total_nutrition": {
                    "calories": round(total_calories),
                    "protein_g": round(total_protein),
                    "carbs_g": round(total_carbs),
                    "fat_g": round(total_fat)
                },
                "average_per_meal": {
                    "calories": round(avg_calories),
                    "protein_g": round(avg_protein),
                    "carbs_g": round(avg_carbs),
                    "fat_g": round(avg_fat)
                },
                "macros_breakdown": {
                    "protein_percentage": round((total_protein * 4 / total_calories) * 100) if total_calories > 0 else 0,
                    "carbs_percentage": round((total_carbs * 4 / total_calories) * 100) if total_calories > 0 else 0,
                    "fat_percentage": round((total_fat * 9 / total_calories) * 100) if total_calories > 0 else 0
                }
            }

        except Exception as e:
            print(f"❌ Error calculating nutrition summary: {e}")
            return {}

    def get_ai_insights(self, profile_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get AI insights and tips for the user's meal prep profile."""
        try:
            # Get the meal prep profile
            profile = self.get_meal_prep_profile_by_id(profile_id)
            if not profile:
                return None

            # Generate personalized insights
            prompt = f"""
            Based on this user's meal prep profile, provide 3-5 personalized insights and tips
            to help them succeed with their meal planning goals.

            User Profile:
            - Goal: {profile.goal or 'General health'}
            - Meals per day: {profile.meals_per_day or '3'}
            - Dietary preference: {profile.dietary_preference or 'Balanced'}
            - Cooking skill level: {profile.skill_level or 'Intermediate'}
            - Time available for cooking: {profile.cooking_time or 'Moderate'}
            - Weekly budget: ${profile.weekly_budget or 'Not specified'}

            Provide practical, actionable insights that consider their:
            1. Nutritional goals and dietary preferences
            2. Time constraints and cooking skills
            3. Budget limitations
            4. Lifestyle factors

            Format as a JSON array of insight objects with 'title' and 'description' fields.
            """

            response = self.query_ai(prompt)
            if not response:
                return None

            # Parse the response
            try:
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    insights = json.loads(json_str)

                    # Create response record
                    request_data = {"profile_id": str(profile_id)}
                    record = self.create_ai_response_record(
                        user_id=user_id,
                        profile_id=profile_id,
                        request_type="ai_insights",
                        request_data=request_data,
                        ai_response=json.dumps(insights)
                    )

                    return {
                        "insights": insights,
                        "record_id": str(record.id) if record else None,
                        "generated_at": datetime.now(timezone.utc).isoformat()
                    }
                else:
                    print("❌ Could not find JSON array in insights response")
                    return None
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse insights response as JSON: {e}")
                return None

        except Exception as e:
            print(f"❌ Error getting AI insights: {e}")
            return None

    def regenerate_recommendations(self, profile_id: UUID, user_id: UUID,
                                 previous_recommendations: List[Dict[str, Any]],
                                 feedback: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Regenerate meal recommendations based on user feedback."""
        try:
            # Get the meal prep profile
            profile = self.get_meal_prep_profile_by_id(profile_id)
            if not profile:
                return None

            # Build feedback context
            feedback_context = f"User feedback: {feedback}" if feedback else "No specific feedback provided"

            prompt = f"""
            The user wants new meal recommendations. Here are their previous recommendations:
            {json.dumps(previous_recommendations, indent=2)}

            {feedback_context}

            Generate 3 new meal recommendations that are different from the previous ones but still
            aligned with their profile preferences.

            User Profile:
            - Goal: {profile.goal or 'General health'}
            - Dietary preference: {profile.dietary_preference or 'Balanced'}
            - Allergies: {', '.join(profile.allergies) if profile.allergies else 'None'}
            - Excluded ingredients: {', '.join(profile.excluded_ingredients) if profile.excluded_ingredients else 'None'}

            Provide the same JSON format as before with meal objects containing:
            name, calories, protein, carbs, fat, prepTime, difficulty, tags
            """

            response = self.query_ai(prompt)
            if not response:
                return None

            # Parse and return new recommendations
            try:
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    new_recommendations = json.loads(json_str)

                    # Create response record
                    request_data = {
                        "profile_id": str(profile_id),
                        "regeneration": True,
                        "feedback_provided": feedback is not None
                    }

                    record = self.create_ai_response_record(
                        user_id=user_id,
                        profile_id=profile_id,
                        request_type="regenerate_recommendations",
                        request_data=request_data,
                        ai_response=json.dumps(new_recommendations)
                    )

                    return {
                        "recommendations": new_recommendations,
                        "record_id": str(record.id) if record else None,
                        "regenerated": True,
                        "generated_at": datetime.now(timezone.utc).isoformat()
                    }
                else:
                    return None
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse regenerated recommendations: {e}")
                return None

        except Exception as e:
            print(f"❌ Error regenerating recommendations: {e}")
            return None