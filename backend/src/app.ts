import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import appRoutes from './routes/applications';
import sdkRoutes from './routes/sdk';

const app = express();

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

app.use('/auth', authRoutes);
app.use('/applications', appRoutes);
app.use('/sdk', sdkRoutes);

export default app;