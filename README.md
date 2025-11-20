# FlagShip - Feature Flag Management System

## Architecture
React Frontend (Vite) <-> Node/Express API <-> PostgreSQL (Prisma)

## Setup & Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL Database

### 1. Database Setup
Ensure PostgreSQL is running. Create a database named `featureflags`.

### 2. Backend Setup
```bash
cd backend
# Install dependencies
npm install

# Configure Environment
cp .env.example .env
# Edit .env with your DB URL and JWT secrets

# Run Migrations
npx prisma migrate dev --name init

# Seed Database (Creates admin@example.com / password123)
npm run seed

# Start Server
npm run dev
```

### 3. Frontend Setup
```bash
# (In root directory)
npm install
npm start
```
Note: This React code structure assumes a standard React Scripts or Vite setup. Since only file contents were provided, ensure you have a basic `package.json` for the frontend with `react`, `react-dom`, `react-router-dom`, `axios`, `react-scripts` (or `vite`).

### SDK Usage Example (Node.js Client)

To use the flags in another Node.js application:

```javascript
const axios = require('axios');

const APP_KEY = 'sample-app-key-123'; // From your Dashboard
const API_URL = 'http://localhost:4000/sdk';

async function checkFeature(flagKey) {
  try {
    const response = await axios.get(`${API_URL}/${APP_KEY}/flags`);
    const flags = response.data;
    
    if (flags[flagKey]) {
      console.log(`Feature ${flagKey} is ENABLED`);
      // Run feature code
    } else {
      console.log(`Feature ${flagKey} is DISABLED`);
    }
  } catch (error) {
    console.error('Failed to fetch flags', error.message);
    // Default to false on error
  }
}

// Usage
checkFeature('new_feature_beta');
```

### SDK Usage Example (React Client)

```tsx
import { useEffect, useState } from 'react';
import axios from 'axios';

const useFeatureFlag = (flagKey: string) => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:4000/sdk/sample-app-key-123/flags')
      .then(res => {
        setIsEnabled(!!res.data[flagKey]);
      })
      .catch(err => console.error(err));
  }, [flagKey]);

  return isEnabled;
};

// Component
const MyComponent = () => {
  const showBeta = useFeatureFlag('new_feature_beta');
  
  if (!showBeta) return null;
  return <div>Beta Feature Active!</div>;
}
```
