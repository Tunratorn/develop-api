// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const sendmailController = require('../controllers/sendmailController');
const cleardebtController = require('../controllers/cleardebtController');
const lunacatController = require('../controllers/lunacatController');

router.get('/get-datauser', contentController.getDataUser);
router.post('/send-email', sendmailController.sendmail);
router.get('/get-register-travel', contentController.getRegister_travel);

router.get('/debug-supabase', contentController.debugSuperbase);
router.get('/get-registrations-travel', contentController.get_registrations_travel);
router.post('/add-registrations-travel', contentController.add_registrations_travel);

router.get('/cleardebt-snapshots', cleardebtController.getAllSnapshots);
router.get('/cleardebt-snapshots/:id', cleardebtController.getSnapshotById);
router.post('/cleardebt-snapshots', cleardebtController.createSnapshot);
router.put('/cleardebt-snapshots/:id', cleardebtController.updateSnapshot);
router.put('/cleardebt-snapshots/:id/upsert', cleardebtController.upsertSnapshot);
router.delete('/cleardebt-snapshots/:id', cleardebtController.removeSnapshot);

router.get('/cleardebt-edit-locks', cleardebtController.getAllLocks);
router.get('/cleardebt-edit-locks/:resourceKey', cleardebtController.getLockByKey);
router.post('/cleardebt-edit-locks/:resourceKey/acquire', cleardebtController.acquireLock);
router.put('/cleardebt-edit-locks/:resourceKey/renew', cleardebtController.renewLock);
router.post('/cleardebt-edit-locks/:resourceKey/release', cleardebtController.releaseLock);
router.delete('/cleardebt-edit-locks/:resourceKey', cleardebtController.forceReleaseLock);

router.get('/lunacat/me', lunacatController.getMe);
router.get('/lunacat/calendars', lunacatController.getCalendars);

router.get('/lunacat/events', lunacatController.getEvents);
router.post('/lunacat/events', lunacatController.createEvent);
router.put('/lunacat/events/:id', lunacatController.updateEvent);
router.delete('/lunacat/events/:id', lunacatController.deleteEvent);

router.get('/lunacat/holidays', lunacatController.getHolidays);
router.put('/lunacat/holidays', lunacatController.replaceHolidays);

router.get('/lunacat/money-entries', lunacatController.getMoneyEntries);
router.post('/lunacat/money-entries', lunacatController.createMoneyEntry);
router.put('/lunacat/money-entries/:id', lunacatController.updateMoneyEntry);
router.delete('/lunacat/money-entries/:id', lunacatController.deleteMoneyEntry);

router.get('/lunacat/products', lunacatController.getProducts);
router.post('/lunacat/products', lunacatController.createProduct);
router.put('/lunacat/products/:id', lunacatController.updateProduct);
router.delete('/lunacat/products/:id', lunacatController.deleteProduct);
router.get('/lunacat/products/:id/stock-movements', lunacatController.getProductStockMovements);

module.exports = router;
