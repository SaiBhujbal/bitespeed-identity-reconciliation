import { createApp } from './app.js';
import { logger } from './logger.js';  


const port = Number(process.env.PORT) || 3000;
createApp().listen(port, () => logger.info(`API listening on ${port}`));
