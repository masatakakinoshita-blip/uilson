import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'uilson-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
