const mysql = require("mysql");
const nodemailer = require("nodemailer");
const fs = require("fs");
const axios = require("axios");
const Jimp = require("jimp");
const mergeImages = require("merge-images");
const { Canvas, Image } = require("canvas");

const { db } = require("../db");

const sha256 = require("js-sha256");
const jwt = require("jwt-then");

exports.DeleteSpec = async (req, res) => {
  const { spec } = req.body;
  let spb = `SELECT id,specs FROM category_sub WHERE specs LIKE '%${spec}%'`;
  db.query(spb, async (err, spSub) => {
    if (err) {
      throw err;
    }
    if (spSub.length > 0) {
      var ids = [],
        subSpec = "";
      spSub.forEach((e) => {
        var speSub = [];
        ids.push(e.id);
        e.specs.split("#").forEach((s) => {
          if (s != `${spec}`) {
            speSub.push(s);
          }
        });
        if (speSub.length > 0) {
          subSpec += ` WHEN id=${e.id} THEN "${speSub.join("#")}"`;
        } else {
          subSpec += ` WHEN id=${e.id} THEN ""`;
        }
      });
      let upSubSp = `UPDATE category_sub SET specs=(Case ${subSpec}end) WHERE id in (${ids});`;
      db.query(upSubSp, async (err) => {
        if (err) {
          throw err;
        }
        let sp = `ALTER TABLE specs DROP COLUMN ${spec}`;
        db.query(sp, async (err) => {
          if (err) {
            throw err;
          }
          db.query(`DESCRIBE specs`, async (err, specs) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
              specs: specs,
            });
          });
        });
      });
    } else {
      let sp = `ALTER TABLE specs DROP COLUMN ${spec}`;
      db.query(sp, async (err) => {
        if (err) {
          throw err;
        }
        db.query(`DESCRIBE specs`, async (err, specs) => {
          if (err) {
            throw err;
          }
          res.json({
            result: "success",
            specs: specs,
          });
        });
      });
    }
  });
};

exports.deleteBrand = async (req, res) => {
  const { id } = req.body;
  let c = `SELECT images from brands WHERE id = ${id}`;
  db.query(c, async (err, check) => {
    if (err) {
      throw err;
    }
    if (fs.existsSync("./public/images/brand/" + check[0].images)) {
      fs.unlinkSync("./public/images/brand/" + check[0].images);
    }

    db.query(`DELETE from brands WHERE id = ${id}`, async (err) => {
      if (err) {
        throw err;
      }
      db.query(`DELETE from product WHERE brand = ${id}`, async (err) => {
        if (err) {
          throw err;
        }
        res.json({
          result: "success",
        });
      });
    });
  });
};
exports.VisibleBrand = async (req, res) => {
  const { id } = req.body;
  db.query(
    `UPDATE brands SET Visible=(CASE WHEN Visible!=1 THEN 1 ELSE 2 END) WHERE id=${id}`,
    async (err) => {
      if (err) {
        throw err;
      } else {
        res.json({
          result: "success",
        });
      }
    }
  );
};
exports.VisibleCategory = async (req, res) => {
  const { id } = req.body;
  console.log(`${id}`);
  db.query(
    `UPDATE category SET Visible=(CASE WHEN Visible!=1 THEN 1 ELSE 2 END) WHERE id=${id}`,
    async (err) => {
      if (err) {
        console.log(err);
        throw err;
      } else {
        res.json({
          result: "success",
        });
      }
    }
  );
};

exports.addHomeBanner = async (req, res) => {
  let { info } = req.body;
  info = JSON.parse(info);
  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];

  const time = Date.now();
  const image_name = time + "." + type;

  let bn = `SELECT title_1, title_2, title_3, image, product_id, id from home_banner`;
  let c = `SELECT id from product WHERE model = '${info.model}' GROUP BY model`;
  db.query(c, async (err, check) => {
    if (err) {
      throw err;
    }
    if (check.length > 0) {
      image.mv("./public/images/banner/" + image_name, function (err) {
        if (err) {
          throw err;
        }
        let n = `INSERT INTO home_banner SET ?`;
        let post = {
          title_1: info.title1,
          title_2: info.title2,
          title_3: info.title3,
          image: image_name,
          product_id: check[0].id,
        };

        db.query(n, post, async (err) => {
          if (err) {
            throw err;
          }
          db.query(bn, async (err, banner) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
              image: image_name,
              banner,
            });
          });
        });
      });
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.updateSpecial = async (req, res) => {
  let { info } = req.body;
  info = JSON.parse(info);
  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];

  const time = Date.now();
  const image_name = time + "." + type;
  let respe = `SELECT id,name FROM product WHERE model='${info.model}'`;
  db.query(respe, async (err, pro) => {
    if (err) {
      throw err;
    }
    if (pro.length > 0) {
      let upspe = `UPDATE special_product SET product_model='${info.model}' WHERE id=1`;
      db.query(upspe, async (err) => {
        if (err) {
          throw err;
        }
        let c = `SELECT image from special_product WHERE id = 1`;
        db.query(c, async (err, check) => {
          if (err) {
            throw err;
          }
          if (check[0].image != "no-image.jpg") {
            if (fs.existsSync("./public/images/product/" + check[0].image)) {
              fs.unlinkSync("./public/images/product/" + check[0].image);
            }
          }
          image.mv("./public/images/product/" + image_name, function (err) {
            if (err) {
              throw err;
            }
            // let up = `UPDATE product SET image = '${image_name}', name = '${info.name}', model = '${info.model}', sale_price = ${info.price}, bonus_percent = ${info.bonus}, remain = ${info.qty}, discount = ${info.sale}, discount_end_time = '${info.end_at}', brand = ${info.brand}, type = ${info.category}, category_sub_id = ${info.subCategory}, updated_at = '${new Date()}' WHERE id=1`;
            let up = `UPDATE special_product SET image = '${image_name}' WHERE id=1`;
            db.query(up, async (err) => {
              if (err) {
                throw err;
              }
              res.json({
                result: "success",
                image: image_name,
                model: info.model,
                name: pro[0].name,
              });
            });
          });
        });
      });
    }
  });
};

exports.updateBonusAll = async (req, res) => {
  const { bonus } = req.body;
};

exports.MergeImages = async (req, res) => {
  const { image1, image2, image3, image4 } = req.body;
  mergeImages(
    [
      {
        src: "./public/images/frame.jpg",
      },
      {
        src: `./public/images/product/${image1}`,
        x: 140,
        y: 120,
      },
    ],
    {
      Canvas: Canvas,
      Image: Image,
    }
  ).then((img1) => {
    mergeImages(
      [
        {
          src: "./public/images/frame.jpg",
        },
        {
          src: `./public/images/product/${image2}`,
          x: 140,
          y: 120,
        },
      ],
      {
        Canvas: Canvas,
        Image: Image,
      }
    ).then((img2) => {
      mergeImages(
        [
          {
            src: "./public/images/frame.jpg",
          },
          {
            src: `./public/images/product/${image3}`,
            x: 140,
            y: 120,
          },
        ],
        {
          Canvas: Canvas,
          Image: Image,
        }
      ).then((img3) => {
        mergeImages(
          [
            {
              src: "./public/images/frame.jpg",
            },
            {
              src: `./public/images/product/${image4}`,
              x: 140,
              y: 120,
            },
          ],
          {
            Canvas: Canvas,
            Image: Image,
          }
        ).then((img4) => {
          res.json({
            img1,
            img2,
            img3,
            img4,
          });
        });
      });
    });
  });
};

