// adminController.js
const passport = require('passport');
const SystemAnnouncement = require('../models/SystemAnnouncements');
const User = require('../models/User');
const marked = require('marked');
const multer = require('multer');
const path = require('path');
const { sendEmail } = require("../../emailService");
const moment = require('moment');
const crypto = require('crypto');
const mongoose = require('mongoose');
const UserActivity = require('../models/UserActivity');
const FeatureUsage = require('../models/FeatureUsage');
const Complaint = require('../models/Complaint');
const os = require('os');
const osUtils = require('os-utils');
const process = require('process');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../public/img/profileImage')); // เปลี่ยน path ให้ตรงกับโครงสร้างโฟลเดอร์ของคุณ
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

exports.adminDashboard = async (req, res, next) => {
    try {
        const nonce = crypto.randomBytes(16).toString('base64');
res.setHeader('Content-Security-Policy', `script-src 'self' https://cdn.jsdelivr.net 'nonce-${nonce}'`);

        const totalUsers = await User.countDocuments({ role: 'user' });

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const onlineUsers = await User.countDocuments({ role: 'user', lastActive: { $gte: fiveMinutesAgo } });

        // 🟢 ดึงข้อมูลกิจกรรมยอดนิยม
        const activities = await UserActivity.aggregate([
            { $group: { _id: "$action", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        const totalActivityCount = activities.reduce((sum, activity) => sum + activity.count, 0);
        const popularActivities = activities.map(activity => ({
            name: activity._id,
            count: activity.count,
            percentage: ((activity.count / totalActivityCount) * 100).toFixed(2)
        }));

        // 🟢 ดึงข้อมูลการใช้งานฟีเจอร์
        const featureUsage = await FeatureUsage.aggregate([
            { $group: { _id: "$featureName", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const featureUsageStats = featureUsage.map(feature => ({
            featureName: feature._id,
            count: feature.count
        }));

        // 🟢 ดึงข้อมูล CPU และ Memory แบบใหม่ (CPU เป็น %)
        const loadAverage = os.loadavg()[0]; // Load Average (1 นาที)
        const cpuCores = os.cpus().length;   // จำนวน Core ของ CPU
        const cpuUsagePercent = (loadAverage / cpuCores) * 100;  // แปลงเป็น %

        const memoryUsage = (process.memoryUsage().rss / os.totalmem()) * 100; // หน่วยความจำ
        const uptime = (process.uptime() / 60).toFixed(2); // uptime เป็นนาที

        // 🟢 ดึง Response Time
        const start = process.hrtime();
        setTimeout(() => {
            const diff = process.hrtime(start);
            const responseTime = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2);


            res.render('admin/Dashboard_admin', {
                nonce,
                title: 'Admin Dashboard',
                user: req.user,
                totalUsers,
                onlineUsers,
                popularActivities: popularActivities || [], // ถ้าไม่มี ให้เป็นอาร์เรย์ว่าง
                featureUsageStats: featureUsageStats || [], // ถ้าไม่มี ให้เป็นอาร์เรย์ว่าง
                cpuUsage: cpuUsagePercent.toFixed(1) + '%',
                memoryUsage: memoryUsage.toFixed(2),
                uptime,
                responseTime,
                layout: "../views/layouts/adminPage",
            });
            
        }, 100);
    } catch (err) {
        console.error('Error loading admin dashboard:', err);
        next(err);
    }
};

exports.getServerStatus = (req, res) => {
    osUtils.cpuUsage(cpuPercent => {
        res.json({
            cpuUsage: (cpuPercent * 100).toFixed(2),
            memoryUsage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2),
            uptime: os.uptime(),
            responseTime: process.uptime().toFixed(2)
        });
    });
};

exports.SystemAnnouncements = async (req, res, next) => {
    try {
        const now = new Date();
        const announcements = await SystemAnnouncement.find({ expirationDate: { $gte: now }, isDeleted: false })
            .populate({
                path: 'createdBy',
                select: 'username role',
                match: { role: 'admin' }
            })
            .sort({ createdAt: -1 });

        const userCounts = await User.countDocuments({
            role: 'user',
            "preferences.notifications.email": true
        });

        res.render('admin/SystemAnnouncements_admin', {
            title: 'System Announcements',
            user: req.user,
            announcements,
            userCounts,
            layout: "../views/layouts/adminPage"
        });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        req.flash('error', 'ไม่สามารถโหลดรายการประกาศได้');
        res.redirect('/admin/adminPage');
    }
};

exports.pageaddAnnouncements = (req, res, next) => {
    res.render('admin/SystemAnnouncements_admin/addSystemAnnouncements', {
        title: 'Admin Page',
        user: req.user,
        layout: "../views/layouts/adminPage"
    });
};

exports.createAnnouncements = async (req, res, next) => {
    try {
        const { title, content, expirationDate } = req.body;

        const users = await User.find({
            role: 'user',
            "preferences.notifications.email": true
        }).select('googleEmail _id');

        const emailAddresses = users.map(user => user.googleEmail);
        const recipients = users.map(user => user._id);

        const newAnnouncement = new SystemAnnouncement({
            createdBy: req.user._id,
            title,
            content,
            expirationDate,
            targetAudience: 'user',
            recipients,
        });

        await newAnnouncement.save();
        console.log('ประกาศถูกสร้างสำเร็จ:', newAnnouncement);

        // สร้าง Notification สำหรับผู้ใช้ทุกคนที่มี role เป็น 'user'
        const allUsers = await User.find({ role: 'user' }); // เปลี่ยนชื่อตัวแปรเป็น allUsers
        const notificationPromises = allUsers.map(async (user) => {
            const notification = new Notification({
                user: user._id,
                type: 'announcement',
                announcement: newAnnouncement._id,
                leader: req.user._id,
                status: 'accepted',
            });
            try {
                await notification.save();
            } catch (err) {
                console.error(err);
            }
        });

        await Promise.all(notificationPromises);

        if (emailAddresses.length > 0) {
            const emailSubject = `ประกาศใหม่: ${title}`;

            // แปลง content เป็น HTML ก่อนส่งอีเมล
            const emailBody = `
                <h1>${title}</h1>
                <p>${marked.parse(content)}</p> 
                <p>ประกาศนี้จะหมดอายุในวันที่ ${new Date(expirationDate).toLocaleDateString()}</p>
            `;

            const emailPromises = emailAddresses.map(email =>
                sendEmail(email, emailSubject, emailBody)
            );
            await Promise.all(emailPromises);
            console.log('ส่งอีเมลสำเร็จ');
        } else {
            console.log('ไม่มีผู้ใช้ที่เปิดใช้งานการแจ้งเตือนทางอีเมล');
        }

        req.flash('success', 'สร้างประกาศสำเร็จและส่งอีเมลแจ้งเตือนแล้ว');
        res.redirect('/SystemAnnouncements');
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการสร้างประกาศ:', error);
        req.flash('error', 'เกิดข้อผิดพลาดในการสร้างประกาศ');
        res.redirect('/SystemAnnouncements/pageaddAnnouncements');
    }
};

exports.sendUnexpiredAnnouncementsToNewUser = async (userEmail) => {
    try {
        const activeAnnouncements = await SystemAnnouncement.find({
            expirationDate: { $gte: new Date() },
            isDeleted: false
        });

        if (activeAnnouncements.length > 0) {
            const emailPromises = activeAnnouncements.map(announcement => {
                const emailSubject = `ประกาศที่ยังไม่หมดอายุ: ${announcement.title}`;

                // แปลง content เป็น HTML ก่อนส่งอีเมล (ควรใช้ announcement.content)
                const emailBody = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <style>
                        body {
                          font-family: sans-serif;
                        }
                        .content-preview {
                          height: 350px;
                          overflow-y: scroll;
                          padding: 10px;
                          font-size: 16px;
                          color: #555;
                          line-height: 1.6;
                          border-radius: 10px;
                        }
                      </style>
                    </head>
                    <body>
                      <h1>${announcement.title}</h1> 
                      <p>${marked.parse(announcement.content)}</p> 
                      <p>ประกาศนี้จะหมดอายุในวันที่ ${new Date(announcement.expirationDate).toLocaleDateString()}</p>
                    </body>
                    </html>
                `;
                return sendEmail(userEmail, emailSubject, emailBody);
            });

            const results = await Promise.allSettled(emailPromises);
            console.log('ส่งอีเมลสำเร็จสำหรับผู้ใช้ใหม่:', userEmail);
        } else {
            console.log('ไม่มีประกาศที่ยังไม่หมดอายุสำหรับผู้ใช้ใหม่');
        }

    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการส่งอีเมล:', error);
    }
};

exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await SystemAnnouncement.findByIdAndUpdate(
            id,
            { isDeleted: true, updatedAt: new Date() },
            { new: true }
        );
        if (!result) {
            return res.status(404).json({ success: false, message: 'ไม่พบประกาศนี้' });
        }
        res.json({ success: true, message: 'ลบประกาศเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบประกาศ' });
    }
};

exports.historySystemAnnouncements = async (req, res, next) => {
    try {
        const { searchTerm } = req.query; // รับค่า searchTerm จาก query parameter

        let filter = { isDeleted: true }; // เริ่มต้นด้วย filter สำหรับประกาศที่ถูกลบ

        if (searchTerm) { // ถ้ามี searchTerm ให้เพิ่ม filter
            filter.title = { $regex: searchTerm, $options: 'i' };
        }

        const deletedAnnouncements = await SystemAnnouncement.find(filter) // เพิ่ม filter ที่มีเงื่อนไขการค้นหา
            .populate({
                path: 'createdBy',
                select: 'username role',
                match: { role: 'admin' }
            })
            .sort({ updatedAt: -1 });

        res.render('admin/SystemAnnouncements_admin/historySystemAnnouncements', {
            title: 'History of Deleted Announcements',
            user: req.user,
            deletedAnnouncements,
            layout: "../views/layouts/adminPage"
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
}

exports.ReportUserProblem = async (req, res, next) => {
    try {
        const complaints = await Complaint.find({ status: { $ne: 'Closed' } }).populate('userId').sort({ submittedAt: -1 });
        res.render('admin/ReportUserProblem_admin', {
            title: 'Report a user problem',
            user: req.user,
            complaints: complaints,
            layout: '../views/layouts/adminPage'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
};

exports.updateReportUserProblem = async (req, res, next) => {
    try {
        const complaintId = req.params.id; // รับ id จาก URL parameter
        const complaint = await Complaint.findById(complaintId).populate('userId');

        if (!complaint) {
            return res.status(404).send('ไม่พบรายงานปัญหา');
        }

        res.render('admin/ReportUserProblem_admin/updateReportUserProblem', {
            title: 'Update Report User Problem',
            user: req.user,
            complaint: complaint, // ส่ง complaint ไปยัง template
            layout: '../views/layouts/adminPage'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
};

exports.ClosedReportUserProblem = async (req, res, next) => {
    try {
        const closedComplaints = await Complaint.find({ status: 'Closed' }).populate('userId').sort({ resolvedAt: -1 });
        res.render('admin/ReportUserProblem_admin/closeReportUserProblem', {
            title: 'Closed Report User Problem',
            user: req.user,
            closedComplaints: closedComplaints, // <-- Make sure this is here
            layout: '../views/layouts/adminPage'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
};

exports.SettingAdmin = (req, res, next) => {
    res.render('admin/SettingAdmin_admin', {
        title: 'Setting Adminstator',
        user: req.user,
        layout: '../views/layouts/adminPage'
    });
};

exports.updateProfileImage = [
    upload.single('profileImage'), // ใช้ middleware upload.single()
    async (req, res, next) => {
        try {
            if (req.file) {
                const updatedUser = await User.findByIdAndUpdate(
                    req.user._id,
                    { profileImage: '/img/profileImage/' + req.file.filename }, // อัปเดต path ของรูปโปรไฟล์
                    { new: true }
                );
                if (updatedUser) {
                    req.flash('success', 'อัปเดตรูปโปรไฟล์สำเร็จ');
                    res.redirect('/SettingAdmin');
                } else {
                    req.flash('error', 'อัปเดตรูปโปรไฟล์ไม่สำเร็จ');
                    res.redirect('/SettingAdmin');
                }
            } else {
                req.flash('error', 'กรุณาเลือกรูปโปรไฟล์');
                res.redirect('/SettingAdmin');
            }
        } catch (error) {
            console.error('Error updating profile image:', error);
            req.flash('error', 'เกิดข้อผิดพลาดในการอัปเดตรูปโปรไฟล์');
            res.redirect('/SettingAdmin');
        }
    }
];

exports.changePassword = async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    // ตรวจสอบความซับซ้อนของรหัสผ่าน (เพิ่ม logic ตรวจสอบตามต้องการ) 
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร' });
    }

    try {
        // ใช้ passport ในการเปลี่ยนรหัสผ่าน 
        await new Promise((resolve, reject) => {
            req.user.changePassword(currentPassword, newPassword, (err, user) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(user);
                }
            });
        });

        res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
    }
};

exports.getLoginHistory = async (req, res, next) => {
    try {
        const adminUser = await User.findById(req.user._id).select('lastLogin lastActive');
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ดูแลระบบ' });
        }

        res.json({
            success: true,
            data: {
                lastLogin: adminUser.lastLogin,
                lastActive: adminUser.lastActive,
            },
        });
    } catch (error) {
        console.error('Error fetching login history:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการเข้าสู่ระบบ' });
    }
};

exports.UserAccountManagement = async (req, res, next) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }); // ดึงข้อมูลผู้ใช้ทั้งหมดที่ไม่ใช่ admin
        res.render('admin/UserAccountManagement_admin.ejs', {
            title: 'User Account Management Adminstator',
            user: req.user,
            users: users,
            layout: '../views/layouts/adminPage'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูล');
    }
};

// ฟังก์ชันสำหรับอัปเดตข้อมูลผู้ใช้
exports.updateusersmanage = async (req, res) => {
    try {
        console.log("Request body:", req.body);
        const { userId, newUsername } = req.body;

        // ตรวจสอบว่ามี userId และ newUsername หรือไม่
        if (!userId || !newUsername) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { username: newUsername },
            { new: true }
        );

        if (updatedUser) {
            res.json({ success: true, message: 'อัปเดตชื่อผู้ใช้สำเร็จ' });
        } else {
            res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด...' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        console.log("Soft Deleting User ID:", userId);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // ทำ Soft Delete โดยอัปเดต isDeleted เป็น true และบันทึกเวลาลบ
        user.isDeleted = true;
        user.deletedAt = new Date();
        await user.save();

        res.json({ success: true, message: "ลบผู้ใช้สำเร็จ (Soft Delete)" });
    } catch (error) {
        console.error("Error soft deleting user:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการลบผู้ใช้" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpiration = Date.now() + 86400000; // 1 day

        user.resetToken = resetToken;
        user.resetTokenExpiration = resetTokenExpiration;

        // Save the user using async/await
        await user.save();

        const resetPasswordUrl = `${req.protocol}://${req.get('host')}/reset-password-new-get?token=${resetToken}`;
        const emailSubject = 'รีเซ็ตรหัสผ่าน';
        const emailBody = `
            <p>สวัสดี ${user.username},</p>
            <p>กรุณากดลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่าน:</p>
            <a href="${resetPasswordUrl}">รีเซ็ตรหัสผ่าน</a>
            <p>ลิ้งรีเซ็ตรหัสผ่านจะอยู่ได้ 1 วัน</p>
        `;

        await sendEmail(user.googleEmail, emailSubject, emailBody);
        res.json({ success: true, message: 'ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด...' });
    }
};


exports.showResetPasswordNew = (req, res) => {
    const token = req.query.token;
    res.render('admin/UserAccountManagement_admin/reset-password-new.ejs', {
        title: 'Reset Password',
        user: req.user,
        token: token,
        layout: "../views/layouts/resetpassUser"
    });
};

exports.resetPasswordNew = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            req.flash('error', 'รหัสผ่านใหม่ไม่ตรงกัน');
            return res.redirect(`/reset-password-new-get?token=${token}`);
        }

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }
        });

        if (!user) {
            console.log('error', 'Token ไม่ถูกต้องหรือหมดอายุ');
            req.flash('error', 'Token ไม่ถูกต้องหรือหมดอายุ');
            return res.redirect('/login');
        }

        // Use the setPassword method with async/await
        await new Promise((resolve, reject) => {
            user.setPassword(newPassword, (err, updatedUser) => {
                if (err) {
                    return reject(err);
                }
                user.resetToken = undefined;
                user.resetTokenExpiration = undefined;
                resolve(updatedUser);
            });
        });

        await user.save(); // Save the user with updated details

        console.log('User saved successfully.');
        req.flash('success', 'รีเซ็ตรหัสผ่านสำเร็จ');
        res.redirect('/login');
    } catch (err) {
        console.error('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน:', err);
        req.flash('error', 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
        res.redirect('/login');
    }
};

exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error logging out");
        }
        req.session.destroy((error) => {
            if (error) {
                console.error(error);
                return res.status(500).send("Error logging out");
            }
            res.redirect("/");
        });
    });
};


