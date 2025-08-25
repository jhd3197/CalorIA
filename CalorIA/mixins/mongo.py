import os
import logging
from typing import Optional, Type as TypingType, TypeVar, Any, Dict, List
from uuid import UUID
from datetime import datetime
from dotenv import load_dotenv
import pymongo
from bson import ObjectId

load_dotenv()
logger = logging.getLogger(__name__)

from .. import types as Type  # tu módulo types

T = TypeVar("T", bound=Type.CalorIAModel)

class MongoMixin:
    """Mixin para operaciones MongoDB con utilidades comunes."""

    def __init__(self):
        self._client: Optional[pymongo.MongoClient] = None
        self._db = None
        self._db_name = os.getenv("MONGODB_DB", "caloria")
        self._mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

    def get_db_connection(self):
        """Inicializa y devuelve la DB (client guardado en self._client)."""
        if self._db is None:
            try:
                # Opciones básicas, ajusta según necesidades (pool, timeout...)
                self._client = pymongo.MongoClient(
                    self._mongo_uri,
                    serverSelectionTimeoutMS=5000,
                )
                self._db = self._client[self._db_name]
            except Exception:
                logger.exception("Database connection error")
                self._db = None
        return self._db

    def close_connection(self):
        """Cierra la conexión MongoClient si existe."""
        try:
            if self._client:
                self._client.close()
                self._client = None
                self._db = None
        except Exception:
            logger.exception("Error closing MongoDB connection")

    # --- helpers internos ---
    def _model_to_dict(self, model: Type.CalorIAModel) -> Dict[str, Any]:
        """Convierte un modelo pydantic a dict para insertar/actualizar."""
        if hasattr(model, "to_dict"):
            d = model.to_dict()
        else:
            # intenta usar .dict() (pydantic)
            d = getattr(model, "dict", lambda **kwargs: {})(
                exclude_none=True, by_alias=True
            )
        # elimina claves que no quieras, añade timestamps por defecto
        d.setdefault("updated_at", datetime.utcnow())
        if "created_at" not in d:
            d.setdefault("created_at", datetime.utcnow())
        return d

    def _prepare_doc_from_mongo(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convierte ObjectId a str para que model.from_dict lo pueda manejar."""
        if not doc:
            return doc
        if "_id" in doc:
            try:
                doc["id"] = str(doc["_id"])
            except Exception:
                doc["id"] = doc["_id"]
            # opcional: borra _id si no lo usas en el modelo
            # del doc["_id"]
        return doc

    # --- operaciones CRUD mejoradas ---
    def create_document(self, collection_name: str, doc: Type.CalorIAModel) -> Optional[str]:
        try:
            db = self.get_db_connection()
            if not db:
                return None
            collection = db[collection_name]
            payload = self._model_to_dict(doc)
            result = collection.insert_one(payload)
            return str(result.inserted_id)
        except Exception:
            logger.exception("Error creating document in %s", collection_name)
            return None

    def bulk_insert_many(self, collection_name: str, docs: List[Type.CalorIAModel]) -> Optional[List[str]]:
        try:
            db = self.get_db_connection()
            if not db:
                return None
            collection = db[collection_name]
            payloads = [self._model_to_dict(d) for d in docs]
            res = collection.insert_many(payloads)
            return [str(i) for i in res.inserted_ids]
        except Exception:
            logger.exception("Error in bulk insert to %s", collection_name)
            return None

    def get_document(self, collection_name: str, query: Dict[str, Any], model_class: TypingType[T]) -> Optional[T]:
        try:
            db = self.get_db_connection()
            if not db:
                return None
            collection = db[collection_name]
            doc = collection.find_one(query)
            if not doc:
                return None
            doc = self._prepare_doc_from_mongo(doc)
            return model_class.from_dict(doc)
        except Exception:
            logger.exception("Error getting document from %s", collection_name)
            return None

    def find_documents(self, collection_name: str, query: Dict[str, Any], model_class: TypingType[T],
                       skip: int = 0, limit: int = 100, sort: Optional[List[tuple]] = None) -> List[T]:
        try:
            db = self.get_db_connection()
            if not db:
                return []
            cursor = db[collection_name].find(query).skip(skip).limit(limit)
            if sort:
                cursor = cursor.sort(sort)
            results = []
            for doc in cursor:
                doc = self._prepare_doc_from_mongo(doc)
                try:
                    results.append(model_class.from_dict(doc))
                except Exception:
                    logger.exception("Error converting doc to model, skipping doc: %s", doc.get("id"))
            return results
        except Exception:
            logger.exception("Error finding documents in %s", collection_name)
            return []

    def count_documents(self, collection_name: str, query: Dict[str, Any]) -> int:
        try:
            db = self.get_db_connection()
            if not db:
                return 0
            return db[collection_name].count_documents(query)
        except Exception:
            logger.exception("Error counting documents in %s", collection_name)
            return 0

    def update_document(self, collection_name: str, query: Dict[str, Any], update_data: Dict[str, Any]) -> bool:
        try:
            db = self.get_db_connection()
            if not db:
                return False
            update_data["updated_at"] = datetime.utcnow()
            result = db[collection_name].update_one(query, {"$set": update_data})
            return result.modified_count > 0 or result.upserted_id is not None
        except Exception:
            logger.exception("Error updating document in %s", collection_name)
            return False

    def upsert_document(self, collection_name: str, query: Dict[str, Any], update_data: Dict[str, Any]) -> Optional[str]:
        """Update with upsert: devuelve inserted_id (str) o None."""
        try:
            db = self.get_db_connection()
            if not db:
                return None
            update_data["updated_at"] = datetime.utcnow()
            res = db[collection_name].update_one(query, {"$set": update_data}, upsert=True)
            if res.upserted_id:
                return str(res.upserted_id)
            # si no creó, intenta buscar el documento que se modificó
            doc = db[collection_name].find_one(query, {"_id": 1})
            return str(doc["_id"]) if doc else None
        except Exception:
            logger.exception("Error upserting document in %s", collection_name)
            return None

    def replace_document(self, collection_name: str, query: Dict[str, Any], new_doc: Dict[str, Any]) -> bool:
        try:
            db = self.get_db_connection()
            if not db:
                return False
            new_doc["updated_at"] = datetime.utcnow()
            res = db[collection_name].replace_one(query, new_doc, upsert=False)
            return res.modified_count > 0
        except Exception:
            logger.exception("Error replacing document in %s", collection_name)
            return False

    def delete_document(self, collection_name: str, query: Dict[str, Any]) -> bool:
        try:
            db = self.get_db_connection()
            if not db:
                return False
            res = db[collection_name].delete_one(query)
            return res.deleted_count > 0
        except Exception:
            logger.exception("Error deleting document from %s", collection_name)
            return False