exports.deleteHomeBanner = async (req, res) => {
  const { id } = req.body;
  let c = `SELECT image from home_banner WHERE id = ${id}`;
  let d = `DELETE from home_banner WHERE id = ${id}`;
  db.query(c, async (err, check) => {
    if (err) {
      throw err;
    }
    if (fs.existsSync("./public/images/banner/" + check[0].image)) {
      fs.unlinkSync("./public/images/banner/" + check[0].image);
    }
    db.query(d, async (err) => {
      if (err) {
        throw err;
      }
      res.json({
        result: "success",
      });
    });
  });
};

exports.updateProducts = async (req, res) => {
  var config = {
    method: "post",
    url: "https://api.icbc.mn/api/usefull/get-all-product",
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIyLCJpYXQiOjE3MDkwMDA3Njh9.Pwsti4ZymQ3YA3NLPDGUuRCdLeE-3uEQFRdIw_e6FBQ",
    },
  };

  axios(config)
    .then(function (response) {
      var qrs = "";
      var models = "";
      var qry_price = "";
      var qry_category = "";
      var qry_sub = "";
      var qry_name = "";
      var br_name = "";
      // var d = JSON.parse(response.data);

      response.data.forEach((value) => {
        if (models == "") {
          models += `'${value.model}'`;
        } else {
          models += `, '${value.model}'`;
        }
        qrs += ` WHEN enc_model ='${value.model}' THEN ${value.total} `;
        if (value.name.includes("'") == true) {
          console.log(value.model);
        }
        qry_name += ` WHEN enc_model ='${value.model}' THEN '${value.name}' `;
        qry_price += ` WHEN enc_model ='${value.model}' THEN ${value.sale_price} `;
        qry_category += ` WHEN enc_model ='${value.model}' THEN ${value.category} `;
        br_name += ` WHEN enc_model ='${value.model}' THEN ${value.brand} `;
        if (value.sub != null) {
          qry_sub += ` WHEN enc_model ='${value.model}' THEN ${value.sub} `;
        }
      });
      var queries =
        "UPDATE product set `name` = (CASE " +
        qry_name +
        " END),remain= (CASE " +
        qrs +
        " END), sale_price = (CASE " +
        qry_price +
        " END), brand =(CASE " +
        br_name +
        " END), type = (CASE " +
        qry_category +
        " END), category_sub_id = (CASE " +
        qry_sub +
        " END) WHERE enc_model in (" +
        models +
        ")";
      db.query(queries, async (err) => {
        if (err) {
          throw err;
        }
        res.json({
          result: "success",
        });
      });
    })
    .catch(function (error) {
      console.log(error);
    });
};

exports.downloadNewProduct = async (req, res) => {
  var colors = [
    "BK",
    "WH",
    "BL",
    "RD",
    "GY",
    "PK",
    "GR",
    "SL",
    "GD",
    "YL",
    "OR",
    "PU",
    "DG",
    "DB",
    "BR",
    "LC",
    "LM",
    "MN",
    "CN",
    "BKGR",
    "WTGR",
    "TH",
    "RG",
    "BKYL",
    "CP",
    "MC",
    "MB",
    "RR",
    "TR",
    "FG",
    "CM",
    "OB",
    "PB",
    "VIO",
    "GB",
    "OG",
    "TB",
    "SB",
    "GG",
    "AB",
    "PW",
    "CF",
    "BG",
  ];
  var config = {
    method: "post",
    url: "https://api.icbc.mn/api/usefull/get-all-product",
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIyLCJpYXQiOjE3MDkwMDA3Njh9.Pwsti4ZymQ3YA3NLPDGUuRCdLeE-3uEQFRdIw_e6FBQ",
    },
  };
  axios(config).then(function (response) {
    let a = `SELECT enc_model from product`;
    db.query(a, async (err, products) => {
      if (err) {
        throw err;
      }
      let bns = `SELECT percent from bonus_table`;
      db.query(bns, async (err, bonusP) => {
        if (err) {
          throw err;
        }
        var n = `INSERT INTO product (name, type, category_sub_id, sale_price, model, brand, description, color_name, remain, enc_model, created_at, updated_at, bonus_percent, discount_over, image) VALUES ?`;
        var rows = [];
        response.data.forEach((el) => {
          var model = "";
          let ex = products.some(function (field) {
            return field.enc_model == el.model;
          });
          if (!ex) {
            var real_model = el.model.split("-");
            var colorclone = real_model[real_model.length - 1];
            if (colors.includes(colorclone)) {
              for (let i = 0; i < real_model.length - 1; i++) {
                if (model == "") {
                  model += real_model[i];
                } else {
                  model += `-${real_model[i]}`;
                }
              }
            } else {
              model = el.model;
            }
            var datetime = new Date()
              .toISOString()
              .replace(/T/, " ")
              .replace(/\..+/, "");
            var post = [
              String(el.name),
              el.category,
              el.sub,
              el.sale_price,
              String(model),
              el.brand,
              String(el.description),
              String(el.color_name),
              el.total,
              String(el.model),
              String(datetime),
              String(datetime),
              bonusP[0].percent,
              "true",
              "no-image.jpg",
            ];
            rows.push(post);
          }
        });
        if (rows.length > 0) {
          db.query(n, [rows], async (err) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
            });
          });
        } else {
          res.json({
            result: "failed",
          });
        }
      });
    });
  });
};

exports.addNewSpec = async (req, res) => {
  const { name } = req.body;
  let c = `SHOW COLUMNS FROM specs LIKE '${name}'`;
  db.query(c, async (err, col) => {
    if (err) {
      throw err;
    }
    if (col.length > 0) {
      res.json({
        result: "failed",
        msg: "Бүртгэлтэй үзүүлэлт",
      });
    } else {
      let n = `ALTER TABLE specs ADD COLUMN ${name} text`;

      db.query(n, async (err) => {
        if (err) {
          res.json({
            result: "failed",
            msg: err,
          });
          throw err;
        }
        let s = `DESCRIBE specs`;
        db.query(s, async (err, specs) => {
          if (err) {
            throw err;
          }
          res.json({
            result: "success",
            specs,
          });
        });
      });
    }
  });
};

exports.updateSpecs = async (req, res) => {
  const { spec, id } = req.body;
  let up = `UPDATE category_sub SET specs = '${spec}' WHERE id = ${id}`;
  db.query(up, async (err) => {
    if (err) {
      throw err;
    }
    let sub = `SELECT sub_category_name, id, specs, categoryID from category_sub`;
    db.query(sub, async (err, subcategory) => {
      if (err) {
        throw err;
      }
      res.json({
        subcategory,
      });
    });
  });
};

