const mysql = require("mysql");

// const db = mysql.createConnection({
//     host: 'localhost',
//     database: 'ikea',
//     user: 'root',
//     password: ''
//   });
  
const { db } = require("../db");


const sha256 = require("js-sha256");
const jwt = require('jwt-then');
const { now } = require("mongoose");

function roundUpToHundred(num) {
    return Math.ceil(num / 100) * 100;
  }

exports.brands = async (req, res) => {
    var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    let brands = `SELECT images, brandname from brands WHERE Visible=1 ORDER BY RAND() LIMIT 10 `;
    db.query(brands, async (err, brand) => {
        if(err) {
            throw err;
        }
        
        let category = `SELECT id, category_name from category WHERE NOT Visible!=1`;
        db.query(category, async (err, categories) => {
            if(err) {
                throw err;
            }
            let featured = `SELECT model, name, image, price_tug,discount, id, type, bonus_percent,formated_id,Top_seller,New_lower_price,New,Last_chance,IKEA_family_price,special_price,regular_price,yuan_price FROM  product WHERE (validToDate>'${dt}' OR validToDate IS NULL) AND featured=0 GROUP BY model ORDER BY RAND() DESC LIMIT 3`
            let discount = `SELECT model, name, image, price_tug, discount, type, id, remain, discount_end_time, bonus_percent,formated_id,Top_seller,New_lower_price,New,Last_chance,IKEA_family_price,special_price,regular_price,yuan_price from product WHERE validToDate>'${dt}' GROUP BY model ORDER BY RAND() DESC LIMIT 3`;
            let topRated = `SELECT p.id, p.type,  p.model, p.name, p.price_tug, p.image, p.total_rate, p.discount, p.bonus_percent,p.formated_id,p.Top_seller,p.New_lower_price,p.New,p.Last_chance,p.IKEA_family_price,p.special_price,p.regular_price,p.yuan_price from product as p inner join featured as f on p.id=f.product_id WHERE (p.validToDate>='${dt}' OR p.validToDate IS NULL) GROUP BY p.model  ORDER BY RAND() DESC LIMIT 3`
            db.query(featured, async (err, feature) => {
                if(err) {
                    throw err;
                }
                if(feature.length>0){
                    feature.forEach(el=>{
                        if(el.special_price>0){
                            el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                        }
                    })
                }
                db.query(discount, async (err, d) => {
                    if(err) {
                        throw err;
                    } 
                    if(d.length>0){
                        d.forEach(el=>{
                            if(el.special_price>0){
                                el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                            }
                        })
                    }
                    db.query(topRated, async (err, top) => {
                        if(err) {
                            throw err;
                        }
                        if(top.length>0){
                            top.forEach(el=>{
                                if(el.special_price>0){
                                    el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                                }
                            })
                        }
                        res.json({
                            brand,
                            categories,
                            featured: feature,
                            discount: d,
                            top
                        });

                    });
                });
            });
        });                                       
    });
}

