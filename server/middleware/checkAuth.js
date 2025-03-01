exports.isLoggedIn = async function (req, res, next) {
  if (req.isAuthenticated() && req.user) {
    console.log('Authenticated user:', req.user);
    return next();
  } else {
    console.log('Not authenticated, redirecting to login');
    return res.redirect('/login');
  }
};