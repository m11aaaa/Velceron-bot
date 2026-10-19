import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Haal je server-ID op. Vul deze in bij de instellingen op Vercel!
COMMUNITY_ID = os.environ.get("COMMUNITY_ID")
ROOT_TOKEN = os.environ.get("ROOT_TOKEN")
BASE_URL = "https://rootapp.com"

headers = {
    "Authorization": f"Bearer {ROOT_TOKEN}",
    "Content-Type": "application/json"
}

def create_server_structure():
    categories = [
        {"name": "📢 INFO CENTER", "channels": ["welcome", "rules", "announcements"]},
        {"name": "🛋️ THE LOUNGE", "channels": ["main-chat", "memes", "media", "food-porn"]},
        {"name": "🤖 BOT ZONE", "channels": ["ai-art", "bot-commands"]}
    ]
    
    for cat in categories:
        cat_res = requests.post(f"{BASE_URL}/communities/{COMMUNITY_ID}/categories", headers=headers, json={"name": cat["name"]})
        if cat_res.status_code in:
            cat_id = cat_res.json().get("id")
            for chan in cat["channels"]:
                requests.post(f"{BASE_URL}/communities/{COMMUNITY_ID}/channels", headers=headers, json={"name": chan, "category_id": cat_id, "type": "text"})

    roles = [
        {"name": "👑 FOUNDER", "color": "#FFD700"},
        {"name": "🛡️ TRUSTEE", "color": "#2ECC71"},
        {"name": "🛋️ HIDEOUT MEMBER", "color": "#3498DB"}
    ]
    for role in roles:
        requests.post(f"{BASE_URL}/communities/{COMMUNITY_ID}/roles", headers=headers, json=role)

@app.route('/')
def home():
    try:
        create_server_structure()
        return "🎉 THE HIDEOUT SOCIETY IS SUCCESVOL GEBOUWD, BRO!", 200
    except Exception as e:
        return f"Oeps, foutje: {str(e)}", 500
