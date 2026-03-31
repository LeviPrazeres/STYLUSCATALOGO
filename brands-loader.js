// =====================
// CARREGADOR DE PRODUTOS POR MARCA PARA HOME PAGE
// =====================

// Configuração da planilha (mesma do catálogo)
const SHEET_CONFIG = {
    spreadsheetId: '1Uxb3myMXc8SFklQQAk6LJB85yoMHl39tjdnC5wsu3xY',
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyjRNIp72sUEbWMjKCfCY3cYQJuCzhNLR9wXE_0dCkmMFjW-cXt0NbfHh6n6tTFbLOIFg/exec',
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

/**
 * Tons frios (profundos / neutros frios) — usados no 2.º carrossel e para EXCLUIR do 1.º.
 * Ajuste conforme a coluna «cor» da planilha.
 */
const COLD_PALETTE_KEYWORDS = [
    'verde', 'musgo', 'oliva', 'militar', 'petroleo', 'petróleo',
    'preto', 'grafite', 'cinza', 'azul', 'chumbo', 'bordô', 'borgonha', 'vinho',
    'prata', 'gelo', 'frio', 'acinzentado'
];

/**
 * Tons terrosos / neutros quentes — só no 1.º carrossel; peças com qualquer tom frio acima ficam de fora.
 */
const WARM_PALETTE_KEYWORDS = [
    'terracota', 'terracotta', 'marrom', 'caramelo', 'camel', 'camelo',
    'bege', 'nude', 'castanho', 'cognac', 'conhaque', 'avelã', 'avela',
    'off white', 'offwhite', 'creme', 'areia', 'couro', 'dourado', 'mostarda', 'terroso'
];

/**
 * Paletas da home (colorKeywords espelha a lista usada em cada bloco).
 */
const PALETTE_HIGHLIGHTS = [
    {
        carouselKey: 'palette-0',
        title: 'Tons terrosos e neutros quentes',
        hint: 'Produtos nas cores desta família — mistura de categorias.',
        colorKeywords: WARM_PALETTE_KEYWORDS
    },
    {
        carouselKey: 'palette-1',
        title: 'Tons frios e profundos',
        hint: 'Neutros frios e cores profundas — mistura conforme o catálogo.',
        colorKeywords: COLD_PALETTE_KEYWORDS
    }
];

function isBootProduct(p) {
    if (!p || p.category !== 'calcados') return false;
    const t = normalizeTextBasic(p.productType || '');
    const n = normalizeTextBasic(p.name || '');
    return t.includes('bota') || n.includes('bota');
}

function isBagProduct(p) {
    if (!p || p.category !== 'acessorios') return false;
    const t = normalizeTextBasic(p.productType || '');
    const n = normalizeTextBasic(p.name || '');
    return (
        t.includes('bolsa') ||
        t.includes('mochila') ||
        n.includes('bolsa') ||
        n.includes('mochila')
    );
}

function productMatchesColorKeywords(p, keywords) {
    if (!keywords || !keywords.length) return false;
    const parts = [];
    if (p.colorNames && p.colorNames.length) {
        p.colorNames.forEach(c => parts.push(normalizeTextBasic(String(c))));
    }
    if (p.corRaw) {
        String(p.corRaw).split(/[,;\/]/).forEach(s => {
            const x = normalizeTextBasic(s.trim());
            if (x) parts.push(x);
        });
    }
    if (!parts.length) return false;
    return keywords.some(kw => {
        const nk = normalizeTextBasic(kw);
        if (!nk) return false;
        return parts.some(part => part.includes(nk) || nk.includes(part));
    });
}

/** Embaralha (Fisher–Yates) */
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Intercala botas e bolsas (embaralhadas) no mesmo carrossel — mesmo critério da paleta (mistura).
 */
function mixBootsAndBags(products) {
    if (!products || !products.length) return [];
    const boots = shuffleArray(products.filter(isBootProduct));
    const bags = shuffleArray(products.filter(isBagProduct));
    const out = [];
    let bi = 0;
    let gi = 0;
    while (bi < boots.length || gi < bags.length) {
        if (bi < boots.length) out.push(boots[bi++]);
        if (gi < bags.length) out.push(bags[gi++]);
    }
    return out;
}

/**
 * Mescla botas com outras peças na mesma paleta de cor (intercala, começando por não-bota)
 * para o carrossel não ficar só com calçados no início.
 */
function mixPaletteProducts(products) {
    if (!products || !products.length) return [];
    const boots = shuffleArray(products.filter(isBootProduct));
    const rest = shuffleArray(products.filter(p => !isBootProduct(p)));
    const out = [];
    let bi = 0;
    let ri = 0;
    while (bi < boots.length || ri < rest.length) {
        if (ri < rest.length) out.push(rest[ri++]);
        if (bi < boots.length) out.push(boots[bi++]);
    }
    return out;
}

// Função para construir URL do Google Sheets
function buildGvizUrl(spreadsheetId, sheetName) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

// Função para buscar dados do Apps Script JSON
async function fetchFromAppsScript() {
    if (!SHEET_CONFIG.appsScriptUrl) {
        throw new Error('URL do Apps Script não configurada');
    }

    try {
        const response = await fetch(SHEET_CONFIG.appsScriptUrl, { 
            cache: 'no-store',
            mode: 'cors',
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // O Apps Script retorna um array direto de objetos
        if (Array.isArray(data)) {
            return { items: data };
        } else if (data.items && Array.isArray(data.items)) {
            return { items: data.items };
        } else {
            throw new Error('Formato JSON inesperado do Apps Script');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar planilha do Apps Script:', error);
        throw error;
    }
}

// Função legada mantida para compatibilidade (não será mais usada)
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

// Função para converter JSON do Apps Script em objetos (normaliza chaves)
function appsScriptJsonToObjects(jsonData) {
    if (!jsonData.items || !Array.isArray(jsonData.items)) {
        return [];
    }
    
    // O JSON já vem como array de objetos com as chaves corretas
    // Só precisamos normalizar as chaves para garantir compatibilidade
    return jsonData.items.map(item => {
        const normalized = {};
        Object.keys(item).forEach(key => {
            // Normalizar chave (minúscula, sem acentos, sem espaços extras)
            const normalizedKey = normalizeTextBasic(key);
            normalized[normalizedKey] = item[key];
        });
        return normalized;
    });
}

// Converter linhas em objetos (função legada para compatibilidade)
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

// Função para extrair ID do Google Drive de uma URL
function extractGoogleDriveId(url) {
    if (!url || typeof url !== 'string') return null;
    
    // Padrões para extrair ID do Google Drive
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /thumbnail\?id=([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
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

// Função para remover produtos duplicados (mesma lógica do script.js)
function removeDuplicateProducts(products) {
    if (!products || products.length === 0) {
        return [];
    }
    
    // Função auxiliar para normalizar texto
    function normalizeTextForComparison(text) {
        if (!text) return '';
        return normalizeTextBasic(text)
            .replace(/\s+/g, ' ')  // Múltiplos espaços em um só
            .trim()
            .toLowerCase();
    }
    
    // Função auxiliar para normalizar URL de imagem (extrair ID do Google Drive)
    function normalizeImageUrl(url) {
        if (!url) return '';
        
        // Se é Google Drive, extrair ID
        if (url.includes('/file/d/')) {
            const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                return match[1];
            }
        }
        
        if (url.includes('id=')) {
            const match = url.match(/id=([a-zA-Z0-9_-]+)/);
            if (match) {
                return match[1];
            }
        }
        
        // Se não é Google Drive, normalizar a URL (remover parâmetros de query)
        try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname;
        } catch {
            return url;
        }
    }
    
    // Função para criar chave única do produto
    function createProductKey(product) {
        const normalizedName = normalizeTextForComparison(product.name || '');
        const normalizedBrand = normalizeTextForComparison(product.brand || '');
        const normalizedImage = normalizeImageUrl(product.image || '');
        
        // Criar chave única: nome + marca + imagem
        // Se não tem imagem, usar apenas nome + marca
        if (normalizedImage) {
            return `${normalizedName}|${normalizedBrand}|${normalizedImage}`;
        } else {
            return `${normalizedName}|${normalizedBrand}`;
        }
    }
    
    const seen = new Map();
    const uniqueProducts = [];
    const duplicates = [];
    
    products.forEach((product, index) => {
        const key = createProductKey(product);
        
        if (seen.has(key)) {
            // Produto duplicado encontrado - SUBSTITUIR o anterior pelo novo (manter o último)
            const originalIndex = seen.get(key);
            const originalProduct = uniqueProducts[originalIndex];
            
            duplicates.push({
                original: originalProduct,
                duplicate: product,
                originalIndex: originalIndex,
                duplicateIndex: index
            });
            
            // Substituir o produto anterior pelo novo (manter sempre o último encontrado)
            uniqueProducts[originalIndex] = product;
        } else {
            // Produto único, adicionar ao resultado
            seen.set(key, uniqueProducts.length);
            uniqueProducts.push(product);
        }
    });
    
    // Log de duplicados encontrados
    if (duplicates.length > 0) {
        console.log(`⚠️ [DEDUPLICAÇÃO] Encontrados ${duplicates.length} produto(s) duplicado(s) na home:`);
        duplicates.forEach((dup, idx) => {
            console.log(`  ${idx + 1}. "${dup.duplicate.name}" (marca: ${dup.duplicate.brand || 'N/A'}) - SUBSTITUIU "${dup.original.name}" (mantido o último encontrado)`);
        });
        console.log(`✅ [DEDUPLICAÇÃO] Mantidos ${uniqueProducts.length} produto(s) únicos (de ${products.length} total) - sempre mantendo o último item encontrado`);
    }
    
    return uniqueProducts;
}

// Carregar produtos da planilha
async function loadBrandProducts() {
    try {
        console.log('🔄 Iniciando carregamento da planilha via Apps Script...');
        
        // Usar Apps Script JSON em vez de gviz
        const response = await fetchFromAppsScript();
        console.log(`✅ Resposta do Apps Script recebida: ${response.items?.length || 0} itens`);
        
        let rows = appsScriptJsonToObjects(response);
        console.log(`📊 Total de produtos processados: ${rows.length}`);
        
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
        
        const allProducts = [];
        
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
            
            // Processar cores (mesmas colunas candidatas que o catálogo)
            const corPlanilha = row.cor || row.col_11 || row.cor_produto || row.color || row.colors || '';
            let colors = [];
            let colorNames = [];
            if (corPlanilha && corPlanilha.trim() !== '') {
                const coresLista = parseList(corPlanilha);
                colorNames = coresLista.map(c => String(c).trim()).filter(Boolean);
                colors = colorNames.map(cor => ({
                    name: cor.trim(),
                    value: '#' + Math.floor(Math.random()*16777215).toString(16)
                }));
            }
            
            const categoryRaw = row.tipo || row.categoria || row.tipo_produto || '';
            const category = normalizeCategory(categoryRaw);
            const productType = String(row.tipo_produto || row.type || '').trim();
            
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
                description,
                category,
                productType,
                corRaw: corPlanilha || '',
                colorNames
            };
            
            allProducts.push(product);
            
            // Adicionar ao array da marca correta (comparação case-insensitive)
            const brandNormalized = brandRaw.trim();
            Object.keys(productsByBrand).forEach(targetBrand => {
                if (brandNormalized.toLowerCase().includes(targetBrand.toLowerCase()) || 
                    targetBrand.toLowerCase().includes(brandNormalized.toLowerCase())) {
                    productsByBrand[targetBrand].push(product);
                }
            });
        });
        
        // Remover produtos duplicados de cada marca
        Object.keys(productsByBrand).forEach(brand => {
            const antes = productsByBrand[brand].length;
            productsByBrand[brand] = removeDuplicateProducts(productsByBrand[brand]);
            const depois = productsByBrand[brand].length;
            if (antes !== depois) {
                console.log(`📊 ${brand}: ${antes} → ${depois} produtos (${antes - depois} duplicados removidos)`);
            }
        });
        
        // Mostrar quantos produtos foram encontrados por marca
        console.log('📊 Produtos por marca (após deduplicação):');
        Object.keys(productsByBrand).forEach(brand => {
            console.log(`  ${brand}: ${productsByBrand[brand].length} produtos`);
        });
        
        return { productsByBrand, allProducts };
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
        carousel.innerHTML = '<div class="carousel-empty">Nenhum produto encontrado com esses critérios</div>';
        return;
    }
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'carousel-product-card';
        card.innerHTML = `
            <div class="carousel-product-image">
                <img src="${product.image || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23f0f0f0\' width=\'200\' height=\'200\'/%3E%3Ctext fill=\'%23999\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3ESem Imagem%3C/text%3E%3C/svg%3E'}" 
                     alt="${product.name}"
                     loading="lazy" decoding="async"
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
    
    const loaded = await loadBrandProducts();
    
    if (!loaded) {
        console.error('❌ Falha ao carregar produtos');
        return;
    }
    
    const { productsByBrand, allProducts: flatAll } = loaded;
    
    // Armazenar todos os produtos globalmente para o cart-handler poder acessar
    if (typeof allProducts !== 'undefined') {
        allProducts.length = 0;
        flatAll.forEach(p => allProducts.push(p));
        console.log(`📦 Total de produtos (lista plana): ${allProducts.length}`);
    }
    
    // Botas + bolsas — intercaladas (mesmo padrão de mistura das paletas)
    const bootsBagsList = mixBootsAndBags(
        flatAll.filter(p => isBootProduct(p) || isBagProduct(p))
    ).slice(0, 24);
    renderBrandCarousel('boots', bootsBagsList);
    setupCarouselNavigation('boots');
    
    // Cores em destaque — blocos mutuamente exclusivos: quente sem frio; frio sem quente
    PALETTE_HIGHLIGHTS.forEach(pal => {
        let matched;
        if (pal.carouselKey === 'palette-0') {
            matched = flatAll.filter(
                p =>
                    productMatchesColorKeywords(p, WARM_PALETTE_KEYWORDS) &&
                    !productMatchesColorKeywords(p, COLD_PALETTE_KEYWORDS)
            );
        } else {
            matched = flatAll.filter(
                p =>
                    productMatchesColorKeywords(p, COLD_PALETTE_KEYWORDS) &&
                    !productMatchesColorKeywords(p, WARM_PALETTE_KEYWORDS)
            );
        }
        const mixed = mixPaletteProducts(matched).slice(0, 24);
        renderBrandCarousel(pal.carouselKey, mixed);
        setupCarouselNavigation(pal.carouselKey);
    });
    
    // Para cada marca, pegar 10 produtos aleatórios e renderizar
    Object.keys(BRAND_MAPPING).forEach(brandKey => {
        const brandName = BRAND_MAPPING[brandKey];
        const allBrandProducts = productsByBrand[brandName] || [];
        const selectedProducts = getRandomProducts(allBrandProducts, 10);
        
        console.log(`✅ ${brandName}: ${selectedProducts.length} produtos`);
        
        renderBrandCarousel(brandKey, selectedProducts);
        setupCarouselNavigation(brandKey);
    });
    
    console.log('✅ Carrosséis da home carregados!');
}

// Carrosséis após pintura inicial: libera CPU/rede para o primeiro frame (LCP)
function scheduleInitializeBrandCarousels() {
    const run = () => initializeBrandCarousels();
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(run, { timeout: 2500 });
    } else {
        setTimeout(run, 0);
    }
}

document.addEventListener('DOMContentLoaded', scheduleInitializeBrandCarousels);

