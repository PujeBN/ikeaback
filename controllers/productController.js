const mysql = require("mysql");
const fs=require('fs');
const axios=require('axios');


const Url='http://api.ikealab.mn';
const { db } = require("../db");

const sha256 = require("js-sha256");
const jwt = require('jwt-then');
const { rmSync } = require("fs");
const e = require("express");

const downloadImage = async (url, outputPath,id) => {
   if(url!=null && url!=''){
    const writer = fs.createWriteStream(outputPath);
  
    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream', // Зургийг stream хэлбэрээр татах
        timeout: 60000, // 30 секундийн хугацаатай
      });
  
      // Stream-ээр файл руу бичих
      response.data.pipe(writer);
  
      // Файл амжилттай татаж дуусахад writer-ийг хаах
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      throw error;
    }
   }
  };

  const updatePhotosDownloadedStatus = async (id, status) => {
    return new Promise((resolve, reject) => {
      db.query(`UPDATE product SET photosDownloaded='${status}' WHERE id='${id}'`, err => {
        if (err) return reject(err);
        resolve();
      });
    });
  };
  
  const downloadAllImages = async (imageUrls, outputPaths, productId) => {
    try {
      // 3 зургийн таталтын promise-уудыг хадгалах
      const downloadPromises = imageUrls.map((url, index) => 
        downloadImage(url, outputPaths[index], productId)
      );
  
      // Бүх зургийг татаж дуустал хүлээнэ
      await Promise.all(downloadPromises);
  
      // Амжилттай татсан бол photosDownloaded-г 'true' болгож өгөгдлийн санд хадгална
      await updatePhotosDownloadedStatus(productId, 'true');
  
      console.log('3 зураг амжилттай татаж дууслаа.');
    } catch (error) {
      console.error('Алдаа гарлаа: ', error);
    }
  };

function roundUpToHundred(num) {
    return Math.ceil(num / 100) * 100;
  }

exports.updateBonusAll = async (req, res) => {
    const { percent } = req.body;
    db.query(`UPDATE product SET bonus_percent = '${percent}'`, async (err) => {
        if(err) {
            throw err;
        }
        res.json({
            result: 'success'
        });
    });
  }

exports.mainCategory = async (req, res) => {
    const { categoryId } = req.body;
    res.json({
        categoryId
    });
}

exports.deleteSubCategory = async (req, res) => {
    const { code } = req.body;
    let q = `SELECT p.id FROM product as p inner join category_sub as c on p.category_sub_id = c.id WHERE c.sub_category_code = '${code}'`;
    db.query(q, async (err, product) => {
        if(err) {
            throw err;
        }
        if(product.length > 0) {
            res.json({
                result: 'failed'
            });
        } else {
            let d = `DELETE from category_sub WHERE sub_category_code = '${code}'`;
            db.query(d, async err => {
                if(err) {
                    throw err;
                }
                res.json({
                    result: 'success'
                });
            });
        }
    });
}

exports.deleteCategory = async (req, res) => {
    const { code } = req.body;
    let q = `SELECT p.id FROM product as p inner join category as c on p.type = c.id WHERE c.category_code = '${code}'`;
    db.query(q, async (err, product) => {
        if(err) {
            throw err;
        }
        if(product.length > 0) {
            res.json({
                result: 'failed'
            });
        } else {
            let d = `DELETE from category WHERE category_code = '${code}'`;
            db.query(d, async err => {
                if(err) {
                    throw err;
                }
                res.json({
                    result: 'success'
                });
            });
        }
    });
}


exports.deleteBrand = async (req, res) => {
    const { code } = req.body;
    let q = `SELECT p.id FROM product as p inner join brands as b on p.brand = b.id WHERE b.id = '${code}'`;
    db.query(q, async (err, product) => {
        if(err) {
            throw err;
        }
        if(product.length > 0) {
            res.json({
                result: 'failed'
            });
        } else {
            let d = `DELETE from brands WHERE id = '${code}'`;
            db.query(d, async err => {
                if(err) {
                    throw err;
                }
                res.json({
                    result: 'success'
                });
            });
        }
    });
}

exports.familyPrice = async (req, res) => {
    var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const{ page }=req.body;
    const first = (page - 1) * 60;
    const last = page * 60;
    let f = `SELECT  p.id, p.model, p.name,c.sub_category_name, p.price_tug, p.discount, p.bonus_percent, p.image, p.description, p.total_rate,p.formated_id,p.product_type,p.Top_seller,p.Last_chance,p.IKEA_family_price,p.New,p.New_lower_price,p.regular_price,p.special_price,p.yuan_price,p.color_name,p.dimension from product as p inner join category_sub as c on p.category_sub_id = c.id WHERE  p.IKEA_family_price=1 AND (p.validToDate>='${dt}' OR p.validToDate IS NULL) GROUP BY p.model`;
    db.query(f, async (err, family) => {
        if(err) {
            throw err;
        }
        var totalPage=0;
        let sc = family.length % 60;
        var totalProduct=0;
        if(family.length>0){
            family.forEach(el=>{
                if(el.special_price>0){
                    el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                }
            })
          totalPage=parseInt(family.length/60);
          totalProduct=family.length;
        }
        if(sc>0){
            totalPage+=1;
        }
        res.json({
            Family:family.slice(first, last),
            totalPage,
            totalProduct
        });
    });
}


exports.setReview = async (req, res) => {
    const { id, message, rate } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, 'HS256');
    let ch = `SELECT id from rate WHERE product_id = ${id} AND user_id = ${payload.id}`;
    db.query(ch, async (err, check) => {
        if(err) {
            throw err;
        }
        if(check.length > 0) {
            let up = `UPDATE rate SET rate = ${rate}, message = '${message}' WHERE product_id = ${id} AND user_id = ${payload.id}`;
            db.query(up, async err => {
                if(err) {
                    throw err;
                }
                res.json({
                    result: 'success'
                });
            });
        } else {
            let post = {product_id: id, rate, message, user_id: payload.id}
            let ins = `INSERT INTO rate  SET ?`;
            db.query(ins, post, async err => {
                if(err) {
                    throw err;
                }
                res.json({
                    result: 'success'
                });
            });
        }
    });
}

exports.changeColor = async (req, res) => {
    const { id } = req.body;
    let c = `SELECT color_name,discount,price_tug,id,Price_unit,formated_id,regular_price,special_price,Price_unit,yuan_price,IKEA_family_price,New_lower_price,New,Last_chance,Top_seller,photosDownloaded from product WHERE id = ${id}`;
    db.query(c, async (err, product) => {
        if(err) {
            throw err;
        }
    if(product[0].photosDownloaded=='false'){
        if(product[0].special_price>0){
            product[0].regular_price=roundUpToHundred(Number((product[0].regular_price*product[0].yuan_price)+(product[0].regular_price*product[0].yuan_price/100*22.5)))
        }
        var i=`SELECT big_image1, big_image2, big_image3,product_id from  images  WHERE product_id = ${id}`;
        db.query(i,async(err,images)=>{
            if(err){
                throw err;
            }
            let imgs=[],urls=[];
            if(images[0].big_image1!=null && images[0].big_image1!=''){
                imgs.push(images[0].big_image1)
              }
              if(images[0].big_image2!=null && images[0].big_image2!=''){
                imgs.push(images[0].big_image2)
              }
              if(images[0].big_image3!=null && images[0].big_image3!=''){
                imgs.push(images[0].big_image3)
              }
              urls.push(`./public/images/product/${images[0].product_id}_1.jpg`,`./public/images/product/${images[0].product_id}_2.jpg`,`./public/images/product/${images[0].product_id}_3.jpg`);
              images=images[0];
            res.json({
                product: product[0],
                images
            });
             downloadAllImages(imgs,urls,id);
        })
    }else{
        if(product[0].special_price>0){
            product[0].regular_price=roundUpToHundred(Number((product[0].regular_price*product[0].yuan_price)+(product[0].regular_price*product[0].yuan_price/100*22.5)))
        }
        var i=`SELECT big_image1, big_image2, big_image3,product_id from images  WHERE product_id = ${id}`;
        db.query(i,async(err,images)=>{
            if(err){
                throw err;
            }
            let imgs={};
            if(images[0].big_image1!=null && images[0].big_image1!=''){
                let big_image1='big_image1';
                imgs[big_image1]=`${Url}/images/product/${images[0].product_id}_1.jpg`;
              }
              if(images[0].big_image2!=null && images[0].big_image2!=''){
                let big_image2='big_image2';
                imgs[big_image2]=`${Url}/images/product/${images[0].product_id}_2.jpg`;
              }else{
                let big_image2='big_image2';
                imgs[big_image2]=null;
              }
              if(images[0].big_image3!=null && images[0].big_image3!=''){
                let big_image3='big_image3';
                imgs[big_image3]=`${Url}/images/product/${images[0].product_id}_3.jpg`;
              }else{
                let big_image3='big_image3';
                imgs[big_image3]=null;
              }
            res.json({
                product: product[0],
                images:imgs
            });
        })
    }
    });
}

exports.getIncomplete = async (req ,res) => {
    const { ordernumber } = req.body;
    var more= ''; var district = ''; var khoroo = '';
    let p = `SELECT o.id,o.created_at,o.end_at,o.tax,o.total_amount,o.status,o.add_bonus,o.discount,o.used_bonus,o.coupon,o.NOAT,o.assemble,o.mow,o.fee,o.warehouse,d.district,u.khoroo,u.more_address,o.chinaDeliver FROM orders as o inner join users as u on o.user_id=u.id inner join district as d on d.id=u.district WHERE o.ordernumber='${ordernumber}'`;
    db.query(p, async (err, order) => {
        if(err) {
            throw err;
        }
        db.query(`SELECT p.name,o.quantity,o.amount FROM order_product as o inner join product as p on o.product_id=p.id WHERE ordernumber='${ordernumber}' GROUP BY p.model`,async (err,products)=>{
            if(err){
                throw err;
            }
            res.json({
                products,
                order:order[0]
            });
        })
    });
}
exports.getCart = async (req ,res) => {
    const { products} = req.body;
    var more= ''; var district = ''; var khoroo = '';
    let p = `SELECT Top_seller,Last_chance,New_lower_price,New,IKEA_family_price,yuan_price,validToDate,bonus_percent,regular_price,special_price,price_tug,id,color_name from product WHERE id in(${products}) GROUP BY model`;
    db.query(p, async (err, product) => {
        if(err) {
            throw err;
        }
        if(product.length>0){
            product.forEach(el=>{
                if(el.special_price>0){
                    el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                }
            })
        }
        res.json({
            product
        });
    });
}