exports.orders = async (req, res) => {
  let o = `SELECT COUNT(*) as count, status from orders GROUP BY status`;
  let or = `(SELECT o.ordernumber, o.created_at, o.total_amount, o.status,o.NOAT,o.tax,o.warehouse,o.assemble,o.mow,o.comp_id,u.khoroo,u.more_address,d.district,o.fee,o.payment,o.ikea_order,o.lend_fee,o.deliver_paid from orders as o inner join users as u on o.user_id=u.id inner join district as d on u.district=d.id WHERE o.status = 'pending' ORDER BY o.created_at DESC LIMIT 10) UNION 
           (SELECT o.ordernumber, o.created_at, o.total_amount, o.status,o.NOAT,o.tax,o.warehouse,o.assemble,o.mow,o.comp_id,u.khoroo,u.more_address,d.district,o.fee,o.payment,o.ikea_order,o.lend_fee,o.deliver_paid from orders as o inner join users as u on o.user_id=u.id inner join district as d on u.district=d.id WHERE o.status='paid' ORDER BY o.created_at DESC) UNION
           (SELECT o.ordernumber, o.created_at, o.total_amount, o.status,o.NOAT,o.tax,o.warehouse,o.assemble,o.mow,o.comp_id,u.khoroo,u.more_address,d.district,o.fee,o.payment,o.ikea_order,o.lend_fee,o.deliver_paid from orders as o inner join users as u on o.user_id=u.id inner join district as d on u.district=d.id WHERE o.status='ordered' ORDER BY o.created_at DESC) UNION
           (SELECT o.ordernumber, o.created_at, o.total_amount, o.status,o.NOAT,o.tax,o.warehouse,o.assemble,o.mow,o.comp_id,u.khoroo,u.more_address,d.district,o.fee,o.payment,o.ikea_order,o.lend_fee,o.deliver_paid from orders as o inner join users as u on o.user_id=u.id inner join district as d on u.district=d.id WHERE o.status='loaded' ORDER BY o.created_at DESC ) UNION
           (SELECT o.ordernumber, o.created_at, o.total_amount, o.status,o.NOAT,o.tax,o.warehouse,o.assemble,o.mow,o.comp_id,u.khoroo,u.more_address,d.district,o.fee,o.payment,o.ikea_order,o.lend_fee,o.deliver_paid from orders as o inner join users as u on o.user_id=u.id inner join district as d on u.district=d.id WHERE o.status='came' ORDER BY o.created_at DESC ) UNION
           (SELECT o.ordernumber, o.created_at, o.total_amount, o.status,o.NOAT,o.tax,o.warehouse,o.assemble,o.mow,o.comp_id,u.khoroo,u.more_address,d.district,o.fee,o.payment,o.ikea_order,o.lend_fee,o.deliver_paid from orders as o inner join users as u on o.user_id=u.id inner join district as d on u.district=d.id WHERE o.status = 'delivered' ORDER BY o.created_at DESC LIMIT 300)`;
  var datetime = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
  db.query(o, async (err, order_count) => {
    if (err) {
      throw err;
    }
    db.query(or, async (err, orders) => {
      if (err) {
        throw err;
      }
      res.json({
        count: order_count,
        orders,
      });
    });
  });
};

