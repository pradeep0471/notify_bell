const { createApp } = require('./app.js');

const PORT = process.env.PORT || 4000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Notification API listening on http://localhost:${PORT}`);
  console.log(`Try:  curl -H "X-Tenant-Id: t1" -H "X-User-Id: u1" http://localhost:${PORT}/notifications`);
});
