import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import appRoutes from './routes/applications';
import sdkRoutes from './routes/sdk';

const app = express();

// Trust the first proxy (required for rate limiting behind proxies like Nginx/Docker)
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Extremely permissive CORS for development
app.use(cors({
  origin: true, // Allow any origin
  credentials: true,
}));
app.options('*', cors()); // Pre-flight for all routes

app.use(express.json());
app.use(cookieParser());

// Health checks
app.get(['/', '/health'], (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create a router for API routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/applications', appRoutes);
apiRouter.use('/sdk', sdkRoutes);

// Mount API routes at both /api and root to be flexible
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Catch-all 404 handler for debugging
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

export default app;