const { promisify } = require('util');
const { db } = require("../db");
// const queryAsync = ;

module.exports = {
}

module.exports = {
    queryAsync:promisify(db.query).bind(db),

    getBrands: `
        SELECT images, brandname 
        FROM brands 
        WHERE Visible=1 
        ORDER BY RAND() 
        LIMIT 10
    `,
    
    getCategories: `
        SELECT category_code, category_name 
        FROM category 
        WHERE NOT Visible!=1
    `,
    
    getSubCategories: `
        SELECT categoryID, id, sub_category_name, image, specs 
        FROM category_sub 
        ORDER BY sub_category_name ASC
    `,
    
    getEvents: `
        SELECT id, event_name, image 
        FROM events
    `,
    
    getFeaturedProducts: (dt) => `
        SELECT code, name, image, price_tug, discount, id, 
        bonus_percent, formated_id, Top_seller, New_lower_price, New,
        Last_chance, IKEA_family_price, sale, special_price, Regular_price_tug, yuan_price 
        FROM product 
        WHERE (validToDate > '${dt}' OR validToDate IS NULL) AND featured=0 
        ORDER BY RAND() DESC LIMIT 3
    `,
    
    getDiscountProducts: (dt) => `
        SELECT code, name, image, price_tug, discount, id, discount_end_time, 
        bonus_percent, formated_id, Top_seller, New_lower_price, New, Last_chance, 
        IKEA_family_price, sale, special_price, Regular_price_tug, yuan_price 
        FROM product 
        WHERE validToDate > '${dt}' 
        ORDER BY RAND() DESC LIMIT 3
    `,
    
    getTopRatedProducts: (dt) => `
        SELECT p.id, p.code, p.name, p.price_tug, p.image, p.total_rate, p.discount, 
        p.bonus_percent, p.formated_id, p.Top_seller, p.New_lower_price, p.New, 
        p.Last_chance, p.IKEA_family_price, p.sale, p.special_price, p.Regular_price_tug, p.yuan_price 
        FROM product as p 
        INNER JOIN featured as f ON p.code = f.product_id 
        WHERE (p.validToDate >= '${dt}' OR p.validToDate IS NULL) 
        ORDER BY RAND() DESC LIMIT 3
    `,
    
    getRandomCategories: `
        SELECT id, sub_category_name, image 
        FROM category_sub 
        ORDER BY RAND() 
        LIMIT 7
    `,
    
    getLastChanceProducts: (dt) => `
        SELECT p.code, p.name, p.color_name, sub.sub_category_name, p.image, p.price_tug, 
        p.discount, p.id, p.discount_end_time, p.bonus_percent, p.Last_chance, p.Top_seller, 
        p.IKEA_family_price, p.New, p.New_lower_price, p.sale, p.Regular_price_tug, 
        p.Price_unit, p.yuan_price, p.product_type 
        FROM product as p 
        INNER JOIN product_categories as pc ON p.code = pc.product_id 
        INNER JOIN category_sub as sub ON pc.category_id = sub.id 
        WHERE Last_chance > 0 AND (p.validToDate IS NULL OR p.validToDate > '${dt}') 
        ORDER BY RAND() LIMIT 50
    `,
    
    getHomeBanner: `
        SELECT h.id, h.product_id, title_1, title_2, title_3, h.image, p.price_tug, p.discount, p.code 
        FROM home_banner as h 
        INNER JOIN product as p ON h.product_id = p.id 
        GROUP BY p.code
    `,
    
    getQuickCategories: `
        SELECT s.id, s.sub_category_name, q.image 
        FROM category_sub as s 
        INNER JOIN quick_category as q ON s.id = q.sub_id 
        GROUP BY q.sub_id 
        ORDER BY RAND() 
        LIMIT 4
    `,
    
    getSpecialProducts: `
        SELECT p.id, s.image, p.price_tug, p.bonus_percent, p.name, p.code, p.color_name, 
        p.Last_chance, p.Top_seller, p.IKEA_family_price, p.New, p.New_lower_price, p.sale, 
        p.Regular_price_tug, p.Price_unit, p.yuan_price, p.product_type 
        FROM product as p 
        INNER JOIN special_product as s ON p.code = s.product_model 
        WHERE s.id = 1
    `,
    
    getRandomProducts: (categoryIds) => {
        console.log(categoryIds)

        if(!categoryIds || categoryIds.length === 0) return `
            SELECT p.code, p.name, p.color_name, p.image, p.price_tug, 
            p.discount, p.id, p.bonus_percent, p.Last_chance, p.Top_seller, p.IKEA_family_price, 
            p.New, p.New_lower_price, p.sale, p.special_price, p.Regular_price_tug, p.Price_unit, 
            p.yuan_price, p.product_type, i.big_image1, i.big_image2, i.big_image3, i.big_image4 
            FROM product as p 
            INNER JOIN images as i ON p.code = i.product_id 
            ORDER BY RAND()
        `

        return `
        SELECT p.code, sub.id, p.name, p.color_name, p.image, p.price_tug, 
        p.discount, p.id, p.bonus_percent, p.Last_chance, p.Top_seller, p.IKEA_family_price, 
        p.New, p.New_lower_price, p.sale, p.special_price, p.Regular_price_tug, p.Price_unit, 
        p.yuan_price, p.product_type, i.big_image1, i.big_image2, i.big_image3, i.big_image4 
        FROM product as p 
        INNER JOIN images as i ON p.code = i.product_id 
        INNER JOIN product_categories as pc ON p.code = pc.product_id 
        INNER JOIN product_categories as sub ON pc.category_id = sub.id 
        WHERE sub.category_id IN (${categoryIds.map(e => `'${e}'`).join(',')}) 
        ORDER BY RAND()
    `
    },
    
    getBanners: `
        SELECT id, title, description, image, subId 
        FROM banners
    `,
    
    getProductModelById: (id) => {
        return `SELECT * FROM product WHERE id='${id}'`;
    },
    
    getProductIdByModel: (model) => {
        return `SELECT id FROM product WHERE model='${model}' AND id!=1 LIMIT 1`;
    },
    
    getSingleProductQuery: (id) => {
        return `SELECT p.name, sub.sub_category_name, c.category_name, p.price_tug, p.id, p.model, p.discount, p.type, p.category_sub_id, p.remain, p.total_rate, p.color_name, b.brandname, b.images, p.image, sub.specs, p.bonus_percent, p.product_type 
                FROM brands AS b 
                INNER JOIN product AS p ON b.id = p.brand 
                INNER JOIN category_sub AS sub ON p.category_sub_id = sub.id 
                INNER JOIN category AS c ON sub.categoryID = c.id 
                WHERE p.id = ${id}`;
    },
    
    // Define other queries similarly...
    
}; 