// =====================
// CARREGADOR DE PRODUTOS POR MARCA PARA HOME PAGE
// =====================

// Configuração da planilha (mesma do catálogo)
const SHEET_CONFIG = {
    spreadsheetId: '1Uxb3myMXc8SFklQQAk6LJB85yoMHl39tjdnC5wsu3xY',
    tabs: {
        produtos: 'Produtos'
    }
};

// Mapeamento de marcas
const BRAND_MAPPING = {
    'jorge': 'Jorge Bischoff',
    'luiza': 'Luiza Barcelos',
    'melissa': 'Mini Melissa',
    'klin': 'Klin',
    'mizuno': 'Mizuno'
};

// Função para construir URL do Google Sheets
function buildGvizUrl(spreadsheetId, sheetName) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

// Função para fazer fetch dos dados
async function fetchGviz(spreadsheetId, sheetName) {
    const url = buildGvizUrl(spreadsheetId, sheetName);
    const response = await fetch(url);
    const text = await response.text();
    const jsonp = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/);
    if (!jsonp || !jsonp[1]) throw new Error('Formato inválido');
    return JSON.parse(jsonp[1]);
}

// Normalizar texto (remover acentos e lowercase)
function normalizeTextBasic(value) {
    if (!value) return '';
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Converter linhas em objetos (mesma função do script.js)
function rowsToObjects(table) {
    const rawCols = table.cols || [];
    const labels = rawCols.map(c => (c && c.label ? String(c.label).trim() : ''));
    const rows = table.rows || [];

    const allLabelsEmpty = labels.every(l => !l);

    function cellValue(cell) {
        return cell ? (cell.v ?? cell.f ?? '') : '';
    }

    if (allLabelsEmpty && rows.length > 0) {
        // Derivar cabeçalhos da primeira linha
        const headerCells = rows[0].c || [];
        const headers = headerCells.map(c => String(cellValue(c)).trim());

        // Normalizar cabeçalhos: minúsculo, sem acento, sem espaços extras
        const normHeaders = headers.map(h => normalizeTextBasic(h));

        // Mapear demais linhas
        const dataRows = rows.slice(1);
        return dataRows.map(r => {
            const obj = {};
            (r.c || []).forEach((cell, idx) => {
                const key = normHeaders[idx] || `col_${idx}`;
                obj[key] = cellValue(cell);
            });
            return obj;
        });
    } else {
        // Se há labels, usar
        const normLabels = labels.map(l => l ? normalizeTextBasic(l) : '');
        return rows.map(r => {
            const obj = {};
            (r.c || []).forEach((cell, idx) => {
                const key = normLabels[idx] || `col_${idx}`;
                obj[key] = cellValue(cell);
            });
            return obj;
        });
    }
}

// Converter URL do Google Drive
function convertGoogleDriveUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') return '';
    
    if (url.includes('/file/d/')) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
        }
    }
    
    if (url.includes('id=')) {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
        }
    }
    
    return url;
}

// Parse lista separada por vírgula
function parseList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    const str = String(value).trim();
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
}

// Parse preço em formato brasileiro
function parseNumberBR(str) {
    if (!str) return null;
    const cleaned = String(str).replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
}

