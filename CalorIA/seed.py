#!/usr/bin/env python3
"""
CalorIA Database Seeding Module
Reads CSV files and seeds the database with ingredients and recipes.
"""

import csv
import os
import click
from datetime import datetime, timezone
from uuid import uuid4, UUID
from typing import Dict, List, Optional
from pathlib import Path

from .types import Ingredient, FoodItem, Meal, MealType, IngredientUnit, Recipe, DifficultyLevel, RecipeIngredient, RecipeCategoryModel, RecipeTagModel
from . import Client


class DatabaseSeeder:
    """Database seeder that reads from CSV files and populates the database."""
    
    def __init__(self):
        self.seeded_ingredients: Dict[str, Ingredient] = {}
        self.package_dir = Path(__file__).parent
        self.seed_data_dir = self.package_dir / "seed_db"
        self.client = Client()
    
    def load_ingredients_from_csv(self) -> List[Dict]:
        """Load ingredient data from CSV file."""
        csv_path = self.seed_data_dir / "ingredients.csv"
        if not csv_path.exists():
            click.echo(f"❌ Ingredients CSV not found: {csv_path}")
            return []
        
        ingredients = []
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    # Parse aliases and tags
                    aliases = [alias.strip() for alias in row['aliases'].split(',')] if row['aliases'] else []
                    tags = [tag.strip() for tag in row['tags'].split(',')] if row['tags'] else []
                    
                    ingredient_data = {
                        'name': row['name'],
                        'category': row['category'],
                        'default_unit': self.client._parse_unit(row['default_unit']),
                        'grams_per_unit': self.client._safe_float(row['grams_per_unit']),
                        'density_g_per_ml': self.client._safe_float(row['density_g_per_ml']),
                        'kcal_per_100g': self.client._safe_float(row['kcal_per_100g']),
                        'protein_per_100g': self.client._safe_float(row['protein_per_100g']),
                        'fat_per_100g': self.client._safe_float(row['fat_per_100g']),
                        'carbs_per_100g': self.client._safe_float(row['carbs_per_100g']),
                        'aliases': aliases,
                        'tags': tags,
                        'popularity_score': self.client._safe_float(row['popularity_score'])
                    }
                    ingredients.append(ingredient_data)
        except Exception as e:
            click.echo(f"❌ Error reading ingredients CSV: {e}")
            return []
        
        return ingredients

    def load_recipes_from_csv(self) -> List[Dict]:
        """Load recipe data from CSV file."""
        csv_path = self.seed_data_dir / "recipes.csv"
        if not csv_path.exists():
            click.echo(f"❌ Recipes CSV not found: {csv_path}")
            return []

        recipes = []
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    # Parse ingredients string: "ingredient1:amount:unit,ingredient2:amount:unit"
                    ingredients = []
                    if row['ingredients']:
                        for ingredient_str in row['ingredients'].split(','):
                            parts = ingredient_str.strip().split(':')
                            if len(parts) == 3:
                                ingredients.append({
                                    'name': parts[0],
                                    'amount': float(parts[1]),
                                    'unit': self.client._parse_unit(parts[2])
                                })

                    # Parse tags
                    tags = [tag.strip() for tag in row['tags'].split(',')] if row['tags'] else []

                    # Parse instructions
                    instructions = [step.strip() for step in row['instructions'].split('.')] if row['instructions'] else []

                    recipe_data = {
                        'name': row['name'],
                        'category': row['category'],  # Keep as raw string, will be resolved later
                        'prep_time_minutes': int(row['prep_time_minutes']),
                        'cook_time_minutes': int(row['cook_time_minutes']) if row['cook_time_minutes'] else None,
                        'servings': int(row['servings']),
                        'difficulty': self.client._parse_difficulty_level(row['difficulty']),
                        'tags': tags,
                        'description': row['description'],
                        'ingredients': ingredients,
                        'instructions': instructions
                    }
                    recipes.append(recipe_data)
        except Exception as e:
            click.echo(f"❌ Error reading recipes CSV: {e}")
            return []

        return recipes
    
    def seed_ingredients(self) -> int:
        """Seed ingredients from CSV file."""
        click.echo("Loading ingredients from CSV...", nl=False)
        ingredients_data = self.load_ingredients_from_csv()
        
        if not ingredients_data:
            click.echo(" ❌ No ingredients to seed")
            return 0
        
        click.echo(f" ✓ ({len(ingredients_data)} found)")
        
        count = 0
        categories = {}
        
        for data in ingredients_data:
            # Check if ingredient already exists (case-insensitive)
            existing = self.client.get_ingredient_by_name(data['name'])
            if existing:
                # Cache the existing ingredient
                self.seeded_ingredients[data['name']] = existing
                continue
            
            # Create new ingredient
            ingredient = Ingredient(
                id=uuid4(),
                name=data['name'],
                slug=data['name'].lower().replace(' ', '-').replace(',', '').replace('(', '').replace(')', ''),
                category=data['category'],
                default_unit=data['default_unit'],
                grams_per_unit=data['grams_per_unit'],
                density_g_per_ml=data['density_g_per_ml'],
                kcal_per_100g=data['kcal_per_100g'],
                protein_per_100g=data['protein_per_100g'],
                fat_per_100g=data['fat_per_100g'],
                carbs_per_100g=data['carbs_per_100g'],
                aliases=data['aliases'],
                tags=data['tags'],
                popularity_score=data['popularity_score'],
                created_at=datetime.now(timezone.utc),
                is_system=True  # Mark as system-created
            )
            
            result = self.client.create_ingredient(ingredient)
            if result:
                count += 1
                self.seeded_ingredients[data['name']] = ingredient
                
                # Track by category for progress display
                category = data['category']
                if category not in categories:
                    categories[category] = 0
                categories[category] += 1
        
        # Display results by category
        for category, cat_count in categories.items():
            click.echo(f"   • {category}: {cat_count} new")
        
        return count

    def load_categories_from_csv(self) -> List[Dict]:
        """Load category data from CSV file."""
        csv_path = self.seed_data_dir / "recipe_categories.csv"
        if not csv_path.exists():
            click.echo(f"❌ Recipe categories CSV not found: {csv_path}")
            return []

        categories = []
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    categories.append({
                        'name': row['name'],
                        'slug': row['slug'],
                        'description': row.get('description'),
                        'color': row.get('color'),
                        'icon': row.get('icon')
                    })
        except Exception as e:
            click.echo(f"❌ Error reading recipe categories CSV: {e}")
            return []

        return categories

    def seed_categories(self) -> int:
        """Seed recipe categories from CSV file."""
        click.echo("Loading recipe categories from CSV...", nl=False)
        categories_data = self.load_categories_from_csv()

        if not categories_data:
            click.echo(" ❌ No categories to seed")
            return 0

        click.echo(f" ✓ ({len(categories_data)} found)")

        count = 0
        for category_data in categories_data:
            # Check if category already exists
            try:
                existing = self.client.get_category_by_slug(category_data['slug'])
                if existing:
                    click.echo(f"   • {category_data['name']} (already exists)")
                    continue
            except Exception as e:
                click.echo(f"   ⚠️ Error checking if category exists {category_data['name']}: {e}")
                # Continue with creation attempt

            # Create new category
            category = RecipeCategoryModel(
                name=category_data['name'],
                slug=category_data['slug'],
                description=category_data['description'],
                color=category_data['color'],
                icon=category_data['icon'],
                is_system=True  # Mark as system-created
            )

            try:
                result = self.client.create_category(category)
                if result:
                    count += 1
                    click.echo(f"   • {category_data['name']}")
                else:
                    click.echo(f"   ❌ Failed to create category: {category_data['name']} (result: {result})")
            except Exception as e:
                click.echo(f"   ❌ Error creating category {category_data['name']}: {e}")

        return count

    def load_tags_from_csv(self) -> List[Dict]:
        """Load tag data from CSV file."""
        csv_path = self.seed_data_dir / "recipe_tags.csv"
        if not csv_path.exists():
            click.echo(f"❌ Recipe tags CSV not found: {csv_path}")
            return []

        tags = []
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    tags.append({
                        'name': row['name'],
                        'slug': row['slug'],
                        'description': row.get('description'),
                        'color': row.get('color')
                    })
        except Exception as e:
            click.echo(f"❌ Error reading recipe tags CSV: {e}")
            return []

        return tags

    def seed_tags(self) -> int:
        """Seed recipe tags from CSV file."""
        click.echo("Loading recipe tags from CSV...", nl=False)
        tags_data = self.load_tags_from_csv()

        if not tags_data:
            click.echo(" ❌ No tags to seed")
            return 0

        click.echo(f" ✓ ({len(tags_data)} found)")

        count = 0
        for tag_data in tags_data:
            # Check if tag already exists
            try:
                existing = self.client.get_tag_by_slug(tag_data['slug'])
                if existing:
                    click.echo(f"   • {tag_data['name']} (already exists)")
                    continue
            except Exception as e:
                click.echo(f"   ⚠️ Error checking if tag exists {tag_data['name']}: {e}")
                # Continue with creation attempt

            # Create new tag
            tag = RecipeTagModel(
                name=tag_data['name'],
                slug=tag_data['slug'],
                description=tag_data['description'],
                color=tag_data['color'],
                is_system=True  # Mark as system-created
            )

            try:
                result = self.client.create_tag(tag)
                if result:
                    count += 1
                    click.echo(f"   • {tag_data['name']}")
                else:
                    click.echo(f"   ❌ Failed to create tag: {tag_data['name']} (result: {result})")
            except Exception as e:
                click.echo(f"   ❌ Error creating tag {tag_data['name']}: {e}")

        return count

    def seed_recipes(self) -> int:
        """Seed recipes from CSV file."""
        if not self.seeded_ingredients:
            click.echo("❌ No ingredients available for recipe creation")
            return 0

        click.echo("Loading recipes from CSV...", nl=False)
        recipes_data = self.load_recipes_from_csv()

        if not recipes_data:
            click.echo(" ❌ No recipes to seed")
            return 0

        click.echo(f" ✓ ({len(recipes_data)} found)")

        count = 0
        for recipe_data in recipes_data:
            # Check if recipe already exists
            try:
                db = self.client.get_db_connection()
                if db is not None:
                    collection = db["recipes"]
                    existing = collection.find_one({"name": recipe_data['name']})
                    if existing:
                        continue
            except Exception:
                pass

            # Create RecipeIngredient objects
            recipe_ingredients = []

            for ingredient_data in recipe_data['ingredients']:
                ingredient_name = ingredient_data['name']
                amount = ingredient_data['amount']
                unit = ingredient_data['unit']

                if ingredient_name in self.seeded_ingredients:
                    ingredient = self.seeded_ingredients[ingredient_name]

                    recipe_ingredient = RecipeIngredient(
                        ingredient_id=ingredient.id,
                        ingredient=ingredient,
                        amount=amount,
                        unit=unit
                    )
                    recipe_ingredients.append(recipe_ingredient)

            if recipe_ingredients:
                # Handle category - find dynamic category by slug
                category_id = None

                # Category is now a raw string from CSV
                category_value = str(recipe_data['category'])

                # Convert to slug format for lookup
                category_slug = category_value.lower().replace(' ', '_').replace('-', '_')
                try:
                    category_obj = self.client.get_category_by_slug(category_slug)
                    if category_obj:
                        category_id = category_obj.id
                    else:
                        print(f"⚠️  Skipping recipe '{recipe_data['name']}' - category '{category_value}' not found")
                        continue  # Skip this recipe
                except Exception as e:
                    print(f"⚠️  Skipping recipe '{recipe_data['name']}' - error looking up category '{category_value}': {e}")
                    continue  # Skip this recipe

                # Calculate nutrition for the recipe
                nutrition = self.calculate_recipe_nutrition(recipe_ingredients, recipe_data['servings'])

                # Handle tags - convert string tags to tag IDs where possible
                tag_ids = []

                if recipe_data['tags']:
                    for tag_name in recipe_data['tags']:
                        try:
                            # Convert tag name to slug format (same as how tags are created)
                            # Handle various separators and formats
                            tag_slug = str(tag_name).lower().replace(' ', '-').replace('_', '-').replace(',', '').strip('-')
                            tag_obj = self.client.get_tag_by_slug(tag_slug)
                            if tag_obj:
                                tag_ids.append(str(tag_obj.id))
                            # If tag not found, skip it (don't add to legacy_tags)
                        except Exception as e:
                            print(f"Warning: Error processing tag '{tag_name}': {e}")

                # Create recipe with new dynamic format
                recipe = Recipe(
                    id=uuid4(),
                    name=recipe_data['name'],
                    description=recipe_data['description'],
                    category_id=category_id,
                    prep_time_minutes=recipe_data['prep_time_minutes'],
                    cook_time_minutes=recipe_data['cook_time_minutes'],
                    servings=recipe_data['servings'],
                    difficulty=recipe_data['difficulty'],
                    ingredients=recipe_ingredients,
                    instructions=recipe_data['instructions'],
                    tag_ids=tag_ids,
                    # Store calculated nutrition values
                    calories_per_serving_stored=nutrition['calories_per_serving'],
                    protein_per_serving_stored=nutrition['protein_per_serving'],
                    fat_per_serving_stored=nutrition['fat_per_serving'],
                    carbs_per_serving_stored=nutrition['carbs_per_serving'],
                    total_calories_stored=nutrition['total_calories'],
                    total_protein_stored=nutrition['total_protein'],
                    total_fat_stored=nutrition['total_fat'],
                    total_carbs_stored=nutrition['total_carbs'],
                    is_system=True,  # Mark as system-created
                    created_at=datetime.now(timezone.utc)
                )

                result = self.client.create_recipe(recipe)
                if result:
                    count += 1
                    click.echo(f"   • {recipe_data['name']}")

                    # Update usage counts for category and tags
                    try:
                        self.client.increment_category_usage(category_id)

                        if tag_ids:
                            for tag_id in tag_ids:
                                try:
                                    self.client.increment_tag_usage(UUID(tag_id))
                                except (ValueError, TypeError):
                                    pass
                    except Exception as e:
                        print(f"Warning: Failed to update usage counts for recipe {recipe_data['name']}: {e}")

        return count

    def calculate_recipe_nutrition(self, recipe_ingredients, servings):
        """Calculate nutrition for a recipe based on its ingredients."""
        total_calories = 0
        total_protein = 0
        total_fat = 0
        total_carbs = 0

        for ingredient in recipe_ingredients:
            if ingredient.ingredient and ingredient.amount:
                # Get nutrition per 100g
                kcal_per_100g = ingredient.ingredient.kcal_per_100g or 0
                protein_per_100g = ingredient.ingredient.protein_per_100g or 0
                fat_per_100g = ingredient.ingredient.fat_per_100g or 0
                carbs_per_100g = ingredient.ingredient.carbs_per_100g or 0

                # Convert amount to grams
                amount_in_grams = ingredient.ingredient.amount_to_grams(ingredient.amount, ingredient.unit)

                # Calculate nutrition for this ingredient
                total_calories += (kcal_per_100g * amount_in_grams) / 100
                total_protein += (protein_per_100g * amount_in_grams) / 100
                total_fat += (fat_per_100g * amount_in_grams) / 100
                total_carbs += (carbs_per_100g * amount_in_grams) / 100

        # Calculate per serving values
        calories_per_serving = total_calories / servings if servings > 0 else total_calories
        protein_per_serving = total_protein / servings if servings > 0 else total_protein
        fat_per_serving = total_fat / servings if servings > 0 else total_fat
        carbs_per_serving = total_carbs / servings if servings > 0 else total_carbs

        return {
            'calories_per_serving': round(calories_per_serving, 1),
            'protein_per_serving': round(protein_per_serving, 1),
            'fat_per_serving': round(fat_per_serving, 1),
            'carbs_per_serving': round(carbs_per_serving, 1),
            'total_calories': round(total_calories, 1),
            'total_protein': round(total_protein, 1),
            'total_fat': round(total_fat, 1),
            'total_carbs': round(total_carbs, 1)
        }

    # Removed seed_meals method - meal seeding deprecated in favor of recipe seeding
    
    def seed_all(self) -> Dict[str, int]:
        """Seed all data from CSV files."""
        results = {
            'categories': 0,
            'tags': 0,
            'ingredients': 0,
            'recipes': 0
        }

        # Seed categories first
        click.echo("📂 Seeding Recipe Categories:")
        results['categories'] = self.seed_categories()

        click.echo()

        # Seed tags
        click.echo("🏷️ Seeding Recipe Tags:")
        results['tags'] = self.seed_tags()

        click.echo()

        # Seed ingredients
        click.echo("🥕 Seeding Ingredients:")
        results['ingredients'] = self.seed_ingredients()

        click.echo()

        # Skip meal seeding - deprecated in favor of recipe seeding

        # Finally seed recipes
        click.echo("📖 Seeding Recipes:")
        results['recipes'] = self.seed_recipes()

        return results
    
    def remove_all_seeded_data(self) -> Dict[str, int]:
        """Remove all system-generated data (categories, tags, ingredients and recipes).

        Returns:
            Dictionary with counts of removed items
        """
        results = {
            'categories': 0,
            'tags': 0,
            'ingredients': 0,
            'recipes': 0,
            'favorites_cleared': 0
        }

        # Remove system categories
        click.echo("🧹 Removing system-generated categories...")
        try:
            db = self.client.get_db_connection()
            if db is None:
                click.echo(" ❌ Database connection failed")
                return results

            collection = db["recipe_categories"]
            query = {"is_system": True}
            delete_result = collection.delete_many(query)
            results['categories'] = delete_result.deleted_count
            click.echo(f" ✓ Removed {results['categories']} system categories")
        except Exception as e:
            click.echo(f" ❌ Error removing categories: {e}")

        click.echo()

        # Remove system tags
        click.echo("🧹 Removing system-generated tags...")
        try:
            db = self.client.get_db_connection()
            if db is None:
                return results

            collection = db["recipe_tags"]
            query = {"is_system": True}
            delete_result = collection.delete_many(query)
            results['tags'] = delete_result.deleted_count
            click.echo(f" ✓ Removed {results['tags']} system tags")
        except Exception as e:
            click.echo(f" ❌ Error removing tags: {e}")

        click.echo()

        # Remove system ingredients
        click.echo("🧹 Removing system-generated ingredients...")
        try:
            db = self.client.get_db_connection()
            if db is None:
                return results

            collection = db["ingredients"]
            query = {"is_system": True}
            delete_result = collection.delete_many(query)
            results['ingredients'] = delete_result.deleted_count
            click.echo(f" ✓ Removed {results['ingredients']} system ingredients")
        except Exception as e:
            click.echo(f" ❌ Error removing ingredients: {e}")

        click.echo()

        # Get system recipe IDs before removing them (for clearing favorites)
        system_recipe_ids = []
        try:
            db = self.client.get_db_connection()
            if db is not None:
                collection = db["recipes"]
                system_recipes = collection.find({"is_system": True}, {"id": 1})
                system_recipe_ids = [recipe["id"] for recipe in system_recipes if "id" in recipe]
        except Exception as e:
            click.echo(f" ⚠️ Warning: Could not get system recipe IDs for favorites cleanup: {e}")

        # Clear system recipe favorites from all users
        if system_recipe_ids:
            click.echo(f"🧹 Clearing system recipe favorites from user accounts ({len(system_recipe_ids)} recipes)...")
            try:
                results['favorites_cleared'] = self.client.clear_system_recipe_favorites(system_recipe_ids)
                click.echo(f" ✓ Cleared favorites for {results['favorites_cleared']} users")
            except Exception as e:
                click.echo(f" ❌ Error clearing favorites: {e}")
        else:
            click.echo("ℹ️ No system recipes found to clear favorites for")

        click.echo()

        # Remove system recipes
        click.echo("🧹 Removing system recipes...")
        try:
            db = self.client.get_db_connection()
            if db is None:
                return results

            collection = db["recipes"]
            query = {"is_system": True}
            delete_result = collection.delete_many(query)
            results['recipes'] = delete_result.deleted_count
            click.echo(f" ✓ Removed {results['recipes']} system recipes")
        except Exception as e:
            click.echo(f" ❌ Error removing recipes: {e}")

        return results


