const mysql = require("mysql");
const axios = require('axios');

// const db = mysql.createConnection({
//   host: 'localhost',
//   database: 'ikea',
//   user: 'root',
//   password: ''
// });

const { db } = require("../db");


const sha256 = require("js-sha256");
const jwt = require('jwt-then');
const { response } = require("express");


const qpayTemplateId = "ICBC_REMAX_INVOICE";
const qpayMerchantId = "ICBC_REMAX";
const qpayClientId = "60C6A5B2-8597-8A5B-7719-8783A6B185C6";
const qpayClientSecret = "95D354F5-1C09-2BD7-108D-47286EE37A26";


const mChatApiKey = "O8v40PG9oewHKZjwMy7zFx/zX9afMkmDcglJvKgIoUM=";
const mChatAppSecret = "zDUZIQVG3Zi7IrJrgMLi3PPmhDR3kZc6FfQ1xBCKul4=";
const mChatUser = "2838905fef351734c35307524eac50b1e79eb5dc29c5cb370889335ce78c785b";
const mChatBranch = "ZMVXYW";

// var SPID=6272;
// const SPAppUserName="11221122";
// const SPAppUserPass="11221122";
// const SPBasicUserName="merchantapp1";
// const SPBasicUserPass="EnRZA3@B";

var SPID=21681;
const SPAppUserName="88977190";
const SPAppUserPass="88977190";
const SPBasicUserName="merchantapp1";
const SPBasicUserPass="EnRZA3@B";

const mcreditAuth="1jbnyOrYwFSqCaeIidRxobdUxzsxhyeUvCq7PuQtH5xLaJObpTVZnZ2XjMCCpNiyy7JVZ5Es1TdOOizkH4tvTM";
const mcreditUser="remax";

async function GetSPAutherToken(){
    let str=axios.post(`http://service-merchant.storepay.mn:7701/oauth/token?grant_type=password&username=${SPAppUserName}&password=${SPAppUserPass}`,"",{
        headers:{
            "authorization":'Basic bWVyY2hhbnRhcHAxOkVuUlpBM0BC'
        }
    }).then((res) => {
        Date.prototype.addDays = function() {
            var date = new Date(this.valueOf());
            date.setHours(date.getHours() + 1);
            return date;
        }
        var dt = new Date().addDays().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        
        let up = `UPDATE tokens SET token = '${res.data.access_token}', expire = '${dt}' WHERE organization = 'storepay'`;
        db.query(up, async err=> {
            if(err) {
                throw err;
            }
        });
        return res.data.access_token;
        
    }).catch((err) => {
        console.error(err.message);
    });
    
return await str;
}


async function requestToFF(invoiceId) {
    let str = axios.get('https://api.hurdanhuruu.mn/api/purchase/qpay-result', {
            headers:{},
            params: {
                invoiceId
            }
        })
        .then((res) => {
            return res.data;
        }).catch((err) => {
            console.error(err);
        });
        return await str;
}
async function requestToPO(invoiceId) {
    let str = axios.get('https://api.icbc.mn/api/order/qpay-result', {
            headers:{},
            params: {
                invoiceId
            }
        })
        .then((res) => {
            return res.data;
        }).catch((err) => {
            console.error(err);
        });
        return await str;
}

async function checkSPBill(id, token) {

    let str = axios.get(`http://service-merchant.storepay.mn:7005/merchant/loan/check/${id}`,{
    headers: {
        Authorization: `Bearer ${token}`
    }
    }).then((res) => {
        return res.data;
    }).catch(error => {
        console.log(error);
    });
    
    return await str;
}

