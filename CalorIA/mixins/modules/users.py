from typing import Optional, Type as TypingType, TypeVar, Any, Dict, List
from uuid import UUID
from datetime import datetime, date

from ... import types as Type

T = TypeVar('T', bound=Type.CalorIAModel)

class UserMixin:
    """Mixin class that provides user-related MongoDB operations."""
    
    # No __init__ needed as it will use the parent class's __init__
    
    def create_user(self, user: Type.User) -> Optional[Any]:
        """Create a new user in the users collection.

        Args:
            user: User model instance

        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("users", user)

    def update_user(self, user_id: UUID, update_data: Dict[str, Any]) -> bool:
        """Update a user in the users collection.

        Args:
            user_id: UUID of the user to update
            update_data: Dictionary containing fields to update

        Returns:
            True if update was successful, False otherwise
        """
        try:
            query = {"user_id": str(user_id)}
            return self.update_document("users", query, update_data)
        except Exception as e:
            print(f"Error updating user {user_id}: {e}")
            return False
    
    def get_user_by_id(self, user_id: UUID) -> Optional[Type.User]:
        """Retrieve a user by their ID.
        
        Args:
            user_id: UUID of the user to retrieve
            
        Returns:
            User instance if found, None otherwise
        """
        query = {"user_id": str(user_id)}  # Convert UUID to string for MongoDB query
        return self.get_document("users", query, Type.User)
    
    def add_meal_to_log(self, user_id: UUID, meal: Type.Meal) -> bool:
        """Find the user's daily log (or create one) and append a new meal to it.
        
        Args:
            user_id: UUID of the user
            meal: Meal instance to add
            
        Returns:
            True if meal was added successfully, False otherwise
        """
        try:
            # Get today's date
            today = datetime.now().date()
            
            # First, try to find existing daily log for today
            query = {
                "user_id": str(user_id),
                "log_date": today.isoformat()
            }
            
            daily_log = self.get_document("daily_logs", query, Type.DailyLog)
            
            if daily_log:
                # Add meal to existing log
                daily_log.meals.append(meal)
                update_data = daily_log.to_dict()
                return self.update_document("daily_logs", query, update_data)
            else:
                # Create new daily log with the meal
                new_log = Type.DailyLog(
                    user_id=user_id,
                    log_date=today,
                    meals=[meal]
                )
                result = self.create_document("daily_logs", new_log)
                return result is not None
                
        except Exception as e:
            print(f"Error adding meal to log for user {user_id}: {e}")
            return False
    
    def add_weight_entry(self, entry: Type.WeightEntry) -> Optional[Any]:
        """Add a new weight entry for a user.
        
        Args:
            entry: WeightEntry instance to add
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("weight_entries", entry)
    
    def get_user_daily_log(self, user_id: UUID, log_date: date) -> Optional[Type.DailyLog]:
        """Get a user's daily log for a specific date.
        
        Args:
            user_id: UUID of the user
            log_date: Date to get the log for
            
        Returns:
            DailyLog instance if found, None otherwise
        """
        query = {
            "user_id": str(user_id),
            "log_date": log_date.isoformat()
        }
        return self.get_document("daily_logs", query, Type.DailyLog)
    
    def get_recent_user_weight_entries(self, user_id: UUID, limit: int = 30) -> List[Type.WeightEntry]:
        """Get recent weight entries for a user.

        Args:
            user_id: UUID of the user
            limit: Maximum number of entries to return

        Returns:
            List of WeightEntry instances, sorted by date (newest first)
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []
                
            collection = db["weight_entries"]
            query = {"user_id": str(user_id)}
            
            # Sort by date descending, limit results
            cursor = collection.find(query).sort("on_date", -1).limit(limit)
            
            entries = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    entry = Type.WeightEntry.from_dict(doc)
                    entries.append(entry)
                except Exception as e:
                    print(f"Error parsing weight entry: {e}")
                    continue
                    
            return entries
        except Exception as e:
            print(f"Error getting weight entries for user {user_id}: {e}")
            return []
    
    def add_water_entry(self, entry: Type.WaterEntry) -> Optional[Any]:
        """Add a new water entry for a user.
        
        Args:
            entry: WaterEntry instance to add
            
        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("water_entries", entry)
    
    def get_user_daily_water_log(self, user_id: UUID, log_date: date) -> Optional[Type.DailyWaterLog]:
        """Get a user's daily water log for a specific date.
        
        Args:
            user_id: UUID of the user
            log_date: Date to get the water log for
            
        Returns:
            DailyWaterLog instance if found, None otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return None
                
            collection = db["water_entries"]
            query = {
                "user_id": str(user_id),
                "on_date": log_date.isoformat()
            }
            
            # Get all water entries for the date
            cursor = collection.find(query)
            entries = []
            
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    entry = Type.WaterEntry.from_dict(doc)
                    entries.append(entry)
                except Exception as e:
                    print(f"Error parsing water entry: {e}")
                    continue
            
            if entries:
                return Type.DailyWaterLog(
                    user_id=user_id,
                    log_date=log_date,
                    entries=entries
                )
            return None
            
        except Exception as e:
            print(f"Error getting daily water log for user {user_id}: {e}")
            return None

    def add_favorite_recipe(self, user_id: UUID, recipe_id: str) -> bool:
        """Add a recipe to user's favorites.

        Args:
            user_id: UUID of the user
            recipe_id: String ID of the recipe to add

        Returns:
            True if recipe was added successfully, False otherwise
        """
        try:
            # Get current user
            user = self.get_user_by_id(user_id)
            if not user:
                return False

            # Check if recipe is already in favorites
            if recipe_id in user.favorite_recipe_ids:
                return True  # Already favorited

            # Add recipe to favorites
            user.favorite_recipe_ids.append(recipe_id)
            update_data = {"favorite_recipe_ids": user.favorite_recipe_ids}
            query = {"user_id": str(user_id)}

            return self.update_document("users", query, update_data)

        except Exception as e:
            print(f"Error adding favorite recipe for user {user_id}: {e}")
            return False

    def remove_favorite_recipe(self, user_id: UUID, recipe_id: str) -> bool:
        """Remove a recipe from user's favorites.

        Args:
            user_id: UUID of the user
            recipe_id: String ID of the recipe to remove

        Returns:
            True if recipe was removed successfully, False otherwise
        """
        try:
            # Get current user
            user = self.get_user_by_id(user_id)
            if not user:
                return False

            # Check if recipe is in favorites
            if recipe_id not in user.favorite_recipe_ids:
                return True  # Already not favorited

            # Remove recipe from favorites
            user.favorite_recipe_ids.remove(recipe_id)
            update_data = {"favorite_recipe_ids": user.favorite_recipe_ids}
            query = {"user_id": str(user_id)}

            return self.update_document("users", query, update_data)

        except Exception as e:
            print(f"Error removing favorite recipe for user {user_id}: {e}")
            return False

    def get_user_favorite_recipe_ids(self, user_id: UUID) -> List[str]:
        """Get list of favorite recipe IDs for a user.

        Args:
            user_id: UUID of the user

        Returns:
            List of favorite recipe IDs as strings
        """
        try:
            user = self.get_user_by_id(user_id)
            if user:
                return user.favorite_recipe_ids
            return []
        except Exception as e:
            print(f"Error getting favorite recipes for user {user_id}: {e}")
            return []

    def is_recipe_favorited(self, user_id: UUID, recipe_id: str) -> bool:
        """Check if a recipe is favorited by a user.

        Args:
            user_id: UUID of the user
            recipe_id: String ID of the recipe

        Returns:
            True if recipe is favorited, False otherwise
        """
        favorite_ids = self.get_user_favorite_recipe_ids(user_id)
        return recipe_id in favorite_ids

    def clear_system_recipe_favorites(self, system_recipe_ids: List[str]) -> int:
        """Remove system recipe favorites from all users.

        Args:
            system_recipe_ids: List of system recipe IDs to remove from favorites

        Returns:
            Number of users updated
        """
        try:
            if not system_recipe_ids:
                return 0

            db = self.get_db_connection()
            if db is None:
                return 0

            collection = db["users"]

            # Convert system recipe IDs to set for faster lookup
            system_ids_set = set(system_recipe_ids)

            # Find all users who have any of the system recipes in their favorites
            query = {"favorite_recipe_ids": {"$in": system_recipe_ids}}
            users_to_update = list(collection.find(query))

            updated_count = 0
            for user_doc in users_to_update:
                # Get current favorite IDs
                current_favorites = user_doc.get("favorite_recipe_ids", [])

                # Remove system recipe IDs from favorites
                updated_favorites = [rid for rid in current_favorites if rid not in system_ids_set]

                # Only update if favorites actually changed
                if len(updated_favorites) != len(current_favorites):
                    update_query = {"user_id": user_doc["user_id"]}
                    update_data = {"favorite_recipe_ids": updated_favorites}
                    result = collection.update_one(update_query, {"$set": update_data})
                    if result.modified_count > 0:
                        updated_count += 1

            return updated_count

        except Exception as e:
            print(f"Error clearing system recipe favorites: {e}")
            return 0