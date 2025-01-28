const envConfig = {
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT,
  storageBucket: process.env.GCP_STORAGE_BUCKET,
  sentrydsn: process.env.SENTRY_DSN,
  cloudinaryName: process.env.CLOUDINARY_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  webhookSignature: process.env.WEBHOOK_SIGNATURE,
  projectId: process.env.GCP_PROJECT_ID,
  location: 'asia-southeast1',
  computeServiceUrl: process.env.COMPUTE_SERVICE_URL,
  ioServiceUrl: process.env.IO_SERVICE_URL,
  cloudTaskServiceAccount: process.env.CLOUD_TASKS_SERVICE_ACCOUNT,
};

export { envConfig };
