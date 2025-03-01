const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: 'googleEmail',
      passwordField: 'password',
    },
    async (googleEmail, password, done) => {
      try {
        const user = await User.findOne({ googleEmail });
        if (!user) {
          return done(null, false, { message: 'Incorrect email.' }); // ข้อความนี้จะถูกส่งไปยัง req.flash
        }
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Incorrect password.' }); // ข้อความนี้จะถูกส่งไปยัง req.flash
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.googleEmail); // ใช้ googleEmail แทน user.id
  done(null, user.googleEmail); // บันทึก googleEmail ลงใน session
});

// Deserialize user
passport.deserializeUser(async (googleEmail, done) => {
  console.log('Deserializing user with email:', googleEmail); // ใช้ googleEmail แทน id
  try {
    const user = await User.findOne({ googleEmail }); // ค้นหาผู้ใช้ด้วย googleEmail
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;