exports.getCartOrders=async(req,res)=>{
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, 'HS256');
    let o=`SELECT o.ordernumber,o.created_at,o.total_amount,o.status,o.lend_fee FROM orders as o inner join users as u on o.user_id=u.id WHERE o.user_id=${payload.id}`;
    db.query(o,async(err,or)=>{
        if(err){
            throw err;
        }
        let f = `SELECT p.Top_seller,p.Last_chance,p.New_lower_price,p.New,IKEA_family_price,p.yuan_price,p.validToDate,p.bonus_percent,p.regular_price,p.special_price,p.price_tug,p.id,p.color_name,p.image,p.model,p.name,f.sale from product as p inner join favourite as f on p.id=f.product_id inner join users as u on f.user_id=u.id WHERE u.id=${payload.id} GROUP BY p.model`;
        db.query(f,async(err,fav)=>{
            if(err){
                throw err;
            }
            if(fav.length>0){
                fav.forEach(el=>{
                    if(el.special_price>0){
                        el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                    }
                })
            }
            res.json({
                orders:or,
                fav
            })
        })
    })
}

exports.getAddress = async (req, res) => {
    const { coupon,id } = req.body;
    
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, 'HS256');

    // let a = `SELECT name, phone, email, phone2, users.khoroo, more_address, district.district from users inner join district on users.district = district.id WHERE users.id = ${payload.id}`;
    let a = `SELECT name, phone, email, phone2, khoroo, more_address, district, bonus from users WHERE id = ${payload.id}`;
    db.query(a, async (err, address) => {
        if(err) {
            throw err;
        }
        let d = `SELECT * from district`;
        db.query(d, async (err, districts) => {
            if(err) {
                throw err;
            }
            let p=`SELECT id,price_tug FROM product WHERE id in ('${id}') GROUP BY model`;
            db.query(p,async(err,price)=>{
                if(err){
                    throw err;
                }
                if(coupon != null) {
                    let c = `SELECT amount from coupon WHERE promo_code = '${coupon}'`;
                    db.query(c, async (err, promo) => {
                        if(err) {
                            throw err;
                        }
                        if(promo.length > 0) {
                            res.json({
                                address,
                                districts,
                                price,
                                coupon: promo
                            });
                        } else {
                            res.json({
                                address,
                                districts,
                                price,
                                coupon: null
                            });
                        }
                    });
                } else {
                    res.json({
                        address,
                        districts,
                        price,
                        coupon
                    });
                }
            })
        });
    });
}

exports.top20 = async (req, res) => {
    var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const{ page }=req.body;
    const first = (page - 1) * 60;
    const last = page * 60;
    let t = `SELECT  p.id, p.model, p.name,c.sub_category_name, p.price_tug, p.discount, p.bonus_percent, p.image, p.description, p.total_rate,p.formated_id,p.product_type,p.Top_seller,p.Last_chance,p.IKEA_family_price,p.New,p.New_lower_price,p.regular_price,p.special_price,p.yuan_price,p.color_name,p.dimension from product as p inner join category_sub as c on p.category_sub_id = c.id WHERE  p.Top_seller=1 AND (p.validToDate>='${dt}' OR p.validToDate IS NULL) GROUP BY p.model`;
    db.query(t, async (err, top) => {
        if(err) {
            throw err;
        }
        var totalPage=0;
        let sc = top.length % 60;
        var totalProduct=0;
        if(top.length>0){
            top.forEach(el=>{
                if(el.special_price>0){
                    el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                }
            })
          totalPage=parseInt(top.length/60);
          totalProduct=top.length;
        }
        if(sc>0){
            totalPage+=1;
        }
        res.json({
            top:top.slice(first, last),
            totalPage,
            totalProduct
        });
    });
}
exports.lowerPrice=async(req,res)=>{
    var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const{ page }=req.body;
    const first = (page - 1) * 60;
    const last = page * 60;
    let l = `SELECT  p.id, p.model,p.name,c.sub_category_name, p.price_tug, p.discount, p.bonus_percent, p.image, p.description, p.total_rate,p.formated_id,p.product_type,p.Top_seller,p.Last_chance,p.IKEA_family_price,p.New,p.New_lower_price,p.regular_price,p.special_price,p.yuan_price,p.color_name,p.dimension from product as p inner join category_sub as c on p.category_sub_id = c.id WHERE  p.New_lower_price=1 AND (p.validToDate>='${dt}' OR p.validToDate IS NULL) GROUP BY p.model`;
    db.query(l, async (err, Lower) => {
        if(err) {
            throw err;
        }
        var totalPage=0;
        let sc = Lower.length % 60;
        var totalProduct=0;
        if(Lower.length>0){
            Lower.forEach(el=>{
                if(el.special_price>0){
                    el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                }
            })
          totalPage=parseInt(Lower.length/60);
          totalProduct=Lower.length;
        }
        if(sc>0){
            totalPage+=1;
        }
        res.json({
            Lower:Lower.slice(first, last),
            totalPage,
            totalProduct
        });
    });
}
exports.showOrder = async (req, res) => {
    const { ordernumber } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, 'HS256');

    let c = `SELECT o.created_at, o.ordernumber, o.tax, o.total_amount, o.status, o.discount, o.add_bonus, o.used_bonus, o.payment, o.payment_id, o.QRCode, o.coupon,o.NOAT,o.assemble,o.mow,o.fee,o.chinaDeliver,o.lend_name,o.lend_fee from orders as o WHERE o.ordernumber = '${ordernumber}' AND o.user_id = ${payload.id} AND o.enable_is = 1`;
    db.query(c, async (err, order) => {
        if(err) {
            throw err;
        }
        let p = `SELECT o.quantity, o.amount, p.image, p.name, p.model, p.color_name, p.id from product as p inner join order_product as o on p.id = o.product_id WHERE o.ordernumber = '${ordernumber}' GROUP BY p.model`;
        db.query(p, async (err, product) => {
            if(err) {
                throw err;
            }
            if(order.length > 0) {
                   res.json({
                    order:order[0],
                    product
                   })
    
            } else {
                res.json({
                    result: 'failed'
                });
            }
        });
    });

}

