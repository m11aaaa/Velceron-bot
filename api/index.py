import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

ROOT_TOKEN = os.environ.get("ROOT_TOKEN")
BASE_URL = "https://rootapp.com"

headers = {
    "Authorization": f"Bearer {ROOT_TOKEN}",
    "Content-Type": "application/json"
}

def create_server_structure(community_id):
    categories = [
        {"name": "📢 INFO CENTER", "channels": ["welcome", "rules", "announcements"]},
        {"name": "🛋️ THE LOUNGE", "channels": ["main-chat", "memes", "media", "food-porn"]},
        {"name": "🤖 BOT ZONE", "channels": ["ai-art", "bot-commands"]}
    ]
    
    for cat in categories:
        cat_res = requests.post(f"{BASE_URL}/communities/{community_id}/categories", headers=headers, json={"name": cat["name"]})
        if cat_res.status_code == 201 or cat_res.status_code == 200:
            cat_id = cat_res.json().get("id")
            for chan in cat["channels"]:
                requests.post(f"{BASE_URL}/communities/{community_id}/channels", headers=headers, json={"name": chan, "category_id": cat_id, "type": "text"})

    roles = [
        {"name": "👑 FOUNDER", "color": "#FFD700"},
        {"name": "🛡️ TRUSTEE", "color": "#2ECC71"},
        {"name": "🛋️ HIDEOUT MEMBER", "color": "#3498DB"}
    ]
    for role in roles:
        requests.post(f"{BASE_URL}/communities/{community_id}/roles", headers=headers, json=role)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    if data.get("event") == "message.created" and data.get("message", {}).get("content") == "!setup":
        community_id = data.get("message", {}).get("community_id")
        create_server_structure(community_id)
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "ignored"}), 200
