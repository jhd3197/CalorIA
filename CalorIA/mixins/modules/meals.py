import re
from typing import Optional, Type as TypingType, TypeVar, Any, Dict, List
from uuid import UUID
from datetime import date

from ... import types as Type

T = TypeVar('T', bound=Type.CalorIAModel)

class MealMixin:
    """Mixin class that provides meal-related MongoDB operations."""
    
    # No __init__ needed as it will use the parent class's __init__
    
    def add_meal_entry(self, meal_entry: Type.Meal) -> Optional[Any]:
        """Add a new meal entry to the meals collection.
        
        Args:
            meal_entry: Meal model instance
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("meals", meal_entry)
    
    def get_meal_by_id(self, meal_id: UUID) -> Optional[Type.Meal]:
        """Retrieve a meal by its ID.
        
        Args:
            meal_id: UUID of the meal to retrieve
            
        Returns:
            Meal instance if found, None otherwise
        """
        query = {"id": str(meal_id)}  # Convert UUID to string for MongoDB query
        return self.get_document("meals", query, Type.Meal)
    
    def update_meal(self, meal_id: UUID, meal_data: Dict[str, Any]) -> bool:
        """Update a meal by its ID.
        
        Args:
            meal_id: UUID of the meal to update
            meal_data: Data to update (will be wrapped in $set)
            
        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(meal_id)}  # Convert UUID to string for MongoDB query
        return self.update_document("meals", query, meal_data)
    
    def delete_meal(self, meal_id: UUID) -> bool:
        """Delete a meal by its ID.
        
        Args:
            meal_id: UUID of the meal to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(meal_id)}  # Convert UUID to string for MongoDB query
        return self.delete_document("meals", query)
    
    def get_user_meals(self, user_id: UUID, start_date: Optional[date] = None, 
                     end_date: Optional[date] = None, 
                     skip: int = 0, limit: Optional[int] = None) -> List[Type.Meal]:
        """Get meals for a user with optional date range and pagination.
        
        Args:
            user_id: UUID of the user
            start_date: Optional start date for filtering meals (inclusive)
            end_date: Optional end date for filtering meals (inclusive)
            skip: Number of meals to skip for pagination (default: 0)
            limit: Maximum number of meals to return (default: None for all meals)
            
        Returns:
            List of Meal instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["meals"]
            
            # Build query for meals belonging to the user (assuming user_id is stored in each meal)
            # Note: Based on types.py, Meal doesn't have user_id directly, this may need to be revised
            # based on how meals are associated with users in the application
            query = {"user_id": str(user_id)}  # Convert UUID to string for MongoDB query
            
            # Add date range filters if provided
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date.isoformat()
                if end_date:
                    date_filter["$lte"] = end_date.isoformat()
                    
                if date_filter:
                    # The timestamp field contains the date information
                    query["timestamp"] = date_filter
            
            # Find all matching meals
            cursor = collection.find(query)
            
            # Sort by timestamp (descending)
            cursor = cursor.sort("timestamp", -1)
            
            # Apply pagination
            cursor = cursor.skip(skip)
            if limit is not None:
                cursor = cursor.limit(limit)
            
            meals = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    meal = Type.Meal.from_dict(doc)
                    meals.append(meal)
                except Exception as e:
                    print(f"Error parsing meal: {e}")
                    continue
                    
            return meals
            
        except Exception as e:
            print(f"Error getting user meals: {e}")
            return []
    
    def get_user_daily_meals(self, user_id: UUID, meal_date: date) -> List[Type.Meal]:
        """Get all meals for a user on a specific date.
        
        Args:
            user_id: UUID of the user
            meal_date: Date to get meals for
            
        Returns:
            List of Meal instances for the specified date, where each Meal contains:
            - meal_type: MealType enum (breakfast, lunch, dinner, snack)
            - food_items: List of FoodItem objects
            - timestamp: datetime when the meal was recorded
            - notes: Optional notes about the meal
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["meals"]
            
            # Query for meals matching user_id and date
            query = {
                "user_id": str(user_id),  # Convert UUID to string for MongoDB query
                "timestamp": {"$regex": f"^{meal_date.isoformat()}"}  # Match timestamp that starts with this date
            }
            
            # Find all matching meals
            cursor = collection.find(query)
            
            # Sort by timestamp (chronological order)
            cursor = cursor.sort("timestamp", 1)
            
            meals = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    meal = Type.Meal.from_dict(doc)
                    meals.append(meal)
                except Exception as e:
                    print(f"Error parsing meal: {e}")
                    continue
            
            return meals
            
        except Exception as e:
            print(f"Error getting user daily meals: {e}")
            return []
    
    def get_meal_nutrition_summary(self, meal_id: UUID) -> Optional[Dict[str, Any]]:
        """Get nutritional summary for a specific meal.
        
        Args:
            meal_id: UUID of the meal
            
        Returns:
            Dictionary containing nutritional summary including:
            - calories: Total calories in the meal
            - protein_g, carbs_g, fat_g: Macronutrient totals
            - meal_type: The meal type (breakfast, lunch, dinner, snack)
            - timestamp: When the meal was recorded
            - notes: Any notes about the meal
        """
        try:
            # First get the meal document
            meal = self.get_meal_by_id(meal_id)
            if meal is None:
                return None
                
            # Calculate nutritional totals from the meal's ingredients
            summary = {
                "calories": 0,
                "protein_g": 0,
                "carbs_g": 0,
                "fat_g": 0,
                "fiber_g": 0,
                "sugar_g": 0,
                "sodium_mg": 0
            }
            
            # Sum up nutrition from each meal food item
            for item in meal.food_items:
                # Add each nutritional component
                summary["calories"] += item.calories
                summary["protein_g"] += item.protein_g
                summary["carbs_g"] += item.carbs_g
                summary["fat_g"] += item.fat_g
                summary["fiber_g"] += getattr(item, "fiber_g", 0)
                summary["sugar_g"] += getattr(item, "sugar_g", 0)
                summary["sodium_mg"] += getattr(item, "sodium_mg", 0)
            
            # Add meal metadata to the summary
            summary["meal_id"] = str(meal_id)
            summary["meal_type"] = meal.meal_type.value
            summary["timestamp"] = meal.timestamp.isoformat()
            summary["notes"] = meal.notes
            
            return summary
            
        except Exception as e:
            print(f"Error getting meal nutrition summary: {e}")
            return None
    
    def get_user_meal_history(self, user_id: UUID, days: int = 7) -> List[Dict[str, Any]]:
        """Get a summary of daily meals for a user over a number of days.
        
        Args:
            user_id: UUID of the user
            days: Number of days of history to retrieve (default: 7)
            
        Returns:
            List of daily meal summary dictionaries, each containing:
            - date: The date (ISO format string)
            - meal_count: Number of meals logged
            - total_calories: Total calories for the day
            - macros: Dictionary with protein, carbs, fat totals in grams
              calculated from the food_items in each meal
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["meals"]
            
            # Use MongoDB aggregation pipeline to group by date and summarize nutritional info
            pipeline = [
                # Match entries for the specific user
                {"$match": {"user_id": str(user_id)}},

                # Add a date field by extracting the date part from timestamp string
                {"$addFields": {
                    "date_only": {"$substr": ["$timestamp", 0, 10]}  # Extract YYYY-MM-DD from ISO string
                }},

                # Group by date and calculate nutritional totals
                {"$group": {
                    "_id": "$date_only",
                    "meal_count": {"$sum": 1},
                    # We need to calculate calories on-the-fly since they're not stored directly
                    # This is a simplified approach and may need to be adjusted based on actual data structure
                    "total_calories": {"$sum": {"$sum": "$food_items.calories"}},
                    "total_protein": {"$sum": {"$sum": "$food_items.protein_g"}},
                    "total_carbs": {"$sum": {"$sum": "$food_items.carbs_g"}},
                    "total_fat": {"$sum": {"$sum": "$food_items.fat_g"}}
                }},

                # Sort by date (descending)
                {"$sort": {"_id": -1}},

                # Limit to specified number of days
                {"$limit": days},

                # Project to format the output
                {"$project": {
                    "_id": 0,
                    "date": "$_id",
                    "meal_count": 1,
                    "total_calories": 1,
                    "macros": {
                        "protein_g": "$total_protein",
                        "carbs_g": "$total_carbs",
                        "fat_g": "$total_fat"
                    }
                }}
            ]
            
            # Execute the aggregation pipeline
            results = list(collection.aggregate(pipeline))
            
            return results
            
        except Exception as e:
            print(f"Error getting user meal history: {e}")
            return []
    
    def get_user_nutritional_summary(self, user_id: UUID, summary_date: date) -> Dict[str, Any]:
        """Get a nutritional summary for a user on a specific date.
        
        Args:
            user_id: UUID of the user
            summary_date: Date to get the summary for
            
        Returns:
            Dictionary containing nutritional summary including:
            - total_calories: Sum of calories from all meals
            - macros: Protein, carbs, and fat totals in grams
            - micros: Fiber, sugar, and sodium totals
            - meal_breakdown: List of meal summaries with nutritional info
              All calculated from the food_items in each Meal
        """
        try:
            # Get all meals for the user on the specified date
            meals = self.get_user_daily_meals(user_id, summary_date)
            
            # Initialize summary structure
            summary = {
                "date": summary_date.isoformat(),
                "total_calories": 0,
                "macros": {
                    "protein_g": 0,
                    "carbs_g": 0,
                    "fat_g": 0
                },
                "micros": {
                    "fiber_g": 0,
                    "sugar_g": 0,
                    "sodium_mg": 0
                },
                "meal_breakdown": []
            }
            
            # Process each meal to build the summary
            for meal in meals:
                # Calculate meal totals
                meal_summary = {
                    "meal_type": meal.meal_type.value,
                    "timestamp": meal.timestamp.isoformat(),
                    "notes": meal.notes,
                    "calories": meal.total_calories(),  # Use the total_calories method from Meal
                    "protein_g": sum(item.protein_g for item in meal.food_items),
                    "carbs_g": sum(item.carbs_g for item in meal.food_items),
                    "fat_g": sum(item.fat_g for item in meal.food_items)
                }
                
                # Sum up nutrition from each meal food item
                for item in meal.food_items:
                    # Update meal summary
                    meal_summary["calories"] += item.calories
                    meal_summary["protein_g"] += item.protein_g
                    meal_summary["carbs_g"] += item.carbs_g
                    meal_summary["fat_g"] += item.fat_g
                    
                    # Update daily totals
                    summary["total_calories"] += item.calories
                    summary["macros"]["protein_g"] += item.protein_g
                    summary["macros"]["carbs_g"] += item.carbs_g
                    summary["macros"]["fat_g"] += item.fat_g
                    summary["micros"]["fiber_g"] += getattr(item, "fiber_g", 0)
                    summary["micros"]["sugar_g"] += getattr(item, "sugar_g", 0)
                    summary["micros"]["sodium_mg"] += getattr(item, "sodium_mg", 0)
                
                # Add meal summary to the breakdown
                summary["meal_breakdown"].append(meal_summary)
            
            # Calculate macro percentages if there are calories
            if summary["total_calories"] > 0:
                protein_cals = summary["macros"]["protein_g"] * 4
                carbs_cals = summary["macros"]["carbs_g"] * 4
                fat_cals = summary["macros"]["fat_g"] * 9
                
                summary["macro_percentages"] = {
                    "protein": round((protein_cals / summary["total_calories"]) * 100, 1),
                    "carbs": round((carbs_cals / summary["total_calories"]) * 100, 1),
                    "fat": round((fat_cals / summary["total_calories"]) * 100, 1)
                }
            else:
                summary["macro_percentages"] = {
                    "protein": 0,
                    "carbs": 0,
                    "fat": 0
                }
            
            return summary
            
        except Exception as e:
            print(f"Error getting user nutritional summary: {e}")
            return {
                "date": summary_date.isoformat(),
                "total_calories": 0,
                "macros": {"protein_g": 0, "carbs_g": 0, "fat_g": 0},
                "micros": {"fiber_g": 0, "sugar_g": 0, "sodium_mg": 0},
                "meal_breakdown": []
            }