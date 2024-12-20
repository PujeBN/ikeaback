const router = require('express').Router();
const { catchErrors } = require('../handlers/errorHandler');
const userController  = require('../controllers/userController');
const auth = require('../middlewares/OnlyAuth');
const checkMail=require('../middlewares/mailCheck');

router.post('/login', catchErrors(userController.login));
router.post('/facebook-login', catchErrors(userController.facebooklogin));
router.get('/google-login', userController.Googlelogin);
router.get('/google-login-callback',userController.googleCallback,userController.googleCallback2);
router.post('/register',checkMail, catchErrors(userController.register));
router.get('/verify-email', catchErrors(userController.VerifyEmail));
router.post('/forgot-password', catchErrors(userController.forgotPassword));
router.post('/my-info', auth, catchErrors(userController.getInfo));
router.post('/update-info', auth, catchErrors(userController.updateInfo));
router.post('/change-password', auth, catchErrors(userController.updatePassword));

module.exports = router;