async function checkQpayBill(payment_id,token) {

    let str = axios.get(`https://merchant.qpay.mn/v2/payment/${payment_id}`,{
    headers: {
        Authorization: `Bearer ${token}`
    }
    }).then((res) => {
        return res.data;
    }).catch(error => {
        console.log(error);
    });
    
    return await str;
}
async function checkMcreditBill(id,token,user){
    const data={
        'invoice_id':id
    }
    let str =axios.post('https://app.mcredit.mn/api/mshop/check/invoice',data,{
    headers:{
        "x-and-auth-token":token,
        "x-and-auth-user":user 
    }
    }).then((res)=>{
        return res.data;
    }).catch(error=>{
        console.log(error)
    })
   return await str
}
exports.spWebhook = async (req, res) =>{
    // const { invoiceId } = req.query;
    const id = req.query.id;
        let token;
        let ch = `SELECT token, expire from tokens WHERE organization = 'storepay'`;
        db.query(ch, async (err, qt) => {
            if(err) {
                throw err;
            }
            if(qt.length > 0) {
                var expire = new Date(qt[0].expire);
                if(new Date() > expire) {
                    token = await GetSPAutherToken();
                } else {
                    token = qt[0].token;
                }
                let check = `SELECT user_id, total_amount, used_bonus, add_bonus, status from orders WHERE payment_id = '${id}'`;
                db.query(check, async (err, order) => {
                    if(err) {
                        throw err;
                    }
                    if(order.length > 0) {
                        if(order[0].status == 'pending') {
                            // нэхэмжлэх олдсон үед 
                            let check = await checkSPBill(id, token);
                            let isPaid = check.value;
                            let status = check.status;
                            if(isPaid ==true && status=="success") {
                                let up = `UPDATE users SET bonus = (bonus + ${order[0].add_bonus}) WHERE id = ${order[0].user_id}`;
                                db.query(up, async (err) => {
                                    if(err) {
                                        throw err;
                                    }
                                    let upOrder = `UPDATE orders SET status = 'paid' WHERE payment_id = '${id}'`;
                                    db.query(upOrder, async (err) => {
                                        if(err) {
                                            throw err;
                                        }
                                        res.json({
                                            result: 'success',
                                            message: 'Амжилттай'
                                        });
                                    });
                                });
                            } else {
                                res.json({
                                    result: 'failed',
                                    message: 'Төлөгдөөгүй нэхэмжлэх'
                                });
                            }
                        } else if(order[0].status == 'expired') {
                            res.json({ 
                                result: 'failed',
                                message: 'Цуцлагдсан нэхэмжлэх'
                            });
                        } else {
                            res.json({
                                result: 'failed',
                                message: 'Төлөгдсөн нэхэмжлэх'
                            });
                        }
                    } else {
                        res.json({
                            result: 'fail',
                            message: 'Нэхэмжлэх олдсонгүй'
                        });
                    }
                });
            }
        });
    }
exports.qpayWebhook = async (req, res) => {
        const invoiceId  = req.query.qpay_payment_id;
        if(invoiceId.substring(0,2) == 'FF') {        
            let responce = await requestToFF(invoiceId);
            return res.json({
                responce
            });
        } else if(invoiceId.substring(0,2) == 'PO') {        
            let responce = await requestToPO(invoiceId);
            return res.json({
                responce
            });
        } else {
            let token;
            let ch = `SELECT token, expire from tokens WHERE organization = 'qpay'`;
            db.query(ch, async (err, qt) => {
                if(err) {
                    throw err;
                }
                if(qt.length > 0) {
                    var expire = new Date(qt[0].expire);
                    if(new Date() > expire) {
                        token = await getToken();
                    } else {
                        token = qt[0].token;
                    }
                    let check = await checkQpayBill(invoiceId,token);
                    let checks = `SELECT user_id, total_amount,payment_id, used_bonus, add_bonus, status,ordernumber from orders WHERE payment_id = '${check.object_id}'`;
                    db.query(checks, async (err, order) => {
                        if(err) {
                            throw err;
                        }
                        if(order.length > 0) {
                            if(order[0].status == 'pending') {
                                // нэхэмжлэх олдсон үед 
                                    let isPaid =check.payment_status;
                                    let amount = check.payment_amount;
                                    if(isPaid == 'PAID') {
                                        if(amount == order[0].total_amount) {
                                            let up = `UPDATE users SET bonus = (bonus + ${order[0].add_bonus}) WHERE id = ${order[0].user_id}`;
                                            db.query(up, async (err) => {
                                                if(err) {
                                                    throw err;
                                                }
                                                let upOrder = `UPDATE orders SET status = 'paid' WHERE ordernumber = '${order[0].ordernumber}'`;
                                                db.query(upOrder, async (err) => {
                                                    if(err) {
                                                        throw err;
                                                    }
                                                      res.status(200).send('SUCCESS');
                                                });
                                            });
                                        } else {
                                            res.json({
                                                result: 'failed',
                                                message: 'Дутуу төлөлт'
                                            });
                                        }
                                    } else {
                                        res.json({
                                            result: 'failed',
                                            message: 'Төлөгдөөгүй нэхэмжлэх'
                                        });
                                    }
                            } else if(order[0].status == 'expired') {
                                res.json({
                                    result: 'failed',
                                    message: 'Цуцлагдсан нэхэмжлэх'
                                });
                            } else {
                                res.json({
                                    result: 'failed',
                                    message: 'Төлөгдсөн нэхэмжлэх'
                                });
                            }
                        } else {
                            res.json({
                                result: 'fail',
                                message: 'Нэхэмжлэх олдсонгүй'
                            });
                        }
                    });
                }
            });
        }
    }


