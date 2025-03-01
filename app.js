//app.js
require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const connectDB = require('./server/config/db');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./server/models/User');
const moment = require('moment');
const bodyParser = require('body-parser');
const schedule = require('node-schedule');
const SystemAnnouncement = require('./server/models/SystemAnnouncements');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const passport = require('./server/config/passport');
const os = require('os');
const http = require("http");

const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: { origin: "*" }
});
const osUtils = require('os-utils');


io.on("connection", (socket) => {
  console.log("Client connected for server monitoring");

  const sendServerStats = () => {
      osUtils.cpuUsage(cpuPercent => {
          socket.emit("serverStats", {
              cpuUsage: (cpuPercent * 100).toFixed(2),
              memoryUsage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2),
              uptime: os.uptime(),
              responseTime: process.uptime().toFixed(2)
          });
      });
  };

  const interval = setInterval(sendServerStats, 3000); // อัปเดตทุก 3 วินาที

  socket.on("disconnect", () => {
      clearInterval(interval);
      console.log("Client disconnected from server monitoring");
  });
});

const port = process.env.PORT || 5001;



// Middleware สำหรับ parse body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to Database
connectDB().catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is not defined in environment variables');
  process.exit(1);
}

// ตั้งค่าการลบประกาศที่หมดอายุทุกวันเวลาเที่ยงคืน
schedule.scheduleJob('0 0 * * *', async () => {
  try {
    const now = new Date();
    const result = await SystemAnnouncement.updateMany(
      { expirationDate: { $lt: now }, isDeleted: { $ne: true } },
      { isDeleted: true, updatedAt: now }
    );
    console.log(`${result.nModified} ประกาศที่หมดอายุถูกย้ายไปที่ history เรียบร้อยแล้ว`);
  } catch (error) {
    console.error('Error moving expired announcements to history:', error);
  }
});

const createAdminUser = async () => {
  try {
    // ตรวจสอบว่า adminEmail และ adminPassword มีค่าหรือไม่
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('ADMIN_EMAIL or ADMIN_PASSWORD is not set in environment variables');
      return;
    }

    // ค้นหาในฐานข้อมูลว่ามีผู้ใช้ที่มีอีเมลและบทบาทเป็น admin แล้วหรือยัง
    const existingAdmin = await User.findOne({ googleEmail: adminEmail, role: 'admin' });

    if (existingAdmin) {
      console.log('Admin user already exists, skipping creation.');
      return;
    }

    // ถ้ายังไม่มี ให้ทำการสร้าง
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = new User({
      username: 'admin',
      googleEmail: adminEmail,
      password: hashedPassword,
      role: 'admin',
    });

    await adminUser.save();
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// เรียกใช้งานฟังก์ชันหลังเชื่อมต่อฐานข้อมูล
connectDB()
  .then(() => {
    console.log('Connected to database');
    return createAdminUser();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });

const sessionSecret = process.env.SESSION_SECRET || 'fallbackSecret1234';

console.log('🔑 Using SESSION_SECRET:', sessionSecret ? 'Loaded' : 'Not loaded');


if (!sessionSecret) {
  console.error('SESSION_SECRET is not defined in environment variables');
  process.exit(1);
}

console.log('Using SESSION_SECRET:', sessionSecret ? 'Loaded' : 'Not loaded');


const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: 'sessions',
});

sessionStore.on('connected', () => {
  console.log('MongoStore connected successfully');
});

sessionStore.on('error', (err) => {
  console.error('MongoStore connection error:', err);
});

console.log("SESSION_SECRET:", process.env.SESSION_SECRET);

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS ใน production เท่านั้น
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // อายุ session 7 วัน
  },
}));

app.set('trust proxy', 1);

console.log("MongoDB Session Store Connected");

app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('User from session:', req.session.passport?.user);
  console.log('User from session:', req.user);
  next();
});

app.use('/socket.io', express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));
app.use("/script", express.static(path.join(__dirname, "public/script"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".js")) {
      res.setHeader("Content-Type", "application/javascript");
    }
  }
}));


app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "script-src-elem": ["'self'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "connect-src": ["'self'", "https://cdn.jsdelivr.net"]
    }
  })
);



app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "script-src 'self' https://cdn.jsdelivr.net;");
  next();
});

app.use((req, res, next) => {
  console.log("Current CSP Headers:", res.getHeaders()["content-security-policy"]);
  next();
});


console.log('Session middleware initialized');
console.log('MongoDB URI:', process.env.MONGODB_URI);
console.log('Session secret:', process.env.SESSION_SECRET ? 'Set' : 'Not set');

app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/docUploads', express.static(path.join(__dirname, 'docUploads')));
app.use(methodOverride('_method'));


// Flash middleware setup
app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.error = req.flash('error');
  next();
});

// Middleware to handle due date validation and formatting
app.use((req, res, next) => {
  if (req.body.dueDate) {
    const dueDate = moment(req.body.dueDate, moment.ISO_8601, true);
    if (!dueDate.isValid()) {
      console.error('Invalid date format:', req.body.dueDate);
      req.flash('error', 'Invalid date format');
      return res.redirect('back');
    }
    req.body.dueDate = dueDate.toISOString();
  }
  next();
});

// Middleware to update lastActive on each request
app.use(async (req, res, next) => {
  if (req.isAuthenticated()) {
      try {
          await User.updateOne({ _id: req.user._id }, { lastActive: Date.now() });
      } catch (error) {
          console.error('Error updating lastActive:', error);
      }
  }
  next();
});


// Templating Engine setup
app.use(expressLayouts);
app.set('layout', './layouts/main');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// Routes setup
app.use('/', require('./server/routes/auth'));
app.use('/', require('./server/routes/index'));
app.use('/', require('./server/routes/adminRoutes'));
app.use('/', require('./server/routes/addAdminRoutes'));

// Handle 404 errors
app.get('*', (req, res) => {
  res.status(404).render('404');
});

// Start the server
server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});