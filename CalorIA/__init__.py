# CalorIA/__init__.py
from dotenv import load_dotenv

from CalorIA.mixins.tools import ToolsMixin
from CalorIA.mixins.mongo import MongoMixin

# Modules
from CalorIA.mixins.modules.ingredients import IngredientMixin
from CalorIA.mixins.modules.meals import MealMixin
from CalorIA.mixins.modules.meal_prep import MealPrepMixin
from CalorIA.mixins.modules.recipes import RecipeMixin
from CalorIA.mixins.modules.recipe_categories import RecipeCategoryMixin
from CalorIA.mixins.modules.recipe_tags import RecipeTagMixin
from CalorIA.mixins.modules.users import UserMixin
from CalorIA.mixins.modules.water import WaterMixin
from CalorIA.mixins.modules.weight import WeightMixin
from CalorIA.mixins.modules.activities import ActivityMixin

# Load environment variables from .env file
load_dotenv()

class Client(
    ToolsMixin,
    MongoMixin,
    IngredientMixin,
    MealMixin,
    MealPrepMixin,
    RecipeMixin,
    RecipeCategoryMixin,
    RecipeTagMixin,
    UserMixin,
    WaterMixin,
    WeightMixin,
    ActivityMixin
):
  
    def __init__(self, **kwargs):
        super().__init__(**kwargs)