// Formatar preço para exibição
function formatPrice(price) {
    if (!price) return '0,00';
    return price.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Normalizar categoria
function normalizeCategory(category) {
    if (!category) return 'roupas';
    const normalized = category.toLowerCase().trim();
    if (normalized.includes('calçado') || normalized.includes('calcado')) return 'calcados';
    if (normalized.includes('acessorio') || normalized.includes('acessório')) return 'acessorios';
    return 'roupas';
}

// Carregar produtos da planilha
async function loadBrandProducts() {
    try {
        console.log('🔄 Iniciando carregamento da planilha...');
        const response = await fetchGviz(SHEET_CONFIG.spreadsheetId, SHEET_CONFIG.tabs.produtos);
        console.log('✅ Resposta da planilha recebida');
        
        let rows = rowsToObjects(response.table);
        console.log(`📊 Total de linhas processadas: ${rows.length}`);
        
        // Debug: mostrar as chaves do primeiro produto
        if (rows.length > 0) {
            console.log('🔍 Chaves disponíveis no primeiro produto:', Object.keys(rows[0]));
            console.log('🔍 Primeiro produto completo:', rows[0]);
        }
        
        rows = rows.filter(r => r && (r.nome || r.imagem));
        console.log(`✅ Linhas válidas (com nome ou imagem): ${rows.length}`);
        
        const productsByBrand = {
            'Jorge Bischoff': [],
            'Luiza Barcelos': [],
            'Mini Melissa': [],
            'Klin': [],
            'Mizuno': []
        };
        
        // Processar cada linha
        rows.forEach((row, index) => {
            const brandRaw = row.marca || '';
            const name = row.nome || '';
            const image = convertGoogleDriveUrl(row.imagem || '');
            
            // Debug para os primeiros 10 produtos
            if (index < 10) {
                console.log(`📦 Produto ${index + 1}: "${name}" | Marca bruta: "${brandRaw}"`);
            }
            
            let price = 0;
            const precoPlanilha = row.preco || row.preço || '';
            
            if (precoPlanilha && String(precoPlanilha).trim() !== '') {
                if (String(precoPlanilha).includes('=')) {
                    // Preço por cor - pegar o menor
                    const colorPricePairs = String(precoPlanilha).split('.').filter(Boolean);
                    const prices = [];
                    colorPricePairs.forEach(pair => {
                        const [color, priceStr] = pair.split('=');
                        if (priceStr) {
                            const priceValue = parseNumberBR(priceStr.trim());
                            if (priceValue) prices.push(priceValue);
                        }
                    });
                    if (prices.length > 0) {
                        price = Math.min(...prices);
                    }
                } else {
                    price = parseNumberBR(precoPlanilha) || 0;
                }
            }
            
            // Processar cores
            const corPlanilha = row.cor || '';
            let colors = [];
            if (corPlanilha && corPlanilha.trim() !== '') {
                const coresLista = parseList(corPlanilha);
                colors = coresLista.map(cor => ({
                    name: cor.trim(),
                    value: '#' + Math.floor(Math.random()*16777215).toString(16)
                }));
            }
            
            // Processar tamanhos
            const tamanhoPlanilha = row.tamanho || '';
            let sizes = [];
            if (tamanhoPlanilha && tamanhoPlanilha.trim() !== '' && !tamanhoPlanilha.includes('=')) {
                sizes = parseList(tamanhoPlanilha);
            }
            
            const description = row.descricao || '';
            
            const product = {
                id: Date.now() + index,
                name,
                price,
                image,
                brand: brandRaw,
                colors,
                sizes,
                description
            };
            
            // Adicionar ao array da marca correta (comparação case-insensitive)
            const brandNormalized = brandRaw.trim();
            Object.keys(productsByBrand).forEach(targetBrand => {
                if (brandNormalized.toLowerCase().includes(targetBrand.toLowerCase()) || 
                    targetBrand.toLowerCase().includes(brandNormalized.toLowerCase())) {
                    productsByBrand[targetBrand].push(product);
                }
            });
        });
        
        // Mostrar quantos produtos foram encontrados por marca
        console.log('📊 Produtos por marca:');
        Object.keys(productsByBrand).forEach(brand => {
            console.log(`  ${brand}: ${productsByBrand[brand].length} produtos`);
        });
        
        return productsByBrand;
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        return null;
    }
}

// Função para pegar N produtos aleatórios
function getRandomProducts(products, count = 10) {
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, products.length));
}

