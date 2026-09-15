from typing import List, Dict, Any, Optional

def classify_recipe(
    required_recipe_ingredients: List[Dict[str, Any]], 
    user_inventory: List[Dict[str, Any]]
) -> str:
    """
    Classifies a recipe into Feasibility Classes A, B, C, or D.
    
    Args:
        required_recipe_ingredients: List of dicts, each with 'ingredient_id' (uuid) and 'quantity' (numeric).
        user_inventory: List of dicts, each with 'ingredient_id', 'quantity' (numeric), 'unit'.
    
    Returns:
        A string representing the classification: "A", "B", "C", or "D".
        
    TRD §16 Classification Rules:
    A. Fully feasible — 0 required missing and no quantity_status="insufficient".
    B. Feasible with substitution — exactly 1 required ingredient missing AND substitute exists (LLM checked later, here we just assume it's candidate B if 1 missing).
    C. Feasible if 1–2 purchased — required_missing in {1,2}, no substitute found (or substitute logic defers to C).
    D. Not recommended — required_missing >= 3 or a core structural ingredient is missing.
    """
    
    inventory_map = {item['ingredient_id']: item for item in user_inventory}
    
    missing_count = 0
    insufficient_quantity = False
    
    for req in required_recipe_ingredients:
        ing_id = req['ingredient_id']
        if ing_id not in inventory_map:
            missing_count += 1
            # In a real system, we'd also check if the missing ingredient is a "core structural" one.
            # For MVP, we use just the count.
        else:
            user_item = inventory_map[ing_id]
            req_qty = req.get('quantity')
            user_qty = user_item.get('quantity')
            
            # Simple quantity check if both are present and units match (assuming normalized units)
            if req_qty is not None and user_qty is not None:
                if user_qty < req_qty:
                    insufficient_quantity = True
    
    if missing_count == 0 and not insufficient_quantity:
        return "A"
    
    if missing_count == 1:
        # We classify as B/C initially. If LLM finds substitution, it's B. 
        # For feasibility scoring baseline, we treat 1 missing as C (buy 1-2) until substitution succeeds.
        return "C" 
        
    if missing_count == 2:
        return "C"
        
    return "D"
