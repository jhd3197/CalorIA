import re
from typing import Optional, Type as TypingType, TypeVar, Any, Dict, List
from uuid import UUID
from datetime import date

from ... import types as Type

T = TypeVar('T', bound=Type.CalorIAModel)

class MealPrepMixin:
    """Mixin class that provides meal prep profile-related MongoDB operations."""

    # No __init__ needed as it will use the parent class's __init__

    def add_meal_prep_profile(self, profile: Type.MealPrepProfile) -> Optional[Any]:
        """Add a new meal prep profile to the meal_prep_profiles collection.

        Args:
            profile: MealPrepProfile model instance

        Returns:
            The inserted_id if successful, None otherwise
        """
        return self.create_document("meal_prep_profiles", profile)

    def get_meal_prep_profile_by_id(self, profile_id: UUID) -> Optional[Type.MealPrepProfile]:
        """Retrieve a meal prep profile by its ID.

        Args:
            profile_id: UUID of the profile to retrieve

        Returns:
            MealPrepProfile instance if found, None otherwise
        """
        query = {"id": str(profile_id)}  # Convert UUID to string for MongoDB query
        return self.get_document("meal_prep_profiles", query, Type.MealPrepProfile)

    def update_meal_prep_profile(self, profile_id: UUID, profile_data: Dict[str, Any]) -> bool:
        """Update a meal prep profile by its ID.

        Args:
            profile_id: UUID of the profile to update
            profile_data: Data to update (will be wrapped in $set)

        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(profile_id)}  # Convert UUID to string for MongoDB query
        return self.update_document("meal_prep_profiles", query, profile_data)

    def delete_meal_prep_profile(self, profile_id: UUID) -> bool:
        """Delete a meal prep profile by its ID.

        Args:
            profile_id: UUID of the profile to delete

        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(profile_id)}  # Convert UUID to string for MongoDB query
        return self.delete_document("meal_prep_profiles", query)

    def get_user_meal_prep_profiles(self, user_id: UUID, include_inactive: bool = False) -> List[Type.MealPrepProfile]:
        """Get all meal prep profiles for a user.

        Args:
            user_id: UUID of the user
            include_inactive: Whether to include inactive profiles

        Returns:
            List of MealPrepProfile instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []

            collection = db["meal_prep_profiles"]

            # Build query
            query = {"user_id": str(user_id)}  # Convert UUID to string for MongoDB query
            if not include_inactive:
                query["is_active"] = True

            # Find all matching profiles
            cursor = collection.find(query)

            # Sort by creation date (descending - newest first)
            cursor = cursor.sort("created_at", -1)

            profiles = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    profile = Type.MealPrepProfile.from_dict(doc)
                    profiles.append(profile)
                except Exception as e:
                    print(f"Error parsing meal prep profile: {e}")
                    continue

            return profiles

        except Exception as e:
            print(f"Error getting user meal prep profiles: {e}")
            return []

    def get_active_meal_prep_profile(self, user_id: UUID) -> Optional[Type.MealPrepProfile]:
        """Get the currently active meal prep profile for a user.

        Args:
            user_id: UUID of the user

        Returns:
            Active MealPrepProfile instance if found, None otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return None

            collection = db["meal_prep_profiles"]

            # Query for active profile
            query = {
                "user_id": str(user_id),
                "is_active": True
            }

            # Find the active profile
            doc = collection.find_one(query)
            if doc is None:
                return None

            if '_id' in doc:
                del doc['_id']

            try:
                return Type.MealPrepProfile.from_dict(doc)
            except Exception as e:
                print(f"Error parsing active meal prep profile: {e}")
                return None

        except Exception as e:
            print(f"Error getting active meal prep profile: {e}")
            return None

    def set_active_meal_prep_profile(self, profile_id: UUID, user_id: UUID) -> bool:
        """Set a meal prep profile as active for a user (deactivates others).

        Args:
            profile_id: UUID of the profile to activate
            user_id: UUID of the user

        Returns:
            True if successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            collection = db["meal_prep_profiles"]

            # First, deactivate all profiles for this user
            collection.update_many(
                {"user_id": str(user_id)},
                {"$set": {"is_active": False}}
            )

            # Then activate the specified profile
            query = {"id": str(profile_id), "user_id": str(user_id)}
            result = collection.update_one(query, {"$set": {"is_active": True}})

            return result.modified_count > 0

        except Exception as e:
            print(f"Error setting active meal prep profile: {e}")
            return False

    def get_meal_prep_profile_count(self, user_id: UUID) -> int:
        """Get the count of meal prep profiles for a user.

        Args:
            user_id: UUID of the user

        Returns:
            Number of profiles
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return 0

            collection = db["meal_prep_profiles"]

            # Count active profiles for the user
            query = {"user_id": str(user_id), "is_active": True}
            return collection.count_documents(query)

        except Exception as e:
            print(f"Error getting meal prep profile count: {e}")
            return 0