exports.isPaidQpayBill = async (req, res) => {
    const { invoiceId } = req.body;
    let check = `SELECT id from orders WHERE ordernumber = '${invoiceId}' AND status = 'paid'`;
    db.query(check, async (err, result) => {
        if(err) {
            throw err;
        }
        if(result.length > 0) {
            res.json({
                result: 'success'
            });
        } else {
            res.json({
                result: 'fail'
            });
        }
    });
}

exports.mongolChatResult = async (req, res) => {
    const { type, data } = req.body;
    if(type == 'scanqr') {
        let qr = {qr: data.generated_qrcode};
        let str = axios.post('https://developer.mongolchat.com/v2/api/worker/onlineqr/status', qr, {
            headers: {
                    'Api-Key': 'O8v40PG9oewHKZjwMy7zFx/zX9afMkmDcglJvKgIoUM=', 
                    'Content-Type': 'application/json', 
                    'App-Secret': 'zDUZIQVG3Zi7IrJrgMLi3PPmhDR3kZc6FfQ1xBCKul4=', 
                    'Authorization': 'WorkerKey 2838905fef351734c35307524eac50b1e79eb5dc29c5cb370889335ce78c785b'
            }
        })
        .then((rs) => {
            // return res.data;
            if(rs.data.status == 'paid') {
                let check = `SELECT user_id, total_amount, used_bonus, add_bonus, status from orders WHERE QRCode = '${data.generated_qrcode}'`;
                db.query(check, async (err, order) => {
                    if(err) {
                        throw err;
                    }
                    if(order.length > 0) {
                        let up = `UPDATE users SET bonus = (bonus + ${order[0].add_bonus}) WHERE id = ${order[0].user_id}`;
                        db.query(up, async (err) => {
                            if(err) {
                                throw err;
                            }
                            let upOrder = `UPDATE orders SET status = 'paid' WHERE QRCode = '${data.generated_qrcode}'`;
                            db.query(upOrder, async (err) => {
                                if(err) {
                                    throw err;
                                }
                                res.json({
                                    result: 'success',
                                    message: 'Амжилттай'
                                });
                            });
                        });
                    } else {
                        res.json({
                            result: 'no data'
                        });
                    }
                });

            } else {
                res.json({
                    result: 'failed'
                });
            }
        }).catch((err) => {
            console.error(err);
        });
        // return await str;
    }
}

