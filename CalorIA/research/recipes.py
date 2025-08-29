#!/usr/bin/env python3
"""
CalorIA Recipe Research
AI-powered recipe discovery and database population.
"""

import click
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from uuid import uuid4

from .tools import BaseResearcher, ResearchResult
from ..types import Recipe, RecipeCategory, DifficultyLevel, RecipeIngredient
from .. import Client


class RecipeResearcher(BaseResearcher):
    """AI-powered recipe research and discovery system."""

    def get_existing_recipes_by_category(self, category: str) -> List[str]:
        """Get list of existing recipe names for a category."""
        try:
            db = self.client.get_db_connection()
            if db is None:
                return []

            collection = db["recipes"]
            cursor = collection.find({"category": category}, {"name": 1})

            return [doc["name"] for doc in cursor]
        except Exception as e:
            click.echo(f"❌ Error getting existing recipes: {e}")
            return []

    def generate_research_prompt(self, category: str, existing_recipes: List[str], letters: Optional[List[str]] = None) -> str:
        """Generate a prompt for the AI to research missing recipes by letter."""

        # If no letters specified, use a default set
        if not letters:
            letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

        # Generate letter-based requests
        letter_requests = []
        for letter in letters[:5]:  # Limit to 5 letters per request
            letter_requests.append(f"3-5 {category} recipes starting with '{letter}'")

        # Map category to RecipeCategory enum
        category_mapping = {
            "breakfast": "breakfast",
            "lunch": "lunch",
            "dinner": "dinner",
            "snack": "snack",
            "dessert": "dessert",
            "beverage": "beverage",
            "appetizer": "appetizer",
            "soup": "soup",
            "salad": "salad",
            "main_course": "main_course",
            "side_dish": "side_dish",
            "healthy": "healthy"
        }

        recipe_category = category_mapping.get(category.lower(), "main_course")

        prompt = f"""I need you to generate a JSON array of missing {category} recipes for a nutrition database, organized by letter.

Focus on recipes that start with these letters: {', '.join(letters[:5])}

Existing recipes to avoid: {', '.join(existing_recipes[:10])}{'...' if len(existing_recipes) > 10 else ''}

Please think step by step, then provide the final JSON array.

Step 1: For each letter, list 3-5 {category} recipes that start with that letter and are not in the existing list.
Step 2: For each recipe, include: name, description, prep_time_minutes, cook_time_minutes, servings, difficulty, tags, instructions (as array), ingredients (with name, amount, unit).
Step 3: Format as JSON array with these fields: name, description, category ("{recipe_category}"), prep_time_minutes, cook_time_minutes, servings, difficulty, tags, instructions, ingredients.

Example format:
[
  {{
    "name": "Avocado Toast",
    "description": "Simple and healthy breakfast with avocado on toast",
    "category": "{recipe_category}",
    "prep_time_minutes": 10,
    "cook_time_minutes": 5,
    "servings": 2,
    "difficulty": "easy",
    "tags": ["vegetarian", "quick", "healthy"],
    "instructions": [
      "Toast the bread slices until golden",
      "Mash the avocado with lemon juice and salt",
      "Spread avocado mixture on toast",
      "Add toppings and serve immediately"
    ],
    "ingredients": [
      {{
        "name": "Whole Wheat Bread",
        "amount": 2,
        "unit": "unit"
      }},
      {{
        "name": "Avocado",
        "amount": 1,
        "unit": "unit"
      }},
      {{
        "name": "Lemon",
        "amount": 0.5,
        "unit": "unit"
      }}
    ]
  }}
]

After your thinking, end with the JSON array:"""

        return prompt

    def query_ai_for_recipes(self, category: str, letters: Optional[List[str]] = None) -> Optional[List[Dict]]:
        """Query AI for missing recipes in a category."""

        existing_recipes = self.get_existing_recipes_by_category(category)
        prompt = self.generate_research_prompt(category, existing_recipes, letters)

        content = self.query_ai(prompt)
        if not content:
            return None

        return self.parse_json_response(content)

    def parse_recipe_data(self, recipe_data: Dict) -> Optional[Recipe]:
        """Parse AI response data into a Recipe object."""

        try:
            # Validate required fields
            required_fields = ['name', 'prep_time_minutes', 'servings', 'difficulty', 'instructions', 'ingredients']
            for field in required_fields:
                if field not in recipe_data or recipe_data[field] is None:
                    click.echo(f"❌ Missing required field: {field}")
                    return None

            # Parse category
            category_str = recipe_data.get('category', 'main_course')
            try:
                category = RecipeCategory(category_str)
            except ValueError:
                click.echo(f"❌ Invalid category: {category_str}, defaulting to 'main_course'")
                category = RecipeCategory.MAIN_COURSE

            # Parse difficulty
            difficulty_str = recipe_data.get('difficulty', 'medium')
            try:
                difficulty = DifficultyLevel(difficulty_str.lower())
            except ValueError:
                click.echo(f"❌ Invalid difficulty: {difficulty_str}, defaulting to 'medium'")
                difficulty = DifficultyLevel.MEDIUM

            # Parse ingredients
            recipe_ingredients = []
            for ingredient_data in recipe_data.get('ingredients', []):
                try:
                    # Create a basic ingredient reference (you might want to look up actual ingredients)
                    recipe_ingredient = RecipeIngredient(
                        ingredient_id=None,  # Would need to look up actual ingredient
                        ingredient=None,    # Would need to look up actual ingredient
                        amount=float(ingredient_data.get('amount', 1)),
                        unit=ingredient_data.get('unit', 'unit'),
                        notes=None
                    )
                    recipe_ingredients.append(recipe_ingredient)
                except Exception as e:
                    click.echo(f"⚠️  Error parsing ingredient: {e}")
                    continue

            # Create recipe object
            recipe = Recipe(
                id=uuid4(),
                name=recipe_data['name'],
                description=recipe_data.get('description', ''),
                category=category,
                prep_time_minutes=int(recipe_data['prep_time_minutes']),
                cook_time_minutes=recipe_data.get('cook_time_minutes'),
                servings=int(recipe_data['servings']),
                difficulty=difficulty,
                ingredients=recipe_ingredients,
                instructions=recipe_data.get('instructions', []),
                tags=recipe_data.get('tags', []),
                is_system=True,
                created_at=datetime.now(timezone.utc)
            )

            return recipe

        except Exception as e:
            click.echo(f"❌ Error parsing recipe data: {e}")
            return None

    def is_duplicate_recipe(self, recipe: Recipe) -> bool:
        """Check if a recipe already exists (case-insensitive)."""

        try:
            db = self.client.get_db_connection()
            if db is None:
                return False

            collection = db["recipes"]
            existing = collection.find_one({"name": {"$regex": f"^{re.escape(recipe.name)}$", "$options": "i"}})
            return existing is not None

        except Exception as e:
            click.echo(f"❌ Error checking for duplicate recipe: {e}")
            return False

    def research_and_add_recipes(self, category: str, max_recipes: int = 10, dry_run: bool = False, letters: Optional[List[str]] = None) -> ResearchResult:
        """Research and add missing recipes for a category."""

        results = ResearchResult()

        if letters:
            click.echo(f"🔍 Researching missing recipes for category: {category} (letters: {', '.join(letters)})")
        else:
            click.echo(f"🔍 Researching missing recipes for category: {category}")

        # Query AI for recipes
        recipes_data = self.query_ai_for_recipes(category, letters)
        if not recipes_data:
            click.echo("❌ Failed to get recipes from AI")
            return results

        results.researched = len(recipes_data)
        click.echo(f"✓ Found {len(recipes_data)} potential recipes from AI")

        # Process each recipe
        added_count = 0
        for i, recipe_data in enumerate(recipes_data):
            if added_count >= max_recipes:
                break

            click.echo(f"  Processing {i+1}/{len(recipes_data)}: {recipe_data.get('name', 'Unknown')}")

            # Parse recipe data
            recipe = self.parse_recipe_data(recipe_data)
            if not recipe:
                results.errors += 1
                continue

            # Check for duplicates
            if self.is_duplicate_recipe(recipe):
                click.echo(f"    ⚠️  Duplicate found: {recipe.name}")
                results.duplicates += 1
                continue

            # Add recipe
            if not dry_run:
                result = self.client.create_recipe(recipe)
                if result:
                    click.echo(f"    ✅ Added: {recipe.name}")
                    results.added += 1
                    added_count += 1
                else:
                    click.echo(f"    ❌ Failed to add: {recipe.name}")
                    results.errors += 1
            else:
                click.echo(f"    🔍 Would add: {recipe.name} (dry run)")
                results.added += 1
                added_count += 1

        return results

    def get_available_categories(self) -> List[str]:
        """Get list of available recipe categories from existing data."""

        try:
            db = self.client.get_db_connection()
            if db is None:
                return []

            collection = db["recipes"]
            categories = collection.distinct("category")
            return sorted(categories)

        except Exception as e:
            click.echo(f"❌ Error getting categories: {e}")
            return []


