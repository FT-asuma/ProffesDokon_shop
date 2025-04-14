const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const router = express.Router();

const dbPath = path.join(__dirname, "../database.json");
const readDB = async () => JSON.parse(await fs.readFile(dbPath, "utf8"));
const writeDB = async (data) =>
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));

const IMGBB_API_KEY =
  process.env.IMGBB_API_KEY || "b5b7a58d6a3224b37b2ce4a2226b7780";

const isAuthenticated = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.redirect("/admin/login");
  }
  next();
};
router.use((req, res, next) => {
    if (req.path === "/login") {
      return next(); // Skip authentication for /admin/login
    }
    isAuthenticated(req, res, next);
  });
  
  router.get("/login", (req, res) => {
    res.render("admin/login", {
      title: res.__("title_admin_login"),
      user: req.session.user || null,
      theme: req.session.theme || "light",
      lang: req.session.lang || "en",
      error: null,
    });
  });
  
  router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const db = await readDB();
      const user = db.users.find(
        (u) => u.username === username && u.password === password
      );
      if (user) {
        req.session.user = {
          id: user.id,
          username: user.username,
          role: user.role,
        };
        res.redirect("/admin/dashboard");
      } else {
        res.render("admin/login", {
          title: res.__("title_admin_login"),
          user: null,
          theme: req.session.theme || "light",
          lang: req.session.lang || "en",
          error: res.__("invalid_credentials"),
        });
      }
    } catch (err) {
      console.error("Admin login error:", err);
      res.status(500).render("error", {
        title: res.__("error"),
        message: "Server error",
        user: null,
        theme: req.session.theme || "light",
        lang: req.session.lang || "en",
      });
    }
  });

router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const db = await readDB();
    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      products: db.products || [],
      users: db.users || [],
      user: req.session.user,
      theme: req.session.theme || "light",
    });
  } catch (err) {
    res.status(500).render("error", {
      title: "Error",
      message: "Server error",
      user: req.session.user,
      theme: req.session.theme || "light",
    });
  }
});

router.get("/create", isAuthenticated, async (req, res) => {
  try {
    const categories = ["Electronics", "Clothing", "Books"];
    res.render("admin/create", {
      title: "Create Product",
      product: {},
      categories,
      user: req.session.user,
      theme: req.session.theme || "light",
      error: null,
    });
  } catch (err) {
    res.status(500).render("error", {
      title: "Error",
      message: "Server error",
      user: req.session.user,
      theme: req.session.theme || "light",
    });
  }
});

router.post("/create", isAuthenticated, async (req, res) => {
  try {
    const db = await readDB();
    const {
      name,
      price,
      currency,
      availableStock,
      description,
      category,
      discountPrice,
      discountDays,
      sellerName,
      sellerPhone,
      sellerTelegram,
      sellerContactUrl,
      kilowatts,
      madeIn,
      detailName = [],
      detailValue = [],
      thumbnailUrl,
      imageUrls = [],
    } = req.body;

    const details = {};
    for (let i = 0; i < detailName.length; i++) {
      if (detailName[i] && detailValue[i]) {
        details[detailName[i]] = detailValue[i];
      }
    }

    let discount = null;
    if (discountPrice && discountDays) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(discountDays));
      discount = {
        price: parseFloat(discountPrice),
        endDate: endDate.toISOString(),
      };
    }

    const newImages = Array.isArray(imageUrls)
      ? imageUrls
      : imageUrls.split(",").filter(Boolean);
    const productId = db.products.length
      ? Math.max(...db.products.map((p) => p.id)) + 1
      : 1;

    const newProduct = {
      id: productId,
      name: name || "Unnamed Product",
      price: parseFloat(price) || 0,
      currency: currency || "USD",
      availableStock: parseInt(availableStock) || 0,
      description: description || "",
      category: category || "Uncategorized",
      image: thumbnailUrl || newImages[0] || "https://via.placeholder.com/150",
      images: newImages,
      discount,
      seller: {
        name: sellerName || "",
        phone: sellerPhone || "",
        telegram: sellerTelegram || "",
        contactUrl: sellerContactUrl || "",
      },
      specifications: {
        kilowatts: kilowatts ? parseFloat(kilowatts) : null,
        madeIn: madeIn || "",
        details,
      },
      rating: 0,
    };

    db.products.push(newProduct);
    await writeDB(db);
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.status(500).render("admin/create", {
      title: "Create Product",
      product: req.body,
      categories: ["Electronics", "Clothing", "Books"],
      user: req.session.user,
      theme: req.session.theme || "light",
      error: err.message || "Failed to create product",
    });
  }
});

