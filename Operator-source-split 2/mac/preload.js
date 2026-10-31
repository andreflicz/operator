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
  openPrivacy: (which) => ipcRenderer.send('op:openPrivacy', String(which || 'ListenEvent'))
});
