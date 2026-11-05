// The page's small window into the Mac app (nothing else from Node reaches it).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('operatorApp', {
  isApp: true,
  platform: process.platform,
  version: process.env.OPERATOR_VERSION || '',
  // what the menu bar shows: "42m" while you're locked in, a dot when Op is holding something
  status: (s) => ipcRenderer.send('op:status', s),
  loginItem: () => ipcRenderer.invoke('op:loginItem'),
  setLoginItem: (on) => ipcRenderer.invoke('op:setLoginItem', !!on),
  importFile: () => ipcRenderer.invoke('op:importFile'),
  show: () => ipcRenderer.send('op:show'),
  // the talk key: on or off, and which key (the app listens for it everywhere)
  talkPrefs: (p) => ipcRenderer.send('op:talkPrefs', p || {}),
  // is the key reaching the app from everywhere? (and open the macOS setting that lets it)
  talkHealth: () => ipcRenderer.invoke('op:talkHealth'),
  openPrivacy: (which) => ipcRenderer.send('op:openPrivacy', String(which || 'ListenEvent')),
  // Round 62: the Check button (asks macOS, opens what's missing, reports back), and a restart once it's turned on
  talkCheck: () => ipcRenderer.invoke('op:talkCheck'),
  relaunch: () => ipcRenderer.send('op:relaunch'),
  // Round 66: save the client report as a PDF
  pdf: (name) => ipcRenderer.invoke('op:pdf', String(name || 'Report.pdf')),
  // Round 68: Operator on your iPhone (on/off, the address, the pairing code)
  phoneInfo: () => ipcRenderer.invoke('phone:info'),
  phoneSet: (on) => ipcRenderer.invoke('phone:set', !!on),
  phoneNewCode: () => ipcRenderer.invoke('phone:newCode')
});
