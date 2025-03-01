const passport = require("passport");
const User = require("../models/User");

exports.loginPage = (req, res) => {
  const error = req.session.error || null;
  req.session.error = null; // ล้างค่าหลังจากแสดงผล
  res.render("log/login", { error });
};


exports.login = async (req, res, next) => {
  console.log('Login process started');

  if (!req.body.googleEmail || !req.body.password) {
      req.session.error = 'กรุณากรอกอีเมลและรหัสผ่าน';
      return res.redirect('/login');
  }

  passport.authenticate('local', async (err, user, info) => {
      if (err) {
          console.error('Authentication error:', err);
          return next(err);
      }

      if (!user) {
          let errorMsg = 'รหัสผ่านไม่ถูกต้อง';
          const userExists = await User.findOne({ googleEmail: req.body.googleEmail });
          if (!userExists) {
              errorMsg = 'ไม่มีอีเมลในฐานข้อมูล';
          }
          req.session.error = errorMsg; // เปลี่ยนจาก req.flash เป็น req.session
          return res.redirect('/login');
      }

      req.logIn(user, async (err) => {
          if (err) {
              console.error('Login error:', err);
              return next(err);
          }
          user.lastLogin = Date.now();
          user.lastActive = Date.now();
          await user.save();

          req.session.save((err) => {
              if (err) console.error('Error saving session:', err);
              return res.redirect('/adminDashboard');
          });
      });
  })(req, res, next);
};

exports.loginFailure = (req, res) => {
  res.send("Something went wrong...");
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