exports.home = async (req, res) => {
    var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    // var d = new Date(dt.setDate(dt.getDate() - 20));
    let randCat = `SELECT id, sub_category_name, image,sub_category_code from category_sub ORDER BY RAND() LIMIT 7`;
    let hBanner = `SELECT h.id, h.product_id, title_1, title_2, title_3, h.image, p.price_tug, p.discount, p.model from home_banner as h inner join product as p on h.product_id = p.id GROUP BY p.model`;
    let cat = `SELECT id, category_name, image, icon from category WHERE NOT Visible!=1`;
    let subCat = `SELECT categoryID, id, sub_category_name, specs,image,icon from category_sub`;
    let quick = `SELECT s.id, s.sub_category_name, q.image from category_sub as s inner join quick_category as q on s.id = q.sub_id GROUP BY q.sub_id ORDER BY RAND() LIMIT 4`;
    let featured = `SELECT p.model,p.name,p.color_name, sub.sub_category_name,p.image, p.price_tug, p.discount, p.id, p.type,  p.bonus_percent,p.Last_chance,p.Top_seller,p.IKEA_family_price,p.New,p.New_lower_price,p.special_price,p.regular_price,p.Price_unit,p.yuan_price,p.product_type from product as p inner join category_sub as sub on p.category_sub_id=sub.id WHERE (p.validToDate is NULL OR p.validToDate>'${dt}') AND p.featured=1 GROUP BY p.model ORDER BY RAND() LIMIT 8`
    let lastChance = `SELECT p.model, p.name, p.color_name, sub.sub_category_name, p.image, p.price_tug,p.discount,p.type,p.id,p.discount_end_time,p.bonus_percent,p.Last_chance,p.Top_seller,p.IKEA_family_price,p.New,p.New_lower_price,p.special_price,p.regular_price,p.Price_unit,p.yuan_price,p.product_type from product as p inner join category_sub as sub on p.category_sub_id=sub.id WHERE Last_chance >0 AND (p.validToDate is NULL OR p.validToDate>'${dt}') ORDER BY RAND() LIMIT 50`;
    let topRated = `SELECT product_id FROM favourite ORDER BY RAND() LIMIT 8`
    let special = `SELECT p.id, s.image, p.price_tug, p.bonus_percent, p.name, p.model, p.color_name,p.Last_chance,p.Top_seller,p.IKEA_family_price,p.New,p.New_lower_price,p.special_price,p.regular_price,p.Price_unit,p.yuan_price,p.product_type from product as p inner join special_product as s on p.model=s.product_model WHERE s.id=1 GROUP BY p.model`;
    let bnns = `SELECT id, title, description, image, subId from banners`;
    let ev = `SELECT id, event_name, image from events`;
    let cId = [];
    db.query(randCat, async (err, randomCategory) => {
        if(err) {
            throw err;
        }
        randomCategory.forEach(element => {
            cId.push(`'${element.id}'`);
        });
         db.query(hBanner, async (err, homeBanner) => {
            if(err) {
                throw err;
            }
            db.query(cat, async (err, category) => {
                if(err) {
                    throw err;
                }
                db.query(subCat, async (err, subCategory) => {
                    if(err) {
                        throw err;
                    }
                    db.query(quick, async (err, quickCategory) => {
                        if(err) {
                            throw err;
                        }
                        db.query(featured, async(err, featuredProduct) => {
                            if(err) {
                                throw err;
                            }
                            db.query(lastChance, async (err, LastChance) => {
                                if(err) {
                                    throw err;
                                }
                                if(LastChance.length>0){
                                    LastChance.forEach(el=>{
                                        if(el.special_price>0){
                                            el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                                        }
                                    })
                                }
                                db.query(topRated, async (err, topRate) => {
                                    if (err) {
                                        throw err;
                                    }
                                    var topR=[];
                                    topRate.forEach(el=>{
                                        topR.push(el.product_id);
                                    })
                                    var tr=`SELECT p.model,p.name,p.color_name, sub.sub_category_name,p.image, p.price_tug, p.discount, p.id, p.type,  p.bonus_percent,p.Last_chance,p.Top_seller,p.IKEA_family_price,p.New,p.New_lower_price,p.special_price,p.regular_price,p.Price_unit,p.yuan_price,p.product_type from product as p inner join category_sub as sub on p.category_sub_id=sub.id WHERE (p.validToDate is NULL OR p.validToDate>'${dt}') AND p.id in (${topR}) GROUP BY p.model ORDER BY RAND() LIMIT 8`;
                                    db.query(tr,async(err,topRatedProduct)=>{
                                        if(err){
                                            throw err;
                                        }
                                        db.query(special, async (err, specialProduct) => {
                                            if(err) {
                                                throw err;
                                            }
                                            if(specialProduct.length>0){
                                                specialProduct.forEach(el=>{
                                                    if(el.special_price>0){
                                                        el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                                                    }
                                                })
                                            }
                                            let r=`SELECT p.model,p.category_sub_id,p.name,p.color_name,p.image, p.price_tug, p.discount, p.id, p.type,  p.bonus_percent,p.Last_chance,p.Top_seller,p.IKEA_family_price,p.New,p.New_lower_price,p.special_price,p.regular_price,p.Price_unit,p.yuan_price,p.product_type,i.big_image1,i.big_image2,i.big_image3,i.big_image4 from product as p inner join images as i on p.id=i.product_id WHERE p.category_sub_id in (${cId}) GROUP BY p.id ORDER BY RAND()`;
                                            db.query(r,async(err,random)=>{
                                                if(err){
                                                    console.log(err);
                                                    throw err;
                                                }
                                                db.query(bnns, async (err, banners) => {
                                                    if(err) {
                                                        throw err;
                                                    }
                                                    db.query(ev, async (err, events) => {
                                                        if(err) {
                                                            throw err;
                                                        }
                                                        res.json({
                                                            category,
                                                            subCategory,
                                                            randomCategory,
                                                            homeBanner,
                                                            quickCategory,
                                                            featuredProduct,
                                                            LastChance,
                                                            topRatedProduct,
                                                            specialProduct,
                                                            random,
                                                            banners,
                                                            events
                                                        });
                                                    });
                                                });
                                            })
                                        });
                                    })
                                });
                            });
                        })
                    });
                });
            });
        });
    });
}

exports.categories = async (req, res) => {
    let cat = `SELECT id, category_name, image, icon from category WHERE NOT Visible!=1`;
    let subCat = `SELECT categoryID, id, sub_category_name,image,specs from category_sub ORDER BY sub_category_name ASC`;
    let ev = `SELECT id, event_name, image from events`;
    db.query(cat, async (err, category) => {
        if(err) {
            throw err;
        }
        db.query(subCat, async (err, subCategory) => {
            if(err) {
                throw err;
            }
            db.query(ev, async (err, events) => {
                res.json({
                    category,
                    subCategory,
                    events
                });
            });
        });
    });    
}
exports.getsub=async(req,res)=>{
    const {cat}=req.body;
    let subs=`SELECT * FROM category_sub WHERE categoryID='${cat}'`;
    db.query(subs,async(err,subcat)=>{
        if(err){
            throw err;
        }
        res.json({
            result:'success',
            subcat
        })
    })
}