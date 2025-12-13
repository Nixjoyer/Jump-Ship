const productGrid = document.getElementById("products-grid");
const categoriesGrid = document.getElementById("categories-grid");
const statsGrid = document.getElementById("stats-grid");
const mobileNav = document.getElementById("mobile-nav");
const navToggle = document.querySelector("[data-toggle='menu']");
const newsletterForm = document.getElementById("newsletter-form");
const inventorySource = "./products.xml";

// Keep the loaded inventory accessible to the search logic
let INVENTORY = { products: [], stats: [] };

// Cart Management
const CART_STORAGE_KEY = 'jumpship_cart';

function getCart() {
  const cartJson = localStorage.getItem(CART_STORAGE_KEY);
  return cartJson ? JSON.parse(cartJson) : [];
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartCount() {
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    const count = getCartCount();
    countEl.textContent = count;
    if (count > 0) {
      countEl.style.display = 'grid';
    } else {
      countEl.style.display = 'none';
    }
  }
}

document.addEventListener("click", (event) => {
  if (!mobileNav || !navToggle) return;
  if (
    mobileNav.classList.contains("open") &&
    !mobileNav.contains(event.target) &&
    !navToggle.contains(event.target)
  ) {
    mobileNav.classList.remove("open");
  }
});

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(newsletterForm);
  const email = formData.get("email");
  alert(`Quantum relay established for ${email}.`);
  newsletterForm.reset();
});

function parseInventory(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("Unable to parse products.xml");
  }

  const products = Array.from(doc.querySelectorAll("product")).map((node) => ({
    id: node.getAttribute("id"),
    name: node.querySelector("name")?.textContent ?? "",
    category: node.querySelector("category")?.textContent ?? "",
    price: node.querySelector("price")?.textContent ?? "",
    image: node.querySelector("image")?.textContent ?? "",
    rarity: node.querySelector("rarity")?.textContent ?? "",
  }));

  const categories = Array.from(doc.querySelectorAll("categories category")).map((node) => ({
    id: node.getAttribute("id"),
    name: node.querySelector("name")?.textContent ?? "",
    description: node.querySelector("description")?.textContent ?? "",
    count: node.querySelector("count")?.textContent ?? "",
    icon: node.getAttribute("icon"),
  }));

  const stats = Array.from(doc.querySelectorAll("stats stat")).map((node) => ({
    value: node.getAttribute("value"),
    label: node.getAttribute("label"),
  }));

  return { products, categories, stats };
}

function createProductCard(product) {
  return `
    <article class="product-card" data-product-id="${product.id}">
      <a href="product.html?id=${product.id}" class="product-card__link-wrapper" style="text-decoration: none; color: inherit; display: block;">
        <div class="product-card__media">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
          <span class="product-card__badge">${product.rarity}</span>
          <div class="product-card__actions">
            <button type="button" class="action-button favorite" data-favorite="${product.id}" aria-label="Toggle favorite" onclick="event.preventDefault(); event.stopPropagation(); this.classList.toggle('favorite--active');">
              ❤
            </button>
            <button type="button" class="action-button" data-preview="${product.id}" aria-label="View product" onclick="event.preventDefault(); event.stopPropagation(); window.location.href='product.html?id=${product.id}';">
              👁
            </button>
          </div>
          <div class="product-card__overlay"></div>
          <p class="product-card__category">${product.category}</p>
        </div>
        <div class="product-card__body">
          <h4 class="product-card__title">${product.name}</h4>
          <div class="product-card__meta">
            <p class="product-card__price">${product.price}</p>
            <span class="product-card__link">VIEW DETAILS →</span>
          </div>
        </div>
      </a>
    </article>
  `;
}

function createCategoryCard(category) {
  return `
    <article class="category-card">
      <div class="category-icon">${category.icon ?? "✦"}</div>
      <h4>${category.name}</h4>
      <p>${category.description}</p>
      <div class="category-meta">
        <span>${category.count}</span>
        <span>Explore →</span>
      </div>
    </article>
  `;
}

