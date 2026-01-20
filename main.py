
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from typing import Optional
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="ZYNC AMEP Backend",
    description="FastAPI gateway for Gemini AI services",
    version="1.0.0"
)

# Configure CORS
# In production, replace ["*"] with specific origins like ["https://your-frontend.com"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning("GEMINI_API_KEY environment variable not set.")
else:
    genai.configure(api_key=api_key)

# Request Models
class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = []

class ChatResponse(BaseModel):
    reply: str
    status: str = "success"

@app.get("/")
async def health_check():
    return {"status": "online", "engine": "Gemini-3-Flash"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Primary endpoint for AI interaction.
    Accepts a user message and returns the model response.
    """
    if not api_key:
        raise HTTPException(status_code=500, detail="API Key not configured on server.")

    try:
        # Using Gemini 3 Flash for speed and efficiency
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        # Start chat with history if provided
        chat = model.start_chat(history=request.history or [])
        response = chat.send_message(request.message)
        
        return ChatResponse(reply=response.text)

    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        # Handle specific quota errors if needed
        if "429" in str(e):
            raise HTTPException(status_code=429, detail="AI Quota exceeded. Please try again in 60 seconds.")
        
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return {
        "reply": f"Error: {exc.detail}",
        "status": "error"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