exports.mcreditResult = async (req, res) => {
    // const { invoiceId } = req.query;
    const id = req.query.invoice_id;
    let check = `SELECT user_id, total_amount, used_bonus, add_bonus, status from orders WHERE ordernumber = '${id}'`;
    db.query(check, async (err, order) => {
        if(err) {
            throw err;
        }
        if(order.length > 0) {
            if(order[0].status == 'pending') {
                // нэхэмжлэх олдсон үед 
                let check = await checkMcreditBill(id,mcreditAuth,mcreditUser);
                if(check.response.payment_status =="PAID") {
                    let up = `UPDATE users SET bonus = (bonus + ${order[0].add_bonus}) WHERE id = ${order[0].user_id}`;
                    db.query(up, async (err) => {
                        if(err) {
                            throw err;
                        }
                        let upOrder = `UPDATE orders SET status = 'paid' WHERE ordernumber = '${id}'`;
                        db.query(upOrder, async (err) => {
                            if(err) {
                                throw err;
                            }
                            res.json({
                                result: 'success',
                                message: 'Амжилттай'
                            });
                        });
                    });
                } else {
                    res.json({
                        result: 'failed',
                        message: 'Төлөгдөөгүй нэхэмжлэх'
                    });
                }
            } else if(order[0].status == 'expired') {
                res.json({ 
                    result: 'failed',
                    message: 'Цуцлагдсан нэхэмжлэх'
                });
            } else {
                res.json({
                    result: 'failed',
                    message: 'Төлөгдсөн нэхэмжлэх'
                });
            }
        } else {
            res.json({
                result: 'fail',
                message: 'Нэхэмжлэх олдсонгүй'
            });
        }
    });
    }
    exports.pocketResult = async (req, res) => {
        // const { invoiceId } = req.query;
        const {invoiceId,amount,invoiceState,orderNumber} = req.body;
        var token='';billCheck='';            
        let check = `SELECT user_id, total_amount,lend_fee,used_bonus, add_bonus, status from orders WHERE ordernumber = '${orderNumber}'`;
        db.query(check, async (err, order) => {
            if(err) {
                throw err;
            }
            if(order.length > 0) {
                if(order[0].status == 'pending') {
                    // нэхэмжлэх олдсон үед 
                    db.query(`SELECT token,expire FROM tokens WHERE organization='pocket'`,async(err,tok)=>{
                        if(err){
                            throw err;
                        }
                        var dt=new Date();
                        if(tok[0].expire>dt){
                            token=tok[0].token
                        }else{
                            token = await getPocketToken();
                        }
                        billCheck=await checkPocketBill(token,orderNumber); 
                        if(billCheck =="paid" && order[0].total_amount+order[0].lend_fee==billCheck.amount) {
                            let up = `UPDATE users SET bonus = (bonus + ${order[0].add_bonus}) WHERE id = ${order[0].user_id}`;
                            db.query(up, async (err) => {
                                if(err) {
                                    throw err;
                                }
                                let upOrder = `UPDATE orders SET status = 'paid' WHERE ordernumber = '${orderNumber}'`;
                                db.query(upOrder, async (err) => {
                                    if(err) {
                                        throw err;
                                    }
                                    res.json({
                                        result: 'success',
                                        message: 'Амжилттай'
                                    });
                                });
                            });
                        } else {
                            res.json({
                                result: 'failed',
                                message: 'Төлөгдөөгүй нэхэмжлэх'
                            });
                        }                     
                    })
                } else if(order[0].status == 'expired') {
                    res.json({ 
                        result: 'failed',
                        message: 'Цуцлагдсан нэхэмжлэх'
                    });
                } else {
                    res.json({
                        result: 'failed',
                        message: 'Төлөгдсөн нэхэмжлэх'
                    });
                }
            } else {
                res.json({
                    result: 'fail',
                    message: 'Нэхэмжлэх олдсонгүй'
                });
            }
        });
        }
