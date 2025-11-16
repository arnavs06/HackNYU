"""
FastAPI server for EcoScan backend.
Provides REST API endpoints for the mobile frontend.
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import tempfile
import os
from datetime import datetime
import traceback
import json

from tagging import combine_lykdat_and_tag_metadata
from similar_search import find_similar_clothing_full_pipeline
from helper import get_env

try:
    import google.generativeai as genai
    GEMINI_API_KEY = get_env("GEMINI_API_KEY", required=False)
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
except ImportError:
    genai = None
    GEMINI_API_KEY = None

# Pydantic models
class ScanHistoryItem(BaseModel):
    id: str
    material: str
    country: str
    ecoScore: Dict[str, Any]
    brand: Optional[str] = None
    timestamp: str

class PicksRequest(BaseModel):
    user_id: str
    scan_history: List[ScanHistoryItem]
    reference_image_uri: Optional[str] = None

app = FastAPI(
    title="EcoScan API",
    description="Backend API for sustainable fashion scanning",
    version="1.0.0"
)

# CORS for React Native/Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "EcoScan API",
        "version": "1.0.0"
    }


@app.post("/api/scan")
async def scan_clothing(
    tag_image: UploadFile = File(..., description="Clothing tag/label image"),
    clothing_image: UploadFile = File(..., description="Main clothing item image"),
    user_id: Optional[str] = Form(None, description="Optional user ID for history tracking")
):
    """
    Main scanning endpoint - accepts both tag and clothing images.
    Returns eco-score, material info, and similar alternatives.
    
    Steps:
    1. Save uploaded images to temporary files
    2. Run Lykdat deep tagging on clothing image
    3. Run Vision OCR + Gemini parsing on tag image
    4. Compute eco-score
    5. Find similar sustainable alternatives
    6. Transform to frontend format
    """
    tag_path = None
    clothing_path = None
    
    try:
        # Validate file types
        if not tag_image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Tag file must be an image")
        if not clothing_image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Clothing file must be an image")
        
        # Save uploaded files temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tag_file:
            tag_content = await tag_image.read()
            tag_file.write(tag_content)
            tag_path = tag_file.name
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as clothing_file:
            clothing_content = await clothing_image.read()
            clothing_file.write(clothing_content)
            clothing_path = clothing_file.name
        
        print(f"📸 Processing scan for user: {user_id or 'anonymous'}")
        print(f"  Tag image: {len(tag_content)} bytes")
        print(f"  Clothing image: {len(clothing_content)} bytes")
        
        # Run analyze algorithm - combines Lykdat + Gemini
        print("🔍 Running deep tagging and tag analysis...")
        result = combine_lykdat_and_tag_metadata(
            clothing_image_path=clothing_path,
            tag_image_path=tag_path
        )
        
        # Get similar products (alternatives)
        print("🔎 Finding similar sustainable alternatives...")
        similar = find_similar_clothing_full_pipeline(
            clothing_image_path=clothing_path,
            max_results=20
        )
        
        # Transform to frontend format
        print("✨ Transforming response to frontend format...")
        response = transform_to_frontend_format(result, similar, user_id)
        
        print(f"✅ Scan complete! Score: {response['ecoScore']['score']}/100")
        
        return {"success": True, "data": response}
        
    except Exception as e:
        print(f"❌ Error processing scan: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process images: {str(e)}"
        )
    
    finally:
        # Cleanup temp files
        if tag_path and os.path.exists(tag_path):
            try:
                os.unlink(tag_path)
            except:
                pass
        if clothing_path and os.path.exists(clothing_path):
            try:
                os.unlink(clothing_path)
            except:
                pass


def transform_to_frontend_format(
    backend_result: Dict[str, Any],
    similar_products: List[Dict[str, Any]],
    user_id: Optional[str]
) -> Dict[str, Any]:
    """
    Transform backend response to match frontend ScanResult interface.
    
    Backend format:
    {
      "combined_product_metadata": {...},
      "eco_score": {
        "grade": "A",
        "impact_score": 1.5,
        "material_and_origin": "...",
        "impact_explanation": "..."
      },
      ...
    }
    
    Frontend format (ScanResult):
    {
      "id": "scan_...",
      "timestamp": "...",
      "material": "100% Organic Cotton",
      "country": "Portugal",
      "ecoScore": {
        "score": 85,
        "grade": "A",
        "flags": [...]
      },
      "explanation": "...",
      "confidence": 0.95,
      "similarProducts": [...]
    }
    """
    # Extract data from backend
    metadata = backend_result.get("combined_product_metadata", {})
    eco = backend_result.get("eco_score", {})
    
    # Convert impact_score (1-5, lower is better) to score (0-100, higher is better)
    # Formula: (6 - impact_score) / 5 * 100
    impact_score = eco.get("impact_score", 3.0)
    score = max(0, min(100, int((6 - impact_score) / 5 * 100)))
    
    # Extract material and origin
    material = metadata.get("materials") or "Unknown Material"
    country = metadata.get("origin") or "Unknown Origin"
    
    # Parse flags from explanation and metadata
    flags = parse_impact_flags(eco, metadata, material, country)
    
    # Get confidence from Lykdat results if available
    lykdat_raw = backend_result.get("lykdat_deep_tag_raw", {})
    confidence = extract_confidence(lykdat_raw)
    
    return {
        "id": f"scan_{int(datetime.now().timestamp())}_{user_id or 'anon'}",
        "userId": user_id,  # Include userId for history tracking
        "timestamp": datetime.now().isoformat(),
        "material": material,
        "country": country,
        "brand": metadata.get("brand"),
        "productName": metadata.get("product_name"),
        "imageUri": None,  # Mobile app will store image locally
        "ecoScore": {
            "score": score,
            "grade": eco.get("grade", "C"),
            "flags": flags
        },
        "explanation": eco.get("impact_explanation", "No explanation available."),
        "confidence": confidence,
        "certifications": metadata.get("certifications", []),
        "improvementTips": generate_tips(score, metadata),
        "similarProducts": transform_similar_products(similar_products)
    }


def parse_impact_flags(
    eco: Dict[str, Any],
    metadata: Dict[str, Any],
    material: str,
    country: str
) -> List[Dict[str, str]]:
    """
    Extract impact flags from explanation text and material/origin data.
    
    Returns list of flags in format:
    {
      "type": "microplastic" | "carbon" | "water" | "labor",
      "severity": "low" | "medium" | "high",
      "label": "Human readable description"
    }
    """
    flags = []
    explanation = eco.get("impact_explanation", "").lower()
    material_lower = material.lower()
    
    # Microplastic detection (synthetic materials)
    synthetic_materials = ["polyester", "nylon", "acrylic", "elastane", "spandex", "lycra", "synthetic"]
    if any(syn in material_lower for syn in synthetic_materials):
        severity = "high" if "polyester" in material_lower or "acrylic" in material_lower else "medium"
        flags.append({
            "type": "microplastic",
            "severity": severity,
            "label": "Microplastic Shedding Risk"
        })
    
    # Carbon/emissions detection
    if any(word in explanation for word in ["carbon", "emission", "fossil", "petroleum"]):
        severity = "high" if "high carbon" in explanation else "medium"
        flags.append({
            "type": "carbon",
            "severity": severity,
            "label": "High Carbon Footprint"
        })
    
    # Water usage detection
    if any(word in explanation for word in ["water", "drought", "irrigation"]):
        severity = "high" if "high water" in explanation else "medium"
        flags.append({
            "type": "water",
            "severity": severity,
            "label": "High Water Usage"
        })
    
    # Labor concerns (based on country and explanation)
    risky_countries = ["bangladesh", "india", "china", "vietnam", "cambodia", "myanmar"]
    if any(risk_country in country.lower() for risk_country in risky_countries):
        if "labor" in explanation or "worker" in explanation:
            flags.append({
                "type": "labor",
                "severity": "high",
                "label": "Labor Risk Concerns"
            })
        else:
            flags.append({
                "type": "labor",
                "severity": "medium",
                "label": "Medium Labor Risk"
            })
    
    # Positive flags for good materials
    good_materials = ["organic", "recycled", "hemp", "linen", "bamboo"]
    if any(good in material_lower for good in good_materials):
        flags.append({
            "type": "carbon",
            "severity": "low",
            "label": "Low Environmental Impact"
        })
    
    return flags


def extract_confidence(lykdat_raw: Dict[str, Any]) -> float:
    """Extract average confidence from Lykdat deep tagging results"""
    try:
        items = lykdat_raw.get("items", [])
        if items and len(items) > 0:
            confidences = [item.get("confidence", 0.85) for item in items]
            return sum(confidences) / len(confidences)
    except:
        pass
    return 0.85  # Default confidence


def generate_tips(score: int, metadata: Dict[str, Any]) -> List[str]:
    """Generate improvement tips based on score and material"""
    material = (metadata.get("materials") or "").lower()
    
    if score >= 80:
        return [
            "Excellent choice! Keep supporting sustainable brands",
            "Share your eco-friendly finds with friends",
            "Consider repairing and maintaining this item for longevity"
        ]
    elif score >= 60:
        return [
            "Good choice! Look for even more sustainable options next time",
            "Consider washing in cold water to reduce microplastic shedding",
            "Support brands with transparent supply chains"
        ]
    else:
        tips = [
            "Look for organic or recycled materials next time",
            "Choose natural fibers like cotton, linen, or hemp",
            "Support brands with transparent supply chains",
            "Consider second-hand or vintage options"
        ]
        
        if any(syn in material for syn in ["polyester", "nylon", "acrylic"]):
            tips.append("Use a microplastic-catching washing bag for synthetic fabrics")
        
        return tips


def transform_similar_products(similar_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Transform similar products to frontend format.
    
    Returns list of alternatives with better eco-scores.
    """
    alternatives = []
    
    for idx, item in enumerate(similar_list):
        metadata = item.get("combined_product_metadata", {})
        eco = item.get("eco_score", {})
        
        # Convert impact_score to 0-100 scale
        impact_score = eco.get("impact_score", 3.0)
        score = max(0, min(100, int((6 - impact_score) / 5 * 100)))
        
        # Extract product info
        title = metadata.get("title") or metadata.get("product_name") or f"Similar Item {idx + 1}"
        url = metadata.get("url", "")
        
        alternatives.append({
            "id": f"alt_{idx}_{url.split('/')[-1] if url else idx}",
            "title": title,
            "brand": metadata.get("brand"),
            "material": metadata.get("materials") or "Unknown",
            "ecoScore": score,
            "grade": eco.get("grade", "C"),
            "url": url,
            "price": metadata.get("price"),
            "currency": metadata.get("currency"),
            "description": eco.get("impact_explanation", "")[:100] + "..."
        })
    
    return alternatives