function createStat(stat) {
  return `
    <div class="stat">
      <p class="stat__value">${stat.value}</p>
      <p class="stat__label">${stat.label}</p>
    </div>
  `;
}

function attachCardInteractions() {
  if (!productGrid) return;
}

async function loadInventory() {
  try {
    const response = await fetch(inventorySource);
    if (!response.ok) throw new Error(`Failed to load ${inventorySource}`);
    const xmlText = await response.text();
    const { products, categories, stats } = parseInventory(xmlText);
    // Store globally for search usage
    INVENTORY = { products, categories, stats };

    if (productGrid) {
      productGrid.innerHTML = products.map(createProductCard).join("");
      attachCardInteractions();
    }

    if (categoriesGrid) {
      categoriesGrid.innerHTML = categories.map(createCategoryCard).join("");
    }

    if (statsGrid) {
      statsGrid.innerHTML = stats.map(createStat).join("");
    }
  } catch (error) {
    if (productGrid) {
      productGrid.innerHTML = `<p class="muted">Unable to load inventory. Please try again later.</p>`;
    }
    console.error(error);
  }
}

// --- Search overlay logic ---
const searchButton = document.querySelector(".icon-button[aria-label='Search catalog']");
const searchOverlay = document.getElementById('search-overlay');
const searchBackdrop = document.getElementById('search-overlay-backdrop');
const searchClose = document.getElementById('search-close');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchResultsEl = document.getElementById('search-results');
const searchEmptyEl = document.getElementById('search-empty');
const searchSort = document.getElementById('search-sort');

function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function openSearch() {
  if (!searchOverlay) return;
  searchOverlay.classList.add('search-overlay--open');
  searchOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  searchInput?.focus();
  // If inventory already loaded, show recent / popular items (first few)
  renderSearchResults(INVENTORY.products.slice(0, 12));
}

function closeSearch() {
  if (!searchOverlay) return;
  searchOverlay.classList.remove('search-overlay--open');
  searchOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  searchResultsEl.innerHTML = '';
  searchEmptyEl.style.display = 'none';
  searchForm?.reset();
}

function performSearch(query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) {
    let items = INVENTORY.products.slice(0, 12);
    items = sortResults(items, searchSort?.value);
    renderSearchResults(items, '');
    return;
  }

  const results = INVENTORY.products.filter(p => {
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.rarity || '').toLowerCase().includes(q)
    );
  });

  const sorted = sortResults(results, searchSort?.value);
  renderSearchResults(sorted, q);
}

