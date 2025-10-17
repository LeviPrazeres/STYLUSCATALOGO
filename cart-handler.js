// =====================
// GERENCIADOR DE CARRINHO PARA HOME PAGE
// Compartilha o mesmo localStorage com o catálogo
// =====================

// Estado do carrinho (compartilhado via localStorage)
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = []; // Será preenchido quando carregar produtos

// Elementos DOM
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const productModal = document.getElementById('productModal');
const closeProductModal = document.getElementById('closeProductModal');
const productModalBody = document.getElementById('productModalBody');

// Inicializar após DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    updateCartUI();
    setupCartEvents();
});

// Configurar eventos do carrinho
function setupCartEvents() {
    if (cartBtn) {
        cartBtn.addEventListener('click', toggleCartModal);
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', toggleCartModal);
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
    
    if (closeProductModal) {
        closeProductModal.addEventListener('click', closeProductModalFunc);
    }
    
    // Fechar modais clicando fora
    if (cartModal) {
        cartModal.addEventListener('click', function(e) {
            if (e.target === cartModal) {
                toggleCartModal();
            }
        });
    }
    
    if (productModal) {
        productModal.addEventListener('click', function(e) {
            if (e.target === productModal) {
                closeProductModalFunc();
            }
        });
    }
}

// Toggle modal do carrinho
function toggleCartModal() {
    cartModal.classList.toggle('active');
    document.body.style.overflow = cartModal.classList.contains('active') ? 'hidden' : '';
}

// Atualizar UI do carrinho
function updateCartUI() {
    // Atualizar contador
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
    }
    
    // Atualizar lista de itens
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <p>Seu carrinho está vazio</p>
                <p style="font-size: 0.9rem; color: #999; margin-top: 10px;">Adicione produtos para continuar</p>
            </div>
        `;
        if (cartTotal) cartTotal.textContent = '0,00';
        return;
    }
    
    // Renderizar itens
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-options">
                    ${item.size ? `Tamanho: ${item.size}` : ''}
                    ${item.size && item.color ? '<br>' : ''}
                    ${item.color ? `Cor: ${item.color}` : ''}
                </div>
                <div class="cart-item-price">R$ ${formatPrice(item.price)}</div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    <button class="remove-item" onclick="removeFromCart('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Atualizar total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotal) {
        cartTotal.textContent = formatPrice(total);
    }
}

// Atualizar quantidade
function updateQuantity(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(itemId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

// Remover do carrinho
function removeFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    saveCart();
    updateCartUI();
}

// Salvar carrinho no localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Formatar preço
function formatPrice(price) {
    if (!price) return '0,00';
    return price.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Finalizar pedido (WhatsApp)
function handleCheckout() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    
    let message = '*🛍️ Novo Pedido - Stylus Concept*\n\n';
    message += '*Itens do Pedido:*\n';
    
    cart.forEach((item, index) => {
        message += `\n${index + 1}. *${item.name}*\n`;
        if (item.size) {
            message += `   Tamanho: ${item.size}\n`;
        }
        if (item.color) {
            message += `   Cor: ${item.color}\n`;
        }
        message += `   Quantidade: ${item.quantity}\n`;
        message += `   Preço: R$ ${formatPrice(item.price)}\n`;
        message += `   Subtotal: R$ ${formatPrice(item.price * item.quantity)}\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `\n*💰 Total: R$ ${formatPrice(total)}*`;
    
    const whatsappNumber = '5577988024793';
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
}

// Abrir modal de produto
function openProductModal(product) {
    console.log('Abrindo modal para produto:', product);
    
    if (!product) {
        console.error('Produto não encontrado');
        return;
    }
    
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');
    
    // Montar HTML do modal
    modalBody.innerHTML = `
        <div class="product-detail-content">
            <div class="product-detail-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-detail-info">
                <h2 class="product-detail-title">${product.name}</h2>
                <p class="product-detail-description">${product.description || 'Produto de qualidade premium da marca ' + product.brand}</p>
                <div class="product-detail-price">R$ ${formatPrice(product.price)}</div>
                
                ${(product.colors && product.colors.length > 0) ? `
                <div class="product-detail-options">
                    <h4>Cores Disponíveis:</h4>
                    <div class="product-detail-colors">
                        ${product.colors.map(color => `
                            <span class="product-detail-color" data-color="${color.name}">${color.name}</span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${(product.sizes && product.sizes.length > 0) ? `
                <div class="product-detail-options">
                    <h4>Tamanhos Disponíveis:</h4>
                    <div class="product-detail-sizes">
                        ${product.sizes.map(size => `
                            <span class="product-detail-size" data-size="${size}">${size}</span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <button class="product-detail-add-cart" id="addToCartModalBtn" ${(!product.colors || product.colors.length === 0) && (!product.sizes || product.sizes.length === 0) ? '' : 'disabled'}>
                    <i class="fas fa-shopping-cart"></i> Adicionar ao Carrinho
                </button>
            </div>
        </div>
    `;
    
    // Configurar eventos de seleção
    setupModalProductEvents(product);
    
    // Mostrar modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Fechar modal de produto
function closeProductModalFunc() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Configurar eventos do modal de produto
function setupModalProductEvents(product) {
    const colorOptions = document.querySelectorAll('.product-detail-color');
    const sizeOptions = document.querySelectorAll('.product-detail-size');
    const addBtn = document.getElementById('addToCartModalBtn');
    
    let selectedColor = null;
    let selectedSize = null;
    
    // Eventos de cor
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            selectedColor = this.dataset.color;
            checkIfCanAdd();
        });
    });
    
    // Eventos de tamanho
    sizeOptions.forEach(option => {
        option.addEventListener('click', function() {
            sizeOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            selectedSize = this.dataset.size;
            checkIfCanAdd();
        });
    });
    
    // Verificar se pode adicionar ao carrinho
    function checkIfCanAdd() {
        const hasColors = colorOptions.length > 0;
        const hasSizes = sizeOptions.length > 0;
        
        if (!hasColors && !hasSizes) {
            addBtn.disabled = false;
        } else if (hasColors && !hasSizes) {
            addBtn.disabled = !selectedColor;
        } else if (!hasColors && hasSizes) {
            addBtn.disabled = !selectedSize;
        } else {
            addBtn.disabled = !(selectedColor && selectedSize);
        }
    }
    
    // Evento de adicionar ao carrinho
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            const cartItem = {
                id: `${product.id}${selectedSize ? `-${selectedSize}` : ''}${selectedColor ? `-${selectedColor}` : ''}`,
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                size: selectedSize,
                color: selectedColor,
                quantity: 1
            };
            
            // Verificar se já existe no carrinho
            const existingItem = cart.find(item => item.id === cartItem.id);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push(cartItem);
            }
            
            saveCart();
            updateCartUI();
            
            // Fechar modal de produto e abrir carrinho
            closeProductModalFunc();
            setTimeout(() => {
                toggleCartModal();
            }, 300);
        });
    }
}

console.log('🛒 Cart Handler carregado');


