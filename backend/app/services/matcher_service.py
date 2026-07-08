from typing import List, Tuple

def calculate_skill_match(candidate_skills: List[str], required_skills: List[str]) -> Tuple[float, List[str], List[str]]:
    """
    Deterministically computes:
    - match_percentage: percentage of required skills possessed by the candidate
    - matching_skills: list of required skills present in candidate skills
    - missing_skills: list of required skills absent from candidate skills
    """
    if not required_skills:
        return 100.0, [], []
        
    cand_list = [s.strip().lower() for s in candidate_skills if s.strip()]
    req_list = [s.strip().lower() for s in required_skills if s.strip()]
    
    matching_skills = []
    missing_skills = []
    
    def is_match(req: str, cand: str) -> bool:
        # 1. Exact match
        if req == cand:
            return True
            
        # 2. Prevent false matching between 'java' and 'javascript'/'java script'/'java scripts'
        if (req == "java" and ("javascript" in cand or "java script" in cand)) or \
           (cand == "java" and ("javascript" in req or "java script" in req)):
            return False
            
        # 3. Common developmental aliases/synonyms
        aliases = {
            "html": ["html5"],
            "html5": ["html"],
            "css": ["css3"],
            "css3": ["css"],
            "js": ["javascript", "js", "node.js", "reactjs", "vuejs", "java script", "java scripts"],
            "javascript": ["js", "js.org", "ecmascript", "java script", "java scripts"],
            "java script": ["javascript", "js", "java scripts"],
            "java scripts": ["javascript", "js", "java script"],
            "ts": ["typescript"],
            "typescript": ["ts"],
            "go": ["golang"],
            "golang": ["go"],
            "react": ["reactjs", "react.js"],
            "reactjs": ["react", "react.js"],
            "vue": ["vuejs", "vue.js"],
            "vuejs": ["vue", "vue.js"],
        }
        
        if req in aliases and any(a in cand for a in aliases[req]):
            return True
        if cand in aliases and any(a in req for a in aliases[cand]):
            return True
            
        # 4. Safe substring matching (len >= 3 to prevent false matches like 'c' in 'css')
        if len(req) >= 3 and req in cand:
            return True
        if len(cand) >= 3 and cand in req:
            return True
            
        return False

    for req in req_list:
        matched = False
        for cand in cand_list:
            if is_match(req, cand):
                matched = True
                break
        if matched:
            matching_skills.append(req)
        else:
            missing_skills.append(req)
            
    # Remove duplicates and sort
    matching_skills = sorted(list(set(matching_skills)))
    missing_skills = sorted(list(set(missing_skills)))
    
    # Calculate percentage
    match_percentage = round((len(matching_skills) / len(req_list)) * 100, 2)
    
    return match_percentage, matching_skills, missing_skills