exports.submitOrder = async (req, res) => {
    const {ordernumber,payment,lend} =  req.body;
    
    const usertoken = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(usertoken, 'HS256');
    var token;
    let c = `SELECT orders.ordernumber,users.id,users.email,orders.used_bonus,users.phone,orders.name,orders.total_amount,orders.comp_id from orders inner join users on orders.user_id = users.id WHERE orders.user_id = ${payload.id} AND  orders.ordernumber='${ordernumber}' AND orders.status='pending'`;

    db.query(c, async (err, info) => {
        if(err) {
            throw err;
        }
        if(info.length > 0) {
            if (payment == 'qpay') {
                let ch = `SELECT token, expire from tokens WHERE organization = 'qpay'`;
                db.query(ch, async (err, qt) => {
                    if(err) {
                        throw err;
                    }
                    if(qt.length > 0) {
                        var expire = new Date(qt[0].expire);
                        if(new Date() > expire) {
                            token = await getToken();
                        } else {
                            token = qt[0].token;
                        }
                        let bill = await createQPAYBill(info[0] ,info[0].total_amount, token);
                        let up = `UPDATE orders SET  payment = '${payment}', payment_id = '${bill.invoice_id}', QRCode = '${bill.qr_text}', enable_is = 1,lend_name='${lend.type}',lend_fee=${lend.fee} WHERE ordernumber = '${ordernumber}'`;
                        db.query(up, async err => {
                            if(err) {
                                throw err;
                            }
                                db.query(`UPDATE users SET bonus = (bonus - ${parseInt(info[0].used_bonus)}) WHERE id = ${payload.id}`, async err => {
                                    if(err) {
                                        throw err;
                                    }
                                    res.json({
                                        result: 'success',
                                        invoiceId:ordernumber,
                                        bill
                                    });
                                });
                        });
                    }
                });
            }else if(payment == 'mongolchat') {
                let productList = [];
                // console.log(cart.product);
                cart.product.forEach(el => {
                    let am = 0;
                    if(el.discount > 0) {
                        am = el.price - (el.price / 100 * el.discount);
                    } else {
                        am = el.price;
                    }
                    productList.push({product_name: el.name, quantity: el.qty, price: am, tag: ""});
                });
                
                if(coupon.amount > 0) {
                    let cp = `UPDATE coupon SET status = 0 WHERE promo_code = '${coupon.code}'`;
                    let s = `SELECT id from coupon WHERE promo_code = '${coupon.code}'`;
                    db.query(cp, async err => {
                        if(err) {
                            throw err;
                        }
                        db.query(s, async (err, rs) => {
                            if(err) {
                                throw err;
                            }
                            let up;
                            let bill = await createMongolChatQr(productList, amount, info[0]);
                            if(rs.length > 0) {
                                up = `UPDATE orders SET total_amount = ${amount}, bonus = ${parseInt(info[0].bonus)}, discount = ${parseInt(cart.sale)}, add_bonus = ${parseInt(cart.bonus)}, used_bonus = ${parseInt(cart.useBonus)}, coupon = '${rs[0].id}', payment = '${payment}', payment_id = '${info[0].ordernumber}', QRCode = '${bill.qr}', enable_is = 1 WHERE ordernumber = '${info[0].ordernumber}'`;
                            } else {
                                up = `UPDATE orders SET total_amount = ${amount}, bonus = ${parseInt(info[0].bonus)}, discount = ${parseInt(cart.sale)}, add_bonus = ${parseInt(cart.bonus)}, used_bonus = ${parseInt(cart.useBonus)}, payment = '${payment}', payment_id = '${info[0].ordernumber}', QRCode = '${bill.qr}', enable_is = 1 WHERE ordernumber = '${info[0].ordernumber}'`;
                            }
                            // let up = `UPDATE orders SET total_amount = ${amount}, bonus = ${parseInt(info[0].bonus)}, discount = ${parseInt(cart.sale)}, add_bonus = ${parseInt(cart.bonus)}, used_bonus = ${parseInt(cart.useBonus)}, coupon = '${coupon.code}', payment = '${payment}', payment_id = '${bill.payment_id}', QRCode = '${bill.qPay_QRcode}', enable_is = 1 WHERE ordernumber = '${info[0].ordernumber}'`;
                            db.query(up, async err => {
                                if(err) {
                                    throw err;
                                }
                                    db.query(`UPDATE users SET bonus = (bonus - ${parseInt(cart.useBonus)}) WHERE id = ${payload.id}`, async err => {
                                        if(err) {
                                            throw err;
                                        }
                                        cart.product.forEach(el=>{
                                            var upPCount=`UPDATE product SET remain=remain-${el.qty} WHERE id=${el.id}`
                                            db.query(upPCount, async err=>{
                                                if(err){
                                                    throw err
                                                }
                                            })
                                        })
                                        var insert = '';
                                        cart.product.forEach(element => {
                                            if(insert == '') {
                                                insert += `('','${element.id}',${element.qty},${element.price},'${info[0].ordernumber}')`;
                                            } else {
                                                insert += `, ('','${element.id}',${element.qty},${element.price},'${info[0].ordernumber}')`;
                                            }
                                        });
                                        insert = `INSERT INTO order_product VALUES ` + insert;
                                        db.query(insert , async err => {
                                            if(err) {
                                                throw err;
                                            }
                                            res.json({
                                                result: 'success',
                                                invoiceId: info[0].ordernumber,
                                                bill
                                            });
                                        })
                                    });
                            });
                        });
                    })     
                } else {
                    let bill = await createMongolChatQr(productList, amount, info[0]);
                    let up = `UPDATE orders SET total_amount = ${amount}, bonus = ${parseInt(info[0].bonus)}, discount = ${parseInt(cart.sale)}, add_bonus = ${parseInt(cart.bonus)}, used_bonus = ${parseInt(cart.useBonus)}, payment = '${payment}', payment_id = '${info[0].ordernumber}', QRCode = '${bill.qr}', enable_is = 1 WHERE ordernumber = '${info[0].ordernumber}'`;
                                    db.query(up, async err => {
                                        if(err) {
                                            throw err;
                                        }
                                            db.query(`UPDATE users SET bonus = (bonus - ${parseInt(cart.useBonus)}) WHERE id = ${payload.id}`, async err => {
                                                if(err) {
                                                    throw err;
                                                }
                                                cart.product.forEach(el=>{
                                                    var upPCount=`UPDATE product SET remain=remain-${el.qty} WHERE id=${el.id}`
                                                    db.query(upPCount, async err=>{
                                                        if(err){
                                                            throw err
                                                        }
                                                    })
                                                })
                                                var insert = '';
                                                cart.product.forEach(element => {
                                                    if(insert == '') {
                                                        insert += `('','${element.id}',${element.qty},${element.price},'${info[0].ordernumber}')`;
                                                    } else {
                                                        insert += `, ('','${element.id}',${element.qty},${element.price},'${info[0].ordernumber}')`;
                                                    }
                                                });
                                                
                                                insert = `INSERT INTO order_product VALUES ` + insert;
                                                db.query(insert , async err => {
                                                    if(err) {
                                                        throw err;
                                                    }
                                                    res.json({
                                                        result: 'success',
                                                        invoiceId: info[0].ordernumber,
                                                        bill
                                                    });
                                                })
                                            });
                                    });
                }
            } else if(payment=="storepay"){
                let ch = `SELECT token, expire from tokens WHERE organization = 'storepay'`;
                db.query(ch, async (err, qt) => {
                    if(err) {
                        throw err;
                    }
                    if(qt.length > 0) {
                        var expire = new Date(qt[0].expire);
                        var turh=new Date();
                        if(new Date() > expire) {
                            token = await GetSPAutherToken();
                        } else {
                            token = qt[0].token;
                        }
                        let bill = await createSTOREPAYBill(info[0] ,info[0].total_amount+lend.fee, token);
                        if(bill.status=="Failed"){
                                   if(bill.msgList[0].code=="v001")
                                   {
                                    res.json({
                                        result: 'failed',
                                        data:bill.msgList[0].text
                                    });
                                   }
                                   else{
                                    res.json({
                                        result: 'failed',
                                        data:bill.msgList[0].code
                                    });
                                   }
                        }else{
                                    let up = `UPDATE orders SET  payment = '${payment}', payment_id = '${bill.value}', QRCode ="null", enable_is = 1,lend_name='${lend.type}',lend_fee=${lend.fee} WHERE ordernumber = '${info[0].ordernumber}'`;
                                db.query(up, async err => {
                                    if(err) {
                                        throw err;
                                    }
                                        db.query(`UPDATE users SET bonus = (bonus - ${parseInt(info[0].used_bonus)}) WHERE id = ${payload.id}`, async err => {
                                            if(err) {
                                                throw err;
                                            }
                                            res.json({
                                                result: 'success',
                                                invoiceId: info[0].ordernumber,
                                                bill
                                            });
                                        });
                                });
                        };
                    }
                });
            }else if(payment=="mcredit"){
                let bill = await createMcreditBill(info[0] ,info[0].total_amount+lend.fee,mcreditAuth,mcreditUser);
                // console.log(bill.responce.qr_string);
                if(!bill.success){
                    res.json({
                        result: 'failed',
                        data:bill.response.ErrorMessage
                    })
                 }else{
                        let up = `UPDATE orders SET payment = '${payment}', payment_id = '${bill.response.invoiceNumber}', QRCode ="${bill.response.qr_string}", enable_is = 1,lend_name='${lend.type}',lend_fee=${lend.fee} WHERE ordernumber = '${info[0].ordernumber}'`;
                        db.query(up, async err => {
                            if(err) {
                                throw err;
                            }
                                db.query(`UPDATE users SET bonus = (bonus - ${parseInt(parseInt(info[0].used_bonus))}) WHERE id = ${payload.id}`, async err => {
                                    if(err) {
                                        throw err;
                                    }
                                    res.json({
                                        result: 'success',
                                        invoiceId: info[0].ordernumber,
                                        bill
                                    });
                                });
                        });
                 };
            }else if(payment=="mobile"){
                let up = `UPDATE orders SET  payment = '${payment}',enable_is = 1,lend_name='${lend.type}',lend_fee=${lend.fee} WHERE ordernumber = '${ordernumber}'`;
                db.query(up, async err => {
                    if(err) {
                        throw err;
                    }
                        db.query(`UPDATE users SET bonus = (bonus - ${parseInt(info[0].used_bonus)}) WHERE id = ${payload.id}`, async err => {
                            if(err) {
                                throw err;
                            }
                            res.json({
                                result: 'success',
                                invoiceId:ordernumber
                            });
                        });
                });
            }else if(payment=='KhanLending'){
                let up = `UPDATE orders SET  payment = '${payment}',enable_is = 1,lend_name='${lend.type}',lend_fee=${lend.fee} WHERE ordernumber = '${ordernumber}'`;
                db.query(up, async err => {
                    if(err) {
                        throw err;
                    }
                        db.query(`UPDATE users SET bonus = (bonus - ${parseInt(info[0].used_bonus)}) WHERE id = ${payload.id}`, async err => {
                            if(err) {
                                throw err;
                            }
                            res.json({
                                result: 'success',
                                invoiceId:ordernumber
                            });
                        });
                });
            }else if(payment=='pocket'){
                  let ch = `SELECT token, expire from tokens WHERE organization = 'pocket'`;
                  db.query(ch, async (err, qt) => {
                      if(err) {
                          throw err;
                      }
                      if(qt.length > 0) {
                          var expire = new Date(qt[0].expire);
                          if(new Date() > expire) {
                              token = await getPocketToken();
                          } else {
                              token = qt[0].token;
                          }
                          let bill = await createPocketBill(info[0] ,info[0].total_amount+lend.fee, token);
                          console.log(bill);
                          if("status" in bill){
                                    res.json({
                                              result: 'failed',
                                              data:bill.message
                                            });
                          }else{
                                      let up = `UPDATE orders SET  payment = '${payment}', payment_id = '${bill.id}', QRCode ='${bill.qr}', enable_is = 1,lend_name='${lend.type}',lend_fee=${lend.fee} WHERE ordernumber = '${info[0].ordernumber}'`;
                                  db.query(up, async err => {
                                      if(err) {
                                          throw err;
                                      }
                                          db.query(`UPDATE users SET bonus = (bonus - ${parseInt(info[0].used_bonus)}) WHERE id = ${payload.id}`, async err => {
                                              if(err) {
                                                  throw err;
                                              }
                                              res.json({
                                                  result: 'success',
                                                  invoiceId: info[0].ordernumber,
                                                  bill
                                              });
                                          });
                                  });
                          };
                      }
                  });
            } else{res.json({
                result: 'failed',
                data: 'Уучлаарай хөгжүүлэлт хийгдэж байна'
            });

            }
        } else {
            res.json({
                result: 'failed',
                data: 'Захиалга олдсонгүй'
            });
        }
        
    });
}

