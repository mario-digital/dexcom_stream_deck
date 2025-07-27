# Dexcom Stream Deck Integration

A project to integrate Dexcom G7 glucose monitoring with Stream Deck for easy access to glucose readings.

## Project Structure

```
dexcom_stream_deck/
├── dexcom_api/          # Dexcom API integration and proof of concept
│   ├── package.json     # Node.js dependencies
│   ├── index.js         # Express server and API endpoints
│   ├── dexcom-api.js    # Dexcom API client
│   ├── token-storage.js # OAuth token persistence
│   ├── env.example      # Environment variables template
│   └── README.md        # Detailed setup instructions
├── .gitignore          # Git ignore rules (protects sensitive data)
└── README.md           # This file
```

## Components

### dexcom_api/
A complete proof of concept for integrating with the Dexcom API. This includes:

- ✅ **OAuth 2.0 Authentication** with Dexcom
- ✅ **Token Persistence** - saves tokens so you don't need to re-authenticate
- ✅ **All Dexcom v3 API Endpoints**:
  - Glucose readings (`/users/self/egvs`)
  - Device information (`/users/self/devices`)
  - Data range (`/users/self/dataRange`)
  - Alerts (`/users/self/alerts`)
  - Calibrations (`/users/self/calibrations`)
  - Events (`/users/self/events`)
- ✅ **Easy Environment Switching** - sandbox ↔ production
- ✅ **RESTful API** - ready for Stream Deck integration

## Getting Started

1. **Navigate to the dexcom_api folder:**
   ```bash
   cd dexcom_api
   ```

2. **Follow the setup instructions in `dexcom_api/README.md`**

3. **Test the API endpoints** to ensure everything works

## Security

- `.env` files are ignored by Git to protect your API credentials
- `tokens.json` is ignored to protect your OAuth tokens
- All sensitive data is kept local

## Future Development

This repository will eventually include:
- Stream Deck plugin/button integration
- Real-time glucose monitoring
- Customizable alerts and notifications
- Historical data visualization

## License

MIT License - see individual component licenses for details. 