def research_recipes_command(category=None, max_recipes=10, letters=None, dry_run=False):
    """Main function for the research-recipes CLI command."""

    click.echo("📖 CalorIA Recipe Research System")
    click.echo("=" * 50)

    researcher = RecipeResearcher()

    # Get available categories
    categories = researcher.get_available_categories()
    if not categories:
        # If no recipes exist, provide default categories
        categories = ["breakfast", "lunch", "dinner", "snack", "dessert", "beverage", "appetizer", "soup", "salad", "main_course", "side_dish", "healthy"]

    # Category selection
    if not category:
        click.echo(f"📂 Available categories: {', '.join(categories)}")
        category = click.prompt("Enter category to research", type=click.Choice(categories))

    # Validate category exists
    if category not in categories:
        click.echo(f"❌ Category '{category}' not found in database.")
        click.echo(f"📂 Available categories: {', '.join(categories)}")
        return

    # Letters selection
    if not letters:
        letters_input = click.prompt("Enter letters to research (comma-separated, e.g., 'A,B,C')", default="")
        if letters_input.strip():
            letters = [letter.strip().upper() for letter in letters_input.split(',')]
        else:
            letters = None

    # Max recipes
    if not max_recipes or max_recipes <= 0:
        max_recipes = click.prompt("Maximum recipes to add", type=int, default=10)

    # Dry run option
    if not dry_run:
        dry_run = click.confirm("Dry run? (Show what would be added without actually adding)", default=False)

    # Show research plan
    if letters:
        click.echo(f"📝 Researching {category} recipes starting with: {', '.join(letters)}")
    else:
        click.echo(f"📝 Researching {category} recipes (systematic approach)")

    # Confirm
    if not dry_run:
        if not click.confirm(f"Add up to {max_recipes} recipes to category '{category}'?", default=True):
            click.echo("❌ Operation cancelled")
            return

    # Perform research
    click.echo()
    results = researcher.research_and_add_recipes(category, max_recipes, dry_run, letters)

    # Summary
    click.echo()
    click.echo("=" * 50)
    click.echo("📊 Research Summary:")
    click.echo(f"   • Researched: {results.researched} recipes")
    click.echo(f"   • Added: {results.added} recipes")
    click.echo(f"   • Duplicates skipped: {results.duplicates} recipes")
    click.echo(f"   • Errors: {results.errors} recipes")

    if dry_run:
        click.echo("💡 This was a dry run - no recipes were actually added")
    else:
        click.echo("✅ Research complete!")


if __name__ == '__main__':
    research_recipes_command()