async function createMongolChatQr(products, amount, info ) {
    const data = {
        amount,
        // amount: "500",
        branch_id: mChatBranch, 
        products,
        title: "Itlab.mn",
        sub_title: "Онлайн худалдааны сайт",
        bill_id: info.ordernumber,
        noat: amount - (amount / 1.1),
        // noat: "200",
        nhat: "0",
        ttd: "5489288",
        dynamic_link: false, 
        dynamic_link_callback: "nope",
        tag: "",
        reference_number: info.ordernumber,
        expire_time: "4400"
    }

    let str = axios.post('https://developer.mongolchat.com/v2/api/worker/onlineqr/generate', data, {
            headers: {
                    'Api-Key': 'O8v40PG9oewHKZjwMy7zFx/zX9afMkmDcglJvKgIoUM=', 
                    'Content-Type': 'application/json', 
                    'App-Secret': 'zDUZIQVG3Zi7IrJrgMLi3PPmhDR3kZc6FfQ1xBCKul4=', 
                    'Authorization': 'WorkerKey 2838905fef351734c35307524eac50b1e79eb5dc29c5cb370889335ce78c785b'
            }
        })
        .then((res) => {
            return res.data;
            // console.log(res.data);
        }).catch((err) => {
            console.error(err);
        });
        return await str;
}

