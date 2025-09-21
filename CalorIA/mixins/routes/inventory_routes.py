from flask import Blueprint, jsonify, request
from uuid import uuid4
from werkzeug.local import LocalProxy
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_db function and types
from CalorIA.backend.app import get_client
from CalorIA import types as Type

# Create the inventory routes blueprint
inventory_bp = Blueprint('inventory', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@inventory_bp.route('/api/inventory', methods=['GET'])
def get_inventory_items():
    """Get all inventory items with optional search query parameter and pagination"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        
        # Validate pagination parameters
        if page < 1:
            return jsonify({"error": "Page must be a positive integer"}), 400
        if limit < 1:
            return jsonify({"error": "Limit must be a positive integer"}), 400
        
        # Convert page to skip
        skip = (page - 1) * limit
        
        # Check for search query parameter
        search_query = request.args.get('search')
        
        # Get inventory items with search if provided
        if search_query:
            inventory_items = client.search_inventory_items(search_query, skip=skip, limit=limit)
        else:
            inventory_items = client.get_all_inventory_items(skip=skip, limit=limit)
        
        if inventory_items is None:
            inventory_items = []
            
        # Convert items to dictionary format for JSON response
        items_list = [item.to_dict() for item in inventory_items]
        
        # Determine if there are more results
        has_more = len(items_list) == limit
        
        # Get total count of inventory items
        if search_query:
            total_count = client.count_inventory_items(search_term=search_query)
        else:
            total_count = client.count_inventory_items()
            
        return jsonify({
            "inventory_items": items_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "has_more": has_more,
                "total": total_count
            }
        })
        
    except ValueError as e:
        return jsonify({"error": f"Invalid parameter value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to fetch inventory items: {str(e)}"}), 500

@inventory_bp.route('/api/inventory/<uuid:item_id>', methods=['GET'])
def get_inventory_item(item_id):
    """Get a specific inventory item by ID"""
    try:
        item = client.get_inventory_item_by_id(item_id)
        
        if item is None:
            return jsonify({"error": "Inventory item not found"}), 404
            
        return jsonify(item.to_dict())
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch inventory item: {str(e)}"}), 500

@inventory_bp.route('/api/inventory', methods=['POST'])
def create_inventory_item():
    """Create a new inventory item"""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Validate required fields
        required_fields = ['ingredient_id', 'quantity', 'unit']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
            
        # Create inventory item object
        inventory_item = Type.InventoryItem(
            id=data.get('id', uuid4()),
            ingredient_id=data['ingredient_id'],
            quantity=data['quantity'],
            unit=data['unit'],
            min_quantity=data.get('min_quantity'),
            max_quantity=data.get('max_quantity'),
            location=data.get('location'),
            notes=data.get('notes')
        )
        
        # Add to database
        result = client.create_inventory_item(inventory_item)
        
        if result is None:
            return jsonify({"error": "Failed to create inventory item"}), 500
            
        return jsonify({
            "message": "Inventory item created successfully",
            "inventory_item": inventory_item.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create inventory item: {str(e)}"}), 500

@inventory_bp.route('/api/inventory/<uuid:item_id>', methods=['PUT'])
def update_inventory_item(item_id):
    """Update an inventory item"""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Check if item exists
        existing_item = client.get_inventory_item_by_id(item_id)
        if existing_item is None:
            return jsonify({"error": "Inventory item not found"}), 404
        
        # Update item with provided data
        updated_item = Type.InventoryItem(
            id=item_id,
            ingredient_id=data.get('ingredient_id', existing_item.ingredient_id),
            quantity=data.get('quantity', existing_item.quantity),
            unit=data.get('unit', existing_item.unit),
            min_quantity=data.get('min_quantity', existing_item.min_quantity),
            max_quantity=data.get('max_quantity', existing_item.max_quantity),
            location=data.get('location', existing_item.location),
            notes=data.get('notes', existing_item.notes)
        )
        
        # Update in database
        # Convert the updated item to a dictionary and remove id field
        update_data = updated_item.to_dict()
        if 'id' in update_data:
            del update_data['id']
        
        result = client.update_inventory_item(item_id, update_data)
        
        if result is None:
            return jsonify({"error": "Failed to update inventory item"}), 500
            
        return jsonify({
            "message": "Inventory item updated successfully",
            "inventory_item": updated_item.to_dict()
        })
        
    except ValueError as e:
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to update inventory item: {str(e)}"}), 500

@inventory_bp.route('/api/inventory/<uuid:item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    """Delete an inventory item"""
    try:
        # Check if item exists
        existing_item = client.get_inventory_item_by_id(item_id)
        if existing_item is None:
            return jsonify({"error": "Inventory item not found"}), 404
        
        # Delete from database
        result = client.delete_inventory_item(item_id)
        
        if result is None:
            return jsonify({"error": "Failed to delete inventory item"}), 500
            
        return jsonify({"message": "Inventory item deleted successfully"})
        
    except Exception as e:
        return jsonify({"error": f"Failed to delete inventory item: {str(e)}"}), 500