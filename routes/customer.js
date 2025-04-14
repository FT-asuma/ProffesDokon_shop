const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const router = express.Router();

const dbPath = path.join(__dirname, "../database.json");
const readDB = async () => JSON.parse(await fs.readFile(dbPath, "utf8"));
const writeDB = async (data) =>
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));

router.get("/", async (req, res) => {
  try {
    const db = await readDB();
    const categories = ["Electronics", "Clothing", "Books"]; // Hardcode or load from DB
    const validProducts = db.products.filter(
      (p) =>
        p.id &&
        p.name &&
        p.price != null &&
        typeof p.price === "number" &&
        p.availableStock >= 0
    );
    res.render("index", {
      title: "Catalog",
      products: validProducts,
      categories,
      user: req.session.user || null,
      theme: req.session.theme || "light",
    });
  } catch (err) {
    console.error("Index error:", err);
    res.status(500).render("error", {
      title: "Error",
      message: "Server error",
      user: req.session.user || null,
      theme: req.session.theme || "light",
    });
  }
});

router.get("/product/:id", async (req, res) => {
  try {
    const db = await readDB();
    const product = db.products.find((p) => p.id == req.params.id);
    if (product) {
      const related = db.products
        .filter((p) => p.category === product.category && p.id != product.id)
        .slice(0, 4);
      const reviews = db.reviews.filter((r) => r.productId == product.id);
      res.render("product", {
        title: product.name,
        product,
        related,
        reviews,
        user: req.session.user || null, // Passing user correctly
        theme: req.session.theme || "light",
        lang: req.session.lang || "en",
      });
    } else {
      res.status(404).render("error", {
        title: res.__("error"),
        message: "Product not found",
        user: req.session.user || null,
        theme: req.session.theme || "light",
        lang: req.session.lang || "en",
      });
    }
  } catch (err) {
    console.error("Product error:", err);
    res.status(500).render("error", {
      title: res.__("error"),
      message: "Server error",
      user: req.session.user || null,
      theme: req.session.theme || "light",
      lang: req.session.lang || "en",
    });
  }
});

router.get("/cart", async (req, res) => {
  try {
    const db = await readDB();
    const cart = req.session.cart || [];
    const cartItems = cart
      .map((item) => {
        const product = db.products.find((p) => p.id == item.productId);
        return { ...item, product };
      })
      .filter((item) => item.product);
    res.render("cart", {
      title: res.__("title_cart"),
      cartItems,
      user: req.session.user || null,
      theme: req.session.theme || "light",
      lang: req.session.lang || "en",
    });
  } catch (err) {
    console.error("Cart error:", err);
    res.status(500).render("error", {
      title: res.__("error"),
      message: "Server error",
      user: req.session.user || null,
      theme: req.session.theme || "light",
      lang: req.session.lang || "en",
    });
  }
});

router.post("/cart/add", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const db = await readDB();
    const product = db.products.find((p) => p.id == productId);
    if (!product || product.availableStock < quantity) {
      return res
        .status(400)
        .json({ error: "Product unavailable or insufficient stock" });
    }
    req.session.cart = req.session.cart || [];
    const itemIndex = req.session.cart.findIndex(
      (item) => item.productId == productId
    );
    if (itemIndex !== -1) {
      req.session.cart[itemIndex].quantity += parseInt(quantity);
    } else {
      req.session.cart.push({
        productId: parseInt(productId),
        quantity: parseInt(quantity),
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/cart/update", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const db = await readDB();
    const product = db.products.find((p) => p.id == productId);
    if (!product || product.availableStock < quantity) {
      return res.status(400).json({ error: "Invalid quantity" });
    }
    req.session.cart = req.session.cart || [];
    const itemIndex = req.session.cart.findIndex(
      (item) => item.productId == productId
    );
    if (itemIndex !== -1) {
      if (quantity > 0) {
        req.session.cart[itemIndex].quantity = parseInt(quantity);
      } else {
        req.session.cart.splice(itemIndex, 1);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Update cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/cart/remove", async (req, res) => {
  try {
    const { productId } = req.body;
    req.session.cart = req.session.cart || [];
    req.session.cart = req.session.cart.filter(
      (item) => item.productId != productId
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/review", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const { productId, rating, comment } = req.body;
    const db = await readDB();
    db.reviews.push({
      id: db.reviews.length + 1,
      productId: parseInt(productId),
      userId: req.session.user.id,
      rating: parseInt(rating),
      comment,
      date: new Date().toISOString(),
    });
    // Update product rating
    const productReviews = db.reviews.filter((r) => r.productId == productId);
    const avgRating =
      productReviews.reduce((sum, r) => sum + r.rating, 0) /
      productReviews.length;
    const productIndex = db.products.findIndex((p) => p.id == productId);
    if (productIndex !== -1) {
      db.products[productIndex].rating = avgRating;
    }
    await writeDB(db);
    res.redirect(`/product/${productId}`);
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).render("error", {
      title: res.__("error"),
      message: "Server error",
      user: req.session.user || null,
      theme: req.session.theme || "light",
      lang: req.session.lang || "en",
    });
  }
});

router.post("/logout", (req, res) => {
  req.session.user = null;
  req.session.cart = [];
  res.redirect("/login");
});

module.exports = router;
