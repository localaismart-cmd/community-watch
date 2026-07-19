const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:contact@localaismart.org',
  process.env.VAPID_PUBLIC || 'BDWGJz7YNTioDf8c2PJh1WlV7yzfGBXxq4-eR3JtlNn_IQOcF2nJJObdc7bb1Tb-7e8hLKgeNB1lhlMgLil-r9s',
  process.env.VAPID_PRIVATE || 'iAsCt3bp7dAUZzEcirOXPx1ihAunQwH2PJnhphAqxOA'
);

let subscriptions = [];

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

    if (action === 'subscribe') {
      if (!body.subscription) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing subscription' }) };
      const exists = subscriptions.find(s => s.endpoint === body.subscription.endpoint);
      if (!exists) {
        subscriptions.push(body.subscription);
        if (subscriptions.length > 50000) subscriptions = subscriptions.slice(-50000);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, count: subscriptions.length }) };
    }

    if (action === 'notify') {
      const { title, body: msg, icon, tag, type } = body;
      if (!title || !msg) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing title/body' }) };
      
      const payload = JSON.stringify({
        title, body: msg.substring(0, 200), icon: icon || '/icon-192.png',
        badge: '/favicon.svg',
        vibrate: type === 'emergency' ? [500,150,500,150,500] : [300,100,300],
        tag: tag || 'cw-' + Date.now(), requireInteraction: type === 'emergency',
        data: { url: '/' }
      });

      let sent = 0, failed = [];
      for (const sub of subscriptions) {
        try { await webpush.sendNotification(sub, payload); sent++; }
        catch (err) { if (err.statusCode === 410 || err.statusCode === 404) failed.push(sub.endpoint); }
      }
      subscriptions = subscriptions.filter(s => !failed.includes(s.endpoint));
      
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, sent, removed: failed.length, total: subscriptions.length }) };
    }

    if (action === 'upload') {
      if (!body.alerts) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing alerts' }) };
      subscriptions._lastAlerts = body.alerts;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'poll') {
      const data = JSON.stringify({ alerts: subscriptions._lastAlerts || [], lastId: body.lastId || 0 });
      return { statusCode: 200, headers, body: data };
    }

    if (action === 'stats') {
      return { statusCode: 200, headers, body: JSON.stringify({ count: subscriptions.length }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
