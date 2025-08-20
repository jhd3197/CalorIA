# CalorIA/__init__.py
from dotenv import load_dotenv

from CalorIA.mixins.tools import ToolsMixin
from CalorIA.mixins.mongo import MongoMixin

# Load environment variables from .env file
load_dotenv()

class Client(
    ToolsMixin,
    MongoMixin,
):
  
    def __init__(self, **kwargs):
        super().__init__(**kwargs)