const performSearchDebounced = debounce(performSearch, 180);

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${escapeRegex(query)})`, 'ig');
  return String(text).replace(re, '<span class="search-highlight">$1</span>');
}

function createSearchResultCard(product, query) {
  const title = highlightMatch(product.name || '', query);
  const category = highlightMatch(product.category || '', query);
  const rarity = highlightMatch(product.rarity || '', query);
  return `
    <div class="search-result-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}" loading="lazy" />
      <div class="search-result-card__info">
        <h4 class="search-result-card__title">${title}</h4>
        <div class="search-result-card__meta">${category} • <small>${rarity}</small></div>
        <div style="margin-top:0.5rem; display:flex; gap:0.5rem; align-items:center;">
          <div style="font-weight:700;">${product.price}</div>
          <a href="product.html?id=${product.id}" class="btn" style="padding:0.35rem 0.6rem; border-radius:8px;">View</a>
        </div>
      </div>
      <div>
        <button class="btn--add-to-cart" data-add-to-cart="${product.id}" aria-label="Add to cart">Add</button>
      </div>
    </div>
  `;
}

function renderSearchResults(items, query) {
  if (!searchResultsEl || !searchEmptyEl) return;
  if (!items || items.length === 0) {
    searchResultsEl.innerHTML = '';
    searchEmptyEl.style.display = '';
    return;
  }
  searchEmptyEl.style.display = 'none';
  searchResultsEl.innerHTML = items.map(p => createSearchResultCard(p, query)).join('');
}

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  // remove currency symbols and non-numeric characters except dot and minus
  const cleaned = String(priceStr).replace(/[₢,\s]/g, '').replace(/[^0-9.-]+/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function sortResults(items, sortKey) {
  if (!sortKey || sortKey === 'relevance') return items;
  const copy = items.slice();
  if (sortKey === 'price-asc') {
    copy.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  } else if (sortKey === 'price-desc') {
    copy.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
  }
  return copy;
}

// Listen for Add-to-cart clicks inside search results (event delegation)
searchResultsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add-to-cart]');
  if (!btn) return;
  const id = btn.getAttribute('data-add-to-cart');
  if (!id) return;
  addToCartById(id);
});

function addToCartById(productId) {
  const product = INVENTORY.products.find(p => p.id === productId);
  if (!product) return;
  const cart = getCart();
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.quantity = existing.quantity + 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
  }
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartUI();
}

// Bind events
searchButton?.addEventListener('click', (e) => {
  e.preventDefault();
  openSearch();
});
searchBackdrop?.addEventListener('click', closeSearch);
searchClose?.addEventListener('click', closeSearch);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSearch();
});

searchForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  performSearch(searchInput.value);
});

searchInput?.addEventListener('input', (e) => {
  performSearchDebounced(e.target.value);
});

searchSort?.addEventListener('change', () => {
  // re-run search with current query when sort changes
  const q = searchInput?.value ?? '';
  performSearch(q);
});

// Cart Modal Logic
const cartModal = document.getElementById('cart-modal');
const cartButton = document.getElementById('cart-button');
const cartOverlay = document.getElementById('cart-overlay');
const cartClose = document.getElementById('cart-close');
const cartItemsEl = document.getElementById('cart-items');

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[₢,]/g, '')) || 0;
    return sum + (price * item.quantity);
  }, 0);
}

function renderCartItems() {
  const cart = getCart();
  const total = getCartTotal();
  
  if (!cartItemsEl) return;
  
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="muted" style="text-align: center; padding: 2rem;">Your cart is empty</p>';
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = '₢0';
    return;
  }
  
  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item__image" />
      <div class="cart-item__info">
        <h4 class="cart-item__name">${item.name}</h4>
        <p class="cart-item__price">${item.price}</p>
        <div class="cart-item__quantity">
          <button class="quantity-btn" data-action="decrease" data-id="${item.id}">−</button>
          <span>${item.quantity}</span>
          <button class="quantity-btn" data-action="increase" data-id="${item.id}">+</button>
        </div>
      </div>
      <button class="cart-item__remove" data-id="${item.id}" aria-label="Remove item">×</button>
    </div>
  `).join('');
  
  const totalEl = document.getElementById('cart-total');
  if (totalEl) {
    totalEl.textContent = `₢${total.toLocaleString()}`;
  }
  
  // Attach event listeners
  cartItemsEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const cart = getCart();
      const item = cart.find(i => i.id === id);
      if (item) {
        if (action === 'increase') {
          updateCartQuantity(id, item.quantity + 1);
        } else if (action === 'decrease') {
          updateCartQuantity(id, item.quantity - 1);
        }
      }
    });
  });
  
  cartItemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.id);
    });
  });
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(item => item.id === productId);
  if (item) {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    item.quantity = quantity;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartUI();
  }
  return cart;
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartUI();
  return cart;
}

function openCart() {
  if (cartModal) {
    cartModal.classList.add('cart-modal--open');
    document.body.style.overflow = 'hidden';
    renderCartItems();
  }
}

function closeCart() {
  if (cartModal) {
    cartModal.classList.remove('cart-modal--open');
    document.body.style.overflow = '';
  }
}

function updateCartUI() {
  updateCartCount();
  if (cartModal && cartModal.classList.contains('cart-modal--open')) {
    renderCartItems();
  }
}

cartButton?.addEventListener('click', openCart);
cartOverlay?.addEventListener('click', closeCart);
cartClose?.addEventListener('click', closeCart);

const checkoutBtn = document.getElementById('checkout-btn');
checkoutBtn?.addEventListener('click', () => {
  const cart = getCart();
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  alert('Checkout functionality coming soon. Your cart has been saved.');
});

loadInventory();
updateCartCount();