def seed_database():
    """Main seeding function that can be called from CLI or other modules."""
    click.echo("🌱 CalorIA Database Seeder")
    click.echo("=" * 40)
    
    seeder = DatabaseSeeder()
    
    # Test database connection
    if seeder.client.get_db_connection() is None:
        click.echo("❌ Failed to connect to database. Please check your MongoDB connection.")
        return False
    
    click.echo("✅ Database connection established")
    click.echo()
    
    # Perform seeding
    results = seeder.seed_all()
    
    click.echo()
    click.echo("=" * 40)
    click.echo("✅ Seeding completed!")
    click.echo(f"   • {results['categories']} recipe categories created")
    click.echo(f"   • {results['tags']} recipe tags created")
    click.echo(f"   • {results['ingredients']} new ingredients added")
    click.echo(f"   • {results['recipes']} recipes created")
    click.echo("   • All items marked as system-generated")
    click.echo()
    click.echo("💡 Run this script again anytime - it's safe and won't create duplicates!")
    
    return True


def remove_seeded_data():
    """Remove all system-generated data from the database."""
    click.echo("🧹 CalorIA Database Cleaner")
    click.echo("=" * 40)
    
    seeder = DatabaseSeeder()
    
    # Test database connection
    if seeder.client.get_db_connection() is None:
        click.echo("❌ Failed to connect to database. Please check your MongoDB connection.")
        return False
    
    click.echo("✅ Database connection established")
    click.echo()
    
    # Perform removal
    results = seeder.remove_all_seeded_data()
    
    click.echo()
    click.echo("=" * 40)
    click.echo("✅ Cleanup completed!")
    click.echo(f"   • Removed {results['categories']} system categories")
    click.echo(f"   • Removed {results['tags']} system tags")
    click.echo(f"   • Removed {results['ingredients']} system ingredients")
    click.echo(f"   • Removed {results['recipes']} system recipes")
    click.echo(f"   • Cleared system recipe favorites from {results['favorites_cleared']} users")
    click.echo()
    click.echo("💡 Use 'caloria seed' to re-seed the database with fresh data.")
    
    return True


@click.command()
def main():
    """CLI entry point for database seeding."""
    seed_database()


if __name__ == '__main__':
    main()