async function createQPAYBill(info, amount, token) {
    
    const datetime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    // const data = {
    //     template_id: qpayTemplateId,
    //     merchant_id: qpayMerchantId,
    //     branch_id: "1",
    //     pos_id: "1",
    //     receiver: {
    //         id: String(info.id),
    //         register_no: String(info.comp_id),
    //         name: info.name,
    //         email: info.email,
    //         phone_number: info.phone,
    //         note: info.name
    //     },
    //     bill_no: info.ordernumber,
    //     date: datetime,
    //     description: 'ikeaLAB.mn сайтын нэхэмжлэх',
    //     amount: amount,
    //     btuk_code: "",
    //     vat_flag: "0"
    // }

  const data={
    invoice_code: "LKEA_INVOICE",
    sender_invoice_no: info.ordernumber,
    invoice_receiver_code: String(info.id),
    invoice_description: "ikeaLAB.mn сайтын нэхэмжлэх",
    allow_exceed: false,
    amount: amount,
    callback_url:'https://api.ikealab.mn/api/purchase/qpay-result',
    invoice_receiver_data: {
        register: String(info.comp_id),
        name: info.name,
        email:info.email,
        phone:info.phone
    }
}

    let str = axios.post('https://merchant.qpay.mn/v2/invoice', data, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then((res) => {
            return res.data;
        }).catch((err) => {
            console.error(err);
        });
    return await str;
}
async function createSTOREPAYBill(info, amount, token) {
    const data = {
           
            storeId:SPID,
            mobileNumber:info.phone,
            Description:"ikeaLAB.mn",
            amount:amount,
            callbackUrl:"https://api.ikealab.mn/api/purchase/storepay-result"
            
    }

    let str = axios.post('http://service-merchant.storepay.mn:7005/merchant/loan', data, {
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}`,
            }
        })
        .then((res) => {
           return res.data
        }).catch((err) => {
            console.log(err);
        });
    return await str;
}
async function createMcreditBill(info,amount,token,user){
     const data={
        amount: amount,
        invoice_id: info.ordernumber,
        callback_url: `https://api.itlab.mn/api/purchase/mcredit-result`,
        description: "ikeaLAB.mn сайтын нэхэмжлэх",
        phoneNumber: info.phone
     }
     let str=axios.post('https://app.mcredit.mn/api/mshop/invoices',data,{
        headers:{
            "x-and-auth-token":token,
            "x-and-auth-user":user
        }
     }).then((res)=>{
        return res.data;
     }).catch((err)=>{
        console.log(err);
     })
     return await str;
}
async function createPocketBill(info,amount,token) {
   const data={
        terminalId: 72632179357118, 
        amount: amount,
        info: info.ordernumber, 
        orderNumber: info.ordernumber, 
        invoiceType: "ZERO",
    };
    let headers={
        "Content-Type": "application/json",
         authorization:`Bearer ${token}`
    }
    let str=axios.post('https://service.invescore.mn/merchant/v2/invoicing/generate-invoice',data,{headers}).then((res)=>{
        return res.data;
    }).catch((err)=>{
        return err.response.data;
    })
    return await str
}
async function getToken() {
    const headers = {
         authorization:'Basic TEtFQTp5OVg2OTd3Nw=='
    };

    let str = axios.post('https://merchant.qpay.mn/v2/auth/token',null,{headers})
        .then((res) => {
            var millsec=res.data.expires_in*1000;
            var dt = new Date(millsec).toISOString().replace(/T/, ' ').replace(/\..+/, '');            
            let up = `UPDATE tokens SET token = '${res.data.access_token}', expire = '${dt}' WHERE organization = 'qpay'`;
            db.query(up, async err=> {
                if(err) {
                    throw err;
                }
            });
            return res.data.access_token;
        }).catch((err) => {
            console.error(err);
        });
    return await str;
}

async function getPocketToken() {
    const headers={
         "Content-Type":"application/x-www-form-urlencoded"
    };
    const data = new URLSearchParams({
        client_id: 'merchant-ikealab-mn',
        client_secret: '545d15de-2691-4e4b-8045-ab08918955e6',
        grant_type: 'client_credentials'
    });
    let str = axios.post('https://sso.invescore.mn/auth/realms/invescore/protocol/openid-connect/token',data,{headers})
        .then((res) => {
            Date.prototype.addDays = function(days) {
                var date = new Date(this.valueOf());
                date.setDate(date.getDate() + days);
                return date;
            }
            var dt = new Date().addDays(res.data.expires_in/3600/24).toISOString().replace(/T/, ' ').replace(/\..+/, '');            
            let up = `UPDATE tokens SET token = '${res.data.access_token}', expire = '${dt}' WHERE organization = 'pocket'`;
            db.query(up, async err=> {
                if(err) {
                    throw err;
                }
            });
            return res.data.access_token;
        }).catch((err) => {
            console.error(err);
        });
    return await str;
}

async function checkPocketBill(token,ordernumber) {
    const headers={
        "Content-Type":"application/json",
        authorization:`Bearer ${token}`
    };
    const data={
        terminalId:72632179357118,
        orderNumber:ordernumber
    }
    let str=axios.post('https://service.invescore.mn/merchant/v2/invoicing/invoices/order-number',data,{headers}).then(
        (res)=>{
            return res.data
        }
    )
    return str;
}