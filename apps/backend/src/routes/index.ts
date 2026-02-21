import { Hono } from 'hono';
import auth from './auth.js';
import items from './items.js';
import ai from './ai.js';
import matches from './matches.js';
import claims from './claims.js';
import ucard from './ucard.js';

const router = new Hono();

router.route('/auth', auth);
router.route('/items', items);
router.route('/ai', ai);
router.route('/matches', matches);
router.route('/claims', claims);
router.route('/ucard', ucard);

export default router;
