const moment = require("moment");

exports.search = async (req, res) => {
  const { search, page, brand, color, price, sub, specs } = req.body;
  const first = (page - 1) * 30;
  const last = page * 30;
  const dt = moment().format("YYYY-MM-DD HH:mm:ss");

  const buildAmountCondition = () => {
    if (price[1] > 0) {
      return `p.price_tug > ${price[0]} AND p.price_tug <= ${price[1]} AND `;
    }
    return `p.price_tug > ${price[0]} AND `;
  };

  const buildFilterCondition = (filterName, filterValues) => {
    if (!filterValues || filterValues.length === 0) return "";
    return `${filterName} IN (${filterValues
      .map((value) => `'${value}'`)
      .join(", ")}) AND `;
  };

  const buildSearchQuery = () => {
    return `(p.name LIKE '%${search}%' OR p.model LIKE '%${search}%' OR p.product_type LIKE '%${search}%' OR p.formated_id LIKE '%${search}%') AND `;
  };

  const buildSpecFilter = async () => {
    if (!specs) return "";
    const spQuery = `SELECT product_id FROM specs WHERE ${specs}`;
    const specIds = await db.query(spQuery);
    return specIds.length > 0
      ? ` AND p.id IN (${specIds.map((id) => id.product_id).join(", ")})`
      : " AND p.id IN (0)";
  };

  // Build base query
  let query = `SELECT p.id, p.name, p.category_sub_id, sub.sub_category_name, p.model, b.brandname, p.image, 
                    p.discount, p.total_rate, p.bonus_percent, p.product_type, p.price_tug, p.formated_id, p.Top_seller,
                    p.New_lower_price, p.New, p.IKEA_family_price, p.Last_chance, p.yuan_price, p.regular_price, p.special_price 
                 FROM brands AS b 
                 INNER JOIN product AS p ON b.id = p.brand 
                 INNER JOIN category_sub AS sub ON sub.id = p.category_sub_id 
                 WHERE ${buildAmountCondition()} 
                 ${buildFilterCondition("p.brand", brand)}
                 ${buildFilterCondition("p.color_name", color)}
                 ${buildSearchQuery()}
                 (p.validToDate > '${dt}' OR p.validToDate IS NULL)`;

  // Add specifications filter if available
  query += await buildSpecFilter();

  if (sub.length > 0) {
    query += `AND p.category_sub_id IN ('${sub.join("', '")}') `;
  }

  query += "GROUP BY p.model";

  // Query for products
  try {
    const [products] = await db.query(query);
    if (products.length > 0) {
      products.forEach((product) => {
        if (product.special_price > 0) {
          product.regular_price = roundUpToHundred(
            Number(
              product.regular_price * product.yuan_price +
                ((product.regular_price * product.yuan_price) / 100) * 22.5
            )
          );
        }
      });

      // Fetch related data for pagination and filters
      const brandQuery = `SELECT brands.id, brands.brandname, COUNT(*) AS total 
                                FROM product AS p 
                                INNER JOIN brands ON p.brand = brands.id 
                                WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%') 
                                GROUP BY brands.id 
                                ORDER BY brands.brandname`;

      const [brands] = await db.query(brandQuery);

      const maxPriceQuery = `SELECT MAX(price_tug) AS max 
                                   FROM product AS p 
                                   WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%')`;
      const [maxPrice] = await db.query(maxPriceQuery);

      const pagination = Math.ceil(products.length / 30);

      const subCategoryQuery = `SELECT c.sub_category_name, c.id, COUNT(*) AS total 
                                      FROM category_sub AS c 
                                      INNER JOIN product AS p ON c.id = p.category_sub_id 
                                      WHERE (p.name LIKE '%${search}%' OR p.model LIKE '%${search}%') 
                                      GROUP BY c.id 
                                      ORDER BY c.sub_category_name`;

      const [subCategories] = await db.query(subCategoryQuery);

      // Return the final response
      res.json({
        result: "success",
        max: maxPrice[0].max,
        color: color,
        spcs: [], // Can be populated based on specific logic
        specs: [],
        brand: brands,
        sub: subCategories,
        product: products.slice(first, last),
        pagination,
      });
    } else {
      res.json({ result: "failed" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
