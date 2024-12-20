const router = require('express').Router();
const { catchErrors } = require('../handlers/errorHandler');
const homeController  = require('../controllers/homeController');
// const auth = require('../middlewares/OnlyAuth');

router.post('/home-page', catchErrors(homeController.home));
router.post('/categories', catchErrors(homeController.categories));
router.post('/brands', catchErrors(homeController.brands));
router.post('/getsub',catchErrors(homeController.getsub));

module.exports = router;