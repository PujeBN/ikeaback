const router = require('express').Router();
const { catchErrors } = require('../handlers/errorHandler');
const productController  = require('../controllers/productController');
const auth = require('../middlewares/OnlyAuth');

router.post('/category', catchErrors(productController.mainCategory));
router.post('/single-product', catchErrors(productController.SingleProduct));
router.post('/add-product-review', auth, catchErrors(productController.setReview));
router.post('/change-product-color', catchErrors(productController.changeColor));
router.post('/category-product', catchErrors(productController.Category));
router.post('/sub-category-product', catchErrors(productController.subCategory));
router.post('/add-favourite-product', auth, catchErrors(productController.addFavourites));
router.post('/get-incomplete-order', catchErrors(productController.getIncomplete));
router.post('/cart-product', catchErrors(productController.getCart));
router.get('/cart-orders',auth, catchErrors(productController.getCartOrders));
router.post('/cart-shipping', auth, catchErrors(productController.getAddress));
router.post('/use-coupon', auth, catchErrors(productController.useCoupon));
router.post('/create-order', auth, catchErrors(productController.createOrder));
router.post('/submit-order', auth, catchErrors(productController.submitOrder));
router.post('/show-order', auth, catchErrors(productController.showOrder));
router.post('/remove-favourite', auth, catchErrors(productController.removeFavourite));
router.post('/compare', catchErrors(productController.compare));
router.post('/search', catchErrors(productController.search));
router.post('/top20', catchErrors(productController.top20));
router.post('/lower-price', catchErrors(productController.lowerPrice));
router.post('/new-arrival', catchErrors(productController.newArrival));
router.post('/family-price', catchErrors(productController.familyPrice));
router.post('/brand-product', catchErrors(productController.Brands));
router.post('/event', catchErrors(productController.Event));
router.post('/get-product-image', auth, catchErrors(productController.getProductImage));
router.post('/delete-sub-category', auth, catchErrors(productController.deleteSubCategory));
router.post('/delete-category', auth, catchErrors(productController.deleteCategory));
router.post('/delete-brands', auth, catchErrors(productController.deleteBrand));
router.post('/single-prod',auth,catchErrors(productController.SingleProd));

module.exports = router;