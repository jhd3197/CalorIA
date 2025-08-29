import re
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from ... import types as Type


class RecipeCategoryMixin:
    """Mixin class that provides recipe category-related MongoDB operations."""

    def create_category(self, category: Type.RecipeCategoryModel) -> Optional[str]:
        """Create a new recipe category in the recipe_categories collection.

        Args:
            category: RecipeCategoryModel instance

        Returns:
            The inserted_id if successful, None otherwise
        """
        # Generate slug if not provided
        if not hasattr(category, 'slug') or not category.slug:
            category.slug = self.generate_slug(category.name)

        return self.create_document("recipe_categories", category)

    def get_category_by_id(self, category_id: UUID) -> Optional[Type.RecipeCategoryModel]:
        """Retrieve a category by its ID.

        Args:
            category_id: UUID of the category to retrieve

        Returns:
            RecipeCategoryModel instance if found, None otherwise
        """
        query = {"id": str(category_id)}
        return self.get_document("recipe_categories", query, Type.RecipeCategoryModel)

    def get_category_by_slug(self, slug: str) -> Optional[Type.RecipeCategoryModel]:
        """Retrieve a category by its slug.

        Args:
            slug: Slug of the category to retrieve

        Returns:
            RecipeCategoryModel instance if found, None otherwise
        """
        query = {"slug": slug}
        return self.get_document("recipe_categories", query, Type.RecipeCategoryModel)

    def get_all_categories(self, skip: int = 0, limit: Optional[int] = None,
                          include_system: bool = True) -> List[Type.RecipeCategoryModel]:
        """Get all categories with optional filtering and pagination.

        Args:
            skip: Number of categories to skip for pagination (default: 0)
            limit: Maximum number of categories to return (default: None for all)
            include_system: Whether to include system categories (default: True)

        Returns:
            List of RecipeCategoryModel instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []

            collection = db["recipe_categories"]

            # Build query
            query = {}
            if not include_system:
                query["is_system"] = False

            cursor = collection.find(query)

            # Sort by name
            cursor = cursor.sort("name", 1)

            # Apply pagination
            cursor = cursor.skip(skip)
            if limit is not None:
                cursor = cursor.limit(limit)

            categories = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    category = Type.RecipeCategoryModel.from_dict(doc)
                    categories.append(category)
                except Exception as e:
                    print(f"Error parsing category: {e}")
                    continue

            return categories
        except Exception as e:
            print(f"Error getting categories: {e}")
            return []

    def update_category(self, category_id: UUID, category_data: dict) -> bool:
        """Update a category by its ID.

        Args:
            category_id: UUID of the category to update
            category_data: Data to update

        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(category_id)}

        # Add updated_at timestamp
        category_data["updated_at"] = datetime.now()

        return self.update_document("recipe_categories", query, category_data)

    def delete_category(self, category_id: UUID) -> bool:
        """Delete a category by its ID.

        Args:
            category_id: UUID of the category to delete

        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(category_id)}
        return self.delete_document("recipe_categories", query)

    def search_categories(self, search_term: str, skip: int = 0, limit: int = 20) -> List[Type.RecipeCategoryModel]:
        """Search categories by name or description.

        Args:
            search_term: Term to search for
            skip: Number of results to skip
            limit: Maximum number of results to return

        Returns:
            List of matching RecipeCategoryModel instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []

            collection = db["recipe_categories"]

            # Create regex pattern for case-insensitive search
            search_pattern = {"$regex": search_term, "$options": "i"}

            # Search in name and description
            query = {
                "$or": [
                    {"name": search_pattern},
                    {"description": search_pattern}
                ]
            }

            cursor = collection.find(query)
            cursor = cursor.sort("name", 1)
            cursor = cursor.skip(skip)
            cursor = cursor.limit(limit)

            categories = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    category = Type.RecipeCategoryModel.from_dict(doc)
                    categories.append(category)
                except Exception as e:
                    print(f"Error parsing category: {e}")
                    continue

            return categories
        except Exception as e:
            print(f"Error searching categories: {e}")
            return []

    def count_categories(self, include_system: bool = True) -> int:
        """Count total categories.

        Args:
            include_system: Whether to include system categories

        Returns:
            Total count of categories
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return 0

            collection = db["recipe_categories"]

            query = {}
            if not include_system:
                query["is_system"] = False

            return collection.count_documents(query)
        except Exception as e:
            print(f"Error counting categories: {e}")
            return 0

    def increment_category_usage(self, category_id: UUID) -> bool:
        """Increment the usage count for a category.

        Args:
            category_id: UUID of the category

        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            collection = db["recipe_categories"]
            query = {"id": str(category_id)}
            update = {"$inc": {"usage_count": 1}, "$set": {"updated_at": datetime.now()}}

            result = collection.update_one(query, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"Error incrementing category usage: {e}")
            return False

    def decrement_category_usage(self, category_id: UUID) -> bool:
        """Decrement the usage count for a category.

        Args:
            category_id: UUID of the category

        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            collection = db["recipe_categories"]
            query = {"id": str(category_id)}
            update = {"$inc": {"usage_count": -1}, "$set": {"updated_at": datetime.now()}}

            result = collection.update_one(query, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"Error decrementing category usage: {e}")
            return False

    def recalculate_category_usage(self, category_id: UUID) -> bool:
        """Recalculate the usage count for a category by counting actual recipes.

        Args:
            category_id: UUID of the category

        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            # Count recipes that use this category
            recipes_collection = db["recipes"]
            count = recipes_collection.count_documents({
                "$or": [
                    {"category_id": str(category_id)},
                    {"legacy_category": {"$exists": True}, "category": {"$exists": False}}
                ]
            })

            # Update the category with the correct count
            categories_collection = db["recipe_categories"]
            query = {"id": str(category_id)}
            update = {"$set": {"usage_count": count, "updated_at": datetime.now()}}

            result = categories_collection.update_one(query, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"Error recalculating category usage: {e}")
            return False