def analyze_scan_history_with_gemini(scan_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Use Gemini to analyze user's scan history and extract preferences.
    
    Returns:
    {
      "common_materials": ["organic cotton", "linen"],
      "average_eco_score": 75.5,
      "preferred_countries": ["Portugal", "USA"],
      "material_frequency": {"organic cotton": 5, "linen": 3},
      "style_summary": "User prefers natural, sustainable materials..."
    }
    """
    if not genai or not GEMINI_API_KEY:
        print("⚠️ Gemini not available, using fallback analysis")
        return fallback_history_analysis(scan_history)
    
    try:
        # Prepare history summary for Gemini
        history_text = "User's scan history:\n\n"
        for i, scan in enumerate(scan_history[:20], 1):  # Limit to 20 most recent
            history_text += f"{i}. Material: {scan.get('material', 'Unknown')}\n"
            history_text += f"   Country: {scan.get('country', 'Unknown')}\n"
            history_text += f"   Eco-Score: {scan.get('ecoScore', {}).get('score', 0)}/100\n"
            history_text += f"   Brand: {scan.get('brand', 'Unknown')}\n\n"
        
        prompt = f"""{history_text}

Based on this user's clothing scan history, analyze their preferences and provide a JSON response with:
1. "common_materials": Top 3-5 materials they scan most (e.g., ["organic cotton", "linen"])
2. "average_eco_score": Average eco-score of their scans (number)
3. "preferred_countries": Top 3 countries of origin they encounter
4. "style_summary": 1-2 sentence description of their sustainability preferences
5. "recommendation_keywords": 3-5 keywords for finding similar sustainable items

Return ONLY valid JSON, no markdown formatting."""

        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        
        # Parse JSON from response
        response_text = response.text.strip()
        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        analysis = json.loads(response_text.strip())
        print(f"✨ Gemini analysis complete: {analysis.get('style_summary', '')}")
        return analysis
        
    except Exception as e:
        print(f"⚠️ Gemini analysis failed: {e}, using fallback")
        traceback.print_exc()
        return fallback_history_analysis(scan_history)


def fallback_history_analysis(scan_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Simple statistical analysis when Gemini is unavailable"""
    if not scan_history:
        return {
            "common_materials": [],
            "average_eco_score": 50,
            "preferred_countries": [],
            "style_summary": "No history available",
            "recommendation_keywords": ["sustainable", "organic", "eco-friendly"]
        }
    
    # Count materials
    material_counts = {}
    eco_scores = []
    country_counts = {}
    
    for scan in scan_history:
        material = scan.get("material", "").lower()
        if material:
            material_counts[material] = material_counts.get(material, 0) + 1
        
        score = scan.get("ecoScore", {}).get("score", 0)
        if score > 0:
            eco_scores.append(score)
        
        country = scan.get("country", "")
        if country:
            country_counts[country] = country_counts.get(country, 0) + 1
    
    # Get top materials and countries
    common_materials = sorted(material_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    common_materials = [mat for mat, _ in common_materials]
    
    preferred_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    preferred_countries = [country for country, _ in preferred_countries]
    
    avg_score = sum(eco_scores) / len(eco_scores) if eco_scores else 50
    
    return {
        "common_materials": common_materials,
        "average_eco_score": avg_score,
        "preferred_countries": preferred_countries,
        "style_summary": f"User scans primarily {', '.join(common_materials[:2])} with average eco-score of {avg_score:.0f}",
        "recommendation_keywords": common_materials[:3] + ["sustainable", "eco-friendly"]
    }


@app.post("/api/picks")
async def get_personalized_picks(
    user_id: str = Form(...),
    scan_history: str = Form(...),  # JSON string
    reference_image: Optional[UploadFile] = File(None)
):
    """
    Generate personalized eco-friendly picks based on user's scan history.
    
    Uses the highest-scored scan image as reference to find similar items,
    then filters by user preferences extracted from their history.
    """
    reference_path = None
    
    try:
        print(f"🎯 Generating personalized picks for user: {user_id}")
        
        # Parse scan history JSON
        import json
        history_data = json.loads(scan_history)
        print(f"   History items: {len(history_data)}")
        
        # Analyze scan history with Gemini
        print("🔍 Analyzing scan history with Gemini...")
        analysis = analyze_scan_history_with_gemini(history_data)
        print(f"   Common materials: {analysis.get('common_materials', [])}")
        print(f"   Average eco-score: {analysis.get('average_eco_score', 50):.1f}")
        print(f"   Style summary: {analysis.get('style_summary', 'N/A')}")
        
        if not history_data:
            raise HTTPException(
                status_code=400,
                detail="No scan history available. Scan some items first!"
            )
        
        # Handle reference image (sent by frontend based on smart rotation)
        if reference_image:
            # User uploaded a reference image - use full pipeline
            print("📸 Reference image provided, using full similarity search...")
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as ref_file:
                content = await reference_image.read()
                ref_file.write(content)
                reference_path = ref_file.name
            
            # Find similar items using the pipeline
            print("🔎 Finding similar sustainable items...")
            similar_items = find_similar_clothing_full_pipeline(
                clothing_image_path=reference_path,
                max_results=15  # Get more results to filter from
            )
        else:
            # No reference image - use history to generate query
            # Strategy: Use materials from user's best scans to search Lykdat
            print("💡 No reference image provided")
            print("⚠️ Cannot fetch real products without a reference image")
            print("   Picks feature requires scanning with image storage enabled")
            
            # Return helpful message
            return {
                "success": True,
                "data": {
                    "picks": [],
                    "analysis": {
                        "common_materials": analysis.get("common_materials", []),
                        "average_eco_score": analysis.get("average_eco_score", 50),
                        "style_summary": analysis.get("style_summary", "")
                    },
                    "message": "Upload a reference image from your best scan to get personalized picks from real products"
                }
            }
        
        # Filter and rank results based on user preferences
        print("✨ Filtering by user preferences...")
        filtered_picks = filter_picks_by_preferences(
            similar_items,
            analysis,
            history_data
        )
        
        # Transform to frontend format
        picks = []
        for idx, item in enumerate(filtered_picks[:10]):  # Top 10 picks
            metadata = item.get("combined_product_metadata", {})
            eco = item.get("eco_score", {})
            
            impact_score = eco.get("impact_score", 3.0)
            score = max(0, min(100, int((6 - impact_score) / 5 * 100)))
            
            title = metadata.get("title") or metadata.get("product_name") or f"Eco Pick {idx + 1}"
            
            picks.append({
                "id": f"pick_{user_id}_{idx}_{int(datetime.now().timestamp())}",
                "title": title,
                "brand": metadata.get("brand"),
                "material": metadata.get("materials") or "Unknown",
                "country": metadata.get("origin") or "Unknown",
                "ecoScore": score,
                "grade": eco.get("grade", "B"),
                "url": metadata.get("url", ""),
                "price": metadata.get("price"),
                "currency": metadata.get("currency"),
                "imageUrl": metadata.get("image_url", ""),
                "description": eco.get("impact_explanation", "")[:150] + "...",
                "matchReason": generate_match_reason(metadata, analysis)
            })
        
        print(f"✅ Generated {len(picks)} personalized picks")
        
        return {
            "success": True,
            "data": {
                "picks": picks,
                "analysis": {
                    "common_materials": analysis.get("common_materials", []),
                    "average_eco_score": analysis.get("average_eco_score", 50),
                    "style_summary": analysis.get("style_summary", "")
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating picks: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate picks: {str(e)}"
        )
    
    finally:
        if reference_path and os.path.exists(reference_path):
            try:
                os.unlink(reference_path)
            except:
                pass


def filter_picks_by_preferences(
    items: List[Dict[str, Any]],
    analysis: Dict[str, Any],
    scan_history: List[Any]
) -> List[Dict[str, Any]]:
    """
    Filter and rank items based on user preferences.
    
    Criteria:
    - Eco-score >= 90% of user's average
    - Prefer materials user commonly scans
    - Exclude duplicates from history
    """
    min_score_threshold = analysis.get("average_eco_score", 50) * 0.9
    common_materials = [m.lower() for m in analysis.get("common_materials", [])]
    
    # Get materials from history to avoid duplicates
    history_materials = set()
    for scan in scan_history:
        mat = scan.material.lower() if hasattr(scan, 'material') else scan.get('material', '').lower()
        history_materials.add(mat)
    
    filtered = []
    for item in items:
        eco = item.get("eco_score", {})
        metadata = item.get("combined_product_metadata", {})
        
        # Calculate score
        impact_score = eco.get("impact_score", 3.0)
        score = max(0, min(100, int((6 - impact_score) / 5 * 100)))
        
        # Apply filters
        if score < min_score_threshold:
            continue
        
        # Check material similarity
        item_material = (metadata.get("materials") or "").lower()
        material_match = any(cm in item_material for cm in common_materials)
        
        # Score the match
        match_score = score
        if material_match:
            match_score += 10  # Bonus for material match
        
        filtered.append({
            **item,
            "_match_score": match_score
        })
    
    # Sort by match score
    filtered.sort(key=lambda x: x.get("_match_score", 0), reverse=True)
    
    return filtered


def select_representative_scan(history_data: List[Dict[str, Any]], analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Select the scan that best represents user's preferences based on Gemini analysis.
    Prioritizes scans that:
    1. Match common materials from user's history
    2. Have above-average eco-scores
    3. Are relatively recent (within last 10 scans)
    """
    if not history_data:
        return None
    
    common_materials = [m.lower() for m in analysis.get("common_materials", [])]
    avg_score = analysis.get("average_eco_score", 50)
    
    # Score each scan
    scored_scans = []
    for idx, scan in enumerate(history_data[:10]):  # Only consider recent 10 scans
        score = 0
        
        # Material match bonus (highest priority)
        scan_material = scan.get("material", "").lower()
        material_matches = sum(1 for cm in common_materials if cm in scan_material)
        score += material_matches * 30
        
        # Eco-score bonus (prefer above average)
        eco_score = scan.get("ecoScore", {}).get("score", 0)
        if eco_score >= avg_score:
            score += 20
        score += eco_score * 0.2  # Scale eco-score to max 20 points
        
        # Recency bonus (prefer recent scans, but not too heavily)
        recency_bonus = max(0, 10 - idx)  # 10 points for most recent, 0 for 10th
        score += recency_bonus
        
        scored_scans.append((score, scan))
    
    # Select scan with highest score
    scored_scans.sort(key=lambda x: x[0], reverse=True)
    selected = scored_scans[0][1]
    
    print(f"🎯 Selected scan: Material='{selected.get('material')}', Score={selected.get('ecoScore', {}).get('score', 0)}")
    print(f"   Matches user preferences: {common_materials}")
    
    return selected


def generate_match_reason(metadata: Dict[str, Any], analysis: Dict[str, Any]) -> str:
    """Generate a reason why this item was recommended"""
    material = (metadata.get("materials") or "").lower()
    common_materials = [m.lower() for m in analysis.get("common_materials", [])]
    
    matches = [cm for cm in common_materials if cm in material]
    if matches:
        return f"Matches your preference for {matches[0]}"
    
    return "Highly sustainable choice based on your history"


def generate_personalized_from_catalog(
    analysis: Dict[str, Any],
    history_data: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Generate personalized recommendations from a curated catalog.
    This is used when no reference image is available.
    
    Returns items in the same format as find_similar_clothing_full_pipeline
    for consistency with downstream processing.
    """
    # Define curated eco-friendly catalog
    curated_catalog = [
        {
            "title": "Hemp Blend Workwear Jacket",
            "brand": "North Loop",
            "materials": "55% hemp, 45% organic cotton",
            "origin": "USA",
            "url": "https://northloop.com/hemp-jacket",
            "price": "$148",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.2,  # Very low impact
            "grade": "A",
            "impact_explanation": "Hemp requires minimal water and no pesticides. Organic cotton reduces chemical use. Fair-trade certified production.",
        },
        {
            "title": "European Linen Midi Dress",
            "brand": "Coastline Atelier",
            "materials": "100% linen",
            "origin": "Portugal",
            "url": "https://coastline.com/linen-dress",
            "price": "$165",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.3,
            "grade": "A",
            "impact_explanation": "Linen is made from flax which requires very little water and grows naturally without pesticides. OEKO-TEX certified dyeing process.",
        },
        {
            "title": "Bamboo Lyocell Everyday Set",
            "brand": "Kind Pulse",
            "materials": "70% bamboo lyocell, 30% organic cotton",
            "origin": "China",
            "url": "https://kindpulse.com/bamboo-set",
            "price": "$98",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.5,
            "grade": "A",
            "impact_explanation": "Bamboo grows rapidly without pesticides. Lyocell processing uses closed-loop system reducing chemical waste.",
        },
        {
            "title": "Organic Cotton Daily Tee",
            "brand": "Evergreen Threads",
            "materials": "100% organic cotton",
            "origin": "India",
            "url": "https://evergreen.com/organic-tee",
            "price": "$32",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.8,
            "grade": "A",
            "impact_explanation": "GOTS certified organic cotton grown without synthetic pesticides. Fair Trade certified production.",
        },
        {
            "title": "Recycled Polyester Fleece",
            "brand": "Patagonia",
            "materials": "100% recycled polyester",
            "origin": "USA",
            "url": "https://patagonia.com/recycled-fleece",
            "price": "$129",
            "currency": "USD",
            "image_url": "",
            "impact_score": 2.0,
            "grade": "B",
            "impact_explanation": "Made from recycled plastic bottles, reducing virgin material use. However, still sheds microplastics when washed.",
        },
        {
            "title": "Merino Wool Base Layer",
            "brand": "Icebreaker",
            "materials": "100% merino wool",
            "origin": "New Zealand",
            "url": "https://icebreaker.com/merino-base",
            "price": "$110",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.6,
            "grade": "A",
            "impact_explanation": "ZQ certified merino wool from ethical farms. Natural, biodegradable fiber with excellent durability.",
        },
        {
            "title": "Tencel Modal Lounge Pants",
            "brand": "Pact",
            "materials": "95% Tencel modal, 5% spandex",
            "origin": "Thailand",
            "url": "https://wearpact.com/tencel-pants",
            "price": "$54",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.7,
            "grade": "A",
            "impact_explanation": "Tencel modal made from sustainably harvested beechwood. Closed-loop production recovers 95% of solvents.",
        },
        {
            "title": "Recycled Cotton Denim",
            "brand": "Nudie Jeans",
            "materials": "80% recycled cotton, 20% recycled polyester",
            "origin": "Italy",
            "url": "https://nudiejeans.com/recycled-denim",
            "price": "$145",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.9,
            "grade": "B",
            "impact_explanation": "Made from pre-consumer textile waste, reducing water usage by 80%. Free repair service promotes longevity.",
        },
        {
            "title": "Cork Leather Sneakers",
            "brand": "Veja",
            "materials": "Cork, organic cotton canvas",
            "origin": "Brazil",
            "url": "https://veja-store.com/cork-sneakers",
            "price": "$175",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.4,
            "grade": "A",
            "impact_explanation": "Cork is renewable and harvested without harming trees. Organic cotton uppers. Fair trade rubber soles.",
        },
        {
            "title": "Alpaca Wool Sweater",
            "brand": "Indigenous",
            "materials": "100% baby alpaca wool",
            "origin": "Peru",
            "url": "https://indigenous.com/alpaca-sweater",
            "price": "$198",
            "currency": "USD",
            "image_url": "",
            "impact_score": 1.5,
            "grade": "A",
            "impact_explanation": "Alpaca wool is hypoallergenic and requires no harsh chemicals for processing. Supports Peruvian artisan communities.",
        },
    ]
    
    # Score each item based on user preferences
    common_materials = [m.lower() for m in analysis.get("common_materials", [])]
    avg_score = analysis.get("average_eco_score", 50)
    
    scored_items = []
    for item in curated_catalog:
        material_lower = item["materials"].lower()
        
        # Calculate match score
        match_score = 0
        
        # Material matching (high priority)
        material_matches = sum(1 for cm in common_materials if cm in material_lower)
        match_score += material_matches * 20
        
        # Eco-score alignment
        item_score = max(0, min(100, int((6 - item["impact_score"]) / 5 * 100)))
        if item_score >= avg_score * 0.85:
            match_score += 15
        
        # Natural/sustainable materials boost
        if any(term in material_lower for term in ["organic", "hemp", "linen", "bamboo", "tencel", "recycled"]):
            match_score += 10
        
        scored_items.append({
            "combined_product_metadata": {
                "title": item["title"],
                "brand": item["brand"],
                "materials": item["materials"],
                "origin": item["origin"],
                "url": item["url"],
                "price": item["price"],
                "currency": item["currency"],
                "image_url": item["image_url"],
            },
            "eco_score": {
                "impact_score": item["impact_score"],
                "grade": item["grade"],
                "impact_explanation": item["impact_explanation"],
            },
            "_match_score": match_score + item_score
        })
    
    # Sort by match score
    scored_items.sort(key=lambda x: x["_match_score"], reverse=True)
    
    print(f"📊 Scored {len(scored_items)} curated items, top match score: {scored_items[0]['_match_score']}")
    
    return scored_items


@app.post("/api/picks")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "scan": "/api/scan",
            "picks": "/api/picks",
            "health": "/api/health"
        }
    }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting EcoScan API Server...")
    print("📍 API will be available at: http://localhost:8000")
    print("📖 Docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
