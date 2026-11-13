import { app } from './app';
import { env } from './config/environment';

const server = app.listen(env.port, () => {
  console.log('====================================================');
  console.log(' Service Request Management System — Backend API');
  console.log(` Environment : ${env.nodeEnv}`);
  console.log(` Server URL  : http://localhost:${env.port}`);
  console.log(` Health URL  : http://localhost:${env.port}/api/health`);
  console.log(` Requests API: http://localhost:${env.port}/api/requests`);
  console.log(` CORS Origin : ${env.corsOrigin}`);
  console.log('====================================================');
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