router.get("/edit/:id", isAuthenticated, async (req, res) => {
  try {
    const db = await readDB();
    const product = db.products.find((p) => p.id == req.params.id);
    if (!product) {
      return res.status(404).render("error", {
        title: "Error",
        message: "Product not found",
        user: req.session.user,
        theme: req.session.theme || "light",
      });
    }
    const categories = ["Electronics", "Clothing", "Books"];
    res.render("admin/edit", {
      title: "Edit Product",
      product,
      categories,
      user: req.session.user,
      theme: req.session.theme || "light",
      error: null,
    });
  } catch (err) {
    res.status(500).render("error", {
      title: "Error",
      message: "Server error",
      user: req.session.user,
      theme: req.session.theme || "light",
    });
  }
});

router.post("/edit/:id", isAuthenticated, async (req, res) => {
  try {
    const db = await readDB();
    const productIndex = db.products.findIndex((p) => p.id == req.params.id);
    if (productIndex === -1) {
      return res.status(404).render("error", {
        title: "Error",
        message: "Product not found",
        user: req.session.user,
        theme: req.session.theme || "light",
      });
    }

    const {
      name,
      price,
      currency,
      availableStock,
      description,
      category,
      discountPrice,
      discountDays,
      sellerName,
      sellerPhone,
      sellerTelegram,
      sellerContactUrl,
      kilowatts,
      madeIn,
      detailName = [],
      detailValue = [],
      deleteImages = "",
      thumbnailUrl,
      imageUrls = [],
    } = req.body;

    const details = {};
    for (let i = 0; i < detailName.length; i++) {
      if (detailName[i] && detailValue[i]) {
        details[detailName[i]] = detailValue[i];
      }
    }

    let discount = null;
    if (discountPrice && discountDays) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(discountDays));
      discount = {
        price: parseFloat(discountPrice),
        endDate: endDate.toISOString(),
      };
    }

    const existingImages = (db.products[productIndex].images || []).filter(
      (img) => !deleteImages.split(",").includes(img)
    );
    const newImages = Array.isArray(imageUrls)
      ? imageUrls
      : imageUrls.split(",").filter(Boolean);
    const allImages = [...existingImages, ...newImages];

    db.products[productIndex] = {
      ...db.products[productIndex],
      name: name || db.products[productIndex].name,
      price: parseFloat(price) || 0,
      currency: currency || "USD",
      availableStock: parseInt(availableStock) || 0,
      description: description || "",
      category: category || "Uncategorized",
      image: thumbnailUrl || allImages[0] || db.products[productIndex].image,
      images: allImages,
      discount,
      seller: {
        name: sellerName || "",
        phone: sellerPhone || "",
        telegram: sellerTelegram || "",
        contactUrl: sellerContactUrl || "",
      },
      specifications: {
        kilowatts: kilowatts ? parseFloat(kilowatts) : null,
        madeIn: madeIn || "",
        details,
      },
    };

    await writeDB(db);
    res.redirect("/admin/dashboard");
  } catch (err) {
    res.status(500).render("admin/edit", {
      title: "Edit Product",
      product: req.body,
      categories: ["Electronics", "Clothing", "Books"],
      user: req.session.user,
      theme: req.session.theme || "light",
      error: err.message || "Failed to update product",
    });
  }
});

router.post("/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const db = await readDB();
    const productIndex = db.products.findIndex((p) => p.id == req.params.id);
    if (productIndex !== -1) {
      db.products.splice(productIndex, 1);
      await writeDB(db);
    }
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).render("error", {
      title: res.__("error"),
      message: "Server error",
      user: req.session.user || null,
      theme: req.session.theme || "light",
      lang: req.session.lang || "en",
    });
  }
});

module.exports = router;
