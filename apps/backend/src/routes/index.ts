import { Hono } from 'hono';
import auth from './auth.js';
import items from './items.js';
import ai from './ai.js';
import matches from './matches.js';
import claims from './claims.js';
import ucard from './ucard.js';
import notifications from './notifications.js';
import { openApiSpec, swaggerHtml } from '../openapi.js';

const router = new Hono();

router.route('/auth', auth);
router.route('/items', items);
router.route('/ai', ai);
router.route('/matches', matches);
router.route('/claims', claims);
router.route('/ucard', ucard);
router.route('/notifications', notifications);

// API documentation
router.get('/docs', (c) => c.html(swaggerHtml));
router.get('/docs/openapi.json', (c) => c.json(openApiSpec));

export default router;
