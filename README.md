# E-Hotel Platform

## Overview

E-Hotel is a private prototype reservation platform for a fictional hotel chain. It showcases a complete software development lifecycle, from business analysis and UML modeling to a working implementation using modern web technologies, containerization, and cloud deployment.

## Architecture & Tech Stack

- **Front-End**: React 19 + Vite, styled with Tailwind CSS
- **Back-End**: Node.js + ExpressJS REST API
- **Authentication & Data**: Firebase Authentication & Firestore
- **Containerization**: Docker (backend only)
- **CI/CD**: GitHub Actions (build, (no testing yet), and deploy on merge to `main`)
- **Cloud Infrastructure**: Google Cloud Run, Firestore

## Business Analysis & UML Models

All analysis deliverables were created in StarUML and exported as images into the [documentation file](SDM-Project.pdf):

- **Use Case Diagrams** & Descriptions
- **Activity & Sequence Diagrams** for booking, check-in, check-out, cancellation
- **Domain Class Diagram** capturing entities (Room, Booking, PaymentTransaction, Invoice, etc.) and relationships

## Repository Structure

```
/      (root)
├─ backend/         # Express API service
│  ├─ controllers/
│  ├─ middleware/
│  ├─ models/
│  ├─ routes/
│  ├─ services/
│  ├─ credentials/  # service account JSONs (firebase-sdk-sa-key.json)
│  ├─ .env          # environment variables
│  ├─ Dockerfile
│  ├─ server.js
│  └─ package.json
├─ frontend/        # React + Vite application
│  ├─ public/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ contexts/
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  ├─ pages/
│  │  ├─ firebase.js
│  │  └─ firebaseConfig.js
│  ├─ .env
│  ├─ .firebaserc
│  ├─ firebase.json
│  ├─ tailwind.config.js
│  ├─ vite.config.js
│  └─ package.json
└─ .github/workflows/  # CI/CD workflows
```

## Prerequisites

- **Node.js** v18.18.0+
- **npm** or **yarn** package manager
- **Docker** (for backend container builds)
- **Firebase CLI** (optional, for local development)
- **Google Cloud SDK** (for deployments)

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Firebase Configuration
FIREBASE_SDK_SA_KEY=./credentials/firebase-sdk-sa-key.json
FIRESTORE_DATABASE_ID=YOUR_FIRESTORE_DB_ID

# Server Configuration
PORT=8080
```

**Important**: You need to:

1. Create a Firebase service account key file and place it in `backend/credentials/firebase-sdk-sa-key.json`
2. Replace `YOUR_FIRESTORE_DB_ID` with your actual Firestore database ID

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory with the following variable:

```env
# API Configuration
VITE_API_URL=http://localhost:8080/api
```

**Note**: The frontend Firebase configuration is already set up with the project's Firebase credentials in `src/firebaseConfig.js` and `.firebaserc`.

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd E-Hotel

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Backend Setup

```bash
cd backend

# Create credentials directory and add your Firebase service account key
mkdir -p credentials
# Copy your firebase-sdk-sa-key.json to credentials/

# Create .env file (copy from env.example)
cp env.example .env
# Edit .env with your actual values

# Start the development server
npm start
```

Backend API runs at [http://localhost:8080](http://localhost:8080)

### 3. Frontend Setup

```bash
cd frontend

# Create .env file (copy from env.example)
cp env.example .env
# Edit .env with your API URL

# Start the development server
npm run dev
```

Frontend app runs at [http://localhost:5173](http://localhost:5173)

## Firebase Setup Requirements

### Backend Firebase Setup

1. Create a Firebase project in the Firebase Console
2. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file as `backend/credentials/firebase-sdk-sa-key.json`
3. Create a Firestore database and note the database ID
4. Update the `FIRESTORE_DATABASE_ID` in your backend `.env` file

### Frontend Firebase Setup

The frontend Firebase configuration is already configured with the project's Firebase credentials:

- **`src/firebaseConfig.js`**: Contains the Firebase app configuration (API keys, project ID, etc.)
- **`.firebaserc`**: Specifies the default Firebase project ID (`e-hotel-internship`)

If you need to use a different Firebase project, update both files:

1. Update the configuration in `src/firebaseConfig.js`
2. Update the project ID in `.firebaserc`

## Containerization (Backend Only)

### Build Backend Image

```bash
docker build -t e-hotel-backend ./backend
```

### Run Backend Container

```bash
docker run -d -p 8080:8080 \
  -e FIREBASE_SDK_SA_KEY=/app/credentials/firebase-sdk-sa-key.json \
  -e FIRESTORE_DATABASE_ID=your-db-id \
  -v $(pwd)/backend/credentials:/app/credentials \
  e-hotel-backend
```

## CI/CD & Deployment

The project includes GitHub Actions workflows for automated deployment:

- **Backend Deployment** (`.github/workflows/backend-deploy.yml`):

  - Builds Docker image from backend
  - Deploys to Google Cloud Run
  - Automatically sets environment variables including `FIRESTORE_DATABASE_ID`

- **Frontend Deployment** (`.github/workflows/frontend-deployment-merge.yml`):
  - Builds and deploys the React frontend

### Required GitHub Secrets

For the CI/CD workflows to work, you need to set up secrets in two separate GitHub environments:

#### Server Environment Secrets

These secrets are used for the backend deployment workflow:

- `BACKEND_PORT`: Backend service port (e.g., "8080")
- `FIREBASE_SDK_SA_KEY`: Firebase service account key content (JSON content)
- `FIRESTORE_DATABASE_ID`: Your Firestore database ID
- `GCP_BACKEND_DEPLOYMENT_SA_KEY`: Google Cloud service account key
- `GCP_BACKEND_DEPLOYMENT_SA_NAME`: Service account name
- `GCP_LOCATION`: Google Cloud region (e.g., "us-central1")
- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `REGISTRY_ARTIFACTS_REPOSITORY_NAME`: Container registry repository name
- `WORKLOAD_IDENTITY_PROVIDER`: Workload identity provider

#### Frontend Environment Secrets

These secrets are used for the frontend deployment workflow:

- `FIREBASERC`: Firebase project configuration (JSON content)
- `FIREBASE_CONFIG`: Firebase configuration for frontend (JSON content)
- `FIREBASE_FRONTEND_DEPLOYMENT_SA_KEY`: Firebase service account key for frontend deployment
- `GCP_LOCATION`: Google Cloud region (e.g., "us-central1")
- `VITE_API_URL`: Production API URL for the frontend

## Available Scripts

### Backend Scripts

- `npm start`: Start the production server
- `npm test`: Run tests (currently not implemented)

### Frontend Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build

## UML Diagrams & Documentation

All UML models are in the `SDM-Project.pdf` file, including (StarUML/PlantUML) as exported PNG/SVG formats for easy reference.

## Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**: Ensure your Firebase service account key is correctly placed and has the necessary permissions
2. **Firestore Connection Issues**: Verify your `FIRESTORE_DATABASE_ID` is correct and the database exists
3. **CORS Errors**: The backend is configured to allow CORS from the frontend development server
4. **Port Conflicts**: Ensure ports 8080 (backend) and 5173 (frontend) are available

### Development Tips

- Use the browser's developer tools to check for API errors
- Check the backend console logs for server-side errors
- Ensure all environment variables are properly set before starting the servers
