const WebSocket = require('ws');
const https = require('https');

const BOT_TOKEN = process.env.ROOT_TOKEN;
const COMMUNITY_ID = "ADHzNr2IgAqyIXl_bVxvjw";

if (!BOT_TOKEN) {
  console.error("❌ Fout: ROOT_TOKEN is niet ingesteld in de Environment Variables!");
  process.exit(1);
}

const gatewayUrl = 'wss://gateway.rootapp.gg/v1';
const ws = new WebSocket(gatewayUrl, {
  headers: { 'Authorization': `Bearer ${BOT_TOKEN}` }
});

ws.on('open', () => {
  console.log('🟢 Bot is nu succesvol LIVE en ONLINE verbonden met de Root gateway!');
});

ws.on('message', (data) => {
  try {
    const payload = JSON.parse(data);
    
    if (payload.event === 'message.created' && payload.data.content === '!setup') {
      const targetCommunity = payload.data.community_id;
      
      if (targetCommunity === COMMUNITY_ID) {
        console.log('⏳ !setup commando ontvangen! Server wordt nu gebouwd...');
        createStructure(targetCommunity);
      }
    }
  } catch (err) {
    console.error('Fout bij verwerken bericht:', err);
  }
});

ws.on('close', () => {
  console.log('❌ Verbinding verbroken. Start opnieuw op...');
  process.exit(1);
});

function createStructure(communityId) {
  const categories = [
    { name: "📢 INFO CENTER", channels: ["welcome", "rules", "announcements"] },
    { name: "🛋️ THE LOUNGE", channels: ["main-chat", "memes", "media", "food-porn"] },
    { name: "🤖 BOT ZONE", channels: ["ai-art", "bot-commands"] }
  ];

  const headers = {
    'Authorization': `Bearer ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
  };

  categories.forEach(cat => {
    const catData = JSON.stringify({ name: cat.name });
    const options = { hostname: '://rootapp.com', path: `/v1/communities/${communityId}/categories`, method: 'POST', headers: headers };
    
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const categoryId = JSON.parse(body).id;
          cat.channels.forEach(chan => {
            const chanData = JSON.stringify({ name: chan, category_id: categoryId, type: "text" });
            const chanOptions = { hostname: '://rootapp.com', path: `/v1/communities/${communityId}/channels`, method: 'POST', headers: headers };
            const chanReq = https.request(chanOptions);
            chanReq.write(chanData);
            chanReq.end();
          });
        }
      });
    });
    req.write(catData);
    req.end();
  });
}
