const User = require('../models/User');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const imgDirectory = path.join(__dirname, '/public/img/profileImage');
fs.mkdirSync(imgDirectory, { recursive: true });

// ตั้งค่า Multer สำหรับอัปโหลดไฟล์
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, imgDirectory);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// แก้ไข route เพื่อใช้ Multer
exports.uploadMiddleware = upload.single('profileImage');

exports.addAdmin = async (req, res, next) => {
    const successMessage = req.session.successMessage;
    const error = req.session.error;

    // ล้างค่า session หลังจากแสดง
    req.session.successMessage = null;
    req.session.error = null;

    res.render('admin/addAdmin', {
        title: 'Create Administrator',
        user: req.user,
        layout: "../views/layouts/adminPage",
        successMessage,
        error
    });
};

exports.createAdministrator = [
    upload.single('profileImage'), 
    async (req, res, next) => {
        const { username, password, googleEmail, confirmPassword } = req.body;
        let finalProfileImage = '/img/profileImage/img-user.svg';

        try {
            // ตรวจสอบอีเมลที่ซ้ำกัน
            const existingUser = await User.findOne({ googleEmail });
            if (existingUser) {
                req.session.error = 'อีเมลนี้ถูกใช้งานแล้ว';
                return res.redirect('/adminPage/addAdmin');
            }

            // ตรวจสอบรหัสผ่าน
            if (password !== confirmPassword) {
                req.session.error = 'รหัสผ่านไม่ตรงกัน';
                return res.redirect('/adminPage/addAdmin');
            }

            // แฮชพาสเวิร์ด
            const hashedPassword = await bcrypt.hash(password, 10);

            // จัดการรูปโปรไฟล์
            if (req.file) {
                finalProfileImage = `/img/profileImage/${req.file.filename}`;
            }

            // สร้าง Admin ใหม่
            const newAdmin = new User({
                username,
                password: hashedPassword,
                googleEmail,
                profileImage: finalProfileImage,
                role: 'admin'
            });

            // บันทึก Admin
            await newAdmin.save();

            req.session.successMessage = 'เพิ่มผู้ดูแลระบบเรียบร้อยแล้ว';
            return res.redirect('/adminPage/addAdmin');
        } catch (err) {
            console.error(err);
            req.session.error = 'เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ';
            return res.redirect('/adminPage/addAdmin');
        }
    }
];
