// Cart
function addToCart(productId) {
    fetch("/cart/add", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `productId=${productId}&quantity=1`,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert("Product added to cart!");
          window.location.href = "/cart";
        } else {
          alert(data.error || "Failed to add to cart.");
        }
      })
      .catch((err) => console.error("Add to cart error:", err));
  }
  
  function updateQuantity(productId, quantity) {
    fetch("/cart/update", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `productId=${productId}&quantity=${quantity}`,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          window.location.reload();
        } else {
          alert(data.error || "Failed to update quantity.");
        }
      })
      .catch((err) => console.error("Update quantity error:", err));
  }
  
  function removeFromCart(productId) {
    fetch("/cart/remove", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `productId=${productId}`,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          window.location.reload();
        } else {
          alert(data.error || "Failed to remove from cart.");
        }
      })
      .catch((err) => console.error("Remove from cart error:", err));
  }
  
  // Category filter and search
  document.addEventListener("DOMContentLoaded", () => {
    const categoryFilter = document.getElementById("category-filter");
    const searchInput = document.getElementById("search-input");
    const products = document.querySelectorAll(".product-item");
  
    if (categoryFilter) {
      categoryFilter.addEventListener("change", () => {
        const selectedCategory = categoryFilter.value;
        products.forEach((product) => {
          const productCategory = product.dataset.category;
          product.style.display =
            selectedCategory === "" || productCategory === selectedCategory ? "block" : "none";
        });
      });
    }
  
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        products.forEach((product) => {
          const name = product.querySelector("h3").textContent.toLowerCase();
          product.style.display = name.includes(query) ? "block" : "none";
        });
      });
    }
  });
  
  // Theme toggle
  function toggleTheme() {
    const currentTheme = document.body.classList.contains("theme-dark") ? "dark" : "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.body.classList.remove(`theme-${currentTheme}`);
    document.body.classList.add(`theme-${newTheme}`);
    fetch("/theme", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `theme=${newTheme}`,
    });
  }