exports.search = async (req, res) => {
    const { search, page, brand, color, price, sub, specs } = req.body;
    Date.prototype.subDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() - days);
        return date;
    }
    const first = (page - 1) * 30;
    const last = page * 30;    
    var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var p;
    var amount;
    if(price[1] > 0) {
        amount = `p.price_tug > ${price[0]} AND p.price_tug <= ${price[1]} AND `;
    } else {
        amount = `p.price_tug > ${price[0]} AND `;
    }
    if(brand.length > 0 && color.length) {
        var col = '';
        color.forEach(element => {
            if(col == '') {
                col = `'${element}'`;
            } else {
                col = col + `, '${element}'`;
            }
        });
        p = `SELECT p.id, p.name, p.category_sub_id,sub.sub_category_name, p.model,b.brandname, p.image, p.discount, p.description, p.total_rate, p.bonus_percent,p.product_type,p.price_tug,p.formated_id,p.Top_seller,p.New_lower_price,p.New,p.IKEA_family_price,p.Last_chance,p.yuan_price,p.regular_price,p.special_price from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on sub.id=p.category_sub_id  WHERE ${amount} p.brand in (${brand}) AND p.color_name in (${col}) AND (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.product_type LIKE '%${search}%' OR p.formated_id LIKE '%${search}%') AND (p.validToDate>'${dt}' OR p.validToDate IS NULL)`;
    } else if(brand.length > 0) {
        p = `SELECT p.id, p.name, p.category_sub_id,sub.sub_category_name, p.model,b.brandname, p.image, p.discount, p.description, p.total_rate, p.bonus_percent,p.product_type,p.price_tug,p.formated_id,p.Top_seller,p.New_lower_price,p.New,p.IKEA_family_price,p.Last_chance,p.yuan_price,p.regular_price,p.special_price from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on sub.id=p.category_sub_id  WHERE ${amount} p.brand in (${brand}) AND (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.product_type LIKE '%${search}%' OR p.formated_id LIKE '%${search}%') AND (p.validToDate>'${dt}' OR p.validToDate IS NULL)`;
    } else if(color.length > 0) {
        var col = '';
        color.forEach(element => {
            if(col == '') {
                col = `'${element}'`;
            } else {
                col = col + `, '${element}'`;
            }
        });
        p = `SELECT p.id, p.name, p.category_sub_id,sub.sub_category_name, p.model,b.brandname, p.image, p.discount, p.description, p.total_rate, p.bonus_percent,p.product_type,p.price_tug,p.formated_id,p.Top_seller,p.New_lower_price,p.New,p.IKEA_family_price,p.Last_chance,p.yuan_price,p.regular_price,p.special_price from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on sub.id=p.category_sub_id  WHERE ${amount} p.color_name in (${col}) AND (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.product_type LIKE '%${search}%' OR p.formated_id LIKE '%${search}%') AND (p.validToDate>'${dt}' OR p.validToDate IS NULL)`;
    } else {
        p = `SELECT p.id, p.name, p.category_sub_id,sub.sub_category_name, p.model,b.brandname, p.image, p.discount, p.description, p.total_rate, p.bonus_percent,p.product_type,p.price_tug,p.formated_id,p.Top_seller,p.New_lower_price,p.New,p.IKEA_family_price,p.Last_chance,p.yuan_price,p.regular_price,p.special_price from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on sub.id=p.category_sub_id  WHERE ${amount} (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.product_type LIKE '%${search}%' OR p.formated_id LIKE '%${search}%') AND (p.validToDate>'${dt}' OR p.validToDate IS NULL)`;
    }

    if(sub.length > 0) {
        p += `AND p.category_sub_id in ('${sub}')`
    }

    p+=` GROUP BY p.model`;
    if(specs != '') {
        var allId = [];
        var spQuery = `SELECT product_id from specs WHERE ${specs}`;
        db.query(spQuery, async (err, specId) => {
            if(err) {
                throw err;
            }
            specId.forEach(element => {
                allId.push(element.product_id)
            });

            if(allId.length > 0) {
                p += ` AND p.id in (${allId})`;
            } else {
                p += ` AND p.id in (0)`;
            }
            db.query(p, async (err, product) => {
                if(err) {
                    throw err;
                }
                if(product.length > 0) {
                    let b = `SELECT brands.id, brands.brandname, COUNT(*) as total from product as p inner join brands on p.brand = brands.id WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.description LIKE '%${search}%') AND (p.remain > 0 OR p.updated_at > '${dt}') GROUP BY brands.id ORDER BY brands.brandname`;
                    db.query(b, async (err, brand) => {
                        if(err) {
                            throw err;
                        }
                        let c = `SELECT color_name, COUNT(*) as total from product as p where (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.description LIKE '%${search}%') AND color_name != '' AND (remain > 0 OR updated_at > '${dt}') GROUP BY color_name ORDER BY color_name`;
                        db.query(c, async (err, color) => {
                            if(err) {
                                throw err;
                            }
                            let m = `SELECT MAX(sale_price) as max from product as p WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.description LIKE '%${search}%') AND (remain > 0 OR updated_at > '${dt}')`;
                            db.query(m, async (err, max) => {
                                if(err) {
                                    throw err;
                                }
                                let sc = product.length % 30;
                                let f = parseInt(product.length / 30);
                                if(sc > 0) {
                                    f += 1;
                                }
        
                                let cate = `SELECT c.sub_category_name, c.id, COUNT(*) as total from category_sub as c inner join product as p on c.id = p.category_sub_id WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.description LIKE '%${search}%') AND (p.remain > 0 OR p.updated_at > '${dt}') GROUP BY c.id ORDER BY c.sub_category_name`;
                                
                                db.query(cate, async (err, sub) => {
                                    if(err) {
                                        throw err;
                                    }
                                    var subId = [];
                                    sub.forEach(el => {
                                        subId.push(el.id);
                                    });
        
                                    db.query(`SELECT specs, sub.id from category_sub as sub inner join category as c on sub.categoryID = c.id WHERE sub.id in (${subId})`, async ( err, sp ) => {
                                        if(err) {
                                            throw err;
                                        }
                                        var spcs = [], cateId = [];
                                        sp.forEach(el => {
                                            if(el.specs != null && el.specs != '') {
                                                cateId.push(el.id);
                                                el.specs.split('#').forEach(e => {
                                                    if(!spcs.includes(e)) {
                                                        spcs.push(e);
                                                    }
                                                });
                                            }
                                        });
                                        if(spcs.length !=0 ) {
                                            let s = `select ${spcs} from specs as s inner join product as p on s.product_id = p.id inner join category_sub as c on p.category_sub_id = c.id WHERE c.id in (${cateId}) AND (p.remain > 0 OR p.updated_at > '${dt}')`
                                            db.query(s, async (err, specs) => {
                                                if(err) {
                                                    throw err;
                                                }
        
                                                res.json({
                                                    result: 'success',
                                                    max: max[0].max,
                                                    color,
                                                    spcs,
                                                    specs,
                                                    brand,
                                                    sub,
                                                    product: product.slice(first, last),
                                                    pagination: f
                                                });
                                            });
                                        } else {
                                            res.json({
                                                result: 'success',
                                                max: max[0].max,
                                                color,
                                                spcs,
                                                specs: [],
                                                brand,
                                                sub,
                                                product: product.slice(first, last),
                                                pagination: f
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                } else {
                    res.json({
                        result: 'failed'
                    });
                }
            });
        });
    } else {
        db.query(p, async (err, product) => {
            if(err) {
                throw err;
            }
            if(product.length > 0) {
                product.forEach(el=>{
                    if(el.special_price>0){
                        el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                    }
                })
                let b = `SELECT brands.id, brands.brandname, COUNT(*) as total from product as p inner join brands on p.brand = brands.id WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.product_type LIKE '%${search}%')  GROUP BY brands.id ORDER BY brands.brandname`;
                db.query(b, async (err, brand) => {
                    if(err) {
                        throw err;
                    }
                    let m = `SELECT MAX(price_tug) as max from product as p WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.product_type LIKE '%${search}%')`;
                    db.query(m, async (err, max) => {
                        if(err) {
                            throw err;
                        }
                        let sc = product.length % 30;
                        let f = parseInt(product.length / 30);
                        if(sc > 0) {
                            f += 1;
                        }

                        let cate = `SELECT c.sub_category_name, c.id, COUNT(*) as total from category_sub as c inner join product as p on c.id = p.category_sub_id WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.product_type LIKE '%${search}%' OR p.formated_id LIKE '%${search}%')  GROUP BY c.id ORDER BY c.sub_category_name`;
                        
                        db.query(cate, async (err, sub) => {
                            if(err) {
                                throw err;
                            }
                            res.json({
                                result: 'success',
                                max: max[0].max,
                                brand,
                                sub,
                                product: product.slice(first, last),
                                pagination: f
                            });
                        });
                    });
                });
            } else {
                res.json({
                    result: 'failed'
                });
            }
        });
    }
    
}

exports.newArrival = async (req, res) => {
    var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const{ page }=req.body;
    const first = (page - 1) * 60;
    const last = page * 60;
    let n = `SELECT  p.id, p.model, p.name,c.sub_category_name, p.price_tug, p.discount, p.bonus_percent, p.image, p.description, p.total_rate,p.formated_id,p.product_type,p.Top_seller,p.Last_chance,p.IKEA_family_price,p.New,p.New_lower_price,p.regular_price,p.special_price,p.yuan_price,p.color_name,p.dimension from product as p inner join category_sub as c on p.category_sub_id = c.id WHERE  p.NEW=1 AND (p.validToDate>='${dt}' OR p.validToDate IS NULL) GROUP BY p.model`;
    db.query(n, async (err, New) => {
        if(err) {
            throw err;
        }
        var totalPage=0;
        let sc = New.length % 60;
        var totalProduct=0;
        if(New.length>0){
            New.forEach(el=>{
                if(el.special_price>0){
                    el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                }
            })
          totalPage=parseInt(New.length/60);
          totalProduct=New.length;
        }
        if(sc>0){
            totalPage+=1;
        }
        res.json({
            New:New.slice(first, last),
            totalPage,
            totalProduct
        });
    });
}

exports.createOrder = async (req, res) => {
    const { shipping,cart,deliver,coupon } = req.body;    
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, 'HS256');
    var personalOrComp = 'personal';
    db.query(`SELECT id,bonus from users WHERE email = '${shipping.user.email}' AND id = ${payload.id}`, async (err, c) => {
        if(err) {
            throw err;
        }
        if(c.length > 0) {
            let up_user = `UPDATE users SET phone='${shipping.user.phone}', phone2 = '${shipping.user.phone2}', email = '${shipping.user.email}', district = '${shipping.user.district}', khoroo = ${shipping.user.khoroo}, more_address = '${shipping.user.more}' WHERE id = ${payload.id}`;
            db.query(up_user, async err => {
                if(err) {
                    throw err;
                }
                if(coupon.amount>0){
                    let am=`UPDATE coupon SET status=0 WHERE promo_code='${coupon.code}'`;
                    let amUp=`SELECT amount FROM coupon WHERE promo_code='${coupon.code}'`;
                    db.query(am,async err=>{
                       if(err){
                        throw err;
                       }
                       db.query(amUp,async(err,cp)=>{
                        if(err){
                            throw err;
                        }
                         let ch = `SELECT ordernumber from orders WHERE user_id = ${payload.id} AND enable_is = 0`;
                         db.query(ch, async (err, check) => {
                             if(err) {
                                 throw err;
                             }
                             Date.prototype.addDays = function(days) {
                                 var date = new Date(this.valueOf());
                                 date.setDate(date.getDate() + days);
                                 return date;
                             }
                             var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                             var end_dt = new Date().addDays(3).toISOString().replace(/T/, ' ').replace(/\..+/, '');
                             
                             if(shipping.user.personal != true) {
                                 personalOrComp = 'company';
                             }
                             var products=[];
                             const invoiceId = 'IK' + Date.now() + payload.id;
                             cart.product.forEach(el=>{
                                 var prs=[el.id,el.qty,el.price,invoiceId];
                                 products.push(prs);
                             })
                             var insert = 'INSERT INTO order_product (product_id, quantity, amount, ordernumber) VALUES ?';
                             if(check.length > 0) {
                                if(cp.length>0){
                                    var up = `UPDATE orders SET total_amount=${cart.sum},created_at = '${dt}', end_at = '${end_dt}', tax = ${shipping.amount}, status = 'pending', w3w = '${shipping.w3w}', receiver = '${personalOrComp}', comp_id = '${shipping.user.register}', lat = '${shipping.lat}', lon = '${shipping.long}', name = '${shipping.user.name}',NOAT='${cart.NOAT}',assemble='${cart.assemble}',mow='${cart.mow}',warehouse='${shipping.warehouse}',fee='${cart.Fee}',bonus = ${parseInt(c[0].bonus)}, discount = ${parseInt(cart.sale)}, add_bonus = ${parseInt(cart.bonus)}, used_bonus = ${parseInt(cart.useBonus)},coupon=${cp[0].amount},ordernumber='${invoiceId}',chinaDeliver=${cart.chinaDeliver} WHERE user_id = ${payload.id} AND enable_is = 0 AND ordernumber='${check[0].ordernumber}';`;
                                 }else{
                                    var up = `UPDATE orders SET total_amount=${cart.sum}, created_at = '${dt}', end_at = '${end_dt}', tax = ${shipping.amount}, status = 'pending', w3w = '${shipping.w3w}', receiver = '${personalOrComp}', comp_id = '${shipping.user.register}', lat = '${shipping.lat}', lon = '${shipping.long}', name = '${shipping.user.name}',NOAT='${cart.NOAT}',assemble='${cart.assemble}',mow='${cart.mow}',warehouse='${shipping.warehouse}',fee='${cart.Fee}',bonus = ${parseInt(c[0].bonus)}, discount = ${parseInt(cart.sale)}, add_bonus = ${parseInt(cart.bonus)}, used_bonus = ${parseInt(cart.useBonus)},ordernumber='${invoiceId}',chinaDeliver=${cart.chinaDeliver} WHERE user_id = ${payload.id} AND enable_is = 0 AND ordernumber='${check[0].ordernumber}'`;
                                 }
                                 db.query(up, async err => {
                                     if(err) {
                                         throw err;
                                     }
                                     db.query(`DELETE from order_product WHERE ordernumber='${check[0].ordernumber}'`,async err=>{
                                        if(err){
                                            throw err
                                        }
                                        db.query(insert,[products],async err=>{
                                            if(err){
                                                throw err;
                                            }
                                            res.json({
                                                result: 'success',
                                                ordernumber:invoiceId
                                            });
                                         })
                                     })
                                 });
                             } else {
                                if(cp.length>0){
                                    var coup=cp[0].id;
                                }else{
                                    var coup=0;
                                }
                                 let post = {
                                     ordernumber: invoiceId, 
                                     user_id: payload.id,
                                     created_at: dt, 
                                     end_at: end_dt,
                                     tax: parseInt(shipping.amount), 
                                     total_amount: cart.sum, 
                                     status: 'pending', 
                                     discount: 0, 
                                     add_bonus: cart.bonus, 
                                     used_bonus: cart.useBonus, 
                                     coupon: coup, 
                                     w3w: shipping.w3w,
                                     payment: '', 
                                     receiver: personalOrComp, 
                                     comp_id: shipping.user.register, 
                                     lat: shipping.lat, 
                                     lon: shipping.long, 
                                     enable_is: 0, 
                                     name: shipping.user.name,
                                     QRCode: '',
                                     payment_id: '',
                                     bonus: 0,
                                     shipping_emp: 0,
                                     NOAT:cart.NOAT,
                                     assemble:cart.assemble,
                                     warehouse:shipping.warehouse,
                                     mow:cart.mow,
                                     fee:cart.Fee,
                                     chinaDeliver:cart.chinaDeliver
                                 };
         
                                 let i = `INSERT INTO orders SET ?`;
                                 
                                 db.query(i, post, async err => {
                                     if(err) {
                                         throw err.message;
                                     }
                                     db.query(insert,[products],async err=>{
                                        if(err){
                                            throw err;
                                        }
                                        res.json({
                                            result: 'success',
                                            ordernumber:invoiceId
                                        });
                                     })
                                 });
                             }
                         });
                       })
                    })
                }else{
                    let ch = `SELECT ordernumber from orders WHERE user_id = ${payload.id} AND enable_is = 0`;
                    db.query(ch, async (err, check) => {
                        if(err) {
                            throw err;
                        }
                        Date.prototype.addDays = function(days) {
                            var date = new Date(this.valueOf());
                            date.setDate(date.getDate() + days);
                            return date;
                        }
                        var dt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                        var end_dt = new Date().addDays(3).toISOString().replace(/T/, ' ').replace(/\..+/, '');
                        
                        if(shipping.user.personal != true) {
                            personalOrComp = 'company';
                        }
                        var products=[];
                        const invoiceId = 'IK' + Date.now() + payload.id;
                        cart.product.forEach(el=>{
                            var prs=[el.id,el.qty,el.price,invoiceId];
                            products.push(prs);
                        })
                        var insert = 'INSERT INTO order_product (product_id, quantity, amount, ordernumber) VALUES ?';
                        if(check.length > 0) {
                               var up = `UPDATE orders SET total_amount=${cart.sum}, created_at = '${dt}', end_at = '${end_dt}', tax = ${shipping.amount}, status = 'pending', w3w = '${shipping.w3w}', receiver = '${personalOrComp}', comp_id = '${shipping.user.register}', lat = '${shipping.lat}', lon = '${shipping.long}', name = '${shipping.user.name}',NOAT='${cart.NOAT}',assemble='${cart.assemble}',mow='${cart.mow}',warehouse='${shipping.warehouse}',fee='${cart.Fee}',bonus = ${parseInt(c[0].bonus)}, discount = ${parseInt(cart.sale)}, add_bonus = ${parseInt(cart.bonus)}, used_bonus = ${parseInt(cart.useBonus)},ordernumber='${invoiceId}',chinaDeliver=${cart.chinaDeliver} WHERE user_id = ${payload.id} AND enable_is = 0 AND ordernumber='${check[0].ordernumber}'`;
                            db.query(up, async err => {
                                if(err) {
                                    throw err;
                                }
                                db.query(`DELETE from order_product WHERE ordernumber='${check[0].ordernumber}'`,async err=>{
                                    if(err){
                                        throw err
                                    }
                                    db.query(insert,[products],async err=>{
                                        if(err){
                                            throw err;
                                        }
                                        res.json({
                                            result: 'success',
                                            ordernumber:invoiceId
                                        });
                                     })
                                 })
                            });
                        } else {
                            let post = {
                                ordernumber: invoiceId, 
                                user_id: payload.id,
                                created_at: dt, 
                                end_at: end_dt,
                                tax: parseInt(shipping.amount), 
                                total_amount: cart.sum, 
                                status: 'pending', 
                                discount: 0, 
                                add_bonus: cart.bonus, 
                                used_bonus: cart.useBonus, 
                                coupon:0, 
                                w3w: shipping.w3w,
                                payment: '', 
                                receiver: personalOrComp, 
                                comp_id: shipping.user.register, 
                                lat: shipping.lat, 
                                lon: shipping.long, 
                                enable_is: 0, 
                                name: shipping.user.name,
                                QRCode: '',
                                payment_id: '',
                                bonus: 0,
                                shipping_emp: 0,
                                NOAT:cart.NOAT,
                                assemble:cart.assemble,
                                warehouse:shipping.warehouse,
                                mow:cart.mow,
                                fee:cart.Fee,
                                chinaDeliver:cart.chinaDeliver
                            };
    
                            let i = `INSERT INTO orders SET ?`;
                            
                            db.query(i, post, async err => {
                                if(err) {
                                    throw err.message;
                                }
                                db.query(insert,[products],async err=>{
                                   if(err){
                                       throw err;
                                   }
                                   res.json({
                                       result: 'success',
                                       ordernumber:invoiceId
                                   });
                                })
                            });
                        }
                    });
                }
            });
        } else {
            res.json({
                result: 'failed'
            });
        }
    });
}

exports.useCoupon = async (req , res) => {
    const { coupon } = req.body;
    let cpn = `SELECT amount from coupon WHERE promo_code = '${coupon}' AND status = 1`;
    db.query(cpn, async (err, promo) => {
        if(err) {
            throw err;
        }
        if(promo.length > 0) {
            res.json({
                result: 'success',
                promo
            });
        } else {
            res.json({
                result: 'failed'
            });
        }
    });
}

exports.subCategory = async (req, res) => {
    const { id, page,price, spec, prms } = req.body;
    Date.prototype.subDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() - days);
        return date;
    }
    
    const first = (page - 1) * 30;
    const last = page * 30;    
    var dt = new Date().subDays(20).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var p;
    var amount;
    if(price[1] > 0) {
        amount = `p.price_tug> ${price[0]} AND p.price_tug <= ${price[1]} AND `;
    } else {
        amount = `p.price_tug > ${price[0]} AND `;
    }

    if(spec != '') {
        var allId = [];
        var spQuery = `SELECT product_id from specs WHERE ${spec}`;
        db.query(spQuery, async (err, specId) => {
            if(err) {
                throw err;
            }
            specId.forEach(element => {
                allId.push(element.product_id)
            });

            if(allId.length > 0) {
                p += ` AND p.id in (${allId})`;
            } else {
                p += ` AND p.id in (0)`;
            }

            db.query(p, async (err, product) => {
                if(err) {
                    throw err;
                }
                let c = `SELECT category.id, sub_category_name,category_sub.id as sub_id, specs, category_name from category_sub inner join category on category_sub.categoryID = category.id WHERE category_sub.id = ${id}`;
                db.query(c, async (err, ct) => {
                    if(err) {
                        throw err;
                    }
                    if(ct.length > 0) {
                        let b = `SELECT brands.id, brands.brandname, COUNT(*) as total from product inner join brands on product.brand = brands.id WHERE product.category_sub_id LIKE '%${id}%' AND  product.updated_at > '${dt}' GROUP BY brands.id ORDER BY brands.brandname`;
                        db.query(b, async (err, brand) => {
                            if(err) {
                                throw err;
                            }
                            let m = `SELECT MAX(sale_price) as max from product WHERE category_sub_id LIKE '%${id}%' AND  updated_at > '${dt}')`;
                            db.query(m, async (err, max) => {
                                if(err) {
                                    throw err;
                                }
                                let sc = product.length % 30;
                                let f = parseInt(product.length / 30);
                                if(sc > 0) {
                                    f += 1;
                                }
    
                                if(ct[0].specs != null) {
                                    var spcs = ct[0].specs.split('#'); var changedSpecs = [];
                                    spcs.forEach((el, index) => {
                                        changedSpecs.push(el);
                                    });

                                    let s = `select ${changedSpecs} from specs as s inner join product as p on s.product_id = p.id inner join category_sub as c on p.category_sub_id = c.id WHERE c.id = ${id} AND (p.remain > 0 OR p.updated_at > '${dt}')`
                                    db.query(s, async (err, specs) => {
                                        if(err) {
                                            throw err;
                                        }
                                        res.json({
                                            result: 'success',
                                            max: max[0].max,
                                            color,
                                            spcs,
                                            brand,
                                            specs,
                                            product: product.slice(first, last),
                                            pagination: f,
                                            category: ct[0]
                                        });
                                    });
                                } else {
                                    res.json({
                                        result: 'success',
                                        max: max[0].max,
                                        brand,
                                        spcs: [],
                                        product: product.slice(first, last),
                                        pagination: f,
                                        category: ct[0]
                                    });
                                }
                            });
                        });
                        
                    } else {
                        res.json({
                            result: 'failed'
                        });
                    }
                });
            });
        });
    } else {
        var sub=`SELECT id,sub_category_name,image FROM category_sub WHERE categoryID='${id}' GROUP BY id`;
        db.query(sub,async(err,subs)=>{
            if(err){
                throw err;
            }
            var s=[];
            if(subs.length>0){
                subs.forEach(e=>{
                    s.push(`'${e.id}'`);
                })
            }
            s.push(`'${id}'`);
            p = `SELECT p.id, p.name, p.model,b.brandname,p.price_tug,p.discount, p.image,p.description, p.category_sub_id,p.total_rate, p.bonus_percent,p.product_type,p.Top_seller,p.Last_chance,New_lower_price,p.new,IKEA_family_price,Price_unit,p.special_price,p.regular_price,p.yuan_price from brands as b inner join product as p on b.id = p.brand  WHERE ${amount} p.category_sub_id in(${s}) AND (p.validToDate>'${dt}' OR p.validToDate IS NULL) GROUP BY p.model`;
            db.query(p, async (err, product) => {
                if(err) {
                    throw err;
                }
                if(product.length>0){
                    product.forEach(el=>{
                        if(el.special_price>0){
                            el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                        }
                    })
                }
                let c = `SELECT category.id, sub_category_name, specs, category_name,category_sub.id as sub_id from category_sub inner join category on category_sub.categoryID = category.id WHERE category_sub.id='${id}'`;
                db.query(c, async (err, ct) => {
                    if(err) {
                        throw err;
                    }
                    if(ct.length > 0) {
                        let b = `SELECT brands.id, brands.brandname, COUNT(*) as total from product inner join brands on product.brand = brands.id WHERE product.category_sub_id LIKE '%${id}%'  GROUP BY brands.id ORDER BY brands.brandname`;
                        db.query(b, async (err, brand) => {
                            if(err) {
                                throw err;
                            }
                            let m = `SELECT MAX(price_tug) as max from product WHERE category_sub_id LIKE '%${id}%' `;
                            db.query(m, async (err, max) => {
                                if(err) {
                                    throw err;
                                }
                                let sc = product.length % 30;
                                let length=0;
                                let f = parseInt(product.length / 30);
                                if(sc > 0) {
                                    f += 1;
                                }
                                if(product.length>0){
                                 length=product.length;
                                }
    
                                if(ct[0].specs != null) {
                                    var spcs = ct[0].specs.split('#'); var changedSpecs = [];
                                    spcs.forEach((el, index) => {
                                        changedSpecs.push(el);
                                    });
                                    
                                    let s = `select ${changedSpecs} from specs as s inner join product as p on s.product_id = p.id inner join category_sub as c on p.category_sub_id = c.id WHERE c.id = ${id}`
                                    db.query(s, async (err, specs) => {
                                        if(err) {
                                            throw err;
                                        }
                                        res.json({
                                            result: 'success',
                                            max: max[0].max,
                                            subs,
                                            spcs,
                                            brand,
                                            specs,
                                            product: product.slice(first, last),
                                            pagination: f,
                                            category: ct[0],
                                            length
                                        });
                                    });
                                } else {
                                    res.json({
                                        result: 'success',
                                        max: max[0].max,
                                        subs,
                                        brand,
                                        spcs: [],
                                        product: product.slice(first, last),
                                        pagination: f,
                                        category: ct[0],
                                        length
                                    });
                                }
                            });
                        });
                        
                    } else {
                       let c= `SELECT t1.sub_category_name as category_name, t1.specs, t1.id FROM category_sub t1 JOIN category_sub t2 ON t1.id = t2.categoryID WHERE t2.id = '${id}'`;
                       db.query(c,async (err,ct)=>{
                        if(ct.length>0){
                            let b = `SELECT brands.id, brands.brandname, COUNT(*) as total from product inner join brands on product.brand = brands.id WHERE product.category_sub_id LIKE '%${id}%'  GROUP BY brands.id ORDER BY brands.brandname`;
                            db.query(b, async (err, brand) => {
                                if(err) {
                                    throw err;
                                }
                                let m = `SELECT MAX(price_tug) as max from product WHERE category_sub_id LIKE '%${id}%' `;
                                db.query(m, async (err, max) => {
                                    if(err) {
                                        throw err;
                                    }
                                    let sc = product.length % 30;
                                    let length=0;
                                    let f = parseInt(product.length / 30);
                                    if(sc > 0) {
                                        f += 1;
                                    }
                                    if(product.length>0){
                                        length=product.length;
                                       }
                                    if(ct[0].specs != null) {
                                        var spcs = ct[0].specs.split('#'); var changedSpecs = [];
                                        spcs.forEach((el, index) => {
                                            changedSpecs.push(el);
                                        });
                                        
                                        let s = `select ${changedSpecs} from specs as s inner join product as p on s.product_id = p.id inner join category_sub as c on p.category_sub_id = c.id WHERE c.id = ${id}`
                                        db.query(s, async (err, specs) => {
                                            if(err) {
                                                throw err;
                                            }
                                            res.json({
                                                result: 'success',
                                                max: max[0].max,
                                                subs,
                                                spcs,
                                                brand,
                                                specs,
                                                product: product.slice(first, last),
                                                pagination: f,
                                                category: ct[0],
                                                length
                                            });
                                        });
                                    } else {
                                        res.json({
                                            result: 'success',
                                            max: max[0].max,
                                            subs,
                                            brand,
                                            spcs: [],
                                            product: product.slice(first, last),
                                            pagination: f,
                                            category: ct[0],
                                            length
                                        });
                                    }
                                });
                            });
                        }else{
                            res.json({
                                result: 'failed'
                            });
                        }
                       })
                    }
                });
            });        })
    }
}



exports.removeFavourite = async (req, res) => {
    const { id } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, 'HS256');

    let p = `DELETE from favourite WHERE product_id = ${id} AND user_id = ${payload.id}`;
    db.query(p, async (err) => {
        if(err) {
            throw err;
        }
        res.json({
            result: 'success'
        });
    });
}

exports.addFavourites = async (req, res) => {
    const { id } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, 'HS256');
    let ch = `SELECT COUNT(*) as total FROM favourite WHERE user_id = ${payload.id}`;
    db.query(ch, async (err, check) => {
        if(err) {
            throw err;
        }
        if(check[0].total < 5) {
            let c2 = `SELECT id from favourite WHERE product_id = ${id}`;
            db.query(c2, async (err, check2) => {
                if(err) {
                    throw err;
                }
                if(check2.length > 0) {
                    res.json({
                        result: 'success',
                    });
                } else {
                    let post = {product_id: id, user_id: payload.id}
                    let i = `INSERT INTO favourite SET ?`;
                    db.query(i, post, async err => {
                        if(err) {
                            throw err;
                        }
                        res.json({
                            result: 'success'
                        });
                    });
                }
            })
        } else {
            res.json({
                result: 'failed'
            });
        }
    });
}

exports.getProductImage = async (req, res) => {
    db.query(`SELECT p.enc_model, p.image, i.big_image1, i.big_image2, i.big_image3, i.big_image4 from product as p inner join images as i on p.image_id = i.id`, async (err, product) => {
        if(err) {
            throw err;
        }
        res.json({
            result: 'success',
            product
        });
    });
}

exports.compare = async (req, res) => {
    const { id } = req.body;
    let specs = [];
    let p = `SELECT  p.discount, p.bonus_percent, b.brandname, p.model, p.image, p.total_rate, p.name, p.id,p.price_tug,p.product_type,p.dimension,p.formated_id from product as p inner join brands as b on p.brand = b.id WHERE p.id in(${id})`;
    db.query(p, async (err, product) => {
        if(err) {
            throw err;
        }
        res.json({
            product
        });
    });
}

exports.trenda = async (req, res) => {
    // let c = `SELECT c.id, c.sub_category_name, SUM(op.quantity) as qty from order_product as op inner join product as p on op.product_id = p.id inner join category_sub as c on c.id = p.category_sub_id GROUP BY c.id ORDER BY qty DESC LIMIT 3`;
    // db.query(c, async (err, category) => {
    //     if(err) {
    //         throw err;
    //     }
    //     let ids = []; q = '';
    //     category.forEach(element => {
    //         if(q == '') {
    //             q += `(SELECT p.id, p.name, p.model, p.category_sub_id, p.price_tug, c.category_name, p.type, p.image, p.discount, p.bonus_percent, p.color_name, p.remain, SUM(op.quantity) as qty FROM order_product as op inner join product as p on op.product_id = p.id inner join category as c on p.type = c.id WHERE p.category_sub_id = ${element.id} GROUP BY p.id ORDER BY qty DESC LIMIT 10)`
    //         } else {
    //             q += ` UNION (SELECT p.id, p.name, p.model, p.category_sub_id, p.price_tug, c.category_name, p.type, p.image, p.discount, p.bonus_percent, p.color_name, p.remain, SUM(op.quantity) as qty FROM order_product as op inner join product as p on op.product_id = p.id inner join category as c on p.type = c.id WHERE p.category_sub_id = ${element.id} GROUP BY p.id ORDER BY qty DESC LIMIT 10)`
    //         }
    //     });
    //     db.query(q, async (err, product) => {
    //         if (err) {
    //             throw err;
    //         }
    //         res.json({
    //             category,
    //             product
    //         })
    //     });
    // });

// JSON файлын замыг заана
const filePath = './controllers/ikea.json';
// const filePath = './categories.txt';
// const filePath = './filteredCategories3.txt';
// const filePath2 = './filteredCategories4.txt';

// Файлыг унших
// fs.readFile(filePath, 'utf8', (err, data) => {
//     if (err) {
//         console.error('Файлыг унших явцад алдаа гарлаа:', err);
//         return;
//     }

//     try {
//         var jsonData = JSON.parse(data);
//         var aguul=[];
//         var parents=[];
//         var jsonText=[];

//     if (Array.isArray(jsonData) && jsonData.length > 0) {
//              jsonData=[... new Set(jsonData)];
//              jsonData.forEach(el=>{
//                 parents.push(el.id_parent);
//              })
//              parents=[... new Set(parents)];
//              parents.forEach(pa=>{
//                 var parentCat=[];
//                 parentCat=jsonData.filter(ca=>ca.id_parent===pa);
//                 parentCat = Array.from(new Set(parentCat.map(item => item.id_category)))
//                 .map(id_category => {
//                     return parentCat.find(item => item.id_category === id_category);
//                 });
//                 aguul.push(parentCat);
//               })
//               aguul.forEach(cats=>{
//                 var cat_ids=[];
//                 cats.forEach(son_cat=>{
//                       cat_ids.push(son_cat.id_category);
//                 });
//                 jsonText.push({"Number":aguul.indexOf(cats),"name":"","id_parent":cats[0].id_parent,"id_categories":cat_ids});
//               })
//              aguul=JSON.stringify(aguul);
//              jsonText=JSON.stringify(jsonText);
//              let writer = fs.createWriteStream('filteredCategories2.txt',{
//              flags: 'a'
//                          });
//              writer.write(`${aguul}`);
//              writer.end();
//              let writed = fs.createWriteStream('filteredCategories3.txt',{
//                 flags: 'a'
//                             });
//                 writed.write(`${jsonText}`);
//                 writed.end();
//              console.log('bolson');
//     } else {
//      console.log('Массив хоосон эсвэл буруу өгөгдөл байна.');
//  }
//     } catch (parseError) {
//         console.error('JSON өгөгдлийг хөрвүүлэх явцад алдаа гарлаа:', parseError);
//     }
// });

// Файлыг унших
function roundUpToHundred(num) {
    return Math.ceil(num / 100) * 100;
}
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Файлыг унших явцад алдаа гарлаа:', err);
        return;
    }

    try {
        var jsonData = JSON.parse(data);
         var aguul="";
    if (Array.isArray(jsonData) && jsonData.length > 0) {
        jsonData=[... new Set(jsonData)];
            var categories=[];
            var datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
             jsonData.forEach(item=>{
                var category=[];
                product.push(item.id);
                product.push(item.name);
                product.push(datetime);
                product.push(datetime);
                product.push(item.productImageUrl);
                product.push(item.globalImageUrl);
                categories.push(category);
             })
             var n=`INSERT INTO category (id, category_name,created_at,updated_at, icon, image) VALUES ?`;
                 db.query(n,[categories],async err=>{
                      if(err){
                        throw err;
                      }
                 });
    } else {
     console.log('Массив хоосон эсвэл буруу өгөгдөл байна.');
 }
    } catch (parseError) {
        console.error('JSON өгөгдлийг хөрвүүлэх явцад алдаа гарлаа:', parseError);
    }
});



}


exports.Brands = async (req, res) => {
    const { id, page, color, price, type } = req.body;
    Date.prototype.subDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() - days);
        return date;
    }

    const first = (page - 1) * 30;
    const last = page * 30;    
    var dt = new Date().subDays(20).toISOString().replace(/T/, ' ').replace(/\..+/, '');

    var p;
    var amount;
    var t = ''; 
    

    if(price[1] > 0) {
        amount = `p.price_tug > ${price[0]} AND p.price_tug <= ${price[1]} AND `;
    } else {
        amount = `p.price_tug > ${price[0]} AND `;
    }

    if(type.length > 0) {
        t = `AND p.category_sub_id in (${type})`;
    }

    if(color.length > 0) {
        var col = '';
        color.forEach(element => {
            if(col == '') {
                col = `'${element}'`;
            } else {
                col = col + `, '${element}'`;
            }
        });
        p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, p.price_tug, p.image, p.discount, p.description, p.type, p.total_rate, p.bonus_percent, p.remain from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} p.color_name in (${col}) AND p.brand = ${id} AND (p.remain > 0 OR p.updated_at > '${dt}') ${t}`;
    } else {
        p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, p.price_tug, p.image, p.discount, p.description, p.type, p.total_rate, p.bonus_percent, p.remain from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} p.brand = ${id} AND (p.remain > 0 OR p.updated_at > '${dt}') ${t}`;
    }


    db.query(p, async (err, product) => {
        if(err) {
            throw err;
        }
        let b = `SELECT id, brandname, images, bg from brands WHERE id = ${id}`;
        db.query(b, async (err, brs) => {
            if(err) {
                throw err;
            }
            if(brs.length > 0) {
                let c = `SELECT color_name, COUNT(*) as total from product as p where brand = ${id} AND color_name != '' AND (remain > 0 OR updated_at > '${dt}') GROUP BY color_name ORDER BY color_name`;
                    db.query(c, async (err, color) => {
                        if(err) {
                            throw err;
                        }
                        let m = `SELECT MAX(sale_price) as max from product as p WHERE brand = ${id} AND (remain > 0 OR updated_at > '${dt}') ${t}`;
                        
                        db.query(m, async (err, max) => {
                            if(err) {
                                throw err;
                            }

                            let cate = `SELECT c.id, c.sub_category_name, COUNT(*) as total from product as p inner join category_sub as c on p.category_sub_id = c.id WHERE p.brand = ${id} AND (p.remain > 0 OR p.updated_at > '${dt}') GROUP BY c.id ORDER BY c.sub_category_name`;
                            db.query(cate, async (err, category) => {
                                if(err) {
                                    throw err;
                                }
                                let sc = product.length % 30;
                                let f = parseInt(product.length / 30);
                                if(sc > 0) {
                                    f += 1;
                                }
                                
                                res.json({
                                    result: 'success',
                                    max: max[0].max,
                                    color,
                                    product: product.slice(first, last),
                                    pagination: f,
                                    brand: brs[0],
                                    category
                                });
                            });
                            
                        });
                    });
            } else {
                res.json({
                    result: 'failed'
                });
            }
        });
    });
}

exports.Event = async (req, res) => {
    const { id,  page, brand, color, price } = req.body;
    const first = (page - 1) * 30;
    const last = page * 30;
    var p;
    var amount;

    let ch = `SELECT productId from event_product WHERE eventId = ${id}`;
    db.query(ch, async (err, Ids) => {
        if(err) {
            throw err;
        }
        if(price[1] > 0) {
            amount = `p.price_tug > ${price[0]} AND p.price_tug <= ${price[1]} `;
        } else {
            amount = `p.price_tug > ${price[0]} `;
        }
        if(Ids.length > 0) {
            var pIds = [];
            Ids.forEach(element => {
                pIds.push(element.productId);
            });
            
            if(brand.length > 0 && color.length) {
                var col = '';
                color.forEach(element => {
                    if(col == '') {
                        col = `'${element}'`;
                    } else {
                        col = col + `, '${element}'`;
                    }
                });
                p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, p.price_tug, p.image,p.total_rate, p.bonus_percent,p.Top_seller,p.Last_chance,p.New_lower_price,p.New,p.IKEA_family_price,p.yuan_price,p.regular_price,p.special_price  from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} AND p.brand in (${brand}) AND p.color_name in (${col}) AND p.id in (${pIds}) GROUP BY p.model`;
            } else if(brand.length > 0) {
                p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, p.price_tug, p.image, p.total_rate, p.bonus_percent,p.Top_seller,p.Last_chance,p.New_lower_price,p.New,p.IKEA_family_price,p.yuan_price,p.regular_price,p.special_price from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} AND p.id in (${pIds}) AND p.brand in (${brand}) GROUP BY p.model`;
            } else if(color.length > 0) {
                var col = '';
                color.forEach(element => {
                    if(col == '') {
                        col = `'${element}'`;
                    } else {
                        col = col + `, '${element}'`;
                    }
                });
                p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, p.price_tug, p.image, p.total_rate, p.bonus_percent,p.Top_seller,p.Last_chance,p.New_lower_price,p.New,p.IKEA_family_price,p.yuan_price,p.regular_price,p.special_price from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} AND p.color_name in (${col}) AND p.id in (${pIds}) GROUP BY p.model`;
            } else {
                p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, p.price_tug, p.image, p.total_rate, p.bonus_percent,p.Top_seller,p.Last_chance,p.New_lower_price,p.New,p.IKEA_family_price,p.yuan_price,p.regular_price,p.special_price  from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} AND p.id in (${pIds}) GROUP BY p.model`;
            }

            db.query(p, async (err, product) => {
                if(err) {
                    throw err;
                }
                if(product.length>0){
                    product.forEach(el=>{
                        if(el.special_price>0){
                            el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                        }
                    })
                }
                let c = `SELECT id, event_name, image from events WHERE id = ${id}`;
                db.query(c, async (err, ct) => {
                    if(err) {
                        throw err;
                    }
                    if(ct.length > 0) {
                        let b = `SELECT brands.id, brands.brandname, COUNT(*) as total from product inner join brands on product.brand = brands.id WHERE product.id in (${pIds}) GROUP BY brands.id ORDER BY brands.brandname`;
                        db.query(b, async (err, brand) => {
                            if(err) {
                                throw err;
                            }
                            let c = `SELECT color_name, COUNT(*) as total from product where id in (${pIds}) AND color_name != '' GROUP BY color_name ORDER BY color_name`;
                            db.query(c, async (err, color) => {
                                if(err) {
                                    throw err;
                                }
                                let m = `SELECT MAX(price_tug) as max from product WHERE id in (${pIds})`;
                                db.query(m, async (err, max) => {
                                    if(err) {
                                        throw err;
                                    }
                                    let sc = product.length % 30;
                                    let f = parseInt(product.length / 30);
                                    if(sc > 0) {
                                        f += 1;
                                    }
            
                                    res.json({
                                        result: 'success',
                                        max: max[0].max,
                                        color,
                                        brand,
                                        product: product.slice(first, last),
                                        pagination: f,
                                        event: ct[0]
                                    });
                                });
                            });
                        });
                        
                    } else {
                        res.json({
                            result: 'failed'
                        });
                    }
                });
            });
        } else {
            res.json({
                result: 'failed'
            });
        }

    });
}


