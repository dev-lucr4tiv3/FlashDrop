# FlashDrop - P2P Chat Web App

Eine sichere Peer-to-Peer Chat-Anwendung, die direkte Kommunikation zwischen Browsern über WebRTC ermöglicht.

## Features

- 🔒 **Ende-zu-Ende Verschlüsselung** über WebRTC
- 🚀 **Peer-to-Peer Kommunikation** ohne Server-Zwischenspeicherung
- 💬 **Echtzeit Chat** mit sofortiger Nachrichtenübertragung
- 🎙️ **Audio Chat** mit Mikrofon-Steuerung
- 🖥️ **Bildschirmfreigabe** für Präsentationen und Zusammenarbeit
- 😊 **Emoji Support** mit kategorisiertem Emoji-Picker
- 🎨 **Modernes UI** mit responsivem Design
- 🔗 **Einfaches Teilen** über Raum-IDs
- 🌐 **Browser-basiert** - keine Installation erforderlich

## Technologien

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express, Socket.IO
- **P2P**: WebRTC für direkte Kommunikation
- **Signaling**: Socket.IO für WebRTC-Handshake

## Installation

1. Repository klonen:
```bash
git clone [repository-url]
cd FlashDrop
```

2. Dependencies installieren:
```bash
npm install
```

3. Server starten:
```bash
npm start
```

4. Browser öffnen und zu `http://localhost:3000` navigieren

## Verwendung

### Chat erstellen
1. Auf "Neuen Chat erstellen" klicken
2. Deinen Namen eingeben
3. Eine eindeutige Raum-ID wird generiert
4. Raum-ID mit anderen teilen

### Chat beitreten
1. Auf "Chat beitreten" klicken
2. Deinen Namen eingeben
3. Erhaltene Raum-ID eingeben
4. Chat beitreten

## Architektur

### WebRTC P2P Kommunikation
- Direkte Verbindung zwischen Browsern
- Keine Nachrichten werden auf dem Server gespeichert
- Automatischer Fallback auf Server-Relay wenn P2P nicht möglich

### Signaling Server
- Socket.IO für WebRTC-Handshake
- Raum-Management
- Benutzer-Präsenz

## Sicherheit

- **Ende-zu-Ende Verschlüsselung**: Nachrichten werden direkt zwischen Clients übertragen
- **Keine Datenspeicherung**: Server speichert keine Chat-Nachrichten
- **Temporäre Räume**: Räume werden automatisch geschlossen wenn leer

## Browser-Kompatibilität

- Chrome 56+
- Firefox 51+
- Safari 11+
- Edge 79+

## Entwicklung

### Lokale Entwicklung
```bash
npm run dev
```

### Projekt-Struktur
```
FlashDrop/
├── public/
│   ├── index.html      # Haupt-HTML
│   ├── styles.css      # Styling
│   └── app.js          # Client-seitige Logik
├── server.js           # Express/Socket.IO Server
├── package.json        # Dependencies
└── README.md          # Dokumentation
```

## Contributing

1. Fork das Repository
2. Feature Branch erstellen (`git checkout -b feature/neue-funktion`)
3. Änderungen committen (`git commit -am 'Neue Funktion hinzufügen'`)
4. Branch pushen (`git push origin feature/neue-funktion`)
5. Pull Request erstellen

## Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## Support

Bei Fragen oder Problemen erstelle ein Issue im Repository.
