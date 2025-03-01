const express = require('express');
const router = express.Router();
const addAdminController = require('../controllers/addAdminController');

const ensureAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
        req.flash('error', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        return res.redirect('/login');
    }
    next();
};

router.get('/adminPage/addAdmin', ensureAdmin, addAdminController.addAdmin);
router.post('/adminPage/addAdmin', ensureAdmin, addAdminController.createAdministrator);

module.exports = router;