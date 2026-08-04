// Netlify Function: Send push notifications to all subscribers
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:contact@localaismart.org',
  process.env.VAPID_PUBLIC || 'BDWGJz7YNTioDf8c2PJh1WlV7yzfGBXxq4-eR3JtlNn_IQOcF2nJJObdc7bb1Tb-7e8hLKgeNB1lhlMgLil-r9s',
  process.env.VAPID_PRIVATE || 'iAsCt3bp7dAUZzEcirOXPx1ihAunQwH2PJnhphAqxOA'
);

const SB_URL = 'https://lhnboiojwfapjnxjxjep.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobmJvaW9qd2ZhcGpueGp4amVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1ODU0MzksImV4cCI6MjEwMDE2MTQzOX0.yft1qubqbKGbkzb2qjYjk3UPQjEWV_1YIRD9MbO_-2k';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body);
    const action = body.action;

    // SUBSCRIBE: Store push subscription in Supabase
    if (action === 'subscribe') {
      const sub = body.subscription;
      if (!sub || !sub.endpoint) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing subscription' }) };
      
      const insertBody = JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: (sub.keys && sub.keys.p256dh) || '',
        auth: (sub.keys && sub.keys.auth) || ''
      });

      const result = await fetch(SB_URL + '/rest/v1/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apiKey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Prefer': 'return=minimal' },
        body: insertBody
      });

      if (!result.ok) {
        const errText = await result.text();
        // If duplicate endpoint, that's fine
        if (result.status !== 409 && result.status !== 400) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'Insert failed: ' + errText }) };
        }
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // NOTIFY: Send push to all subscribers
    if (action === 'notify') {
      const { title, message, type } = body;
      if (!title || !message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing title/message' }) };

      // Get all subscriptions from Supabase
      const subs = await fetch(SB_URL + '/rest/v1/subscriptions?select=*&limit=10000', {
        headers: { 'apiKey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
      }).then(r => r.json()).catch(() => []);

      const payload = JSON.stringify({
        title: title,
        body: message.substring(0, 200),
        icon: '/icon-192.png',
        badge: '/favicon.svg',
        vibrate: type === 'emergency' ? [800, 200, 800, 200, 800] : [300, 100, 300],
        tag: 'cw-' + Date.now(),
        requireInteraction: type === 'emergency',
        silent: false,
        data: { url: '/' }
      });

      let sent = 0;
      const invalid = [];

      for (const s of subs || []) {
        let sub = null;
        // Prefer the full JSON if available
        if (s.sub_json) {
          try { sub = JSON.parse(s.sub_json); } catch(e) { sub = null; }
        }
        if (!sub && s.p256dh && s.auth) {
          sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
        }
        if (sub) {
          try {
            await webpush.sendNotification(sub, payload);
            sent++;
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) invalid.push(s.endpoint);
          }
        }
      }

      // Clean up invalid subscriptions
      for (const ep of invalid) {
        await fetch(SB_URL + '/rest/v1/subscriptions?endpoint=eq.' + encodeURIComponent(ep), {
          method: 'DELETE',
          headers: { 'apiKey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        }).catch(() => {});
      }

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, sent, removed: invalid.length }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
