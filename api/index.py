from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import google.generativeai as genai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")

@app.get("/")
def home():
    return {"status": "ok"}

@app.post("/chat")
async def chat(data: dict):
    msg = data.get("message", "")
    res = model.generate_content(msg)
    return {"reply": res.text}