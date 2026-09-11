# VOX-BERNIE Stream Deck Plugin

Official 15-key Stream Deck companion for VOX-BERNIE.

## Requirements
- Windows 10 or newer
- Stream Deck 6.6 or newer
- VOX-BERNIE Build 032 or newer running on the same computer

## 15-key layout

Row 1: RECORD | STOP | PLAY/PAUSE | SLOW JOG LEFT | SLOW JOG RIGHT

Row 2: FAST JOG LEFT | FAST JOG RIGHT | CUT | COPY | PASTE

Row 3: DELETE | UNDO | SAVE | SAVE AS | EXPORT WAV

Jog actions repeat while the Stream Deck key is held.

## Connection
The plugin talks directly to VOX-BERNIE over `127.0.0.1:17631`. The command bridge only listens on the local computer and is not exposed to the network.

## Build
```powershell
npm install
npm run build
streamdeck pack com.berniemack.voxbernie.sdPlugin --output dist
```

The resulting `.streamDeckPlugin` file can be double-clicked to install in Stream Deck.
