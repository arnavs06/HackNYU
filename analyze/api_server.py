"""
FastAPI server for EcoScan backend.
Provides REST API endpoints for the mobile frontend.
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any, List
import tempfile
import os
from datetime import datetime
import traceback

from tagging import combine_lykdat_and_tag_metadata
from similar_search import find_similar_clothing_full_pipeline

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
        "timestamp": datetime.now().isoformat(),
        "material": material,
        "country": country,
        "brand": metadata.get("brand"),
        "productName": metadata.get("product_name"),
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


@app.get("/api/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "scan": "/api/scan",
            "health": "/api/health"
        }
    }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting EcoScan API Server...")
    print("📍 API will be available at: http://localhost:8000")
    print("📖 Docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