exports.Category = async (req, res) => {
    const { id, page, brand, color, price, sub, specs } = req.body;
    
    Date.prototype.subDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() - days);
        return date;
    }
    const first = (page - 1) * 30;
    const last = page * 30;    
    var dt = new Date().subDays(20).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var p;
    var amount;
    if(price[1] > 0) {
        amount = `p.price_tug > ${price[0]} AND p.price_tug <= ${price[1]} AND `;
    } else {
        amount = `p.price_tug > ${price[0]} AND `;
    }
    
    if(brand.length > 0 && color.length) {
        var col = '';
        color.forEach(element => {
            if(col == '') {
                col = `'${element}'`;
            } else {
                col = col + `, '${element}'`;
            }
        });
        p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, sub.specs, p.price_tug, p.image, p.discount, p.description, p.type, p.total_rate, p.bonus_percent, p.remain from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} p.brand in (${brand}) AND p.color_name in (${col}) AND p.type = ${id} AND (p.remain > 0 OR p.updated_at > '${dt}')`;
    } else if(brand.length > 0) {
        p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, sub.specs, p.price_tug, p.image, p.discount, p.description, p.type, p.total_rate, p.bonus_percent, p.remain from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} p.brand in (${brand}) AND p.type = ${id} AND (p.remain > 0 OR p.updated_at > '${dt}')`;
    } else if(color.length > 0) {
        var col = '';
        color.forEach(element => {
            if(col == '') {
                col = `'${element}'`;
            } else {
                col = col + `, '${element}'`;
            }
        });
        p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, p.price_tug, p.image, p.discount, p.description, p.type, p.total_rate, p.bonus_percent, p.remain from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} p.color_name in (${col}) AND p.type = ${id} AND (p.remain > 0 OR p.updated_at > '${dt}')`;
    } else {
        p = `SELECT p.id, p.name, p.category_sub_id, p.model, p.color_name, b.brandname, sub.sub_category_name, p.price_tug, p.image, p.discount, p.description, p.type, p.total_rate, p.bonus_percent, p.remain from brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id = sub.id inner join category as c on sub.categoryID = c.id WHERE ${amount} p.category_sub_id = '${id}' AND (p.validToDate =NULL OR p.validToDate > '${dt}')`;
    }

    if(sub.length > 0) {
        console.log(sub);
        p += ` AND category_sub_id in ('${sub}')`
    }
    if(specs != '') {
        var allId = [];
        var spQuery = `SELECT product_id from specs WHERE ${specs}`;
        db.query(spQuery, async (err, specId) => {
            if(err) {
                throw err;
            }
            specId.forEach(element => {
                allId.push(element.product_id)
            });

            if(allId.length > 0) {
                p += ` AND p.id in (${allId})`;
            } else {
                p += ` AND p.id in (0)`;
            }

            db.query(p, async (err, product) => {
                if(err) {
                    throw err;
                }
                let c = `SELECT id, category_name from category WHERE id = ${id}`;
                db.query(c, async (err, ct) => {
                    if(err) {
                        throw err;
                    }
                    if(ct.length > 0) {
                        let b = `SELECT brands.id, brands.brandname, COUNT(*) as total from product inner join brands on product.brand = brands.id WHERE product.type = ${id} AND (product.remain > 0 OR product.updated_at > '${dt}') GROUP BY brands.id ORDER BY brands.brandname`;
                        db.query(b, async (err, brand) => {
                            if(err) {
                                throw err;
                            }
                            let c = `SELECT color_name, COUNT(*) as total from product where type = ${id} AND color_name != '' AND (remain > 0 OR updated_at > '${dt}') GROUP BY color_name ORDER BY color_name`;
                            db.query(c, async (err, color) => {
                                if(err) {
                                    throw err;
                                }
                                let m = `SELECT MAX(sale_price) as max from product WHERE type = ${id} AND (remain > 0 OR updated_at > '${dt}')`;
                                db.query(m, async (err, max) => {
                                    if(err) {
                                        throw err;
                                    }
                                    let sc = product.length % 30;
                                    let f = parseInt(product.length / 30);
                                    if(sc > 0) {
                                        f += 1;
                                    }
                                    
                                    db.query(`SELECT c.sub_category_name, c.id, COUNT(*) as total from category_sub as c inner join product as p on c.id = p.category_sub_id WHERE c.categoryID = ${id} AND (p.remain > 0 OR p.updated_at > '${dt}') GROUP BY c.id ORDER BY c.sub_category_name`, async (err, sub) => {
                                        if(err) {
                                            throw err;
                                        }
        
                                        db.query(`SELECT specs, sub.id from category_sub as sub inner join category as c on sub.categoryID = c.id WHERE c.id = ${id}`, async ( err, sp ) => {
                                            if(err) {
                                                throw err;
                                            }
                                            var spcs = [], cateId = [];
                                            sp.forEach(el => {
                                                if(el.specs != null && el.specs != '') {
                                                    cateId.push(el.id);
                                                    el.specs.split('#').forEach(e => {
                                                        if(!spcs.includes(e)) {
                                                            spcs.push(e);
                                                        }
                                                    });
                                                }
                                            });
                                            if(spcs.length !=0) {
                                                let s = `select ${spcs} from specs as s inner join product as p on s.product_id = p.id inner join category_sub as c on p.category_sub_id = c.id WHERE c.id in (${cateId}) AND (p.remain > 0 OR p.updated_at > '${dt}')`
                                                db.query(s, async (err, specs) => {
                                                    if(err) {
                                                        throw err;
                                                    }
                                                    res.json({
                                                        result: 'success',
                                                        max: max[0].max,
                                                        color,
                                                        spcs,
                                                        specs,
                                                        sub,
                                                        brand,
                                                        product: product.slice(first, last),
                                                        pagination: f,
                                                        category: ct[0].category_name
                                                    });
                                                });
                                            } else {
                                                res.json({
                                                    result: 'success',
                                                    max: max[0].max,
                                                    color,
                                                    spcs,
                                                    specs: [],
                                                    sub,
                                                    brand,
                                                    product: product.slice(first, last),
                                                    pagination: f,
                                                    category: ct[0].category_name
                                                });
                                            }
                                        });
                                    });
            
                                });
                            });
                        });
                        
                    } else {
                        res.json({
                            result: 'failed'
                        });
                    }
                });
            });
            
        });
    } else { 
        db.query(p, async (err, product) => {
            if(err) {
                throw err;
            }
            let c = `SELECT id, category_name from category WHERE id = '${id}'`;
            db.query(c, async (err, ct) => {
                if(err) {
                    throw err;
                }
                if(ct.length > 0) {
                    let b = `SELECT brands.id, brands.brandname, COUNT(*) as total from product inner join brands on product.brand = brands.id WHERE product.category_sub_id = '${id}' AND (product.validToDate = NULL OR product.validToDate > '${dt}') GROUP BY brands.id ORDER BY brands.brandname`;
                    db.query(b, async (err, brand) => {
                        if(err) {
                            throw err;
                        }
                        let c = `SELECT color_name, COUNT(*) as total from product where category_sub_id = '${id}' AND color_name != '' AND (validToDate = NULL OR validToDate > '${dt}') GROUP BY color_name ORDER BY color_name`;
                        db.query(c, async (err, color) => {
                            if(err) {
                                throw err;
                            }
                            let m = `SELECT MAX(price_tug) as max from product WHERE category_sub_id = '${id}' AND (validToDate = NULL OR validToDate > '${dt}')`;
                            db.query(m, async (err, max) => {
                                if(err) {
                                    throw err;
                                }
                                let sc = product.length % 30;
                                let f = parseInt(product.length / 30);
                                if(sc > 0) {
                                    f += 1;
                                }
                                
                                db.query(`SELECT c.sub_category_name, c.id, COUNT(*) as total from category_sub as c inner join product as p on c.id = p.category_sub_id WHERE c.categoryID = '${id}' AND (validToDate = NULL OR validToDate > '${dt}') GROUP BY c.id ORDER BY c.sub_category_name`, async (err, sub) => {
                                    if(err) {
                                        throw err;
                                    }
    
                                    db.query(`SELECT specs, sub.id from category_sub as sub inner join category as c on sub.categoryID = c.id WHERE c.id = '${id}'`, async ( err, sp ) => {
                                        if(err) {
                                            throw err;
                                        }
                                        var spcs = [], cateId = [];
                                        sp.forEach(el => {
                                            if(el.specs != null && el.specs != '') {
                                                cateId.push(el.id);
                                                el.specs.split('#').forEach(e => {
                                                    if(!spcs.includes(e)) {
                                                        spcs.push(e);
                                                    }
                                                });
                                            }
                                        });
                                        if(spcs.length !=0) {
                                            let s = `select ${spcs} from specs as s inner join product as p on s.product_id = p.id inner join category_sub as c on p.category_sub_id = c.id WHERE c.id in (${cateId}) AND (p.remain > 0 OR p.updated_at > '${dt}')`
                                            db.query(s, async (err, specs) => {
                                                if(err) {
                                                    throw err;
                                                }
                                                res.json({
                                                    result: 'success',
                                                    max: max[0].max,
                                                    color,
                                                    spcs,
                                                    specs,
                                                    sub,
                                                    brand,
                                                    product: product.slice(first, last),
                                                    pagination: f,
                                                    category: ct[0].category_name
                                                });
                                            });
                                        } else {
                                            res.json({
                                                result: 'success',
                                                max: max[0].max,
                                                color,
                                                spcs,
                                                specs: [],
                                                sub,
                                                brand,
                                                product: product.slice(first, last),
                                                pagination: f,
                                                category: ct[0].category_name
                                            });
                                        }
                                    });
                                });
        
                            });
                        });
                    });
                    
                } else {
                    res.json({
                        result: 'failed'
                    });
                }
            });
        });
    }
}

exports.SingleProduct = async (req, res) => {
    const { id } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    let ids=0;
    // console.log(token == 'null');
    // const payload = await jwt.verify(token, 'HS256');

    if(id == 1) {
        let spProduct =`SELECT model FROM product WHERE id='${id}'`;
        db.query(spProduct, async(err,promodel)=>{
            if(err){
                throw err;
            }
            if(promodel.length>0){
                let proid=`SELECT id from product Where model='${promodel[0].model}' AND id!=1 LIMIT 1`;
                db.query(proid, async(err,idis)=>{
                    if(err){
                        throw err;
                    }
                    if(idis.length>0){
                        ids=idis[0].id;
                        var my_review = 0;
                        let singleQuery = `SELECT p.name, sub.sub_category_name, c.category_name, p.price_tug, p.id, p.model, p.discount, p.type, p.category_sub_id, p.remain, p.total_rate, p.color_name, b.brandname, b.images, p.image, sub.specs, p.bonus_percent,p.product_type from 
                                    brands as b inner join product as p on b.id = p.brand 
                                    inner join category_sub as sub on p.category_sub_id = sub.id
                                    inner join category as c on sub.categoryID = c.id WHERE p.id = ${idis[0].id}`;
                        db.query(singleQuery, async (err, single) => {
                            if(err) {
                                throw err;
                            }
                            
                            if(single.length > 0) {
                                let img = `SELECT big_image1, big_image2, big_image3, big_image4, title1, title2, title3, title4, title5, title6, desc1, desc2, desc3, desc4, desc5, desc6 from product inner join images on product.image_id = images.id WHERE product.id = ${single[0].id}`;
                                db.query(img, async (err, images) => {
                                    if(err) {
                                        throw err;
                                    }
                                    let other = `SELECT color_name, id, image from product WHERE id != ${single[0].id} AND id!=1 AND model = '${single[0].model}'`;
                                    db.query(other, async (err, others) => {
                                        if(err) {
                                            throw err;
                                        }
                                        let rel = `SELECT model, name, discount, image, id, sale_price, bonus_percent, remain, color_name from,product_type product WHERE category_sub_id = ${single[0].category_sub_id} AND remain > 0 ORDER BY RAND() LIMIT 6`;
                                        db.query(rel, async (err, related) => {
                                            if(err) {
                                                throw err;
                                            }
                                            let reviews = `SELECT u.name, r.message, r.rate, user_id, r.created_at from rate as r inner join users u on r.user_id = u.id WHERE product_id = ${id} ORDER BY RAND()`;
                                            db.query(reviews, async (err, review) => {
                                                if(err) {
                                                    throw err;
                                                }
                                                if(token == 'null') {
                                                    if(single[0].specs != null) {
                                                        let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                                        db.query(spec, async (err, specs) => {
                                                            if(err) {
                                                                throw err;
                                                            }
                                                            res.json({
                                                                result: 'success',
                                                                single,
                                                                images,
                                                                others,
                                                                specs,
                                                                review,
                                                                my_review,
                                                                related,
                                                                ids
                                                            });
                                                        });
                                                    } else {
                                                        res.json({
                                                            result: 'success',
                                                            single,
                                                            images,
                                                            others,
                                                            specs: null,
                                                            review,
                                                            my_review,
                                                            related,
                                                            ids
                                                        });
                                                    }
                                                } else {
                                                    const payload = await jwt.verify(token, 'HS256');
                                                    let sel = `SELECT rate from rate WHERE user_id = ${payload.id} AND product_id = ${id}`;
                                                    db.query(sel, async (err, r) => {
                                                        if(err) {
                                                            throw err;
                                                        }
                                                        if(r.length > 0) {
                                                            my_review = r[0].rate;
                                                        }
                
                                                        if(single[0].specs != null) {
                                                            let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                                            db.query(spec, async (err, specs) => {
                                                                res.json({
                                                                    result: 'success',
                                                                    single,
                                                                    images,
                                                                    others,
                                                                    specs,
                                                                    review,
                                                                    my_review,
                                                                    related,
                                                                    ids
                                                                });
                                                            });
                                                        } else {
                                                            res.json({
                                                                result: 'success',
                                                                single,
                                                                images,
                                                                others,
                                                                specs: null,
                                                                review,
                                                                my_review,
                                                                related,
                                                                ids
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        })
                                    });
                                });
                            } else {
                                res.json({
                                    result: 'failed'
                                });
                            }
                        });
                    }
                })
       

            }
        })
        
    } else {
        var my_review = 0;
        let singleQuery = `SELECT p.name, p.id,b.brandname, p.model, p.discount, p.category_sub_id,p.total_rate, b.brandname, b.images,p.special_price,p.regular_price,p.image, p.bonus_percent,p.dimension,p.price_tug,p.product_type,p.formated_id,p.Top_seller,p.Last_chance,p.New_lower_price,p.IKEA_family_price,p.New,p.color_name,sub.sub_category_name,sub.id as sub_id,c.category_name,c.id as cat_id,sub.specs,p.variants,p.Price_unit,p.yuan_price,p.photosDownloaded from 
                    brands as b inner join product as p on b.id = p.brand inner join category_sub as sub on p.category_sub_id=sub.id inner join category as c on c.id=sub.categoryID WHERE p.id = '${id}'`;
        db.query(singleQuery, async (err, single) => {
            if(err) {
                throw err;
            }
            if(single.length > 0) {
                if(single[0].photosDownloaded=='false'){
                    var imgs=[],urls=[];
                    if(single[0].variants=='' || single[0].variants==null){
                        var variants=[]
                      }else{
                          var variants=single[0].variants.split(",");
                      }
                      if(single[0].special_price>0){
                          single[0].regular_price=roundUpToHundred(Number((single[0].regular_price*single[0].yuan_price)+(single[0].regular_price*single[0].yuan_price/100*22.5)));
                      }
                      let img = `SELECT big_image1, big_image2, big_image3,product_id from images WHERE product_id = ${id}`;
                      db.query(img, async (err, images) => {
                          if(err) {
                              throw err;
                          }
                          if(images[0].big_image1!=null && images[0].big_image1!=''){
                            imgs.push(images[0].big_image1)
                          }
                          if(images[0].big_image2!=null && images[0].big_image2!=''){
                            imgs.push(images[0].big_image2)
                          }
                          if(images[0].big_image3!=null && images[0].big_image3!=''){
                            imgs.push(images[0].big_image3)
                          }
                          urls.push(`./public/images/product/${images[0].product_id}_1.jpg`,`./public/images/product/${images[0].product_id}_2.jpg`,`./public/images/product/${images[0].product_id}_3.jpg`);
                          images=images[0]
                          let rel = `SELECT model, name, discount, image, id, bonus_percent,price_tug,Top_seller,Last_chance,New_lower_price,IKEA_family_price,New,special_price,regular_price,yuan_price from product WHERE category_sub_id='${single[0].category_sub_id}' ORDER BY RAND() LIMIT 10`;
                          db.query(rel, async (err, related) => {
                              if(err) {
                                  throw err;
                              }
                              if(related.length>0){
                                  related.forEach(el=>{
                                      if(el.special_price>0){
                                          el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                                      }
                                  })
                              }
                              let reviews = `SELECT u.name, r.message, r.rate, user_id, r.created_at from rate as r inner join users u on r.user_id = u.id WHERE product_id = ${id} ORDER BY RAND()`;
                              db.query(reviews, async (err, review) => {
                                  if(err) {
                                      throw err;
                                  }
                                  if(variants.length>0){
                                      db.query(`SELECT * FROM product WHERE id IN (${variants}) GROUP BY model`,async(err,variant)=>{
                                          if(err){
                                              throw err;
                                          }
                                          if(token == 'null') {
                                              if(single[0].specs != null) {
                                                  let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                                  db.query(spec, async (err, specs) => {
                                                      if(err) {
                                                          throw err;
                                                      }
                                                      res.json({
                                                          result: 'success',
                                                          single,
                                                          images,
                                                          specs,
                                                          others:variant,
                                                          review,
                                                          my_review,
                                                          related,
                                                          ids
                                                      });
                                                  });
                                              } else {
                                                  res.json({
                                                      result: 'success',
                                                      single,
                                                      images,
                                                      specs: null,
                                                      others:variant,
                                                      review,
                                                      my_review,
                                                      related,
                                                      ids
                                                  });
                                              }
                                          } else {
                                              const payload = await jwt.verify(token, 'HS256');
                                              let sel = `SELECT rate from rate WHERE user_id = ${payload.id} AND product_id = ${id}`;
                                              db.query(sel, async (err, r) => {
                                                  if(err) {
                                                      throw err;
                                                  }
                                                  if(r.length > 0) {
                                                      my_review = r[0].rate;
                                                  }
              
                                                  if(single[0].specs != null) {
                                                      let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                                      db.query(spec, async (err, specs) => {
                                                          res.json({
                                                              result: 'success',
                                                              single,
                                                              images,
                                                              specs,
                                                              others:variant,
                                                              review,
                                                              my_review,
                                                              related,
                                                              ids
                                                          });
                                                      });
                                                  } else {
                                                      res.json({
                                                          result: 'success',
                                                          single,
                                                          images,
                                                          specs: null,
                                                          review,
                                                          others:variant,
                                                          my_review,
                                                          related,
                                                          ids
                                                      });
                                                  }
                                              });
                                          }
                                      })
                                  }else{
                                      if(token == 'null') {
                                          if(single[0].specs != null) {
                                              let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                              db.query(spec, async (err, specs) => {
                                                  if(err) {
                                                      throw err;
                                                  }
                                                  res.json({
                                                      result: 'success',
                                                      single,
                                                      images,
                                                      specs,
                                                      others:variants,
                                                      review,
                                                      my_review,
                                                      related,
                                                      ids
                                                  });
                                              });
                                          } else {
                                              res.json({
                                                  result: 'success',
                                                  single,
                                                  images,
                                                  specs: null,
                                                  review,
                                                  others:variants,
                                                  my_review,
                                                  related,
                                                  ids
                                              });
                                          }
                                      } else {
                                          const payload = await jwt.verify(token, 'HS256');
                                          let sel = `SELECT rate from rate WHERE user_id = ${payload.id} AND product_id = ${id}`;
                                          db.query(sel, async (err, r) => {
                                              if(err) {
                                                  throw err;
                                              }
                                              if(r.length > 0) {
                                                  my_review = r[0].rate;
                                              }
          
                                              if(single[0].specs != null) {
                                                  let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                                  db.query(spec, async (err, specs) => {
                                                      res.json({
                                                          result: 'success',
                                                          single,
                                                          images,
                                                          specs,
                                                          review,
                                                          others:variants,
                                                          my_review,
                                                          related,
                                                          ids
                                                      });
                                                  });
                                              } else {
                                                  res.json({
                                                      result: 'success',
                                                      single,
                                                      images,
                                                      specs: null,
                                                      review,
                                                      others:variants,
                                                      my_review,
                                                      related,
                                                      ids
                                                  });
                                              }
                                          });
                                      }
                                  }
                              });
                          })
                            downloadAllImages(imgs,urls,id)
                      });
                }else{
                    if(single[0].variants=='' || single[0].variants==null){
                        var variants=[]
                      }else{
                          var variants=single[0].variants.split(",");
                      }
                      if(single[0].special_price>0){
                          single[0].regular_price=roundUpToHundred(Number((single[0].regular_price*single[0].yuan_price)+(single[0].regular_price*single[0].yuan_price/100*22.5)));
                      }
                      let img = `SELECT big_image1, big_image2, big_image3,product_id from images WHERE product_id = ${id}`;
                      db.query(img,async(err,images)=>{
                        if(err){
                            throw err;
                        }
                        let imgs={};
                        if(images[0].big_image1!=null && images[0].big_image1!=''){
                            let big_image1='big_image1';
                            imgs[big_image1]=`${Url}/images/product/${images[0].product_id}_1.jpg`;
                          }
                          if(images[0].big_image2!=null && images[0].big_image2!=''){
                            let big_image2='big_image2';
                            imgs[big_image2]=`${Url}/images/product/${images[0].product_id}_2.jpg`;
                          }else{
                            let big_image2='big_image2';
                            imgs[big_image2]=null;
                          }
                          if(images[0].big_image3!=null && images[0].big_image3!=''){
                            let big_image3='big_image3';
                            imgs[big_image3]=`${Url}/images/product/${images[0].product_id}_3.jpg`;
                          }else{
                            let big_image3='big_image3';
                            imgs[big_image3]=null;
                          }
                          let rel = `SELECT model, name, discount, image, id, bonus_percent,price_tug,Top_seller,Last_chance,New_lower_price,IKEA_family_price,New,special_price,regular_price,yuan_price from product WHERE category_sub_id='${single[0].category_sub_id}' ORDER BY RAND() LIMIT 10`;
                          db.query(rel, async (err, related) => {
                              if(err) {
                                  throw err;
                              }
                              if(related.length>0){
                                  related.forEach(el=>{
                                      if(el.special_price>0){
                                          el.regular_price=roundUpToHundred(Number((el.regular_price*el.yuan_price)+(el.regular_price*el.yuan_price/100*22.5)))
                                      }
                                  })
                              }
                              let reviews = `SELECT u.name, r.message, r.rate, user_id, r.created_at from rate as r inner join users u on r.user_id = u.id WHERE product_id = ${id} ORDER BY RAND()`;
                              db.query(reviews, async (err, review) => {
                                  if(err) {
                                      throw err;
                                  }
                                  if(variants.length>0){
                                      db.query(`SELECT * FROM product WHERE id IN (${variants}) GROUP BY model`,async(err,variant)=>{
                                          if(err){
                                              throw err;
                                          }
                                          if(token == 'null') {
                                              if(single[0].specs != null) {
                                                  let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                                  db.query(spec, async (err, specs) => {
                                                      if(err) {
                                                          throw err;
                                                      }
                                                      res.json({
                                                          result: 'success',
                                                          single,
                                                          images:imgs,
                                                          specs,
                                                          others:variant,
                                                          review,
                                                          my_review,
                                                          related,
                                                          ids
                                                      });
                                                  });
                                              } else {
                                                  res.json({
                                                      result: 'success',
                                                      single,
                                                      images:imgs,
                                                      specs: null,
                                                      others:variant,
                                                      review,
                                                      my_review,
                                                      related,
                                                      ids
                                                  });
                                              }
                                          } else {
                                              const payload = await jwt.verify(token, 'HS256');
                                              let sel = `SELECT rate from rate WHERE user_id = ${payload.id} AND product_id = ${id}`;
                                              db.query(sel, async (err, r) => {
                                                  if(err) {
                                                      throw err;
                                                  }
                                                  if(r.length > 0) {
                                                      my_review = r[0].rate;
                                                  }
              
                                                  if(single[0].specs != null) {
                                                      let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                                      db.query(spec, async (err, specs) => {
                                                          res.json({
                                                              result: 'success',
                                                              single,
                                                              images:imgs,
                                                              specs,
                                                              others:variant,
                                                              review,
                                                              my_review,
                                                              related,
                                                              ids
                                                          });
                                                      });
                                                  } else {
                                                      res.json({
                                                          result: 'success',
                                                          single,
                                                          images:imgs,
                                                          specs: null,
                                                          review,
                                                          others:variant,
                                                          my_review,
                                                          related,
                                                          ids
                                                      });
                                                  }
                                              });
                                          }
                                      })
                                  }else{
                                      if(token == 'null') {
                                          if(single[0].specs != null) {
                                              let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                              db.query(spec, async (err, specs) => {
                                                  if(err) {
                                                      throw err;
                                                  }
                                                  res.json({
                                                      result: 'success',
                                                      single,
                                                      images:imgs,
                                                      specs,
                                                      others:variants,
                                                      review,
                                                      my_review,
                                                      related,
                                                      ids
                                                  });
                                              });
                                          } else {
                                              res.json({
                                                  result: 'success',
                                                  single,
                                                  images:imgs,
                                                  specs: null,
                                                  review,
                                                  others:variants,
                                                  my_review,
                                                  related,
                                                  ids
                                              });
                                          }
                                      } else {
                                          const payload = await jwt.verify(token, 'HS256');
                                          let sel = `SELECT rate from rate WHERE user_id = ${payload.id} AND product_id = ${id}`;
                                          db.query(sel, async (err, r) => {
                                              if(err) {
                                                  throw err;
                                              }
                                              if(r.length > 0) {
                                                  my_review = r[0].rate;
                                              }
          
                                              if(single[0].specs != null) {
                                                  let spec = `SELECT ${single[0].specs.split('#')} from specs WHERE product_id = ${id}`;
                                                  db.query(spec, async (err, specs) => {
                                                      res.json({
                                                          result: 'success',
                                                          single,
                                                          images:imgs,
                                                          specs,
                                                          review,
                                                          others:variants,
                                                          my_review,
                                                          related,
                                                          ids
                                                      });
                                                  });
                                              } else {
                                                  res.json({
                                                      result: 'success',
                                                      single,
                                                      images:imgs,
                                                      specs: null,
                                                      review,
                                                      others:variants,
                                                      my_review,
                                                      related,
                                                      ids
                                                  });
                                              }
                                          });
                                      }
                                  }
                              });
                          })
                      })
                }
            } else {
                res.json({
                    result: 'failed'
                });
            }
        });
    }
} 
exports.SingleProd=async(req,res)=>{
    const { id } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    var prod=`SELECT * FROM product2 WHERE product_id=${id}`;
    db.query(prod,async(err,pro)=>{
        if(err){
            throw err;
        }
        res.json({
            result:'success',
            pro:pro[0]
        }
        )
    })

}