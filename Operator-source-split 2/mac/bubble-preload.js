// The journal bubble's window into the app: save an entry, grow into a card and back.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bubble', {
  save: (text) => ipcRenderer.invoke('bubble:save', String(text || '')),
  open: (on) => ipcRenderer.send('bubble:open', !!on),
  pos: () => ipcRenderer.invoke('bubble:pos'),
  moveTo: (x, y) => ipcRenderer.send('bubble:moveTo', Number(x) || 0, Number(y) || 0),
  moved: () => ipcRenderer.send('bubble:moved'),
  onOpen: (fn) => ipcRenderer.on('bubble:focus', () => fn())
});
