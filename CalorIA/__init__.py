# CalorIA/__init__.py
from dotenv import load_dotenv

from CalorIA.mixins.tools import ToolsMixin
from CalorIA.mixins.mongo import MongoMixin

# Modules
from CalorIA.mixins.modules.ingredients import IngredientMixin
from CalorIA.mixins.modules.meals import MealMixin
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
    UserMixin,
    WaterMixin,
    WeightMixin,
    ActivityMixin
):
  
    def __init__(self, **kwargs):
        super().__init__(**kwargs)