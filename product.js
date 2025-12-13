// Duplicate cart-management block removed; consolidated further down in this file.

// Cart Management
const CART_STORAGE_KEY = 'jumpship_cart';

function getCart() {
  const cartJson = localStorage.getItem(CART_STORAGE_KEY);
  return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ ...product, quantity });
  }
  
  saveCart(cart);
  updateCartUI();
  return cart;
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
  updateCartUI();
  return cart;
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(item => item.id === productId);
  if (item) {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    item.quantity = quantity;
    saveCart(cart);
    updateCartUI();
  }
  return cart;
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[₢,]/g, '')) || 0;
    return sum + (price * item.quantity);
  }, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartCount() {
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    const count = getCartCount();
    countEl.textContent = count;
    countEl.style.display = count > 0 ? 'grid' : 'none';
  }
}

// Product Detail Page Logic
const productDetailEl = document.getElementById('product-detail');
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

const inventorySource = "./products.xml";

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

  return products;
}

function renderProductDetail(product) {
  if (!productDetailEl) return;
  
  productDetailEl.innerHTML = `
    <div class="product-detail__grid">
      <div class="product-detail__image">
        <img src="${product.image}" alt="${product.name}" />
      </div>
      <div class="product-detail__info">
        <p class="eyebrow">${product.category}</p>
        <h1 class="product-detail__title">${product.name}</h1>
        <div class="product-detail__badge">${product.rarity}</div>
        <div class="product-detail__price">${product.price}</div>
        <p class="product-detail__description">
          This extraordinary item represents the pinnacle of scientific achievement and theoretical possibility. 
          Each acquisition comes with complete documentation, safety protocols, and quantum encryption certificates. 
          Our containment systems ensure safe transport and storage, meeting all intergalactic safety standards.
        </p>
        <div class="product-detail__features">
          <h3>Seller Guarantees:</h3>
          <ul>
            <li>100% satisfaction guaranteed</li>
            <li>Free returns within 30 days</li>
            <li>Lifetime warranty on all products</li>
            <li>24/7 customer support</li>
            <li>Secure payment processing</li>
          </ul>
        </div>
        <div class="product-detail__actions">
          <div class="quantity-selector">
            <label for="quantity">Quantity:</label>
            <input type="number" id="quantity" min="1" value="1" style="width: 80px; padding: 0.5rem; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border); color: var(--text); border-radius: 4px; margin-left: 1rem;" />
          </div>
          <button class="btn btn--gradient" id="add-to-cart-btn" style="width: 100%; margin-top: 1.5rem; padding: 1.25rem;">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;

  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const quantityInput = document.getElementById('quantity');
  
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const quantity = parseInt(quantityInput.value) || 1;
      addToCart(product, quantity);
      addToCartBtn.textContent = 'Added to Cart!';
      addToCartBtn.style.background = 'linear-gradient(120deg, #10b981, #059669)';
      setTimeout(() => {
        addToCartBtn.textContent = 'Add to Cart';
        addToCartBtn.style.background = '';
      }, 2000);
    });
  }
}

async function loadProduct() {
  if (!productId) {
    if (productDetailEl) {
      productDetailEl.innerHTML = '<p class="muted">Product not found. <a href="index.html">Return to catalog</a></p>';
    }
    return;
  }

  try {
    const response = await fetch(inventorySource);
    if (!response.ok) throw new Error(`Failed to load ${inventorySource}`);
    const xmlText = await response.text();
    const products = parseInventory(xmlText);
    const product = products.find(p => p.id === productId);
    
    if (product) {
      renderProductDetail(product);
      document.title = `${product.name} | Jump Ship`;
    } else {
      if (productDetailEl) {
        productDetailEl.innerHTML = '<p class="muted">Product not found. <a href="index.html">Return to catalog</a></p>';
      }
    }
  } catch (error) {
    if (productDetailEl) {
      productDetailEl.innerHTML = '<p class="muted">Unable to load product. <a href="index.html">Return to catalog</a></p>';
    }
    console.error(error);
  }
}

// Cart Modal Logic
const cartModal = document.getElementById('cart-modal');
const cartButton = document.getElementById('cart-button');
const cartOverlay = document.getElementById('cart-overlay');
const cartClose = document.getElementById('cart-close');
const cartItemsEl = document.getElementById('cart-items');

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
 
function updateCartUI() {
  updateCartCount();
  if (cartModal && cartModal.classList.contains('cart-modal--open')) {
    renderCartItems();
  }
}

// Event Listeners
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

// Initialize
loadProduct();
updateCartCount();

