// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const sendmailController = require('../controllers/sendmailController');
const cleardebtSnapshotsController = require('../controllers/cleardebtSnapshotsController');

router.get('/get-datauser', contentController.getDataUser);
router.post('/send-email', sendmailController.sendmail);
router.get('/get-register-travel', contentController.getRegister_travel);

router.get('/debug-supabase', contentController.debugSuperbase);
router.get('/get-registrations-travel', contentController.get_registrations_travel);
router.post('/add-registrations-travel', contentController.add_registrations_travel);

router.get('/cleardebt-snapshots', cleardebtSnapshotsController.getAll);
router.get('/cleardebt-snapshots/:id', cleardebtSnapshotsController.getById);
router.post('/cleardebt-snapshots', cleardebtSnapshotsController.create);
router.put('/cleardebt-snapshots/:id', cleardebtSnapshotsController.update);
router.put('/cleardebt-snapshots/:id/upsert', cleardebtSnapshotsController.upsert);
router.delete('/cleardebt-snapshots/:id', cleardebtSnapshotsController.remove);

module.exports = router;