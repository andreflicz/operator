// Puts the app's resources in place before packaging: the built page, the helpers, the menu-bar icon.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), res = path.join(__dirname, 'res');
const legacy = path.join(root, 'packaged', 'Operator-2-7-2.app', 'Contents', 'Resources');
fs.mkdirSync(res, { recursive: true });
fs.copyFileSync(path.join(root, 'dist', 'command-center-2.html'), path.join(res, 'command-center-2.html'));
for (const f of ['helper.sh', 'bridge.pl']) fs.copyFileSync(path.join(legacy, f), path.join(res, f));
for (const f of ['helper.sh', 'bridge.pl', 'activity.sh']) fs.chmodSync(path.join(res, f), 0o755);
for (const f of ['trayTemplate.png', 'trayTemplate@2x.png']) if (!fs.existsSync(path.join(res, f))) throw new Error('missing ' + f);
console.log('staged', fs.readdirSync(res).join(', '));
