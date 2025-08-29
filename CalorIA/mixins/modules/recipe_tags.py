import re
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from ... import types as Type


class RecipeTagMixin:
    """Mixin class that provides recipe tag-related MongoDB operations."""

    def create_tag(self, tag: Type.RecipeTagModel) -> Optional[str]:
        """Create a new recipe tag in the recipe_tags collection.

        Args:
            tag: RecipeTagModel instance

        Returns:
            The inserted_id if successful, None otherwise
        """
        # Generate slug if not provided
        if not hasattr(tag, 'slug') or not tag.slug:
            tag.slug = self.generate_slug(tag.name)

        return self.create_document("recipe_tags", tag)

    def get_tag_by_id(self, tag_id: UUID) -> Optional[Type.RecipeTagModel]:
        """Retrieve a tag by its ID.

        Args:
            tag_id: UUID of the tag to retrieve

        Returns:
            RecipeTagModel instance if found, None otherwise
        """
        query = {"id": str(tag_id)}
        return self.get_document("recipe_tags", query, Type.RecipeTagModel)

    def get_tag_by_slug(self, slug: str) -> Optional[Type.RecipeTagModel]:
        """Retrieve a tag by its slug.

        Args:
            slug: Slug of the tag to retrieve

        Returns:
            RecipeTagModel instance if found, None otherwise
        """
        query = {"slug": slug}
        return self.get_document("recipe_tags", query, Type.RecipeTagModel)

    def get_all_tags(self, skip: int = 0, limit: Optional[int] = None,
                    include_system: bool = True, sort_by_usage: bool = False) -> List[Type.RecipeTagModel]:
        """Get all tags with optional filtering and pagination.

        Args:
            skip: Number of tags to skip for pagination (default: 0)
            limit: Maximum number of tags to return (default: None for all)
            include_system: Whether to include system tags (default: True)
            sort_by_usage: Whether to sort by usage count (default: False)

        Returns:
            List of RecipeTagModel instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []

            collection = db["recipe_tags"]

            # Build query
            query = {}
            if not include_system:
                query["is_system"] = False

            cursor = collection.find(query)

            # Sort by usage count (descending) or name (ascending)
            if sort_by_usage:
                cursor = cursor.sort("usage_count", -1)
            else:
                cursor = cursor.sort("name", 1)

            # Apply pagination
            cursor = cursor.skip(skip)
            if limit is not None:
                cursor = cursor.limit(limit)

            tags = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    tag = Type.RecipeTagModel.from_dict(doc)
                    tags.append(tag)
                except Exception as e:
                    print(f"Error parsing tag: {e}")
                    continue

            return tags
        except Exception as e:
            print(f"Error getting tags: {e}")
            return []

    def update_tag(self, tag_id: UUID, tag_data: dict) -> bool:
        """Update a tag by its ID.

        Args:
            tag_id: UUID of the tag to update
            tag_data: Data to update

        Returns:
            True if update was successful, False otherwise
        """
        query = {"id": str(tag_id)}

        # Add updated_at timestamp
        tag_data["updated_at"] = datetime.now()

        return self.update_document("recipe_tags", query, tag_data)

    def delete_tag(self, tag_id: UUID) -> bool:
        """Delete a tag by its ID.

        Args:
            tag_id: UUID of the tag to delete

        Returns:
            True if deletion was successful, False otherwise
        """
        query = {"id": str(tag_id)}
        return self.delete_document("recipe_tags", query)

    def search_tags(self, search_term: str, skip: int = 0, limit: int = 20) -> List[Type.RecipeTagModel]:
        """Search tags by name or description.

        Args:
            search_term: Term to search for
            skip: Number of results to skip
            limit: Maximum number of results to return

        Returns:
            List of matching RecipeTagModel instances
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return []

            collection = db["recipe_tags"]

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
            cursor = cursor.sort("usage_count", -1)  # Sort by popularity
            cursor = cursor.skip(skip)
            cursor = cursor.limit(limit)

            tags = []
            for doc in cursor:
                if '_id' in doc:
                    del doc['_id']
                try:
                    tag = Type.RecipeTagModel.from_dict(doc)
                    tags.append(tag)
                except Exception as e:
                    print(f"Error parsing tag: {e}")
                    continue

            return tags
        except Exception as e:
            print(f"Error searching tags: {e}")
            return []

    def increment_tag_usage(self, tag_id: UUID) -> bool:
        """Increment the usage count for a tag.

        Args:
            tag_id: UUID of the tag

        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            collection = db["recipe_tags"]
            query = {"id": str(tag_id)}
            update = {"$inc": {"usage_count": 1}, "$set": {"updated_at": datetime.now()}}

            result = collection.update_one(query, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"Error incrementing tag usage: {e}")
            return False

    def decrement_tag_usage(self, tag_id: UUID) -> bool:
        """Decrement the usage count for a tag.

        Args:
            tag_id: UUID of the tag

        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            collection = db["recipe_tags"]
            query = {"id": str(tag_id)}
            update = {"$inc": {"usage_count": -1}, "$set": {"updated_at": datetime.now()}}

            result = collection.update_one(query, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"Error decrementing tag usage: {e}")
            return False

    def count_tags(self, include_system: bool = True) -> int:
        """Count total tags.

        Args:
            include_system: Whether to include system tags

        Returns:
            Total count of tags
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return 0

            collection = db["recipe_tags"]

            query = {}
            if not include_system:
                query["is_system"] = False

            return collection.count_documents(query)
        except Exception as e:
            print(f"Error counting tags: {e}")
            return 0

    def get_popular_tags(self, limit: int = 10) -> List[Type.RecipeTagModel]:
        """Get most popular tags by usage count.

        Args:
            limit: Maximum number of tags to return

        Returns:
            List of popular RecipeTagModel instances
        """
        return self.get_all_tags(limit=limit, sort_by_usage=True)

    def increment_tag_usage(self, tag_id: UUID) -> bool:
        """Increment the usage count for a tag.

        Args:
            tag_id: UUID of the tag

        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            collection = db["recipe_tags"]
            query = {"id": str(tag_id)}
            update = {"$inc": {"usage_count": 1}, "$set": {"updated_at": datetime.now()}}

            result = collection.update_one(query, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"Error incrementing tag usage: {e}")
            return False

    def decrement_tag_usage(self, tag_id: UUID) -> bool:
        """Decrement the usage count for a tag.

        Args:
            tag_id: UUID of the tag

        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            collection = db["recipe_tags"]
            query = {"id": str(tag_id)}
            update = {"$inc": {"usage_count": -1}, "$set": {"updated_at": datetime.now()}}

            result = collection.update_one(query, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"Error decrementing tag usage: {e}")
            return False

    def recalculate_tag_usage(self, tag_id: UUID) -> bool:
        """Recalculate the usage count for a tag by counting actual recipes.

        Args:
            tag_id: UUID of the tag

        Returns:
            True if update was successful, False otherwise
        """
        try:
            db = self.get_db_connection()
            if db is None:
                return False

            # Count recipes that use this tag
            recipes_collection = db["recipes"]
            count = recipes_collection.count_documents({
                "$or": [
                    {"tag_ids": str(tag_id)},
                    {"legacy_tags": {"$in": [str(tag_id)]}}
                ]
            })

            # Update the tag with the correct count
            tags_collection = db["recipe_tags"]
            query = {"id": str(tag_id)}
            update = {"$set": {"usage_count": count, "updated_at": datetime.now()}}

            result = tags_collection.update_one(query, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"Error recalculating tag usage: {e}")
            return False