exports.ordersOfPay = async (req, res) => {
  const { dates } = req.body;
  var start,
    end = "";
  if (dates != null) {
    var d = dates.split(" ");
    if (d.length > 2) {
      start = d[0];
      end = d[2];
      var o = `SELECT SUM(tax) as deliver,SUM(assemble) as assemble,SUM(mow) as mow from orders WHERE status='delivered' AND (created_at>='${start} 00:00:00' AND created_at<='${end} 23:59:59')`;
      var or = `SELECT created_at,ordernumber,tax,assemble,mow FROM orders WHERE tax>0 AND status='delivered' AND (created_at>='${start} 00:00:00' AND created_at<='${end} 23:59:59')`;
    } else {
      var dt = new Date();
      var m = dt.getMonth();
      m = m + 1 < 10 ? "0" + (m + 1) : m + 1;
      dt = dt.getFullYear() + "-" + m + "-01";
      dt = dt.getMonth;
      var o = `SELECT SUM(tax) as deliver,SUM(assemble) as assemble,SUM(mow) as mow from orders WHERE status='delivered' AND created_at>='${dt} 00:00:00'`;
      var or = `SELECT created_at,ordernumber,tax,assemble,mow FROM orders WHERE tax>0 AND status='delivered' AND created_at>='${dt} 00:00:00'`;
    }
  } else {
    var dt = new Date();
    var m = dt.getMonth();
    m = m + 1 < 10 ? "0" + (m + 1) : m + 1;
    dt = dt.getFullYear() + "-" + m + "-01";
    var o = `SELECT SUM(tax) as deliver,SUM(assemble) as assemble,SUM(mow) as mow from orders WHERE status='delivered' AND created_at>='${dt} 00:00:00'`;
    var or = `SELECT created_at,ordernumber,tax,assemble,mow FROM orders WHERE tax>0 AND status='delivered' AND created_at>='${dt} 00:00:00'`;
  }
  var datetime = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
  db.query(o, async (err, info) => {
    if (err) {
      throw err;
    }
    db.query(or, async (err, orders) => {
      if (err) {
        throw err;
      }
      res.json({
        info: info[0],
        orders,
      });
    });
  });
};
exports.searchOrder = async (req, res) => {
  const { ordernumber } = req.body;
  let c = `SELECT ordernumber, created_at, total_amount, status from orders WHERE ordernumber = '${ordernumber}'`;
  db.query(c, async (err, order) => {
    if (err) {
      throw err;
    }
    if (order.length > 0) {
      res.json({
        result: "success",
        order,
      });
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.add_note = async (req,res) => {
  const { ordernumber, note, } = req.body;
  const sql = `
  INSERT INTO \`order_notes\`( \`ordernumber\`, \`note\`, \`created_by\`) 
                      VALUES ('${ordernumber}','${note}',${parseInt(req.user.id)})
  `;
  db.query(sql,(err,newNotes) => {
    if(err) {
      throw err;
    }
    res.json(newNotes);
  })
}

exports.remove_note = async (req,res) => {
  // order-remove-note
  const {id } = req.body;

  const sql = `
  DELETE FROM \`order_notes\` WHERE id=${parseInt(id)}
  `
  db.query(sql,(err,result) => {
    if(err) {
      throw err;
    }
    res.json(result);
  })
}

exports.edit_note = async (req,res) => {
  const { ordernumber, note, id} = req.body;
  const sql = `
  UPDATE \`order_notes\` SET \`note\`='${note}' WHERE id='${id}' AND ordernumber='${ordernumber}'
  `;
  db.query(sql,(err,newNotes) => {
    if(err) {
      throw err;
    }
    res.json(newNotes);
  })
}


exports.changeOrderStatus = async (req, res) => {
  const { ordernumber, status, ordernumberIkea } = req.body;
  let up = "";
  if (status == "loaded" || status == "came") {
    db.query(
      `SELECT ikea_order FROM orders WHERE ordernumber='${ordernumber}'`,
      async (err, ikea) => {
        if (err) {
          throw err;
        }
        if (ikea.length > 0 && ikea[0].ikea_order != 0) {
          up = `UPDATE orders SET status='${status}' WHERE ikea_order='${ikea[0].ikea_order}'`;
          db.query(up, async (err) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
            });
          });
        } else {
          res.json({
            result: "error",
            message: "ИКЭ захиалгын дугаар байхгүй байна",
          });
        }
      }
    );
  } else if (status == "ordered") {
    up = `UPDATE orders SET status = '${status}', ikea_order=${ordernumberIkea} WHERE ordernumber = '${ordernumber}'`;
    db.query(up, async (err) => {
      if (err) {
        throw err;
      }
      res.json({
        result: "success",
      });
    });
  } else {
    up = `UPDATE orders SET status = '${status}',ikea_order=0 WHERE ordernumber = '${ordernumber}'`;
    db.query(up, async (err) => {
      if (err) {
        throw err;
      }
      res.json({
        result: "success",
      });
    });
  }
};

exports.specs = async (req, res) => {
  const { id } = req.body;
  let s = `SELECT c.specs from product as p inner join category_sub as c on p.category_sub_id = c.id WHERE p.id = ${id}`;
  db.query(s, async (err, spec) => {
    if (err) {
      throw err;
    }

    if (spec.length > 0) {
      if (spec[0].specs != "" && spec[0].specs != null) {
        var spec = spec[0].specs.split("#");
        let p = `SELECT ${spec} from specs WHERE product_id = ${id}`;
        db.query(p, async (err, product) => {
          if (err) {
            throw err;
          }
          res.json({
            result: "success",
            spec,
            product,
          });
        });
      } else {
        res.json({
          result: "failed",
        });
      }
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.updateProductSpec = async (req, res) => {
  const { id, params, values } = req.body;
  console.log("dfjkasd");
  db.query(`SELECT model from product WHERE id = ${id}`, async (err, model) => {
    if (err) {
      throw err;
    }
    if (model.length > 0) {
      db.query(
        `SELECT id from product WHERE model = '${model[0].model}'`,
        async (err, models) => {
          if (err) {
            throw err;
          }
          let n = `INSERT into specs (${params}, product_id) VALUES ?`;
          var rows = [],
            ids = [],
            prs = [];
          models.forEach((el) => {
            ids.push(el.id);
            prs = [];
            params.forEach((elem, index) => {
              prs.push(values[index]);
            });
            prs.push(el.id);
            rows.push(prs);
          });
          db.query(
            `DELETE from specs WHERE product_id in (${ids})`,
            async (err) => {
              if (err) {
                throw err;
              }
              db.query(n, [rows], async (err) => {
                if (err) {
                  throw err;
                }
                res.json({
                  result: "success",
                });
              });
            }
          );
        }
      );
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.productEdit = async (req, res) => {
  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];
  const { name, id } = req.body;

  const time = Date.now();
  const image_name = time + "." + type;
  if (name == "mainimage") {
    let c = `SELECT image from product WHERE id = ${id}`;
    db.query(c, async (err, check) => {
      if (err) {
        throw err;
      }
      if (check.length > 0) {
        if (check[0].image != "no-image.jpg") {
          if (fs.existsSync("./public/images/product/" + check[0].image)) {
            fs.unlinkSync("./public/images/product/" + check[0].image);
          }
        }

        image.mv(
          "./public/images/product/" + image_name,
          function (err, result) {
            let up = `UPDATE product SET image = '${image_name}' WHERE id = ${id}`;
            db.query(up, async (err) => {
              if (err) {
                throw err;
              }
              res.json({
                image: image_name,
              });
            });
          }
        );
      }
    });
  } else {
    image.mv("./public/images/product/" + image_name, function (err, result) {
      if (err) {
        throw err;
      }
      let c = `SELECT image_id from product WHERE id = ${id}`;
      db.query(c, async (err, check) => {
        if (err) {
          throw err;
        }
        if (check.length > 0) {
          if (
            check[0].image_id != "" &&
            check[0].image_id != null &&
            check[0].image_id != 0
          ) {
            let s = `SELECT ${name} from product inner join images on product.image_id = images.id WHERE product.id = ${id}`;
            db.query(s, async (err, ss) => {
              if (err) {
                throw err;
              }
              if (fs.existsSync("./public/images/product/" + ss[0][name])) {
                fs.unlinkSync("./public/images/product/" + ss[0][name]);
              }
              let up = `UPDATE images SET ${name} = '${image_name}' WHERE id = ${check[0].image_id}`;
              db.query(up, async (err) => {
                if (err) {
                  throw err;
                }
                res.json({
                  image: image_name,
                });
              });
            });
          } else {
            let i = `INSERT INTO images (${name}) VALUES('${image_name}')`;
            db.query(i, async (err) => {
              if (err) {
                throw err;
              }
              let m = `SELECT MAX(id) as id from images`;
              db.query(m, async (err, max) => {
                if (err) {
                  throw err;
                }
                let u = `UPDATE product SET image_id = ${max[0].id} WHERE id = ${id}`;
                db.query(u, async (err) => {
                  if (err) {
                    throw err;
                  }
                  res.json({
                    image: image_name,
                  });
                });
              });
            });
          }
        }
      });
    });
  }
};

exports.productEditSubmit = async (req, res) => {
  const { info, id } = req.body;
  let c = `SELECT image_id from product WHERE id = ${id}`;
  db.query(c, async (err, p) => {
    if (err) {
      throw err;
    }
    if (p.length > 0) {
      if (p[0].image_id != "" && p[0].image_id != null && p[0].image_id != 0) {
        let up = `UPDATE product SET description = '${info.description}', bonus_percent = '${info.bonus_percent}' WHERE id = ${id}`;
        db.query(up, async (err) => {
          if (err) {
            throw err;
          }
          let u = `UPDATE images SET title1 = '${info.title1}', title2 = '${info.title2}', title3 = '${info.title3}', title4 = '${info.title4}', title5 = '${info.title5}', title6 = '${info.title6}',
                  desc1 = '${info.desc1}', desc2 = '${info.desc2}', desc3 = '${info.desc3}', desc4 = '${info.desc4}', desc5 = '${info.desc5}', desc6 = '${info.desc6}' WHERE id = ${p[0].image_id}`;
          db.query(u, async (err) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
            });
          });
        });
      } else {
        res.json({
          result: "failed",
        });
      }
    } else {
      res.json({
        result: "notfound",
      });
    }
  });
};

exports.deleteCoupon = async (req, res) => {
  const { id } = req.body;

  let d = `DELETE from coupon WHERE id = ${id} AND status = 1`;
  db.query(d, async (err) => {
    if (err) {
      throw err;
    }
    res.json({
      result: "success",
    });
  });
};

exports.getQuickCategory = async (req, res) => {
  let q = `SELECT q.id, q.image, c.sub_category_name from quick_category as q inner join category_sub as c on q.sub_id = c.id GROUP BY c.id`;
  let c = `SELECT * from category_sub`;
  db.query(q, async (err, result) => {
    if (err) {
      throw err;
    }
    db.query(c, async (err, cate) => {
      if (err) {
        throw err;
      }
      res.json({
        result: "success",
        data: result,
        category: cate,
      });
    });
  });
};

exports.addQuickCategory = async (req, res) => {
  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];
  const { id } = req.body;

  const time = Date.now();
  const image_name = time + "." + type;

  let c = `SELECT image from quick_category WHERE sub_id = ${id}`;
  db.query(c, async (err, check) => {
    if (err) {
      throw err;
    }
    if (check.length > 0) {
      res.json({
        result: "failed",
      });
    } else {
      // if(fs.existsSync("./public/images/category/" + check[0].image)){
      //   fs.unlinkSync("./public/images/category/" + check[0].image);
      // }
      image.mv(
        "./public/images/category/" + image_name,
        function (err, result) {
          if (err) {
            throw err;
          }
          let up = `INSERT INTO quick_category SET ?`;
          let p = { image: image_name, sub_id: id };
          db.query(up, p, async (err) => {
            if (err) {
              throw err;
            }
            let q = `SELECT q.id, q.image, c.sub_category_name from quick_category as q inner join category_sub as c on q.sub_id = c.id GROUP BY q.sub_id`;
            db.query(q, async (err, result) => {
              if (err) {
                throw err;
              }
              res.json({
                result: "success",
                data: result,
              });
            });
          });
        }
      );
    }
  });
};

exports.getFeatured = async (req, res) => {
  let a = `SELECT image, model, name, price_tug, color_name from  product WHERE featured=1 GROUP BY model`;
  db.query(a, async (err, all) => {
    if (err) {
      throw err;
    }
    res.json({
      product: all,
    });
  });
};

exports.addFeature = async (req, res) => {
  const { model } = req.body;
  let c = `SELECT id from product WHERE model = '${model}'`;
  db.query(c, async (err, check) => {
    if (check.length > 0) {
      let s = `UPDATE product SET featured=1 WHERE model='${model}'`;
      db.query(s, async (err, ch) => {
        if (err) {
          throw err;
        }
        let a = `SELECT image,model,name,price_tug,color_name,id FROM product WHERE featured=1 GROUP BY model`;
        db.query(a, async (err, all) => {
          if (err) {
            throw err;
          }
          res.json({
            result: "success",
            product: all,
          });
        });
      });
    } else {
      res.json({
        result: "notfound",
      });
    }
  });
};

exports.deleteFeature = async (req, res) => {
  const { id } = req.body;
  let d = `DELETE FROM featured WHERE id = ${id}`;
  db.query(d, async (err) => {
    if (err) {
      throw err;
    }
    res.json({
      result: "success",
    });
  });
};

exports.getDiscount = async (req, res) => {
  let d = `SELECT p.model, p.name, p.color_name, c.sub_category_name, p.image, p.price_tug, p.id, p.bonus_percent from product as p inner join category_sub as c on p.category_sub_id = c.id WHERE  New_lower_price=1 OR IKEA_family_price=1 GROUP BY p.model LIMIT 20`;
  db.query(d, async (err, discount) => {
    if (err) {
      throw err;
    }
    res.json({
      discount,
    });
  });
};

exports.deleteDiscount = async (req, res) => {
  const { id } = req.body;
  let d = `UPDATE product SET discount = 0, discount_over = true WHERE id = ${id}`;
  db.query(d, async (err) => {
    if (err) {
      throw err;
    }
    res.json({
      result: "success",
    });
  });
};

exports.addDiscount = async (req, res) => {
  const { model, percent } = req.body;
  let c = `SELECT id from product where enc_model = '${model}'`;
  db.query(c, async (err, check) => {
    if (err) {
      throw err;
    }
    if (check.length > 0) {
      let up = `UPDATE product SET discount = ${percent}, discount_over = 'false' WHERE id = ${check[0].id}`;
      db.query(up, async (err) => {
        if (err) {
          throw err;
        }
        let d = `SELECT p.model, p.name, p.color_name, c.category_name, p.image, p.sale_price, p.discount, p.type, p.id, p.remain, p.discount_end_time, p.bonus_percent from product as p inner join category as c on p.type = c.id WHERE discount_over = false AND discount > 0`;
        db.query(d, async (err, discount) => {
          if (err) {
            throw err;
          }
          res.json({
            result: "success",
            discount,
          });
        });
      });
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.getUsers = async (req, res) => {
  const { page, search } = req.body;
  const prev = (page - 1) * 20;
  const last = page * 20;
  let alls = `SELECT * FROM users`;
  let allB = `SELECT * FROM users order by bonus DESC LIMIT 50`;
  let u = `SELECT name, phone, email, phone2, img, id, bonus, permission from users WHERE permission = 2 AND name LIKE '%${search}%'`;
  let l = `select u.name, u.phone, u.email, u.phone2, u.img, u.id, u.bonus, o.q from users as u inner join (SELECT COUNT(*) as q, user_id FROM orders WHERE status != 'pending' AND status != 'expired' GROUP BY user_id ORDER BY q DESC) as o on u.id = o.user_id LIMIT 50`;
  let b = `SELECT SUM(bonus) as total from users `;
  db.query(u, async (err, user) => {
    if (err) {
      throw err;
    }
    let sc = user.length % 20;
    let f = parseInt(user.length / 20);
    if (sc > 0) {
      f += 1;
    }

    db.query(l, async (err, loyalty) => {
      if (err) {
        throw err;
      }
      db.query(b, async (err, bonus) => {
        if (err) {
          throw err;
        }
        db.query(alls, async (err, all) => {
          if (err) {
            throw err;
          }
          db.query(allB, async (err, HBUsers) => {
            if (err) {
              throw err;
            }

            res.json({
              all,
              user: user.slice(prev, last),
              pagination: f,
              loyalty,
              bonus,
              HBUsers,
            });
          });
        });
      });
    });
  });
};

exports.userToEmp = async (req, res) => {
  const { id, role } = req.body;
  let up = `UPDATE users SET permission = ${role} WHERE id = ${id}`;
  db.query(up, async (err) => {
    if (err) {
      throw err;
    }
    res.json({
      result: "success",
    });
  });
};

exports.empToUser = async (req, res) => {
  const { id } = req.body;
  let up = `UPDATE users SET permission = 2 WHERE id = ${id}`;
  db.query(up, async (err) => {
    if (err) {
      throw err;
    }
    res.json({
      result: "success",
    });
  });
};

exports.getEmployees = async (req, res) => {
  const { page, search } = req.body;
  const prev = (page - 1) * 20;
  const last = page * 20;
  let u = `SELECT name, phone, email, phone2, img, id, permission from users WHERE permission != 2 AND name LIKE '%${search}%'`;
  db.query(u, async (err, user) => {
    if (err) {
      throw err;
    }
    let sc = user.length % 20;
    let f = parseInt(user.length / 20);
    if (sc > 0) {
      f += 1;
    }
    res.json({
      user: user.slice(prev, last),
      pagination: f,
    });
  });
};

exports.deleteQuickCategory = async (req, res) => {
  const { info } = req.body;
  if (fs.existsSync("./public/images/category/" + info.image)) {
    fs.unlinkSync("./public/images/category/" + info.image);
  }
  let d = `DELETE from quick_category WHERE id = ${info.id}`;
  db.query(d, async (err) => {
    if (err) {
      throw err;
    }
    res.json({
      result: "success",
    });
  });
};

exports.addCoupon = async (req, res) => {
  const { promo, amount, value, status, page } = req.body;
  const token = req.headers.authorization.split(" ")[1];
  const payload = await jwt.verify(token, "HS256");

  let c = `SELECT id from coupon WHERE promo_code = '${promo}'`;
  db.query(c, async (err, result) => {
    if (err) {
      throw err;
    }
    if (result.length > 0) {
      res.json({
        result: "failed",
      });
    } else {
      let p = {
        amount,
        value,
        promo_code: promo,
        status: 1,
        created_at: new Date(),
        updated_at: new Date(),
        user_id: payload.id,
      };
      let i = `INSERT INTO coupon SET ?`;
      db.query(i, p, async (err) => {
        if (err) {
          throw err;
        }
        const prev = (page - 1) * 20;
        const last = page * 20;
        let c;
        if (status == 3) {
          c = `SELECT id, amount, created_at, promo_code, status from coupon ORDER BY created_at DESC`;
        } else {
          c = `SELECT id, amount, created_at, promo_code, status from coupon WHERE status = ${status} ORDER BY created_at DESC`;
        }
        db.query(c, async (err, result) => {
          if (err) {
            throw err;
          }
          let sc = result.length % 20;
          let f = parseInt(result.length / 20);
          if (sc > 0) {
            f += 1;
          }
          res.json({
            result: "success",
            data: result.slice(prev, last),
            pagination: f,
          });
        });
      });
    }
  });
};

exports.getAllCoupon = async (req, res) => {
  const { page, status } = req.body;
  const prev = (page - 1) * 20;
  const last = page * 20;
  let c;
  if (status == 3) {
    c = `SELECT id, amount, created_at, promo_code, status from coupon ORDER BY created_at DESC`;
  } else {
    c = `SELECT id, amount, created_at, promo_code, status from coupon WHERE status = ${status} ORDER BY created_at DESC`;
  }

  db.query(c, async (err, result) => {
    if (err) {
      throw err;
    }
    let sc = result.length % 20;
    let f = parseInt(result.length / 20);
    if (sc > 0) {
      f += 1;
    }
    res.json({
      result: "success",
      data: result.slice(prev, last),
      pagination: f,
    });
  });
};

exports.getProductEdit = async (req, res) => {
  const { id } = req.body;
  let p = `SELECT image, description, image_id, model, bonus_percent from product WHERE id = ${id}`;
  let i = `SELECT i.big_image1, i.big_image2, i.big_image3, i.big_image4, i.title1, i.title2, i.title3, i.title4, i.title6, i.title5, i.desc1, i.desc2, i.desc3, i.desc4, i.desc5, i.desc6 from product inner join images as i on product.image_id = i.id WHERE product.id = ${id}`;
  db.query(p, async (err, product) => {
    if (err) {
      throw err;
    }
    if (product.length > 0) {
      if (
        product[0].image_id != "" &&
        product[0].image_id != null &&
        product[0].image_id != 0
      ) {
        db.query(i, async (err, info) => {
          if (err) {
            throw err;
          }
          res.json({
            product,
            info,
          });
        });
      } else {
        let c = `SELECT image_id from product WHERE model = '${product[0].model}' AND id != ${id}`;
        db.query(c, async (err, transfer) => {
          if (err) {
            throw err;
          }
          if (transfer.length > 0) {
            var sId = 0;
            transfer.forEach((element) => {
              if (
                element.image_id != "" &&
                element.image_id != null &&
                element.image_id != 0
              ) {
                sId = element.image_id;
              }
            });
            let up = `UPDATE product SET image_id = ${sId} WHERE id = ${id}`;
            db.query(up, async (err) => {
              if (err) {
                throw err;
              }
              db.query(p, async (err, product) => {
                if (err) {
                  throw err;
                }
                db.query(i, async (err, info) => {
                  if (err) {
                    throw err;
                  }
                  res.json({
                    product,
                    info,
                  });
                });
              });
            });
          }
        });
      }
    }
  });
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.body;
  if (id != 1) {
    let c = `SELECT image from product WHERE id = ${id}`;
    db.query(c, async (err, image) => {
      if (image.length > 0) {
        if (image[0].image != "no-image.jpg") {
          if (fs.existsSync("./public/images/product/" + image[0].image)) {
            fs.unlinkSync("./public/images/product/" + image[0].image);
          }
        }
      }
      let d = `DELETE from product WHERE id = ${id}`;
      db.query(d, async (err) => {
        if (err) {
          throw err;
        }
        res.json({
          result: "success",
        });
      });
    });
  } else {
    res.json({
      result: "error",
    });
  }
};

exports.allproduct = async (req, res) => {
  const { page, search } = req.body;
  const first = (page - 1) * 20;
  const last = page * 20;
  let p = `SELECT p.name, p.model, p.image, p.id, b.brandname, p.color_name, p.price_tug from product as p inner join brands as b on p.brand = b.id WHERE p.model LIKE '%${search}%' GROUP BY p.model ORDER BY p.id DESC`;
  let img = `SELECT COUNT(*) as total FROM product WHERE image = 'no-image.jpg'`;
  let c = `SELECT COUNT(*) as total FROM category_sub WHERE specs is NULL`;
  let d = `SELECT COUNT(*) as total FROM product WHERE description = '' OR description is NULL`;
  let t = `SELECT COUNT(*) as total from (select model from product GROUP BY model) as z`;
  db.query(p, async (err, product) => {
    if (err) {
      throw err;
    }
    let sc = product.length % 20;
    let f = parseInt(product.length / 20);
    if (sc > 0) {
      f += 1;
    }
    db.query(img, async (err, image) => {
      if (err) {
        throw err;
      }
      db.query(c, async (err, category) => {
        if (err) {
          throw err;
        }
        db.query(d, async (err, desc) => {
          if (err) {
            throw err;
          }
          db.query(t, async (err, model) => {
            if (err) {
              throw err;
            }
            res.json({
              product: product.slice(first, last),
              pagination: f,
              image: image[0].total,
              category: category[0].total,
              desc: desc[0].total,
              model: model[0].total,
            });
          });
        });
      });
    });
  });
};

exports.showOrder = async (req, res) => {
  const { ordernumber } = req.body;
  `
   
  `
  let p = `SELECT p.name, p.model, o.amount, o.quantity, p.image, p.color_name FROM order_product as o inner join product as p on o.product_id = p.id WHERE o.ordernumber = '${ordernumber}' GROUP BY p.model`;
  let c = `SELECT o.ordernumber, o.lat, o.lon, u.phone, u.phone2, u.email, u.more_address, d.district, u.khoroo, o.name, o.created_at, o.tax, o.status, o.discount, o.used_bonus, o.total_amount, o.w3w, o.receiver, o.comp_id,o.NOAT,o.assemble,o.mow,o.warehouse,o.fee FROM orders as o inner join users as u on o.user_id = u.id inner JOIN district as d on u.district = d.id WHERE o.ordernumber = '${ordernumber}'`;
  let notes = `
    SELECT 
      notes.note as note,
      u.name as user_name,
      u.id as user_id,
      notes.created_at  as created_at ,
      notes.id as id 
      
    FROM
      order_notes  as notes

    INNER JOIN 
       users as u ON notes.created_by = u.id
    WHERE 
      ordernumber='${ordernumber}'
      
    GROUP BY 
    	notes.id

  `
  
  db.query(c, async (err, info) => {
    if (err) {
      throw err;
    }
    if (info.length > 0) {
      // db.query()
      db.query(p, async (err, product) => {
        if (err) {
          throw err;
        }
        db.query(notes,(err,notes) => {

          res.json({
            result: "success",
            info,
            notes,
            product,
          });
        });
        
      });
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.updateCategory = async (req, res) => {
  var config = {
    method: "post",
    url: "https://api.icbc.mn/api/usefull/get-categories",
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIyLCJpYXQiOjE3MDkwMDA3Njh9.Pwsti4ZymQ3YA3NLPDGUuRCdLeE-3uEQFRdIw_e6FBQ",
    },
  };
  let n = `INSERT into category (id, category_name, category_code, image, created_at, updated_at) VALUES ?`;
  var rows = [];
  var subID = [],
    nm = "";
  axios(config).then(function (response) {
    let c = `SELECT id, category_code from category`;
    db.query(c, async (err, category) => {
      if (err) {
        throw err;
      }
      response.data.forEach((el) => {
        let ex = category.some(function (field) {
          return field.id == el.id && el.category_code == field.category_code;
        });
        if (!ex) {
          var datetime = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          var post = [
            el.id,
            el.category_name,
            el.category_code,
            "no-image.png",
            datetime,
            datetime,
          ];
          rows.push(post);
        } else {
          subID.push(el.id);
          nm += ` WHEN id = ${el.id} THEN '${el.category_name}'`;
        }
      });
      let up = `UPDATE category SET category_name  = (CASE ${nm} END) WHERE id in (${subID})`;
      db.query(up, async (err) => {
        if (err) {
          throw err;
        }
        if (rows.length > 0) {
          db.query(n, [rows], async (err) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
            });
          });
        } else {
          res.json({
            result: "success",
          });
        }
      });
    });
  });
};

exports.updateSubCategory = async (req, res) => {
  var config = {
    method: "post",
    url: "https://api.icbc.mn/api/usefull/get-sub-categories",
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIyLCJpYXQiOjE3MDkwMDA3Njh9.Pwsti4ZymQ3YA3NLPDGUuRCdLeE-3uEQFRdIw_e6FBQ",
    },
  };
  let n = `INSERT into category_sub (id, sub_category_name, sub_category_code, categoryID, created_at, updated_at) VALUES ?`;
  var rows = [];
  var subID = [],
    nm = "";
  axios(config).then(function (response) {
    let c = `SELECT id, sub_category_code from category_sub`;
    db.query(c, async (err, category) => {
      if (err) {
        throw err;
      }
      response.data.forEach((el) => {
        let ex = category.some(function (field) {
          return (
            field.id == el.id && el.sub_category_code == field.sub_category_code
          );
        });
        if (!ex) {
          var datetime = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          var post = [
            el.id,
            el.sub_category_name,
            el.sub_category_code,
            el.categoryID,
            datetime,
            datetime,
          ];
          rows.push(post);
        } else {
          subID.push(el.id);
          nm += ` WHEN id = ${el.id} THEN '${el.sub_category_name}'`;
        }
      });
      let up = `UPDATE category_sub SET sub_category_name  = (CASE ${nm} END) WHERE id in (${subID})`;
      db.query(up, async (err) => {
        if (err) {
          throw err;
        }
        if (rows.length > 0) {
          db.query(n, [rows], async (err) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
            });
          });
        } else {
          res.json({
            result: "success",
          });
        }
      });
    });
  });
};

exports.AddProductEvent = async (req, res) => {
  const { model, eventId } = req.body;
  let ch = `SELECT id from product WHERE model = '${model}'`;
  db.query(ch, async (err, check) => {
    if (err) {
      throw err;
    }
    if (check.length > 0) {
      let pst = { eventId, productId: check[0].id };
      let qr = `INSERT INTO event_product SET ?`;
      db.query(qr, pst, async (err) => {
        if (err) {
          throw err;
        }
        let evtp = `SELECT p.image, ep.eventId, ep.id as mainId, p.id, p.name, p.model, p.color_name from product as p inner join event_product as ep on p.id = ep.productId GROUP BY p.model`;
        db.query(evtp, async (err, product) => {
          if (err) {
            throw err;
          }
          res.json({
            result: "success",
            product,
          });
        });
      });
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.DeleteEvent = async (req, res) => {
  const { id } = req.body;
  let ch = `SELECT image from events WHERE id = ${id}`;
  db.query(ch, async (err, check) => {
    if (err) {
      throw err;
    }
    if (check.length > 0) {
      if (fs.existsSync("./public/images/event/" + check[0].image)) {
        fs.unlinkSync("./public/images/event/" + check[0].image);
      }
      db.query(`DELETE FROM events WHERE id = ${id}`, async (err) => {
        if (err) {
          throw err;
        }
        db.query(
          `DELETE from event_product WHERE eventId = ${id}`,
          async (err) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
            });
          }
        );
      });
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.updateBrand = async (req, res) => {
  var config = {
    method: "post",
    url: "https://api.icbc.mn/api/usefull/get-brands",
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIyLCJpYXQiOjE3MDkwMDA3Njh9.Pwsti4ZymQ3YA3NLPDGUuRCdLeE-3uEQFRdIw_e6FBQ",
    },
  };
  let n = `INSERT into brands (id, brandname, images, created_at) VALUES ?`;
  var rows = [],
    names = "",
    ids = [];
  axios(config).then(function (response) {
    let b = `SELECT brandname, id from brands`;
    db.query(b, async (err, brands) => {
      if (err) {
        throw err;
      }
      response.data.forEach((el) => {
        let ex = brands.some(function (field) {
          return field.id == el.id;
        });
        if (!ex) {
          var datetime = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          var post = [el.id, el.brandname, "no-image.png", datetime];
          rows.push(post);
        } else {
          ids.push(el.id);
          names += ` when id = ${el.id} then '${el.brandname}'`;
        }
      });
      var q = `UPDATE brands set brandname = (case ${names} end) WHERE id in (${ids})`;
      db.query(q, async (err) => {
        if (err) {
          throw err;
        }
        if (rows.length > 0) {
          db.query(n, [rows], async (err) => {
            if (err) {
              throw err;
            }
            res.json({
              result: "success",
            });
          });
        } else {
          res.json({
            result: "failed",
          });
        }
      });
    });
  });
};

exports.getProductDetail = async (req, res) => {
  const { model } = req.body;
  let singleQuery = `SELECT sub.specs, p.id, b.images from 
                    brands as b inner join product as p on b.id = p.brand 
                    inner join category_sub as sub on p.category_sub_id = sub.id
                    inner join category as c on sub.categoryID = c.id WHERE p.enc_model = '${model}'`;

  db.query(singleQuery, async (err, single) => {
    if (err) {
      throw err;
    }
    if (single.length > 0) {
      if (single[0].specs != null) {
        let spec = `SELECT ${single[0].specs.split(
          "#"
        )} from specs WHERE product_id = ${single[0].id}`;
        db.query(spec, async (err, specs) => {
          if (err) {
            throw err;
          }
          res.json({
            result: "success",
            single,
            specs,
          });
        });
      } else {
        res.json({
          result: "success",
          single,
          specs: [],
        });
      }
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.dashboard = async (req, res) => {
  let d = new Date();
  let mnt;
  if (d.getMonth() + 1 < 10) {
    mnt = "0" + (d.getMonth() + 1);
  } else {
    mnt = d.getMonth() + 1;
  }
  let cp = `SELECT COUNT(*) as total from product`;
  let co = `SELECT COUNT(*) as total from orders where status = 'paid'`;
  let cu = `SELECT COUNT(*) as total from users where verified = 'true'`;
  let toDay = `SELECT DAYNAME(created_at) as dayname, created_at, SUM(total_amount) as amount FROM orders WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) AND status != 'pending' AND status != 'expired' GROUP BY dayname`;
  let to = `SELECT SUM(total_amount) as amount, DAY(Date(created_at)) as day, created_at from orders where created_at LIKE '${d.getFullYear()}-${mnt}%' AND status != 'pending' AND status != 'expired' GROUP BY day`;
  let sp = `SELECT p.name, s.image,s.product_model FROM special_product as s inner join product as p on s.product_model=p.model WHERE s.id = 1 GROUP BY p.model`;
  let ct = `SELECT category_name, image, id, icon,Visible from category`;
  let br = `SELECT brandname, images, id, bg, Visible from brands`;
  let bn = `SELECT title_1, title_2, title_3, image, product_id, id from home_banner`;
  let sub = `SELECT sub_category_name, id, specs, categoryID from category_sub`;
  let bann = `SELECT title, id, image from banners`;
  let evt = `SELECT id, event_name, image, special from events`;
  let evtp = `SELECT p.image, ep.eventId, ep.id as mainId, p.id, p.name, p.model, p.color_name from product as p inner join event_product as ep on p.id = ep.productId GROUP BY p.model`;
  let s = `DESCRIBE specs`;
  let lastDate = new Date();
  lastDate.setDate(lastDate.getDate());
  lastDate = new Date(lastDate.setMonth(lastDate.getMonth() - 1));
  let lmnt;
  if (lastDate.getMonth() + 1 < 10) {
    lmnt = "0" + (lastDate.getMonth() + 1);
  } else {
    lmnt = lastDate.getMonth() + 1;
  }
  // console.log(lastDate.toISOString().replace(/T/, ' ').replace(/\..+/, ''));
  let totalThis = `SELECT SUM(total_amount) as total FROM orders WHERE status != 'pending' AND status != 'expired' AND created_at < NOW() AND created_at LIKE '${d.getFullYear()}-${mnt}%'`;
  let totalLast = `SELECT SUM(total_amount) as total FROM orders WHERE status != 'pending' AND status != 'expired' AND created_at <= '${lastDate
    .toISOString()
    .replace(/T/, " ")
    .replace(
      /\..+/,
      ""
    )}' AND created_at LIKE '${lastDate.getFullYear()}-${lmnt}%'`;

  db.query(cp, async (err, cproduct) => {
    if (err) {
      throw err;
    }
    db.query(co, async (err, corder) => {
      if (err) {
        throw err;
      }
      db.query(cu, async (err, cusers) => {
        if (err) {
          throw err;
        }
        db.query(to, async (err, total_order) => {
          if (err) {
            throw err;
          }
          db.query(sp, async (err, special) => {
            if (err) {
              console.log(err);
              throw err;
            }
            db.query(ct, async (err, category) => {
              if (err) {
                throw err;
              }
              db.query(br, async (err, brand) => {
                if (err) {
                  throw err;
                }
                db.query(bn, async (err, banner) => {
                  if (err) {
                    throw err;
                  }
                  db.query(sub, async (err, subcat) => {
                    if (err) {
                      throw err;
                    }
                    db.query(s, async (err, specs) => {
                      if (err) {
                        throw err;
                      }
                      db.query(toDay, async (err, week) => {
                        if (err) {
                          throw err;
                        }
                        db.query(totalThis, async (err, totalThisMonth) => {
                          if (err) {
                            throw err;
                          }
                          db.query(totalLast, async (err, totalLastMonth) => {
                            if (err) {
                              throw err;
                            }
                            db.query(bann, async (err, banners) => {
                              if (err) {
                                throw err;
                              }
                              db.query(evt, async (err, events) => {
                                if (err) {
                                  throw err;
                                }
                                db.query(evtp, async (err, event_product) => {
                                  if (err) {
                                    throw err;
                                  }
                                  res.json({
                                    count: {
                                      product: cproduct[0].total,
                                      order: corder[0].total,
                                      users: cusers[0].total,
                                    },
                                    total_order,
                                    special,
                                    category,
                                    brand,
                                    banner,
                                    subcategory: subcat,
                                    specs,
                                    week,
                                    lastMonth: totalLastMonth[0].total,
                                    thisMonth: totalThisMonth[0].total,
                                    banners,
                                    events,
                                    event_product,
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

exports.addNewEvent = async (req, res) => {
  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];
  const { name } = req.body;
  const time = Date.now();
  const image_name = time + "." + type;
  image.mv("./public/images/event/" + image_name, function (err, result) {
    if (err) {
      throw err;
    }
    let pst = { event_name: name, image: image_name };
    let n = `INSERT INTO events SET ?`;
    db.query(n, pst, async (err) => {
      if (err) {
        throw err;
      }
      db.query(
        `SELECT event_name, id, image, special from events`,
        async (err, events) => {
          if (err) {
            throw err;
          }
          res.json({
            result: "success",
            events,
          });
        }
      );
    });
  });
};

exports.addNewBanner2 = async (req, res) => {
  const image = req.files.photo;

  const type = image.mimetype.split("/")[1];
  const { title, description, subId } = req.body;
  const time = Date.now();
  const image_name = time + "." + type;

  image.mv("./public/images/banner/" + image_name, function (err, result) {
    if (err) {
      throw err;
    }
    let pst = { title, description, image: image_name, subId };
    let n = `INSERT INTO banners SET ?`;
    db.query(n, pst, async (err) => {
      if (err) {
        throw err;
      }
      db.query(`SELECT title, id, image from banners`, async (err, banners) => {
        if (err) {
          throw err;
        }
        res.json({
          result: "success",
          banners,
        });
      });
    });
  });
};

exports.deleteBanner2 = async (req, res) => {
  const { id } = req.body;
  let check = `SELECT image from banners WHERE id = ${id}`;
  db.query(check, async (err, result) => {
    if (err) {
      throw err;
    }
    if (result.length > 0) {
      if (fs.existsSync("./public/images/banner/" + result[0].image)) {
        fs.unlinkSync("./public/images/banner/" + result[0].image);
      }
      db.query(`DELETE from banners WHERE id = ${id}`, async (err) => {
        if (err) {
          throw err;
        }
        res.json({
          result: "success",
        });
      });
    } else {
      res.json({
        result: "failed",
      });
    }
  });
};

exports.changeCategogryImage = async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const payload = await jwt.verify(token, "HS256");

  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];
  const { id } = req.body;

  const time = Date.now();
  const image_name = time + "." + type;

  let c = `SELECT image from category WHERE id = ${id}`;
  db.query(c, async (err, img) => {
    if (err) {
      throw err;
    }
    if (fs.existsSync("./public/images/category/" + img[0].image)) {
      fs.unlinkSync("./public/images/category/" + img[0].image);
    }
    image.mv("./public/images/category/" + image_name, function (err, result) {
      if (err) {
        throw err;
      }
      let up = `UPDATE category SET image = '${image_name}' WHERE id = ${id}`;
      db.query(up, async (err) => {
        if (err) {
          throw err;
        }
        res.json({
          image: image_name,
        });
      });
    });
  });
};

exports.changeCategogryIcon = async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const payload = await jwt.verify(token, "HS256");

  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];
  const { id } = req.body;

  const time = Date.now();
  const image_name = time + "." + type;

  let c = `SELECT icon from category WHERE id = ${id}`;
  db.query(c, async (err, img) => {
    if (err) {
      throw err;
    }
    if (img[0].icon != "main.svg") {
      if (fs.existsSync("./public/images/menu/" + img[0].icon)) {
        fs.unlinkSync("./public/images/menu/" + img[0].icon);
      }
    }

    image.mv("./public/images/menu/" + image_name, function (err, result) {
      if (err) {
        throw err;
      }
      let up = `UPDATE category SET icon = '${image_name}' WHERE id = ${id}`;
      db.query(up, async (err) => {
        if (err) {
          throw err;
        }
        res.json({
          image: image_name,
        });
      });
    });
  });
};

exports.changeBrandBackground = async (req, res) => {
  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];
  const { id } = req.body;

  const time = Date.now();
  const image_name = time + "." + type;

  let c = `SELECT bg from brands WHERE id = ${id}`;
  db.query(c, async (err, img) => {
    if (err) {
      throw err;
    }
    if (img[0].bg != "default.jpg") {
      if (fs.existsSync("./public/images/brand/" + img[0].bg)) {
        fs.unlinkSync("./public/images/brand/" + img[0].bg);
      }
    }
    image.mv("./public/images/brand/" + image_name, function (err) {
      if (err) {
        throw err;
      }
      let up = `UPDATE brands SET bg = '${image_name}' WHERE id = ${id}`;
      db.query(up, async (err) => {
        if (err) {
          throw err;
        }
        res.json({
          image: image_name,
        });
      });
    });
  });
};
exports.changeBrandImage = async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const payload = await jwt.verify(token, "HS256");

  const image = req.files.photo;
  const type = image.mimetype.split("/")[1];
  const { id } = req.body;

  const time = Date.now();
  const image_name = time + "." + type;

  let c = `SELECT images from brands WHERE id = ${id}`;
  db.query(c, async (err, img) => {
    if (err) {
      throw err;
    }
    if (fs.existsSync("./public/images/brand/" + img[0].image)) {
      fs.unlinkSync("./public/images/brand/" + img[0].image);
    }
    image.mv("./public/images/brand/" + image_name, function (err) {
      if (err) {
        throw err;
      }
      let up = `UPDATE brands SET images = '${image_name}' WHERE id = ${id}`;
      db.query(up, async (err) => {
        if (err) {
          throw err;
        }
        res.json({
          image: image_name,
        });
      });
    });
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  // const user = await User.findOne({email, password: sha256(password + process.env.SALT)});
  let qry = `SELECT * from users WHERE email = '${email}' AND password = '${sha256(
    password + process.env.SALT
  )}' AND (permission = 1 OR permission=3 OR permission=4)`;

  db.query(qry, async (err, result) => {
    if (err) {
      throw err;
    }
    if (result.length === 0) {
      return res.status(200).json({
        result: "fail",
        data: "Хэрэглэгчийн нэр эсвэл нууц үг буруу",
        status: 400,
      });
    }

    // if(result[0].verified == 'false') {

    //   const token  = await  jwt.sign({
    //       id: result[0].id
    //     },
    //     'HS256');

    //   await SentEmail(token, email);

    //   return res.status(200).json({
    //     result: 'fail',
    //     data: 'Баталгаажуулаагүй хаяг байна. И-Мэйл хаягаа шалгана уу!',
    //     status: 400
    //   })
    // }

    const token = await jwt.sign(
      {
        id: result[0].id,
      },
      "HS256"
    );

    return res.status(200).json({
      result: "success",
      data: result[0],
      token,
      status: 200,
    });
  });
};

exports.DeleteEventProduct = async (req, res) => {
  const { event, product } = req.body;
  db.query(
    `DELETE FROM event_product WHERE productId=${product} AND eventId=${event}`,
    async (err) => {
      if (err) {
        throw err;
      }
      res.json({
        result: "success",
      });
    }
  );
};
