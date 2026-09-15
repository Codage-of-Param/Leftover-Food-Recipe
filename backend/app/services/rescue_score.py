from typing import List, Dict, Any, Optional

def calculate_rescue_score(
    recipe_id: str,
    matched_ingredients_count: int,
    total_required_ingredients: int,
    matched_use_first_count: int,
    total_use_first_count: int,
    all_quantities_sufficient: bool,
    any_quantity_insufficient: bool,
    cook_time_minutes: int,
    user_max_time: int,
    feasibility_class: str,
    required_missing: int,
    unused_recipe_ingredients_beyond_2: int
) -> Dict[str, Any]:
    """
    Calculates the Rescue Score (0-100) per TRD §17.
    """
    
    # 1. Ingredient Coverage (0-40)
    coverage_score = 0
    if total_required_ingredients > 0:
        coverage_score = int(40 * (matched_ingredients_count / total_required_ingredients))
        
    # 2. Priority Ingredient Bonus (0-15)
    priority_bonus = 0
    if total_use_first_count > 0:
        priority_bonus = int(15 * (matched_use_first_count / total_use_first_count))
        
    # 3. Quantity Feasibility (0-25)
    if any_quantity_insufficient:
        qty_score = 0
    elif all_quantities_sufficient:
        qty_score = 25
    else:
        # Unknown/unspecified
        qty_score = 15
        
    # 4. Time Compatibility (0-10)
    time_score = 0
    if cook_time_minutes <= user_max_time:
        time_score = 10
    elif cook_time_minutes <= user_max_time * 1.5:
        time_score = 5
        
    # 5. Recipe Feasibility Class (0-10)
    class_score_map = {"A": 10, "B": 7, "C": 4, "D": 0}
    class_score = class_score_map.get(feasibility_class, 0)
    
    # 6. Missing Ingredient Penalty (0 to -20)
    missing_penalty = max(-20, -5 * required_missing)
    
    # 7. Extra Ingredient Penalty (0 to -5)
    extra_penalty = max(-5, -1 * unused_recipe_ingredients_beyond_2)
    
    # Total Score
    total = (
        coverage_score + 
        priority_bonus + 
        qty_score + 
        time_score + 
        class_score + 
        missing_penalty + 
        extra_penalty
    )
    
    # Clamp to 0-100
    total = max(0, min(100, total))
    
    return {
        "total": total,
        "components": {
            "ingredient_coverage": coverage_score,
            "priority_bonus": priority_bonus,
            "quantity_feasibility": qty_score,
            "time_compatibility": time_score,
            "feasibility_class": class_score,
            "missing_penalty": missing_penalty,
            "extra_penalty": extra_penalty
        }
    }
