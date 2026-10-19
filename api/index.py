import requests
from flask import Flask, jsonify

app = Flask(__name__)

# Jouw unieke Root server-ID direct in de code ingevuld!
COMMUNITY_ID = "ADHzNr2IgAqyIXl_bVxvjw"
ROOT_TOKEN = "hier_jouw_token" # Dit pakt Vercel dadelijk uit je Environment Variables

BASE_URL = "https://rootapp.com"

def create_server_structure():
    headers = {
        "Authorization": f"Bearer {ROOT_TOKEN}",
        "Content-Type": "application/json"
    }
    
    categories = [
        {"name": "📢 INFO CENTER", "channels": ["welcome", "rules", "announcements"]},
        {"name": "🛋️ THE LOUNGE", "channels": ["main-chat", "memes", "media", "food-porn"]},
        {"name": "🤖 BOT ZONE", "channels": ["ai-art", "bot-commands"]}
    ]
    
    for cat in categories:
        cat_res = requests.post(f"{BASE_URL}/communities/{COMMUNITY_ID}/categories", headers=headers, json={"name": cat["name"]})
        if cat_res.status_code == 201 or cat_res.status_code == 200:
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

if __name__ == '__main__':
    app.run()