// Renderizar produtos no carrossel
function renderBrandCarousel(brandKey, products) {
    const carouselId = `carousel-${brandKey}`;
    const carousel = document.getElementById(carouselId);
    
    if (!carousel) return;
    
    carousel.innerHTML = '';
    
    if (products.length === 0) {
        carousel.innerHTML = '<div class="carousel-empty">Nenhum produto disponível</div>';
        return;
    }
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'carousel-product-card';
        card.innerHTML = `
            <div class="carousel-product-image">
                <img src="${product.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23f0f0f0\' width=\'200\' height=\'200\'/%3E%3Ctext fill=\'%23999\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3ESem Imagem%3C/text%3E%3C/svg%3E'}" 
                     alt="${product.name}"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23f0f0f0\' width=\'200\' height=\'200\'/%3E%3Ctext fill=\'%23999\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3ESem Imagem%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="carousel-product-info">
                <h4 class="carousel-product-name">${product.name}</h4>
                <p class="carousel-product-price">R$ ${formatPrice(product.price)}</p>
            </div>
        `;
        
        // Adicionar evento de clique para abrir modal do produto
        card.addEventListener('click', () => {
            openProductModal(product);
        });
        
        carousel.appendChild(card);
    });
}

// Configurar navegação do carrossel
function setupCarouselNavigation(brandKey) {
    const carousel = document.getElementById(`carousel-${brandKey}`);
    const prevBtn = document.querySelector(`.carousel-btn.prev[data-brand="${brandKey}"]`);
    const nextBtn = document.querySelector(`.carousel-btn.next[data-brand="${brandKey}"]`);
    
    if (!carousel || !prevBtn || !nextBtn) return;
    
    const scrollAmount = 320; // Largura do card + gap
    
    prevBtn.addEventListener('click', () => {
        carousel.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });
    
    nextBtn.addEventListener('click', () => {
        carousel.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
    
    // Atualizar visibilidade dos botões baseado no scroll
    function updateButtons() {
        const isAtStart = carousel.scrollLeft <= 10;
        const isAtEnd = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 10;
        
        prevBtn.style.opacity = isAtStart ? '0.3' : '1';
        prevBtn.style.cursor = isAtStart ? 'not-allowed' : 'pointer';
        
        nextBtn.style.opacity = isAtEnd ? '0.3' : '1';
        nextBtn.style.cursor = isAtEnd ? 'not-allowed' : 'pointer';
    }
    
    carousel.addEventListener('scroll', updateButtons);
    updateButtons();
    
    // Permitir arrastar com o mouse
    let isDown = false;
    let startX;
    let scrollLeft;
    
    carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        carousel.style.cursor = 'grabbing';
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    });
    
    carousel.addEventListener('mouseleave', () => {
        isDown = false;
        carousel.style.cursor = 'grab';
    });
    
    carousel.addEventListener('mouseup', () => {
        isDown = false;
        carousel.style.cursor = 'grab';
    });
    
    carousel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });
}

// Inicializar carrosséis
async function initializeBrandCarousels() {
    console.log('🔄 Carregando produtos por marca...');
    
    const productsByBrand = await loadBrandProducts();
    
    if (!productsByBrand) {
        console.error('❌ Falha ao carregar produtos');
        return;
    }
    
    // Armazenar todos os produtos globalmente para o cart-handler poder acessar
    if (typeof allProducts !== 'undefined') {
        allProducts.length = 0;
        Object.values(productsByBrand).forEach(brandProducts => {
            allProducts.push(...brandProducts);
        });
        console.log(`📦 Total de produtos carregados: ${allProducts.length}`);
    }
    
    // Para cada marca, pegar 10 produtos aleatórios e renderizar
    Object.keys(BRAND_MAPPING).forEach(brandKey => {
        const brandName = BRAND_MAPPING[brandKey];
        const allBrandProducts = productsByBrand[brandName] || [];
        const selectedProducts = getRandomProducts(allBrandProducts, 10);
        
        console.log(`✅ ${brandName}: ${selectedProducts.length} produtos`);
        
        renderBrandCarousel(brandKey, selectedProducts);
        setupCarouselNavigation(brandKey);
    });
    
    console.log('✅ Carrosséis de marcas carregados!');
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', initializeBrandCarousels);

