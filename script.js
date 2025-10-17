// Preload da imagem de fundo (apenas se hero existir)
document.addEventListener('DOMContentLoaded', function() {
    const hero = document.querySelector('.hero');
    if (hero) {
    const img = new Image();
    
    img.onload = function() {
        hero.classList.add('loaded');
    };
    
    img.src = 'images/fundo1.jpg';
    }
});

// Dados dos produtos (vazios, preenchidos via Google Sheets)
const products = [];

// Cache de produtos para evitar recarregamento
let productsCache = null;
let isLoadingProducts = false;

// Função otimizada para carregar produtos com filtros pré-aplicados
async function loadProductsWithPreFilter(urlParams = null) {
    // Se já está carregando, aguardar
    if (isLoadingProducts) {
        return new Promise((resolve) => {
            const checkLoading = () => {
                if (!isLoadingProducts) {
                    resolve();
                } else {
                    setTimeout(checkLoading, 100);
                }
            };
            checkLoading();
        });
    }
    
    // Se já temos cache e não há filtros específicos, usar cache
    if (productsCache && !urlParams) {
        console.log(`⚡ Usando cache de produtos (${productsCache.length} produtos)`);
        return productsCache;
    }
    
    isLoadingProducts = true;
    console.log(`🚀 Carregando produtos da planilha...`);
    
    try {
        const data = await fetchGviz();
        const rows = data.table.rows;
        const allProducts = rowsToObjects(rows);
        
        // Armazenar no cache
        productsCache = allProducts;
        
        // Se há filtros da URL, aplicar durante o carregamento
        if (urlParams) {
            const categoria = urlParams.get('categoria');
            const tipo = urlParams.get('tipo');
            const marca = urlParams.get('marca');
            
            console.log(`🎯 Aplicando filtros durante carregamento: categoria=${categoria}, tipo=${tipo}, marca=${marca}`);
            
            // Filtrar produtos durante o carregamento
            let filteredProducts = allProducts;
            
            if (categoria) {
                filteredProducts = filteredProducts.filter(p => 
                    p.category === categoria || 
                    (categoria === 'roupas' && ['roupas', 'elegante', 'casual'].includes(p.category))
                );
            }
            
            if (tipo) {
                filteredProducts = filteredProducts.filter(p => 
                    p.type && normalizeTextBasic(p.type).includes(normalizeTextBasic(tipo))
                );
            }
            
            if (marca) {
                filteredProducts = filteredProducts.filter(p => 
                    p.brand && normalizeTextBasic(p.brand).includes(normalizeTextBasic(marca))
                );
            }
            
            console.log(`✅ Produtos filtrados durante carregamento: ${filteredProducts.length} de ${allProducts.length}`);
        }
        
        isLoadingProducts = false;
        return allProducts;
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        isLoadingProducts = false;
        return [];
    }
}

// Produtos de Calçados (vazios, preenchidos via Google Sheets)
const calcadosProducts = [];

// Produtos de Acessórios (vazios, preenchidos via Google Sheets)
const acessoriosProducts = [];

// Estado da aplicação
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let filteredProducts = [...products];

// Elementos DOM
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const productsGrid = document.getElementById('productsGrid');

// Inicialização otimizada
document.addEventListener('DOMContentLoaded', async function() {
    console.log(`🚀 Catálogo carregado - aplicando filtros da URL...`);
    
    // Mostrar loading spinner
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }
    
    // Verificar se há filtros na URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasFilters = urlParams.get('categoria') || urlParams.get('tipo') || urlParams.get('marca');
    
    try {
        // Carregar produtos com filtros pré-aplicados se necessário
        if (hasFilters) {
            await loadProductsWithPreFilter(urlParams);
        } else {
            await loadProductsWithPreFilter();
        }
        
        // Inicializar catálogo
        await initializeCatalogFromSheets();
        
        // Aplicar filtros da URL (se houver) e aguardar conclusão
        if (hasFilters) {
            console.log(`🎯 Aplicando filtros finais...`);
            await applyFiltersFromURLWithDelay();
            
            // Aguardar mais um pouco para garantir que a renderização foi concluída
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Atualizar UI
    updateCartUI();
    setupEventListeners();
    setupSupportModals();
    setupHelpTooltip();
        
        // Aguardar um pouco mais para garantir que tudo foi renderizado
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verificar se há produtos renderizados antes de ocultar o spinner
        const hasRenderedProducts = checkIfProductsAreRendered();
        if (!hasRenderedProducts) {
            console.log(`⏳ Aguardando produtos serem renderizados...`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
    } finally {
        // Ocultar loading spinner apenas quando tudo estiver pronto
        if (loadingSpinner) {
            console.log(`✅ Carregamento concluído - ocultando spinner`);
            loadingSpinner.classList.add('hidden');
        }
    }
});

// Event Listeners
function setupEventListeners() {
    cartBtn.addEventListener('click', toggleCartModal);
    closeCart.addEventListener('click', toggleCartModal);
    checkoutBtn.addEventListener('click', handleCheckout);
    
    // Botão "Ver Todas" - mostrar todas as seções
    const clearAllBtn = document.getElementById('clearAllFilters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            console.log(`🔄 Limpando todos os filtros e mostrando todas as seções`);
            
            // Mostrar todas as seções
            const allCategories = ['roupas', 'calcados', 'acessorios'];
            allCategories.forEach(category => {
                const section = document.getElementById(category);
                if (section) {
                    section.style.display = 'block';
                }
                
                // Limpar filtros de cada categoria
                clearFilters(category);
            });
            
            // Limpar URL (remover parâmetros)
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Scroll para o topo
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Busca
    const searchBtn = document.querySelector('.search-btn');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    if (searchBtn && searchBar && searchInput) {
        searchBtn.addEventListener('click', function() {
            searchBar.classList.toggle('active');
            if (searchBar.classList.contains('active')) {
                searchInput.focus();
            } else {
                searchInput.value = '';
                handleSearch('');
            }
        });
        
        searchInput.addEventListener('input', function() {
            handleSearch(this.value);
        });
        
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                searchInput.value = '';
                handleSearch('');
                searchBar.classList.remove('active');
            }
        });
        
        if (clearSearch) {
            clearSearch.addEventListener('click', function() {
                searchInput.value = '';
                handleSearch('');
                searchInput.focus();
            });
        }
    }
    
    // Menu mobile
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.querySelector('.nav-menu');
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
            
            // Prevenir scroll do body quando menu estiver aberto
            if (navMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // Fechar menu ao clicar em um link
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
                document.body.style.overflow = '';
            });
        });
    }
    
    // Fechar modal clicando fora
    cartModal.addEventListener('click', function(e) {
        if (e.target === cartModal) {
            toggleCartModal();
        }
    });
    
    // Fechar menu mobile ao redimensionar janela
    window.addEventListener('resize', function() {
        if (window.innerWidth > 862) {
            navMenu.classList.remove('active');
            if (mobileMenuBtn) {
                const icon = mobileMenuBtn.querySelector('i');
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
            document.body.style.overflow = '';
        }
    });
    
    // Scroll suave para seções
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
}


// =====================
// Integração Google Sheets
// =====================

// CONFIGURAÇÃO DA PLANILHA GOOGLE SHEETS
// Planilha: https://docs.google.com/spreadsheets/d/1Uxb3myMXc8SFklQQAk6LJB85yoMHl39tjdnC5wsu3xY/edit
const SHEET_CONFIG = {
    spreadsheetId: '1Uxb3myMXc8SFklQQAk6LJB85yoMHl39tjdnC5wsu3xY',
    tabs: {
        produtos: 'Produtos' // Uma única aba com todos os produtos
    },
    // ID da pasta do Google Drive onde estão as fotos
    driveFolderId: 'COLOQUE_AQUI_O_ID_DA_SUA_PASTA' // Substitua pelo ID da sua pasta
};

function buildGvizUrl(spreadsheetId, sheetName) {
    // Endpoint gviz retorna JS com prefixo/sufixo, vamos extrair o JSON
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

// Função para converter nome do arquivo em URL do Google Drive
function convertFileNameToDriveUrl(fileName) {
    if (!fileName || fileName.trim() === '') return '';
    
    // Se já é uma URL completa, converte para formato direto
    if (fileName.startsWith('http')) {
        return convertGoogleDriveUrl(fileName);
    }
    
    // Se é apenas o nome do arquivo, precisa buscar o ID real do arquivo
    // Por enquanto, vamos usar uma abordagem diferente
    console.log('Tentando carregar arquivo:', fileName);
    
    // Tentar diferentes formatos de URL
    const possibleUrls = [
        `https://drive.google.com/thumbnail?id=${fileName}&sz=w1000`,
        `https://lh3.googleusercontent.com/d/${fileName}`,
        `https://drive.google.com/uc?export=view&id=${fileName}`
    ];
    
    return possibleUrls[0]; // Retorna a primeira opção
}

// Função para converter URL do Google Drive para formato direto
function convertGoogleDriveUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    // Debug removido
    
    // Se já está no formato correto, retorna como está
    if (url.includes('/uc?export=view&id=')) {
        // URL já no formato correto
        return url;
    }
    
    // Extrair ID do arquivo da URL - diferentes formatos
    let fileId = null;
    
    // Formato: /file/d/ID/view
    const idMatch1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch1) {
        fileId = idMatch1[1];
    }
    
    // Formato: /open?id=ID
    const idMatch2 = url.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
    if (idMatch2) {
        fileId = idMatch2[1];
    }
    
    // Formato: id=ID
    const idMatch3 = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch3) {
        fileId = idMatch3[1];
    }
    
    if (fileId) {
        // Tentar múltiplas opções para contornar CORS
        const options = [
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
            `https://lh3.googleusercontent.com/d/${fileId}`,
            `https://drive.google.com/uc?export=view&id=${fileId}`,
            `https://images.weserv.nl/?url=drive.google.com/uc?export=view&id=${fileId}`
        ];
        
        // URLs geradas para fallback
        return options[0]; // Retorna a primeira opção (thumbnail)
    }
    
    // URL não convertida
    return url;
}

// Função para extrair URL de imagem embutida do Google Sheets
function extractEmbeddedImageUrl(cellValue) {
    if (!cellValue) return '';
    
    // Se já é uma URL, retorna como está
    if (cellValue.startsWith('http')) return cellValue;
    
    // Se contém dados de imagem embutida (base64 ou referência)
    if (cellValue.includes('data:image') || cellValue.includes('blob:')) {
        return cellValue;
    }
    
    // Se é uma referência de imagem do Google Sheets
    if (cellValue.includes('=IMAGE(')) {
        // Extrair URL da função IMAGE
        const urlMatch = cellValue.match(/=IMAGE\("([^"]+)"/);
        if (urlMatch) {
            return urlMatch[1];
        }
    }
    
    // Se não conseguir extrair, retorna vazio
    return '';
}

async function fetchGviz(spreadsheetId, sheetName) {
    const url = buildGvizUrl(spreadsheetId, sheetName);
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // Formato típico: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
    let data;
    // 1) Tenta regex direta
    const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
    if (match && match[1]) {
        data = JSON.parse(match[1]);
        return data;
    }
    // 2) Fallback: procurar primeiro '{' e último '}' e tentar parsear
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
        const maybeJson = text.slice(first, last + 1);
        data = JSON.parse(maybeJson);
        return data;
    }
    throw new Error('Formato GViz inesperado');
}

function rowsToObjects(table) {
    // Alguns retornos gviz não trazem labels nas colunas.
    // Nesses casos, usamos a primeira linha como header.
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
    }

    // Caso labels existam, usamos diretamente
    const normLabels = labels.map(l => normalizeTextBasic(l));
    return rows.map(r => {
        const obj = {};
        (r.c || []).forEach((cell, idx) => {
            const key = normLabels[idx] || `col_${idx}`;
            obj[key] = cellValue(cell);
        });
        return obj;
    });
}

function parseNumberBR(value) {
    if (typeof value === 'number') return value;
    if (!value) return null;
    
    try {
        // aceita "1.234,56" ou "1234,56" ou "1234.56"
        let v = String(value).trim();
        
        // Se contém caracteres não numéricos (exceto vírgula, ponto e espaços), retorna null
        if (!/^[\d\s,\.]+$/.test(v)) {
            return null;
        }
        
        // Se tem vírgula, é formato brasileiro (1.234,56 ou 1234,56)
        if (v.includes(',')) {
            // Remove pontos de milhares (1.234,56 -> 1234,56)
            v = v.replace(/\./g, '');
            // Converte vírgula para ponto decimal (1234,56 -> 1234.56)
            v = v.replace(/,/g, '.');
        }
        // Se não tem vírgula, já está em formato americano (1234.56)
        
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
    } catch (error) {
        console.error('Erro ao processar número:', value, error);
        return null;
    }
}

function normalizeTextBasic(value) {
    if (!value) return '';
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCategory(raw) {
    const v = normalizeTextBasic(raw);
    if (v.startsWith('calcad')) return 'calcados';
    if (v.startsWith('acessori')) return 'acessorios';
    if (v.startsWith('roup')) return 'roupas';
    if (v.startsWith('casual')) return 'roupas';
    if (v.startsWith('elegant')) return 'roupas';
    return 'roupas';
}

function parseList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value)
        .split(/[,;]\s*/)
        .map(s => s.trim())
        .filter(Boolean)
        .filter(item => {
            // Filtrar mensagens de erro de vídeo
            const errorMessages = [
                'Vídeo não encontrado',
                'Video não encontrado', 
                'N/A',
                'Nenhum',
                'Sem vídeo',
                'Não disponível',
                'Vídeo indisponível',
                'Video indisponível',
                'Sem dados',
                'Nenhum vídeo'
            ];
            return !errorMessages.includes(item);
        });
}

function parseColors(value) {
    // Aceita formatos:
    // "Preto:#000000, Branco:#ffffff" ou somente "Preto, Branco" (sem HEX)
    if (!value) return [];
    const parts = String(value).split(/[,;]\s*/).map(p => p.trim()).filter(Boolean);
    return parts.map((p) => {
        const [name, hex] = p.split(/:\s*/);
        return {
            name: (name || p).trim(),
            value: (hex || '#cccccc').trim()
        };
    });
}

// Função para gerar valor hexadecimal baseado no nome da cor
function generateColorValue(colorName) {
    const colorMap = {
        'preto': '#000000',
        'branco': '#ffffff',
        'cinza': '#808080',
        'azul': '#0000ff',
        'vermelho': '#ff0000',
        'verde': '#008000',
        'amarelo': '#ffff00',
        'rosa': '#ffc0cb',
        'roxo': '#800080',
        'laranja': '#ffa500',
        'marrom': '#a52a2a',
        'bege': '#f5f5dc',
        'azul claro': '#add8e6',
        'azul escuro': '#00008b',
        'verde claro': '#90ee90',
        'verde escuro': '#006400',
        'vermelho claro': '#ffcccb',
        'vermelho escuro': '#8b0000',
        'amarelo claro': '#ffffe0',
        'amarelo escuro': '#b8860b',
        'rosa claro': '#ffb6c1',
        'rosa escuro': '#c71585',
        'roxo claro': '#dda0dd',
        'roxo escuro': '#4b0082',
        'laranja claro': '#ffd700',
        'laranja escuro': '#ff8c00',
        'marrom claro': '#deb887',
        'marrom escuro': '#654321',
        'bege claro': '#faf0e6',
        'bege escuro': '#d2b48c'
    };
    
    const normalizedName = colorName.toLowerCase().trim();
    return colorMap[normalizedName] || '#cccccc'; // Cor padrão se não encontrar
}

function mapRowToProduct(row, index) {
    // Mapeamento para as colunas da planilha: tipo, nome, preco, tamanho, descricao, imagem
    const id = Date.now() + index; // Gera ID único baseado no timestamp + índice
    const name = row.nome || `Produto ${index + 1}`;
    
    // Processar preços - pode ser fixo ou por cor
    // Tentar diferentes possibilidades de nome da coluna de preço
    let precoPlanilha = row.preco || row.preço || row.preco_produto || row.price || row.col_5 || row.col_f || '';
    
    // Se o preço está vazio, tentar buscar preços por cor em uma coluna separada
    // Seguindo a mesma lógica de tamanhos por cor
    if (!precoPlanilha) {
        // Tentar buscar preços por cor em colunas extras (como col_12, col_13, etc.)
        const colunasExtras = [
            row.col_12, row.col_13, row.col_14, row.col_15, row.col_16,
            row.col_17, row.col_18, row.col_19
        ];
        
        for (const coluna of colunasExtras) {
            if (coluna && String(coluna).trim() !== '' && String(coluna).includes('=')) {
                precoPlanilha = coluna;
                break;
            }
        }
    }
    
    let price = 0; // Preço padrão
    let pricesByColor = {}; // Preços por cor
    
    if (precoPlanilha && String(precoPlanilha).trim() !== '') {
        // Verificar se está no formato "Cor=preço. Cor=preço"
        if (String(precoPlanilha).includes('=')) {
            // Processar formato "Cor=preço. Cor=preço"
            const colorPricePairs = String(precoPlanilha).split('.').filter(Boolean);
            
            colorPricePairs.forEach(pair => {
                const trimmedPair = pair.trim();
                if (trimmedPair.includes('=')) {
                    const [color, priceStr] = trimmedPair.split('=');
                    if (color && priceStr) {
                        const colorName = color.trim();
                        const priceValue = parseNumberBR(priceStr.trim());
                        if (priceValue !== null) {
                            pricesByColor[colorName] = priceValue;
                        }
                    }
                }
            });
            
            // Se há preços por cor, calcular range de preços
            const precoValues = Object.values(pricesByColor);
            const minPrice = Math.min(...precoValues);
            const maxPrice = Math.max(...precoValues);
            
            // Se há apenas um preço, usar ele diretamente
            if (minPrice === maxPrice) {
                price = minPrice;
            } else {
                // Se há múltiplos preços, usar o menor como preço base
                // O range será exibido na interface
                price = minPrice;
            }
        } else {
            // Formato antigo: preço fixo
            price = parseNumberBR(precoPlanilha) ?? 0;
        }
    }
    
    const oldPrice = null; // Não temos preço antigo na planilha
    
    // Debug: mostrar todas as chaves disponíveis no row para entender o mapeamento
    if (index === 0) { // Só mostrar para o primeiro produto para não poluir o console
        // console.log('🔍 Chaves disponíveis no objeto row:', Object.keys(row));
        // console.log('🔍 Conteúdo completo do primeiro produto:', row);
    }
    
    const image = convertGoogleDriveUrl(row.imagem || '');
    const badge = null; // Não temos badge na planilha
    const category = normalizeCategory(row.tipo);
    const description = row.descricao || '';
    
    // Para tamanhos, vamos usar o que está na coluna "tamanho" ou array vazio se não houver
    const tamanhoPlanilha = row.tamanho || '';
    let sizes = [];
    let sizesByColor = {};
    
    if (tamanhoPlanilha && tamanhoPlanilha.trim() !== '') {
        // console.log(`🔍 Processando tamanhos para ${name}:`, tamanhoPlanilha);
        
        // Verificar se está no formato "Cor=tamanho1,tamanho2"
        if (tamanhoPlanilha.includes('=')) {
            // Processar formato "Cor=tamanho1,tamanho2"
            // Dividir por ponto e vírgula primeiro, depois processar cada par
            const colorSizePairs = tamanhoPlanilha.split('.').filter(Boolean);
            // console.log(`🔍 Pares cor-tamanho encontrados:`, colorSizePairs);
            
            colorSizePairs.forEach(pair => {
                const trimmedPair = pair.trim();
                if (trimmedPair.includes('=')) {
                    const [color, sizesStr] = trimmedPair.split('=');
                    if (color && sizesStr) {
                        const colorName = color.trim();
                        const sizeList = sizesStr.split(',').map(s => s.trim()).filter(Boolean);
                        sizesByColor[colorName] = sizeList;
                        // console.log(`🔍 Cor "${colorName}" tem tamanhos:`, sizeList);
                    }
                }
            });
            
            // console.log(`🔍 Tamanhos por cor processados:`, sizesByColor);
            // Se há tamanhos por cor, usar array vazio para sizes (será preenchido dinamicamente)
            sizes = [];
        } else {
            // Formato antigo: lista simples de tamanhos
            sizes = parseList(tamanhoPlanilha);
            // console.log(`🔍 Tamanhos formato antigo:`, sizes);
        }
    }
    
    // Para cores, vamos usar o que está na coluna L da planilha (índice 11)
    // Tentar diferentes possibilidades de nome da coluna
    const corPlanilha = row.cor || row.col_11 || row.cor_produto || row.color || row.colors || '';
    let colors = [];
    
    if (corPlanilha && corPlanilha.trim() !== '') {
        // console.log(`🎨 Cores encontradas na planilha para ${name}:`, corPlanilha);
        // Se há cores na planilha, processar a lista de cores
        const coresLista = parseList(corPlanilha);
        // console.log(`🎨 Lista de cores parseada:`, coresLista);
        colors = coresLista.map(cor => {
            // Se a cor já está no formato {name, value}, usar diretamente
            if (typeof cor === 'object' && cor.name && cor.value) {
                return cor;
            }
            // Se é apenas o nome da cor, gerar um valor hexadecimal
            const corName = cor.trim();
            const corValue = generateColorValue(corName);
            return { name: corName, value: corValue };
        });
        // console.log(`🎨 Cores processadas:`, colors);
    } else {
        // Se não há cores na planilha, usar array vazio em vez de cores padrão
        colors = [];
    }

    // Nova estrutura: Coluna I = fotos, Coluna J = vídeos
    const fotos = parseList(row.fotos || row.imagens || row.imagem || '');
    const videos = parseList(row.videos || row.video || '');
    
    // console.log('📸 Fotos encontradas:', fotos.length);
    // console.log('🎬 Vídeos encontrados:', videos.length);
    
    // Converter URLs das fotos
    const fotosConvertidas = fotos.map(foto => convertGoogleDriveUrl(foto));
    
    // Converter URLs dos vídeos
    const videosConvertidos = videos.map(video => convertGoogleDriveUrl(video));
    
    // Criar galeria: fotos primeiro, vídeos por último
    const gallery = [...fotosConvertidas, ...videosConvertidos];
    
    // Calcular índices dos vídeos (sempre no final da galeria)
    const videoIndices = [];
    for (let i = fotosConvertidas.length; i < gallery.length; i++) {
                videoIndices.push(i);
    }
    
    // console.log('🖼️ Galeria organizada:', {
    //     total: gallery.length,
    //     fotos: fotosConvertidas.length,
    //     videos: videosConvertidos.length,
    //     videoIndices: videoIndices
    // });
    
    // Detecção automática removida - agora usamos colunas específicas I (fotos) e J (vídeos)
    
    // Detecção automática completamente removida - usando apenas colunas I e J
    
    // Todas as detecções automáticas foram removidas - usando apenas colunas I e J
    
    // Sistema simplificado: apenas colunas I (fotos) e J (vídeos)

    // Adicionar campos para filtros - usar coluna B da planilha como público
    const publico = row.categoria || null; // coluna B = categoria (masculino, feminino, infantil)
    const material = row.material || null; // coluna D = material (só se existir)
    const type = row.tipo_produto || null; // coluna E = tipo (só se existir)
    const brand = row.marca || null; // coluna E = marca (só se existir)
    
    // Coluna G (chamada "tamanho" na planilha) = tamanho do produto para ordenação
    // Para acessórios: pequeno, médio, grande
    // IMPORTANTE: Salvar ANTES de usar row.tamanho para outras coisas
    const productSize = row.tamanho || null;

    // Calcular range de preços se houver preços por cor
    let priceRange = null;
    if (pricesByColor && Object.keys(pricesByColor).length > 1) {
        const precoValues = Object.values(pricesByColor);
        const minPrice = Math.min(...precoValues);
        const maxPrice = Math.max(...precoValues);
        priceRange = { min: minPrice, max: maxPrice };
    }
    
    return { id, name, price, oldPrice, image, badge, category, sizes, sizesByColor, colors, description, gallery, videoIndices, publico, material, type, brand, pricesByColor, priceRange, productSize };
}


// Função para ordenar produtos por cor (do mais claro ao mais escuro)
function sortProductsByColor(products) {
    if (!products || products.length === 0) return [];
    
    // Ordem das cores do mais claro ao mais escuro
    const colorOrder = {
        'branco': 1,
        'bege': 2,
        'creme': 3,
        'amarelo': 4,
        'laranja': 5,
        'rosa': 6,
        'vermelho': 7,
        'caramelo': 8,
        'dourado': 9,
        'azul': 10,
        'verde': 11,
        'marrom': 12,
        'cinza': 13,
        'preto': 14,
        'outros': 999
    };
    
    return [...products].sort((a, b) => {
        // Pegar a primeira cor de cada produto
        const colorA = getFirstColor(a.colors || a.color || 'outros');
        const colorB = getFirstColor(b.colors || b.color || 'outros');
        
        const orderA = colorOrder[colorA] || 999;
        const orderB = colorOrder[colorB] || 999;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        // Se têm a mesma cor, manter ordem original
        return 0;
    });
}

// Função para extrair a primeira cor de uma string de cores
function getFirstColor(colorString) {
    if (!colorString) return 'outros';
    
    // Se é um array de objetos com name/value
    if (Array.isArray(colorString)) {
        if (colorString.length > 0) {
            const firstColor = colorString[0];
            if (typeof firstColor === 'object' && firstColor.name) {
                return normalizeColorName(firstColor.name);
            } else if (typeof firstColor === 'string') {
                return normalizeColorName(firstColor);
            }
        }
        return 'outros';
    }
    
    // Se é uma string, dividir por vírgulas ou ponto e vírgula
    if (typeof colorString === 'string') {
        const colors = colorString.toLowerCase().split(/[,;]/).map(c => c.trim());
        const firstColor = colors[0] || 'outros';
        return normalizeColorName(firstColor);
    }
    
    return 'outros';
}

// Função para normalizar nomes de cores
function normalizeColorName(colorName) {
    if (!colorName) return 'outros';
    
    const color = colorName.toLowerCase().trim();
    
    // Normalizar variações de nomes de cores (do mais claro ao mais escuro)
    
    // BRANCO e tons muito claros
    if (color.includes('branco') || color.includes('white') || 
        color.includes('off-white') || color.includes('offwhite') ||
        color.includes('off white') || color.includes('gelo') ||
        color.includes('linho')) return 'branco';
    
    // BEGE e tons nude/areia
    if (color.includes('bege') || color.includes('beige') || 
        color.includes('nude') || color.includes('areia') ||
        color.includes('arenito') || color.includes('sand') ||
        color.includes('champagne') || color.includes('champanhe')) return 'bege';
    
    // CREME e tons claros quentes
    if (color.includes('creme') || color.includes('cream') ||
        color.includes('marfim') || color.includes('ivory') ||
        color.includes('cappuccino') || color.includes('cappucino')) return 'creme';
    
    // AMARELO e tons amarelados
    if (color.includes('amarelo') || color.includes('yellow') ||
        color.includes('melancia') || color.includes('limão')) return 'amarelo';
    
    // LARANJA e tons terrosos claros
    if (color.includes('laranja') || color.includes('orange') ||
        color.includes('coral') || color.includes('damasco')) return 'laranja';
    
    // ROSA e tons rosados (incluindo variações)
    if (color.includes('rosa') || color.includes('pink') ||
        color.includes('salmão') || color.includes('salmon') ||
        color.includes('salmao') || color.includes('rosa claro') ||
        color.includes('rosa-claro') || color.includes('rosé')) return 'rosa';
    
    // VERMELHO e tons avermelhados
    if (color.includes('vermelho') || color.includes('red') ||
        color.includes('vinho') || color.includes('bordô') ||
        color.includes('bordo') || color.includes('burgundy') ||
        color.includes('rubi') || color.includes('cereja')) return 'vermelho';
    
    // CARAMELO e tons médios quentes
    if (color.includes('caramelo') || color.includes('caramel') ||
        color.includes('caramello') || color.includes('mel') ||
        color.includes('honey') || color.includes('cognac') ||
        color.includes('whisky') || color.includes('whiskey')) return 'caramelo';
    
    // DOURADO e tons metálicos claros
    if (color.includes('dourado') || color.includes('dourada') || 
        color.includes('gold') || color.includes('ouro')) return 'dourado';
    
    // AZUL e tons azulados
    if (color.includes('azul') || color.includes('blue') ||
        color.includes('marinho') || color.includes('navy') ||
        color.includes('royal') || color.includes('turquesa')) return 'azul';
    
    // VERDE e tons esverdeados
    if (color.includes('verde') || color.includes('green') ||
        color.includes('militar') || color.includes('oliva') ||
        color.includes('musgo') || color.includes('limão')) return 'verde';
    
    // MARROM e tons castanhos
    if (color.includes('marrom') || color.includes('brown') ||
        color.includes('castanho') || color.includes('chocolate') ||
        color.includes('café') || color.includes('coffee') ||
        color.includes('tabaco') || color.includes('tan') ||
        color.includes('terra') || color.includes('camel')) return 'marrom';
    
    // CINZA e tons acinzentados (incluindo variações)
    if (color.includes('cinza') || color.includes('gray') || 
        color.includes('grey') || color.includes('grafite') ||
        color.includes('graphite') || color.includes('chumbo') ||
        color.includes('prata') || color.includes('silver') ||
        color.includes('cinza escuro') || color.includes('cinza-escuro') ||
        color.includes('cinza claro') || color.includes('cinza-claro') ||
        color.includes('mescla') || color.includes('carvão') ||
        color.includes('carvao')) return 'cinza';
    
    // PRETO e tons muito escuros
    if (color.includes('preto') || color.includes('preta') || 
        color.includes('black') || color.includes('negro') ||
        color.includes('ônix') || color.includes('onix') ||
        color.includes('preto total') || color.includes('all black')) return 'preto';
    
    return 'outros';
}

// Função para agrupar produtos por tipo
function groupProductsByType(products) {
    if (!products || products.length === 0) return [];
    
    // Criar grupos por tipo
    const groups = {};
    
    products.forEach(product => {
        const type = product.type || 'outros';
        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(product);
    });
    
    // Ordenar os grupos por ordem de prioridade (alfabética)
    const sortedGroups = Object.keys(groups).sort();
    
    // Concatenar todos os grupos em ordem
    const groupedProducts = [];
    sortedGroups.forEach(type => {
        groupedProducts.push(...groups[type]);
    });
    
    console.log(`📦 Produtos agrupados por tipo:`, Object.keys(groups).map(type => `${type}: ${groups[type].length}`).join(', '));
    
    return groupedProducts;
}

// Função para agrupar produtos por tipo com ordem personalizada
function groupProductsByTypeWithCustomOrder(products, category) {
    if (!products || products.length === 0) return [];
    
    // Ordem personalizada por categoria
    const customOrder = {
        'calcados': ['bota', 'sandália', 'sandalia', 'sapato', 'tênis', 'tenis', 'chinelo', 'outros'],
        'roupas': ['vestido', 'blusa', 'camisa', 'calça', 'calca', 'short', 'saia', 'outros'],
        'acessorios': ['bolsa', 'mochila', 'carteira', 'cinto', 'outros']
    };
    
    // Criar grupos por tipo
    const groups = {};
    
    products.forEach(product => {
        const type = (product.type || 'outros').toLowerCase().trim();
        let groupKey = type;
        
        // Normalizar variações de nomes
        if (type.includes('sandália') || type.includes('sandalia')) {
            groupKey = 'sandália';
        } else if (type.includes('tênis') || type.includes('tenis')) {
            groupKey = 'tênis';
        } else if (type.includes('calça') || type.includes('calca')) {
            groupKey = 'calça';
        }
        
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(product);
    });
    
    // Ordenar os grupos pela ordem personalizada
    const order = customOrder[category] || Object.keys(groups).sort();
    const groupedProducts = [];
    
    // Adicionar grupos na ordem personalizada
    order.forEach(type => {
        if (groups[type]) {
            // Para todas as categorias, ordenar por cor dentro de cada tipo
            const sortedByColor = sortProductsByColor(groups[type]);
            groupedProducts.push(...sortedByColor);
        }
    });
    
    // Adicionar tipos que não estão na ordem personalizada
    Object.keys(groups).forEach(type => {
        if (!order.includes(type)) {
            // Para todas as categorias, ordenar por cor dentro de cada tipo
            const sortedByColor = sortProductsByColor(groups[type]);
            groupedProducts.push(...sortedByColor);
        }
    });
    
    console.log(`📦 Produtos agrupados por tipo (${category}):`, Object.keys(groups).map(type => `${type}: ${groups[type].length}`).join(', '));
    
    // Log detalhado da ordenação por cor para cada tipo
    Object.keys(groups).forEach(type => {
        const typeProducts = groups[type];
        if (typeProducts.length > 1) {
            const colorOrderDisplay = typeProducts.map(p => {
                const normalizedColor = getFirstColor(p.colors || p.color || 'outros');
                const originalColor = Array.isArray(p.colors) && p.colors.length > 0 
                    ? (typeof p.colors[0] === 'object' ? p.colors[0].name : p.colors[0])
                    : (p.color || 'N/A');
                
                // Destacar cores não reconhecidas
                if (normalizedColor === 'outros') {
                    return `⚠️ ${originalColor}→${normalizedColor}`;
                }
                return `${originalColor}→${normalizedColor}`;
            });
            console.log(`🎨 ${type} ordenado por cor:`, colorOrderDisplay.join(' | '));
            
            // Listar cores não reconhecidas
            const unrecognizedColors = typeProducts
                .filter(p => getFirstColor(p.colors || p.color || 'outros') === 'outros')
                .map(p => Array.isArray(p.colors) && p.colors.length > 0 
                    ? (typeof p.colors[0] === 'object' ? p.colors[0].name : p.colors[0])
                    : (p.color || 'N/A'));
            
            if (unrecognizedColors.length > 0) {
                console.warn(`⚠️ ${type} - Cores não reconhecidas:`, [...new Set(unrecognizedColors)]);
            }
        }
    });
    
    return groupedProducts;
}

// Função para formatar preços com pontos para milhares
function formatPrice(price) {
    return price.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Função para obter o preço correto baseado na cor selecionada
function getProductPrice(product, selectedColor = null) {
    // Se o produto tem preços por cor e uma cor foi selecionada
    if (product.pricesByColor && Object.keys(product.pricesByColor).length > 0 && selectedColor) {
        const colorPrice = product.pricesByColor[selectedColor];
        if (colorPrice !== undefined) {
            return colorPrice;
        }
    }
    
    // Se não tem preços por cor ou cor não foi selecionada, usar preço padrão
    return product.price || 0;
}

// Funções auxiliares removidas - agora usamos apenas dados reais da planilha

async function loadAllProductsFromSheets() {
    const result = { roupas: [], calcados: [], acessorios: [] };
    const { spreadsheetId, tabs } = SHEET_CONFIG;

    // Buscar a única aba "Produtos"
    const response = await fetchGviz(spreadsheetId, tabs.produtos);
    
    let rows = rowsToObjects(response.table);
    
    // Filtrar linhas vazias (sem nome e sem imagem)
    rows = rows.filter(r => (r && (r.nome || r.imagem)));
    
    // Converter cada linha em produto e separar por categoria
    rows.forEach((row, index) => {
        try {
            const product = mapRowToProduct(row, index);
            
            // Separar por categoria baseado na coluna "tipo"
            if (product.category === 'calcados' || product.category === 'calçados') {
                result.calcados.push(product);
            } else if (product.category === 'acessorios' || product.category === 'acessórios') {
                result.acessorios.push(product);
            } else {
                // Qualquer outro tipo vai para roupas (roupas, elegante, casual, etc.)
                result.roupas.push(product);
            }
        } catch (error) {
            console.error(`❌ Erro ao processar linha ${index + 1}:`, error, row);
        }
    });
    
    console.log(`✅ Produtos carregados da planilha:`, {
        roupas: result.roupas.length,
        calcados: result.calcados.length,
        acessorios: result.acessorios.length
    });

    return result;
}

async function initializeCatalogFromSheets() {
    try {
        // Se o ID não foi configurado, mantém os dados locais
        if (!SHEET_CONFIG.spreadsheetId || SHEET_CONFIG.spreadsheetId.startsWith('COLOQUE_')) {
            console.log(`⚠️ ID da planilha não configurado, usando dados locais`);
            renderCategoryProducts();
            return;
        }
        
        // Se já temos cache, usar cache
        if (productsCache && productsCache.length > 0) {
            console.log(`⚡ Usando cache para inicialização (${productsCache.length} produtos)`);
        const data = await loadAllProductsFromSheets();

        // Substitui os arrays locais se veio algo da planilha;
        if (Array.isArray(data.roupas) && data.roupas.length) {
            products.length = 0; data.roupas.forEach(p => products.push(p));
        }
        if (Array.isArray(data.calcados) && data.calcados.length) {
            calcadosProducts.length = 0; data.calcados.forEach(p => calcadosProducts.push(p));
        }
        if (Array.isArray(data.acessorios) && data.acessorios.length) {
            acessoriosProducts.length = 0; data.acessorios.forEach(p => acessoriosProducts.push(p));
        }
        } else {
            console.log(`🚀 Carregando produtos da planilha...`);
            const data = await loadAllProductsFromSheets();

            // Substitui os arrays locais se veio algo da planilha;
            if (Array.isArray(data.roupas) && data.roupas.length) {
                products.length = 0; data.roupas.forEach(p => products.push(p));
            }
            if (Array.isArray(data.calcados) && data.calcados.length) {
                calcadosProducts.length = 0; data.calcados.forEach(p => calcadosProducts.push(p));
            }
            if (Array.isArray(data.acessorios) && data.acessorios.length) {
                acessoriosProducts.length = 0; data.acessorios.forEach(p => acessoriosProducts.push(p));
            }
        }

        renderCategoryProducts();
        generateDynamicFilters(); // Gerar filtros baseados nos dados da planilha
        setTimeout(setupScrollAnimations, 300);
    } catch (err) {
        console.error('❌ Falha ao carregar dados do Google Sheets:', err);
        // Fallback para os dados locais
        renderCategoryProducts();
        generateDynamicFilters(); // Gerar filtros mesmo com dados locais
    }
}


// Função para truncar descrições
function truncateDescription(description, maxLength = 100) {
    if (!description || description.length <= maxLength) {
        return description;
    }
    return description.substring(0, maxLength).trim() + '...';
}

// Função para reorganizar gallery - agora já vem organizada (fotos primeiro, vídeos por último)
function reorganizeGallery(gallery, videoIndices = []) {
    if (!gallery || gallery.length <= 1) {
        return gallery || [];
    }
    
    // A galeria já vem organizada: fotos primeiro, vídeos por último
    // Não precisa reorganizar, apenas retornar como está
    return gallery;
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

// Função para converter link de thumbnail para formato de vídeo
function convertThumbnailToVideo(thumbnailUrl) {
    if (!thumbnailUrl || typeof thumbnailUrl !== 'string') return thumbnailUrl;
    
    // Se já é um link de vídeo direto, retornar como está
    if (thumbnailUrl.includes('/file/d/') && (thumbnailUrl.includes('/view') || thumbnailUrl.includes('/preview'))) {
        return thumbnailUrl;
    }
    
    // Extrair ID do arquivo
        const fileId = extractGoogleDriveId(thumbnailUrl);
        if (fileId) {
        // Gerar URL de vídeo do Google Drive - usar preview para reprodução
        const videoUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        return videoUrl;
    }
    
    return thumbnailUrl;
}

// Função para obter lista de IDs conhecidos de vídeos
function getKnownVideoIds() {
    return [
        '12N8jFUCKmOBsZfc9FSk_JEgtSW3OjMMb', // ID do vídeo que você mencionou
        // Adicione mais IDs de vídeos conhecidos aqui conforme necessário
        // 'outro_id_de_video_aqui',
        // 'mais_um_id_de_video_aqui'
    ];
}

// Função para adicionar um novo ID de vídeo conhecido
function addKnownVideoId(videoId) {
    console.log('➕ Adicionando ID de vídeo conhecido:', videoId);
    // Esta função pode ser expandida para salvar em localStorage ou enviar para servidor
    // Por enquanto, apenas loga o ID
}

// Função para testar a detecção com o padrão do seu link
function testVideoDetection() {
    console.log('🧪 === TESTE DE DETECÇÃO DE VÍDEO ===');
    
    const testUrl = 'https://drive.google.com/file/d/12N8jFUCKmOBsZfc9FSk_JEgtSW3OjMMb/view?usp=drivesdk';
    
    console.log('📋 Testando URL:', testUrl);
    
    const fileType = detectGoogleDriveFileType(testUrl);
    console.log('📁 Tipo detectado:', fileType);
    
    const isVideoResult = isVideo(testUrl);
    console.log('🎬 É vídeo?', isVideoResult);
    
    console.log('🧪 === FIM DO TESTE ===');
    
    return isVideoResult;
}

// Função para verificar se um ID é conhecido como vídeo
function isKnownVideoId(fileId) {
    return getKnownVideoIds().includes(fileId);
}

// Função para detectar automaticamente se um link do Google Drive é vídeo baseado no padrão da URL
function detectGoogleDriveFileType(url) {
    if (!url || typeof url !== 'string') return 'unknown';
    
    const urlLower = url.toLowerCase();
    
    if (!urlLower.includes('drive.google.com')) return 'not_google_drive';
    
    console.log('🔍 Analisando tipo de arquivo do Google Drive:', url);
    
    // Padrões que indicam claramente vídeo
    const videoPatterns = [
        'export=download',
        'export=media',
        'export=video',
        'viewer?usp=sharing',
        'preview?usp=sharing',
        'usp=drivesdk',
        'view?usp=drivesdk'
    ];
    
    const hasVideoPattern = videoPatterns.some(pattern => urlLower.includes(pattern));
    if (hasVideoPattern) {
        console.log('✅ Padrão de vídeo detectado');
        return 'video';
    }
    
    // Padrões que indicam claramente imagem
    const imagePatterns = [
        'thumbnail',
        'export=view',
        'sz=w',
        'images.googleusercontent.com',
        'lh3.googleusercontent.com',
        'lh4.googleusercontent.com',
        'lh5.googleusercontent.com',
        'lh6.googleusercontent.com'
    ];
    
    const hasImagePattern = imagePatterns.some(pattern => urlLower.includes(pattern));
    if (hasImagePattern) {
        console.log('🖼️ Padrão de imagem detectado');
        return 'image';
    }
    
    // Se é um link direto de arquivo sem padrões específicos
    if (urlLower.includes('/file/d/')) {
        console.log('📁 Link direto de arquivo - assumindo vídeo por padrão');
        return 'video'; // Assumir vídeo por padrão para links diretos
    }
    
    console.log('❓ Tipo não identificado');
    return 'unknown';
}

// Função de debug para analisar por que uma URL não foi detectada como vídeo
function debugVideoDetection(url) {
    console.log('🔍 === DEBUG DE DETECÇÃO DE VÍDEO ===');
    console.log('📋 URL analisada:', url);
    
    if (!url || typeof url !== 'string') {
        console.log('❌ URL inválida ou vazia');
        return;
    }
    
    const urlLower = url.toLowerCase();
    
    // Verificar extensões
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const hasExtension = videoExtensions.some(ext => urlLower.includes(ext));
    console.log('🎬 Tem extensão de vídeo:', hasExtension);
    
    // Verificar plataformas
    const hasPlatform = urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('vimeo.com');
    console.log('📺 É de plataforma de vídeo:', hasPlatform);
    
    // Verificar Google Drive
    const isGoogleDrive = urlLower.includes('drive.google.com');
    console.log('☁️ É do Google Drive:', isGoogleDrive);
    
    if (isGoogleDrive) {
        // Usar a nova função de detecção
        const fileType = detectGoogleDriveFileType(url);
        console.log('📁 Tipo de arquivo detectado:', fileType);
        
        // Verificar padrões específicos
        const videoPatterns = ['export=download', 'export=media', 'export=video', 'viewer?usp=sharing', 'preview?usp=sharing', 'usp=drivesdk', 'view?usp=drivesdk'];
        const hasVideoPattern = videoPatterns.some(pattern => urlLower.includes(pattern));
        console.log('🔗 Tem padrão de vídeo:', hasVideoPattern);
        
        // Verificar palavras-chave
        const videoKeywords = ['video', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'ogg', 'filme', 'gravação', 'recording', 'demo', 'apresentação'];
        const hasKeyword = videoKeywords.some(keyword => urlLower.includes(keyword));
        console.log('📝 Tem palavra-chave:', hasKeyword);
        
        // Verificar se é thumbnail
        const isThumbnail = urlLower.includes('thumbnail?id=');
        console.log('🖼️ É thumbnail:', isThumbnail);
        
        if (isThumbnail) {
            const imagePatterns = ['sz=w', 'export=view', 'images.googleusercontent.com'];
            const hasImagePattern = imagePatterns.some(pattern => urlLower.includes(pattern));
            console.log('🖼️ Tem padrão de imagem:', hasImagePattern);
        }
        
        // Verificar ID
        const fileId = extractGoogleDriveId(url);
        console.log('🆔 ID extraído:', fileId);
        
        if (fileId) {
            const knownVideoIds = getKnownVideoIds();
            const isKnown = knownVideoIds.includes(fileId);
            console.log('✅ ID é conhecido:', isKnown);
        }
        
        // Verificar padrões gerais
        const hasGeneralPattern = urlLower.includes('view') || urlLower.includes('preview') || urlLower.includes('file');
        console.log('🔗 Tem padrão geral:', hasGeneralPattern);
    }
    
    console.log('🔍 === FIM DO DEBUG ===');
}

// Função para detectar se um item é vídeo baseado no índice na galeria
function isVideo(url, index, totalFotos) {
    // Se o índice está na parte de vídeos (após as fotos), é vídeo
    return index >= totalFotos;
}

// Função para detectar se um item é vídeo (versão simplificada para compatibilidade)
function isVideoByUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    
    // Detectar por extensões de vídeo
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    if (videoExtensions.some(ext => urlLower.includes(ext))) {
                return true;
            }
    
    // Detectar YouTube e Vimeo
    if (urlLower.includes('youtube.com') || 
        urlLower.includes('youtu.be') ||
        urlLower.includes('vimeo.com')) {
        return true;
    }
    
    // Para Google Drive, usar detecção inteligente
    if (urlLower.includes('drive.google.com')) {
        const fileType = detectGoogleDriveFileType(url);
        return fileType === 'video';
    }
    
    return false;
}

// Função para detectar vídeos do Google Drive de forma mais inteligente
// Esta função pode ser usada quando você souber que um arquivo é vídeo
function isGoogleDriveVideo(url) {
    if (!url || typeof url !== 'string') return false;
    return url.toLowerCase().includes('drive.google.com');
}

// Função para detectar vídeos do Google Drive baseada em padrões de URL
function isGoogleDriveVideoByUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    
    if (!urlLower.includes('drive.google.com')) return false;
    
    console.log('🔍 Analisando padrão de URL:', url);
    
    // Padrões específicos que indicam vídeo no Google Drive
    const videoPatterns = [
        'export=download',
        'export=media',
        'export=video',
        'viewer?usp=sharing',
        'preview?usp=sharing',
        'usp=drivesdk',  // Padrão específico dos seus links
        'view?usp=drivesdk'  // Padrão exato dos seus links
    ];
    
    // Verificar se contém algum padrão de vídeo
    const hasVideoPattern = videoPatterns.some(pattern => urlLower.includes(pattern));
    
    if (hasVideoPattern) {
        console.log('✅ Padrão de vídeo detectado');
        return true;
    }
    
    // Se é um link direto de arquivo (/file/d/), verificar se não é imagem
    if (urlLower.includes('/file/d/')) {
        console.log('📁 Link direto de arquivo detectado');
        
        // Padrões que indicam imagem (não vídeo)
        const imagePatterns = [
            'thumbnail',
            'export=view',
            'sz=w',  // Tamanho específico (thumbnail)
            'images.googleusercontent.com'
        ];
        
        // Se não tem padrões de imagem, pode ser vídeo
        const hasImagePattern = imagePatterns.some(pattern => urlLower.includes(pattern));
        console.log('🖼️ Tem padrão de imagem:', hasImagePattern);
        
        if (!hasImagePattern) {
            console.log('✅ Link direto sem padrão de imagem - assumindo vídeo');
            return true;
        }
    }
    
    console.log('❌ Não atende aos padrões de vídeo');
    return false;
}

// Função para detectar vídeos baseada em palavras-chave no nome do arquivo
function isVideoByKeywords(url) {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    
    const videoKeywords = [
        'video', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'ogg',
        'filme', 'gravação', 'recording', 'demo', 'apresentação'
    ];
    
    return videoKeywords.some(keyword => urlLower.includes(keyword));
}

// Função específica para detectar vídeos do Google Drive com padrões mais agressivos
function isGoogleDriveVideoAggressive(url) {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    
    if (!urlLower.includes('drive.google.com')) return false;
    
    // Padrões mais específicos para Google Drive
    const driveVideoPatterns = [
        'usp=drivesdk',
        'view?usp=drivesdk',
        '/file/d/',
        'export=download',
        'export=media',
        'export=video'
    ];
    
    // Se contém qualquer um dos padrões, considerar como possível vídeo
    return driveVideoPatterns.some(pattern => urlLower.includes(pattern));
}

// Função para detectar vídeos baseada na posição (último item da lista)
function isVideoByPosition(url, index, totalItems) {
    if (!url || typeof url !== 'string') return false;
    
    // Se é o último item e é do Google Drive, pode ser vídeo
    if (index === totalItems - 1 && url.includes('drive.google.com')) {
        return true;
    }
    
    return false;
}

// Função específica para detectar vídeos baseada em padrões do Google Drive
function isGoogleDriveVideoSpecific(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Padrões específicos dos links fornecidos
    const specificPatterns = [
        'usp=drivesdk',
        'view?usp=drivesdk',
        '/file/d/',
        'drive.google.com/file/d/'
    ];
    
    return specificPatterns.some(pattern => url.includes(pattern));
}

// Criar card do produto
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const badgeHTML = product.badge ? 
        `<div class="product-badge ${product.badge === 'novo' ? 'new' : 'sale'}">${product.badge}</div>` : '';
    
    const oldPriceHTML = product.oldPrice ? 
        `<span class="old-price">R$ ${formatPrice(product.oldPrice)}</span>` : '';
    
    
    // Verificar se há imagem válida
    const hasValidImage = product.image && product.image.trim() !== '' && product.image !== 'undefined';
    const hasValidGallery = product.gallery && product.gallery.length > 0 && product.gallery[0] && product.gallery[0].trim() !== '';
    
    // Debug removido
    
    // Usar a primeira imagem válida do gallery ou fallback para product.image
    const displayImage = hasValidGallery ? product.gallery[0] : (hasValidImage ? product.image : null);
    
    // Placeholder SVG para imagem indisponível
    const placeholderImage = `data:image/svg+xml;base64,${btoa(`
        <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8f8f8"/>
            <rect x="20" y="20" width="260" height="200" fill="#e0e0e0" rx="10"/>
            <circle cx="120" cy="100" r="25" fill="#ccc"/>
            <polygon points="120,85 110,105 130,105" fill="#ccc"/>
            <rect x="80" y="140" width="80" height="8" fill="#ccc" rx="4"/>
            <rect x="90" y="155" width="60" height="6" fill="#ccc" rx="3"/>
            <text x="150" y="200" font-family="Arial, sans-serif" font-size="14" fill="#999" text-anchor="middle">Imagem Indisponível</text>
        </svg>
    `)}`;
    
    // Se não tem imagem válida, usar placeholder
    const imageWithFallback = displayImage ? `
        <img src="${displayImage}" alt="${product.name}" 
             onerror="this.onerror=null; this.src='${placeholderImage}'"
             onload="adjustImageContainer(this)">
    ` : `
        <img src="${placeholderImage}" alt="${product.name}" onload="adjustImageContainer(this)">
    `;
    
    // Verificar se tem múltiplas imagens
    const hasMultipleImages = product.gallery && product.gallery.length > 1;
    const moreImagesIndicator = hasMultipleImages ? 
        `<div class="more-images-indicator">
            <i class="fas fa-images"></i>
            <span>+${product.gallery.length - 1}</span>
        </div>` : '';
    
    card.innerHTML = `
        <div class="product-image" onclick="openProductModal(${product.id})">
            ${imageWithFallback}
            ${badgeHTML}
            ${moreImagesIndicator}
        </div>
        <div class="product-content">
            <h3 class="product-title" onclick="openProductModal(${product.id})" style="cursor: pointer;">${product.name}</h3>
            ${product.brand ? `<p class="product-brand"><i class="fas fa-tag"></i> ${product.brand}</p>` : ''}
            ${product.description ? `<p class="product-description"><strong>Descrição do produto:</strong> ${truncateDescription(product.description)}</p>` : ''}
            <div class="product-price">
                ${product.priceRange ? 
                    `<span class="current-price" id="price-${product.id}">R$ ${formatPrice(product.priceRange.min)}</span>
                     <span class="price-range" id="price-range-${product.id}"> - R$ ${formatPrice(product.priceRange.max)}</span>` :
                    `<span class="current-price" id="price-${product.id}">R$ ${formatPrice(product.price)}</span>`
                }
                ${oldPriceHTML}
            </div>
            <div class="product-options">
                ${product.colors && product.colors.length > 0 ? `
                <div class="color-options">
                    <label class="option-label">Cor:</label>
                    <div class="color-selector">
                        ${product.colors.map(color => 
                            `<span class="color-option" data-color="${color.name}">${color.name}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
                ${(product.sizes && product.sizes.length > 0) || (product.sizesByColor && Object.keys(product.sizesByColor).length > 0) ? `
                <div class="size-options">
                    <label class="option-label">Tamanho:</label>
                    <div class="size-selector" id="sizeSelector-${product.id}">
                        ${product.sizes && product.sizes.length > 0 ? 
                            product.sizes.map(size => 
                                `<span class="size-option" data-size="${size}">${size}</span>`
                            ).join('') : 
                            '<span class="no-sizes-message">Selecione uma cor primeiro</span>'
                        }
                    </div>
                </div>
                ` : ''}
            </div>
            <button class="add-to-cart" data-product-id="${product.id}">
                Adicionar ao Carrinho
            </button>
        </div>
    `;
    
    // Event listeners para opções
    setupProductCardEvents(card, product);
    
    return card;
}

// Setup eventos do card do produto
function setupProductCardEvents(card, product) {
    // Seleção de tamanho
    const sizeOptions = card.querySelectorAll('.size-option');
    sizeOptions.forEach(option => {
        option.addEventListener('click', function() {
            sizeOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            checkIfCanAddToCart();
        });
    });
    
    // Seleção de cor
    const colorOptions = card.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            
            // Atualizar preço baseado na cor selecionada
            updatePriceForColor(product, this.dataset.color);
            
            // Atualizar tamanhos baseado na cor selecionada
            updateSizesForColor(product, this.dataset.color);
            
            checkIfCanAddToCart();
        });
    });
    
    // Função para atualizar preço baseado na cor selecionada
    function updatePriceForColor(product, selectedColor) {
        const priceElement = card.querySelector(`#price-${product.id}`);
        const priceRangeElement = card.querySelector(`#price-range-${product.id}`);
        
        if (!priceElement) return;
        
        // Obter o preço correto para a cor selecionada
        const newPrice = getProductPrice(product, selectedColor);
        
        // Atualizar o preço na interface
        priceElement.textContent = `R$ ${formatPrice(newPrice)}`;
        
        // Esconder o range de preços quando uma cor for selecionada
        if (priceRangeElement) {
            priceRangeElement.style.display = 'none';
        }
        
        console.log(`💰 Preço atualizado para ${product.name} - Cor: ${selectedColor}, Preço: R$ ${formatPrice(newPrice)}`);
    }
    
    // Função para atualizar tamanhos baseado na cor selecionada
    function updateSizesForColor(product, selectedColor) {
        const sizeSelector = card.querySelector(`#sizeSelector-${product.id}`);
        if (!sizeSelector) return;
        
        // Limpar seleção de tamanho anterior
        const previousSizeSelection = card.querySelector('.size-option.selected');
        if (previousSizeSelection) {
            previousSizeSelection.classList.remove('selected');
        }
        
        if (product.sizesByColor && product.sizesByColor[selectedColor]) {
            // Mostrar tamanhos específicos da cor
            const sizes = product.sizesByColor[selectedColor];
            sizeSelector.innerHTML = sizes.map(size => 
                `<span class="size-option" data-size="${size}">${size}</span>`
            ).join('');
            
            // Reconfigurar eventos dos novos tamanhos
            setupSizeEvents();
        } else if (product.sizes && product.sizes.length > 0) {
            // Mostrar todos os tamanhos (formato antigo)
            sizeSelector.innerHTML = product.sizes.map(size => 
                `<span class="size-option" data-size="${size}">${size}</span>`
            ).join('');
            
            // Reconfigurar eventos dos novos tamanhos
            setupSizeEvents();
        } else {
            // Não há tamanhos disponíveis
            sizeSelector.innerHTML = '<span class="no-sizes-message">Nenhum tamanho disponível para esta cor</span>';
        }
        
        checkIfCanAddToCart();
    }
    
    // Função para configurar eventos dos tamanhos
    function setupSizeEvents() {
        const sizeOptions = card.querySelectorAll('.size-option');
        sizeOptions.forEach(option => {
            option.addEventListener('click', function() {
                sizeOptions.forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                checkIfCanAddToCart();
            });
        });
    }
    
    // Função para verificar se pode adicionar ao carrinho
    function checkIfCanAddToCart() {
        const selectedSize = card.querySelector('.size-option.selected');
        const selectedColor = card.querySelector('.color-option.selected');
        
        // Se não há tamanhos nem cores, pode adicionar diretamente
        if (sizeOptions.length === 0 && colorOptions.length === 0) {
            addToCartBtn.disabled = false;
        }
        // Se só há tamanhos (formato antigo), precisa selecionar tamanho
        else if (sizeOptions.length > 0 && colorOptions.length === 0) {
            addToCartBtn.disabled = !selectedSize;
        }
        // Se há cores, sempre precisa selecionar cor primeiro
        else if (colorOptions.length > 0) {
            if (!selectedColor) {
                addToCartBtn.disabled = true;
            } else {
                // Se há tamanhos (seja formato antigo ou por cor), precisa selecionar tamanho
                const hasAnySizes = (product.sizes && product.sizes.length > 0) || 
                                  (product.sizesByColor && Object.keys(product.sizesByColor).length > 0);
                if (hasAnySizes) {
                    addToCartBtn.disabled = !selectedSize;
                } else {
                    addToCartBtn.disabled = false;
                }
            }
        }
        // Se só há tamanhos (formato antigo), precisa selecionar tamanho
        else {
            addToCartBtn.disabled = !selectedSize;
        }
    }
    
    // Adicionar ao carrinho
    const addToCartBtn = card.querySelector('.add-to-cart');
    addToCartBtn.addEventListener('click', function() {
        const selectedSize = card.querySelector('.size-option.selected');
        const selectedColor = card.querySelector('.color-option.selected');
        
        // Validar tamanho apenas se há opções de tamanho
        if (sizeOptions.length > 0 && !selectedSize) {
            alert('Por favor, selecione um tamanho');
            return;
        }
        
        // Validar cor apenas se há opções de cor
        if (colorOptions.length > 0 && !selectedColor) {
            alert('Por favor, selecione uma cor');
            return;
        }
        
        // Obter o preço correto baseado na cor selecionada
        const finalPrice = getProductPrice(product, selectedColor ? selectedColor.dataset.color : null);
        
        const cartItem = {
            id: `${product.id}${selectedSize ? `-${selectedSize.dataset.size}` : ''}${selectedColor ? `-${selectedColor.dataset.color}` : ''}`,
            productId: product.id,
            name: product.name,
            price: finalPrice,
            image: (product.gallery && product.gallery.length > 0) ? product.gallery[0] : product.image,
            size: selectedSize ? selectedSize.dataset.size : null,
            color: selectedColor ? selectedColor.dataset.color : null,
            quantity: 1
        };
        
        addToCart(cartItem);
        
        // Feedback visual
        addToCartBtn.textContent = 'Adicionado!';
        addToCartBtn.style.background = '#28a745';
        setTimeout(() => {
            addToCartBtn.textContent = 'Adicionar ao Carrinho';
            addToCartBtn.style.background = '';
        }, 1500);
    });
}

// Adicionar ao carrinho
function addToCart(item) {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push(item);
    }
    
    saveCart();
    updateCartUI();
}

// Remover do carrinho
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    saveCart();
    updateCartUI();
    renderCartItems();
}

// Atualizar quantidade
function updateQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (item) {
        item.quantity = newQuantity;
        saveCart();
        updateCartUI();
        renderCartItems();
    }
}

// Salvar carrinho no localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Atualizar UI do carrinho
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    cartTotal.textContent = formatPrice(totalPrice);
    
    if (cartModal.classList.contains('active')) {
        renderCartItems();
    }
}

// Renderizar itens do carrinho
function renderCartItems() {
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                <p>Seu carrinho está vazio</p>
                <p style="font-size: 0.9rem; color: #999;">Adicione produtos para continuar</p>
            </div>
        `;
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
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
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Toggle modal do carrinho
function toggleCartModal() {
    cartModal.classList.toggle('active');
    if (cartModal.classList.contains('active')) {
        renderCartItems();
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}


// Finalizar pedido (WhatsApp)
function handleCheckout() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }
    
    console.log('Carrinho atual:', cart); // Debug
    
    // Verificar se todos os itens têm as propriedades necessárias
    const invalidItems = cart.filter(item => {
        // Verificar propriedades obrigatórias
        if (!item.name || !item.price || !item.quantity) {
            return true;
        }
        
        // Verificar se tem pelo menos cor ou tamanho (não pode ter ambos vazios)
        if (!item.color && !item.size) {
            return true;
        }
        
        return false;
    });
    
    if (invalidItems.length > 0) {
        console.error('Itens inválidos no carrinho:', invalidItems);
        alert('Erro: Alguns itens do carrinho estão com dados incompletos. Por favor, recarregue a página e tente novamente.');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Montar mensagem para WhatsApp
    let message = '🛍️ *Pedido - Stylus Concept*\n\n';
    message += '*Produtos selecionados:*\n';
    
    cart.forEach((item, index) => {
        message += `\n${index + 1}. *${item.name}*\n`;
        if (item.size) {
            message += `   Tamanho: ${item.size}\n`;
        }
        if (item.color) {
            message += `   Cor: ${item.color}\n`;
        }
        message += `   Quantidade: ${item.quantity}\n`;
        message += `   Preço unitário: R$ ${formatPrice(item.price)}\n`;
        message += `   Subtotal: R$ ${formatPrice(item.price * item.quantity)}\n`;
    });
    
    message += `\n*Total: R$ ${formatPrice(total)}*\n\n`;
    message += 'Gostaria de finalizar este pedido! 😊';
    
    console.log('Mensagem construída:', message); // Debug
    
    // Número do WhatsApp da loja
    const whatsappNumber = '5577988024793';
    
    // Codificar mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    console.log('Mensagem codificada:', encodedMessage); // Debug
    
    // Construir URL do WhatsApp
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    console.log('URL do WhatsApp:', whatsappURL); // Debug
    
    // Testar se a URL é válida
    try {
        new URL(whatsappURL);
    } catch (e) {
        console.error('URL do WhatsApp inválida:', e);
        alert('Erro ao gerar link do WhatsApp. Por favor, tente novamente.');
        return;
    }
    
    // Abrir WhatsApp
    const newWindow = window.open(whatsappURL, '_blank');
    
    // Verificar se a janela foi aberta
    if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        alert('Por favor, permita pop-ups para este site e tente novamente.');
        return;
    }
    
    // Limpar carrinho após envio
    cart = [];
    saveCart();
    updateCartUI();
    toggleCartModal();
    
    // Mostrar confirmação
    setTimeout(() => {
        alert('Pedido enviado! Você será redirecionado para o WhatsApp.');
    }, 500);
}

// Função para testar o link do WhatsApp (para debug)
function testWhatsAppLink() {
    const testMessage = '🛍️ *Teste - Stylus Concept*\n\n*Produtos selecionados:*\n\n1. *Produto Teste*\n   Tamanho: M\n   Quantidade: 1\n   Preço unitário: R$ 50,00\n   Subtotal: R$ 50,00\n\n*Total: R$ 50,00*\n\nGostaria de finalizar este pedido! 😊';
    
    const whatsappNumber = '5577988024793';
    const encodedMessage = encodeURIComponent(testMessage);
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    console.log('Teste - URL do WhatsApp:', whatsappURL);
    
    // Abrir em nova aba para teste
    window.open(whatsappURL, '_blank');
}

// Adicionar função de teste ao console (para debug)
window.testWhatsAppLink = testWhatsAppLink;


// Renderizar produtos por categoria
function renderCategoryProducts() {
    // Verificar se há filtros na URL para renderização otimizada
    const urlParams = new URLSearchParams(window.location.search);
    const categoria = urlParams.get('categoria');
    const tipo = urlParams.get('tipo');
    const marca = urlParams.get('marca');
    
    const hasFilters = categoria || tipo || marca;
    
    if (hasFilters) {
        console.log(`⚡ Renderização otimizada com filtros: categoria=${categoria}, tipo=${tipo}, marca=${marca}`);
        
        // Renderizar apenas a categoria filtrada
        if (categoria) {
            renderSingleCategory(categoria, true);
            return;
        }
    }
    
    console.log(`⚡ Renderização normal (todas as categorias)`);
    
    const roupasGrid = document.getElementById('roupasGrid');
    const calcadosGrid = document.getElementById('calcadosGrid');
    const acessoriosGrid = document.getElementById('acessoriosGrid');
    
    // Elementos das seções para ocultar/mostrar
    const roupasSection = document.getElementById('roupas');
    const calcadosSection = document.getElementById('calcados');
    const acessoriosSection = document.getElementById('acessorios');
    
    // Renderizar roupas
    let roupasCount = 0;
    if (roupasGrid) {
        roupasGrid.innerHTML = '';
        const roupasProducts = products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual');
        const groupedRoupas = groupProductsByTypeWithCustomOrder(roupasProducts, 'roupas');
        
        groupedRoupas.forEach(product => {
                const productCard = createProductCard(product);
                roupasGrid.appendChild(productCard);
                roupasCount++;
        });
    }
    
    // Renderizar calçados
    let calcadosCount = 0;
    if (calcadosGrid) {
        calcadosGrid.innerHTML = '';
        const groupedCalcados = groupProductsByTypeWithCustomOrder(calcadosProducts, 'calcados');
        
        groupedCalcados.forEach(product => {
            const productCard = createProductCard(product);
            calcadosGrid.appendChild(productCard);
            calcadosCount++;
        });
        
        // Processar imagens verticais de calçados após carregamento
        setTimeout(() => processShoesImages(), 200);
    }
    
    // Renderizar acessórios
    let acessoriosCount = 0;
    if (acessoriosGrid) {
        acessoriosGrid.innerHTML = '';
        // Agrupar por tipo e ordenar por cor dentro de cada tipo
        const groupedAcessorios = groupProductsByTypeWithCustomOrder(acessoriosProducts, 'acessorios');
        
        groupedAcessorios.forEach(product => {
            const productCard = createProductCard(product);
            acessoriosGrid.appendChild(productCard);
            acessoriosCount++;
        });
    }
    
    // Ocultar seções vazias
    if (roupasSection) {
        roupasSection.style.display = roupasCount > 0 ? 'block' : 'none';
    }
    if (calcadosSection) {
        calcadosSection.style.display = calcadosCount > 0 ? 'block' : 'none';
    }
    if (acessoriosSection) {
        acessoriosSection.style.display = acessoriosCount > 0 ? 'block' : 'none';
    }
}

// Função para renderizar apenas uma categoria (otimizada)
function renderSingleCategory(category, hideOthers = false) {
    console.log(`🎯 Renderizando categoria: ${category}`);
    
    // Ocultar outras seções PRIMEIRO para evitar flash
    if (hideOthers) {
        const allCategories = ['roupas', 'calcados', 'acessorios'];
        allCategories.forEach(cat => {
            if (cat !== category) {
                const section = document.getElementById(cat);
                if (section) {
                    section.style.display = 'none';
                }
            }
        });
    }
    
    // Renderizar apenas a categoria especificada
    const section = document.getElementById(category);
    if (section) {
        section.style.display = 'block';
        
        let productsToRender = [];
        let grid = null;
        
        if (category === 'roupas') {
            productsToRender = products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual');
            grid = document.getElementById('roupasGrid');
        } else if (category === 'calcados') {
            productsToRender = calcadosProducts;
            grid = document.getElementById('calcadosGrid');
        } else if (category === 'acessorios') {
            productsToRender = acessoriosProducts;
            grid = document.getElementById('acessoriosGrid');
        }
        
        if (grid) {
            // Limpar grid ANTES de renderizar
            grid.innerHTML = '';
            
            // Verificar se há produtos nesta categoria
            if (productsToRender.length === 0) {
                // Mostrar mensagem de categoria vazia
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'no-products-message';
                emptyMessage.innerHTML = `
                    <div class="no-products-content">
                        <i class="fas fa-box-open"></i>
                        <h3>Produtos em breve!</h3>
                        <p>Esta seção não tem produtos disponíveis ainda, mas aguarde novidades em breve! Estamos trabalhando para trazer os melhores produtos para você.</p>
                        <p style="margin-top: 12px;">Fique à vontade para navegar por outras seções.</p>
                        <div style="margin-top: 30px; display: flex; justify-content: center;">
                            <a href="index.html" class="btn-back-home-styled">
                                <i class="fas fa-home"></i>
                                Voltar para Home
                            </a>
                        </div>
                    </div>
                `;
                grid.appendChild(emptyMessage);
                grid.classList.add('empty-grid');
                console.log(`⚠️ Nenhum produto cadastrado para ${category}`);
            } else {
                // Agrupar produtos por tipo para todas as categorias
                productsToRender = groupProductsByTypeWithCustomOrder(productsToRender, category);
                
                // Renderizar produtos de forma síncrona
                productsToRender.forEach(product => {
                    const productCard = createProductCard(product);
                    grid.appendChild(productCard);
                });
                
                console.log(`✅ Renderizados ${productsToRender.length} produtos para ${category}`);
            }
        }
    }
}

// Busca
function handleSearch(query) {
    const q = normalizeTextBasic(query);
    const filterFn = (p) => {
        const inName = normalizeTextBasic(p.name).includes(q);
        return inName;
    };
    
    const filtered = {
        roupas: products.filter(filterFn),
        calcados: calcadosProducts.filter(filterFn),
        acessorios: acessoriosProducts.filter(filterFn)
    };
    
    // 🎯 AGRUPAR PRODUTOS POR TIPO na busca
    filtered.roupas = groupProductsByTypeWithCustomOrder(filtered.roupas, 'roupas');
    filtered.calcados = groupProductsByTypeWithCustomOrder(filtered.calcados, 'calcados');
    filtered.acessorios = groupProductsByTypeWithCustomOrder(filtered.acessorios, 'acessorios');
    
    // Renderiza com base no filtro
    const roupasGrid = document.getElementById('roupasGrid');
    const calcadosGrid = document.getElementById('calcadosGrid');
    const acessoriosGrid = document.getElementById('acessoriosGrid');
    const secRoupas = document.getElementById('roupas');
    const secCalcados = document.getElementById('calcados');
    const secAcessorios = document.getElementById('acessorios');
    
    if (roupasGrid) {
        roupasGrid.innerHTML = '';
        filtered.roupas.forEach(product => roupasGrid.appendChild(createProductCard(product)));
        if (secRoupas) {
            secRoupas.style.display = filtered.roupas.length > 0 ? 'block' : 'none';
        }
    }
    if (calcadosGrid) {
        calcadosGrid.innerHTML = '';
        filtered.calcados.forEach(product => calcadosGrid.appendChild(createProductCard(product)));
        if (secCalcados) {
            secCalcados.style.display = filtered.calcados.length > 0 ? 'block' : 'none';
        }
        // Processar imagens verticais de calçados após carregamento
        setTimeout(() => processShoesImages(), 200);
    }
    if (acessoriosGrid) {
        acessoriosGrid.innerHTML = '';
        filtered.acessorios.forEach(product => acessoriosGrid.appendChild(createProductCard(product)));
        if (secAcessorios) {
            secAcessorios.style.display = filtered.acessorios.length > 0 ? 'block' : 'none';
        }
    }

    // Se busca vazia, garante que todas apareçam
    if (!q) {
        renderCategoryProducts();
    }
}


// Scroll animations
function setupScrollAnimations() {
    try {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observar elementos que devem animar
        document.querySelectorAll('.product-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    } catch (error) {
        console.error('Erro ao configurar animações de scroll:', error);
    }
}

// Executar animações após o carregamento
setTimeout(setupScrollAnimations, 500);

// Modal de detalhes do produto
function openProductModal(productId) {
    console.log('Tentando abrir modal para produto ID:', productId);
    const allProducts = [...products, ...calcadosProducts, ...acessoriosProducts];
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        console.error('Produto não encontrado com ID:', productId);
        return;
    }
    
    console.log('Produto encontrado:', product.name);
    
    // Se for produto de calçados, processar imagens verticais
    if (product.category === 'calcados') {
        console.log('👟 Produto de calçados detectado, processando imagens...');
        setTimeout(() => processShoesImages(), 100);
    }
    
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');
    
    const oldPriceHTML = product.oldPrice ? 
        `<span class="old-price">R$ ${formatPrice(product.oldPrice)}</span>` : '';
    
    
    // Reorganizar gallery para colocar vídeos na segunda posição
    const reorganizedGallery = reorganizeGallery(product.gallery || [], product.videoIndices || []);
    
    // Log de debug para mostrar tipos de mídia do produto
    console.log(`🎬 Produto: ${product.name}`);
    // Calcular quantas fotos temos (vídeos vêm por último)
    const videoIndices = product.videoIndices || [];
    const totalFotos = reorganizedGallery.length - videoIndices.length;
    
    reorganizedGallery.forEach((item, index) => {
        const isVideoItem = isVideo(item, index, totalFotos);
        console.log(`  📹 Posição ${index}: ${isVideoItem ? 'VIDEO' : 'FOTO'} - ${item}`);
    });
    
    // Gerar carrossel de imagens e vídeos
    const carouselHTML = reorganizedGallery && reorganizedGallery.length > 1 ? `
        <div class="product-image-carousel">
            ${isVideo(reorganizedGallery[0], 0, totalFotos) ? 
                `<div class="video-container" id="mainVideoPlayer">
                        <iframe class="carousel-main-video" id="mainImage" 
                                src="${convertThumbnailToVideo(reorganizedGallery[0])}" 
                                frameborder="0" 
                                allow="autoplay; fullscreen" 
                                allowfullscreen>
                        </iframe>
                </div>` :
                `<img src="${reorganizedGallery[0]}" alt="${product.name}" class="carousel-main-image" id="mainImage">`
            }
            <button class="carousel-nav prev" id="prevBtn" ${reorganizedGallery.length <= 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="carousel-nav next" id="nextBtn" ${reorganizedGallery.length <= 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    ` : `
        <img src="${product.image || `data:image/svg+xml;base64,${btoa(`
            <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f8f8f8"/>
                <rect x="30" y="30" width="340" height="280" fill="#e0e0e0" rx="15"/>
                <circle cx="180" cy="150" r="35" fill="#ccc"/>
                <polygon points="180,125 165,155 195,155" fill="#ccc"/>
                <rect x="120" y="200" width="120" height="12" fill="#ccc" rx="6"/>
                <rect x="140" y="220" width="80" height="8" fill="#ccc" rx="4"/>
                <text x="200" y="280" font-family="Arial, sans-serif" font-size="16" fill="#999" text-anchor="middle">Imagem Indisponível</text>
            </svg>
        `)}`}" alt="${product.name}">
    `;

    modalBody.innerHTML = `
        <div class="product-detail-content">
            <div class="product-detail-image">
                ${carouselHTML}
            </div>
            <div class="product-detail-info">
                <h2 class="product-detail-title">${product.name}</h2>
                ${product.description ? `<p class="product-detail-description"><strong>Descrição do produto:</strong> ${product.description}</p>` : ''}
                        <div class="product-detail-price">
                            ${product.priceRange ? 
                                `<span class="current-price" id="modal-price-${product.id}">R$ ${formatPrice(product.priceRange.min)}</span>
                                 <span class="price-range" id="modal-price-range-${product.id}"> - R$ ${formatPrice(product.priceRange.max)}</span>` :
                                `<span class="current-price" id="modal-price-${product.id}">R$ ${formatPrice(product.price)}</span>`
                            }
                            ${oldPriceHTML}
                        </div>
                ${product.colors && product.colors.length > 0 ? `
                <div class="product-detail-options">
                    <h4>Selecione a cor:</h4>
                    <div class="product-detail-colors">
                        ${product.colors.map(color => 
                            `<span class="product-detail-color" data-color="${color.name}">${color.name}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
                ${(product.sizes && product.sizes.length > 0) || (product.sizesByColor && Object.keys(product.sizesByColor).length > 0) ? `
                <div class="product-detail-options">
                    <h4>Selecione o tamanho:</h4>
                    <div class="product-detail-sizes" id="modalSizeSelector-${product.id}">
                        ${product.sizes && product.sizes.length > 0 ? 
                            product.sizes.map(size => 
                                `<span class="product-detail-size" data-size="${size}">${size}</span>`
                            ).join('') : 
                            '<span class="no-sizes-message">Selecione uma cor primeiro</span>'
                        }
                    </div>
                </div>
                ` : ''}
                <div class="product-detail-actions">
                    <button class="product-detail-add-cart" data-product-id="${product.id}" disabled>
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Event listeners para o modal
    setupProductModalEvents(product, reorganizedGallery, totalFotos);
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Restaurar vídeos quando o modal for aberto
    restoreAllVideos();
    
    // Aplicar detecção de vídeos verticais
    applyVideoDetection();
}

function setupProductModalEvents(product, reorganizedGallery, totalFotos = 0) {
    const modal = document.getElementById('productModal');
    const closeBtn = document.getElementById('closeProductModal');
    const addCartBtn = document.querySelector('.product-detail-add-cart');
    const sizeOptions = document.querySelectorAll('.product-detail-size');
    
    // Fechar modal
    closeBtn.addEventListener('click', closeProductModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeProductModal();
    });
    
    // Carrossel de imagens e vídeos
    if (reorganizedGallery && reorganizedGallery.length > 1) {
        try {
            setupCarousel(reorganizedGallery, totalFotos);
        } catch (error) {
            console.error('Erro ao configurar carrossel:', error);
        }
    }
    
    // Iframe do Google Drive não precisa de configuração adicional
    
    // Seleção de tamanho
    sizeOptions.forEach(option => {
        option.addEventListener('click', function() {
            sizeOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            checkIfCanAddToCart();
        });
    });
    
    // Seleção de cor
    const colorOptions = document.querySelectorAll('.product-detail-color');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            
            // Atualizar preço baseado na cor selecionada
            updateModalPriceForColor(product, this.dataset.color);
            
            // Atualizar tamanhos baseado na cor selecionada
            updateModalSizesForColor(product, this.dataset.color);
            
            checkIfCanAddToCart();
        });
    });
    
    // Função para atualizar preço baseado na cor selecionada no modal
    function updateModalPriceForColor(product, selectedColor) {
        const priceElement = document.querySelector(`#modal-price-${product.id}`);
        const priceRangeElement = document.querySelector(`#modal-price-range-${product.id}`);
        
        if (!priceElement) return;
        
        // Obter o preço correto para a cor selecionada
        const newPrice = getProductPrice(product, selectedColor);
        
        // Atualizar o preço na interface
        priceElement.textContent = `R$ ${formatPrice(newPrice)}`;
        
        // Esconder o range de preços quando uma cor for selecionada
        if (priceRangeElement) {
            priceRangeElement.style.display = 'none';
        }
        
        console.log(`💰 Preço atualizado no modal para ${product.name} - Cor: ${selectedColor}, Preço: R$ ${formatPrice(newPrice)}`);
    }
    
    // Função para atualizar tamanhos baseado na cor selecionada no modal
    function updateModalSizesForColor(product, selectedColor) {
        const sizeSelector = document.querySelector(`#modalSizeSelector-${product.id}`);
        if (!sizeSelector) return;
        
        // Limpar seleção de tamanho anterior
        const previousSizeSelection = document.querySelector('.product-detail-size.selected');
        if (previousSizeSelection) {
            previousSizeSelection.classList.remove('selected');
        }
        
        if (product.sizesByColor && product.sizesByColor[selectedColor]) {
            // Mostrar tamanhos específicos da cor
            const sizes = product.sizesByColor[selectedColor];
            sizeSelector.innerHTML = sizes.map(size => 
                `<span class="product-detail-size" data-size="${size}">${size}</span>`
            ).join('');
            
            // Reconfigurar eventos dos novos tamanhos
            setupModalSizeEvents();
        } else if (product.sizes && product.sizes.length > 0) {
            // Mostrar todos os tamanhos (formato antigo)
            sizeSelector.innerHTML = product.sizes.map(size => 
                `<span class="product-detail-size" data-size="${size}">${size}</span>`
            ).join('');
            
            // Reconfigurar eventos dos novos tamanhos
            setupModalSizeEvents();
        } else {
            // Não há tamanhos disponíveis
            sizeSelector.innerHTML = '<span class="no-sizes-message">Nenhum tamanho disponível para esta cor</span>';
        }
        
        checkIfCanAddToCart();
    }
    
    // Função para configurar eventos dos tamanhos no modal
    function setupModalSizeEvents() {
        const sizeOptions = document.querySelectorAll('.product-detail-size');
        sizeOptions.forEach(option => {
            option.addEventListener('click', function() {
                sizeOptions.forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                checkIfCanAddToCart();
            });
        });
    }
    
    // Função para verificar se pode adicionar ao carrinho
    function checkIfCanAddToCart() {
        const selectedSize = document.querySelector('.product-detail-size.selected');
        const selectedColor = document.querySelector('.product-detail-color.selected');
        
        // Se não há tamanhos nem cores, pode adicionar diretamente
        if (sizeOptions.length === 0 && colorOptions.length === 0) {
            addCartBtn.disabled = false;
        }
        // Se só há tamanhos (formato antigo), precisa selecionar tamanho
        else if (sizeOptions.length > 0 && colorOptions.length === 0) {
            addCartBtn.disabled = !selectedSize;
        }
        // Se há cores, sempre precisa selecionar cor primeiro
        else if (colorOptions.length > 0) {
            if (!selectedColor) {
                addCartBtn.disabled = true;
            } else {
                // Se há tamanhos (seja formato antigo ou por cor), precisa selecionar tamanho
                const hasAnySizes = (product.sizes && product.sizes.length > 0) || 
                                  (product.sizesByColor && Object.keys(product.sizesByColor).length > 0);
                if (hasAnySizes) {
                    addCartBtn.disabled = !selectedSize;
                } else {
                    addCartBtn.disabled = false;
                }
            }
        }
        // Se só há tamanhos (formato antigo), precisa selecionar tamanho
        else {
            addCartBtn.disabled = !selectedSize;
        }
    }
    
    // Adicionar ao carrinho
    addCartBtn.addEventListener('click', function() {
        const selectedSize = document.querySelector('.product-detail-size.selected');
        const selectedColor = document.querySelector('.product-detail-color.selected');
        
        // Validar tamanho apenas se há opções de tamanho
        if (sizeOptions.length > 0 && !selectedSize) {
            alert('Por favor, selecione um tamanho');
            return;
        }
        
        // Validar cor apenas se há opções de cor
        if (colorOptions.length > 0 && !selectedColor) {
            alert('Por favor, selecione uma cor');
            return;
        }
        
        // Obter o preço correto baseado na cor selecionada
        const finalPrice = getProductPrice(product, selectedColor ? selectedColor.dataset.color : null);
        
        const cartItem = {
            id: `${product.id}${selectedSize ? `-${selectedSize.dataset.size}` : ''}${selectedColor ? `-${selectedColor.dataset.color}` : ''}`,
            productId: product.id,
            name: product.name,
            price: finalPrice,
            image: (product.gallery && product.gallery.length > 0) ? product.gallery[0] : product.image,
            size: selectedSize ? selectedSize.dataset.size : null,
            color: selectedColor ? selectedColor.dataset.color : null,
            quantity: 1
        };
        
        addToCart(cartItem);
        
        // Feedback visual
        addCartBtn.textContent = 'Adicionado!';
        addCartBtn.style.background = '#28a745';
        setTimeout(() => {
            addCartBtn.textContent = 'Adicionar ao Carrinho';
            addCartBtn.style.background = '#333';
        }, 1500);
    });
}

function setupCarousel(items, totalFotos = 0) {
    let currentIndex = 0;
    let mainElement = document.getElementById('mainImage');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Verificar se os elementos existem
    if (!mainElement || !prevBtn || !nextBtn) {
        console.error('Elementos do carrossel não encontrados');
        return;
    }
    
    function updateItem(index) {
        const item = items[index];
        if (!item) return;
        
        const isVideoItem = isVideo(item, index, totalFotos);
        
        try {
            if (isVideoItem) {
                const videoUrl = convertThumbnailToVideo(item);
                
                // Se é vídeo, substituir por iframe com overlay
                if (mainElement.tagName === 'IMG' || mainElement.tagName === 'VIDEO' || mainElement.tagName === 'IFRAME') {
                    const videoContainer = document.createElement('div');
                    videoContainer.className = 'video-container';
                    videoContainer.id = 'mainVideoPlayer';
                    videoContainer.innerHTML = `
                        <iframe class="carousel-main-video" id="mainImage" 
                                src="${videoUrl}" 
                                frameborder="0" 
                                allow="autoplay; fullscreen" 
                                allowfullscreen>
                        </iframe>
                    `;
                    if (mainElement.parentNode) {
                        mainElement.parentNode.replaceChild(videoContainer, mainElement);
                    }
                    // Atualizar referência do mainElement
                    mainElement = document.getElementById('mainImage');
                    
                    // Aplicar detecção de vídeo vertical
                    setTimeout(() => {
                        detectAndAdjustVerticalVideos();
                    }, 100);
                } else {
                    // Se já é container de vídeo, apenas trocar o src do iframe
                    const iframe = mainElement.querySelector('iframe');
                    if (iframe) {
                        iframe.src = videoUrl;
                        
                        // Aplicar detecção de vídeo vertical
                        setTimeout(() => {
                            detectAndAdjustVerticalVideos();
                        }, 100);
                    }
                }
            } else {
                // Se é imagem, substituir por elemento de imagem
                if (mainElement.tagName === 'VIDEO' || mainElement.tagName === 'IFRAME' || mainElement.parentElement?.classList.contains('video-container')) {
                    // Se estamos vindo de um vídeo, substituir o container inteiro
                    const img = document.createElement('img');
                    img.src = item;
                    img.alt = 'Produto';
                    img.className = 'carousel-main-image';
                    img.id = 'mainImage';
                    
                    // Encontrar o container pai (video-container) e substituir
                    const container = mainElement.closest('.video-container') || mainElement.parentElement;
                    if (container) {
                        container.replaceWith(img);
                    }
                    // Atualizar referência do mainElement
                    mainElement = document.getElementById('mainImage');
                } else {
                    // Se já é imagem, apenas trocar o src
                    mainElement.src = item;
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar item do carrossel:', error);
        }
        
        
        const prevDisabled = index === 0;
        const nextDisabled = index === items.length - 1;
        
        prevBtn.disabled = prevDisabled;
        nextBtn.disabled = nextDisabled;
    }
    
    // Navegação por botões
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateItem(currentIndex);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentIndex < items.length - 1) {
            currentIndex++;
            updateItem(currentIndex);
        }
    });
    
    
    // Navegação por teclado
    document.addEventListener('keydown', function(e) {
        if (!document.getElementById('productModal').classList.contains('active')) return;
        
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            currentIndex--;
            // Adicionar pequeno delay para evitar conflitos
            setTimeout(() => updateItem(currentIndex), 100);
        } else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) {
            currentIndex++;
            // Adicionar pequeno delay para evitar conflitos
            setTimeout(() => updateItem(currentIndex), 100);
        }
    });
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Pausar todos os vídeos quando o modal for fechado
    pauseAllVideos();
}

// Função para pausar todos os vídeos no modal
function pauseAllVideos() {
    // Pausar vídeos HTML5
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        if (!video.paused) {
            video.pause();
            console.log('⏸️ Vídeo HTML5 pausado');
        }
    });
    
    // Pausar iframes de vídeo (YouTube, Vimeo, Google Drive, etc.)
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            // Para iframes, não podemos controlar diretamente, mas podemos remover o src
            // e recarregar quando necessário
            if (iframe.src && (
                iframe.src.includes('youtube.com') || 
                iframe.src.includes('youtu.be') || 
                iframe.src.includes('vimeo.com') ||
                iframe.src.includes('drive.google.com')
            )) {
                // Salvar o src original
                const originalSrc = iframe.src;
                iframe.setAttribute('data-original-src', originalSrc);
                
                // Remover o src para parar a reprodução
                iframe.src = '';
                
                console.log('⏸️ Iframe de vídeo pausado:', originalSrc);
            }
        } catch (error) {
            console.log('⚠️ Erro ao pausar iframe:', error);
        }
    });
}

// Função para restaurar todos os vídeos no modal
function restoreAllVideos() {
    // Restaurar iframes de vídeo que foram pausados
    const iframes = document.querySelectorAll('iframe[data-original-src]');
    iframes.forEach(iframe => {
        try {
            const originalSrc = iframe.getAttribute('data-original-src');
            if (originalSrc) {
                iframe.src = originalSrc;
                iframe.removeAttribute('data-original-src');
                console.log('▶️ Iframe de vídeo restaurado:', originalSrc);
            }
        } catch (error) {
            console.log('⚠️ Erro ao restaurar iframe:', error);
        }
    });
}

// Função para ajustar o container da imagem baseado no tamanho real da imagem
function adjustImageContainer(img) {
    const container = img.closest('.product-image');
    if (!container) return;
    
    // Aguardar um pouco para garantir que a imagem carregou completamente
    setTimeout(() => {
        const imgAspectRatio = img.naturalWidth / img.naturalHeight;
        const containerWidth = container.offsetWidth;
        
        // Calcular altura ideal baseada na proporção da imagem
        let idealHeight = containerWidth / imgAspectRatio;
        
        // Limitar altura entre 250px e 400px
        idealHeight = Math.max(250, Math.min(400, idealHeight));
        
        // Aplicar altura calculada
        container.style.height = `${idealHeight}px`;
        
        // Verificar se é uma imagem vertical (altura > largura) e se está na seção de calçados
        const isVerticalImage = img.naturalHeight > img.naturalWidth;
        const isInShoesSection = container.closest('#calcadosGrid') !== null;
        
        // Debug: log das dimensões para verificar
        console.log(`Imagem: ${img.naturalWidth}x${img.naturalHeight}, Aspect Ratio: ${imgAspectRatio.toFixed(2)}, Vertical: ${isVerticalImage}, Calçados: ${isInShoesSection}`);
        
        // Se for imagem vertical na seção de calçados, aplicar posicionamento inferior
        if (isVerticalImage && isInShoesSection) {
            img.classList.add('vertical-shoe');
            console.log('✅ Aplicado object-position: bottom para imagem vertical de calçados');
        }
        
        // Adicionar classe para animação suave
        container.classList.add('image-adjusted');
    }, 100);
}

// Função para processar todas as imagens de calçados após carregamento
function processShoesImages() {
    console.log('🔍 Iniciando processamento de imagens de calçados...');
    const shoesGrid = document.getElementById('calcadosGrid');
    if (!shoesGrid) {
        console.log('❌ Grid de calçados não encontrado');
        return;
    }
    
    const images = shoesGrid.querySelectorAll('.product-image img');
    console.log(`📸 Encontradas ${images.length} imagens no grid de calçados`);
    
    images.forEach((img, index) => {
        console.log(`🔍 Processando imagem ${index + 1}:`);
        console.log(`   - Src: ${img.src}`);
        console.log(`   - Complete: ${img.complete}`);
        console.log(`   - Natural dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
        
        if (img.complete && img.naturalWidth > 0) {
            // Processar imagem já carregada
            const isVerticalImage = img.naturalHeight > img.naturalWidth;
            console.log(`   - É vertical: ${isVerticalImage} (${img.naturalHeight} > ${img.naturalWidth})`);
            
            if (isVerticalImage) {
                img.classList.add('vertical-shoe');
                console.log(`✅ Aplicado object-position: bottom para imagem ${index + 1}`);
            } else {
                console.log(`➡️ Imagem ${index + 1} é horizontal, mantendo posição center`);
            }
        } else {
            console.log(`⏳ Imagem ${index + 1} ainda não carregou, aguardando...`);
            // Aguardar carregamento
            img.addEventListener('load', function() {
                const isVerticalImage = this.naturalHeight > this.naturalWidth;
                console.log(`   - Após load: ${this.naturalWidth}x${this.naturalHeight}, Vertical: ${isVerticalImage}`);
                
                if (isVerticalImage) {
                    this.classList.add('vertical-shoe');
                    console.log(`✅ Aplicado object-position: bottom para imagem ${index + 1} após load`);
                } else {
                    console.log(`➡️ Imagem ${index + 1} é horizontal após load, mantendo posição center`);
                }
            });
        }
    });
    
    console.log('🏁 Processamento de imagens de calçados concluído');
}

// Função para forçar processamento de todas as imagens (pode ser chamada manualmente)
function forceProcessAllImages() {
    console.log('🔄 Forçando processamento de todas as imagens...');
    
    // Processar todas as seções
    const allGrids = ['roupasGrid', 'calcadosGrid', 'acessoriosGrid'];
    
    allGrids.forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        
        const images = grid.querySelectorAll('.product-image img');
        console.log(`📸 Processando ${images.length} imagens em ${gridId}`);
        
        images.forEach((img, index) => {
            if (img.complete && img.naturalWidth > 0) {
                const isVerticalImage = img.naturalHeight > img.naturalWidth;
                const isInShoesSection = gridId === 'calcadosGrid';
                
                console.log(`   Imagem ${index + 1}: ${img.naturalWidth}x${img.naturalHeight}, Vertical: ${isVerticalImage}, Calçados: ${isInShoesSection}`);
                
                if (isVerticalImage && isInShoesSection) {
                    img.classList.add('vertical-shoe');
                    console.log(`   ✅ Aplicado object-position: bottom`);
                }
            }
        });
    });
    
    console.log('🏁 Processamento forçado concluído');
}

// Disponibilizar função globalmente para debug
window.forceProcessAllImages = forceProcessAllImages;

// Funções para modais de suporte
function openSupportModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSupportModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function setupSupportModals() {
    // Event listeners para abrir modais
    document.querySelectorAll('[data-modal]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.getAttribute('data-modal');
            openSupportModal(modalId);
        });
    });

    // Event listeners para fechar modais
    document.querySelectorAll('.close-support-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            closeSupportModal(modalId);
        });
    });

    // Fechar modal clicando fora dele
    document.querySelectorAll('.support-modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // FAQ accordion functionality
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Fechar todos os outros itens
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Abrir o item clicado se não estava ativo
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });

    // Fechar modais com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.support-modal.active').forEach(modal => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    });
}

// Configurar filtros
function setupFilters() {
    console.log('Configurando filtros...');
    
    // Configurar botões de toggle dos filtros
    setupFilterToggleButtons();
    
    
    console.log('Filtros configurados!');
}

// Configurar botões de toggle dos filtros
function setupFilterToggleButtons() {
    const toggleButtons = [
        { id: 'toggleRoupasFilters', containerId: 'roupasFilters' },
        { id: 'toggleCalcadosFilters', containerId: 'calcadosFilters' },
        { id: 'toggleAcessoriosFilters', containerId: 'acessoriosFilters' }
    ];
    
    toggleButtons.forEach(({ id, containerId }) => {
        const button = document.getElementById(id);
        const container = document.getElementById(containerId);
        
        if (button && container) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Toggle clicado para ${containerId}`);
                
                // Fechar outros dropdowns abertos
                toggleButtons.forEach(({ containerId: otherContainerId }) => {
                    if (otherContainerId !== containerId) {
                        const otherContainer = document.getElementById(otherContainerId);
                        const otherButton = document.getElementById(otherContainerId.replace('Filters', 'toggle') + 'Filters');
                        if (otherContainer && otherButton) {
                            otherContainer.classList.remove('show');
                            otherContainer.classList.add('hidden');
                            otherButton.classList.remove('active');
                        }
                    }
                });
                
                // Toggle do dropdown atual
                if (container.classList.contains('hidden')) {
                    // Abrir dropdown
                    container.classList.remove('hidden');
                    setTimeout(() => {
                        container.classList.add('show');
                        // Configurar fechamento ao clicar fora quando abrir
                        const category = containerId.replace('Filters', '');
                        setupFilterClickOutside(category);
                    }, 10);
                    button.classList.add('active');
                } else {
                    // Fechar dropdown
                    container.classList.remove('show');
                    setTimeout(() => {
                        container.classList.add('hidden');
                    }, 300);
                    button.classList.remove('active');
                }
            });
        }
    });
    
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.filter-dropdown-container')) {
            toggleButtons.forEach(({ containerId }) => {
                const container = document.getElementById(containerId);
                const button = document.getElementById(containerId.replace('Filters', 'toggle') + 'Filters');
                if (container && button && container.classList.contains('show')) {
                    container.classList.remove('show');
                    setTimeout(() => {
                        container.classList.add('hidden');
                    }, 300);
                    button.classList.remove('active');
                }
            });
        }
    });
}

// Função para gerar filtros dinamicamente baseados na coluna B da planilha
function generateDynamicFilters() {
    
    // Coletar todos os valores únicos da coluna B (público) por categoria
    const filterData = {
        roupas: { publicos: new Set(), tamanhos: new Set(), precos: new Set(), tipos: new Set(), marcas: new Set(), cores: new Set() },
        calcados: { publicos: new Set(), tamanhos: new Set(), precos: new Set(), tipos: new Set(), marcas: new Set(), cores: new Set() },
        acessorios: { publicos: new Set(), tipos: new Set(), precos: new Set(), materiais: new Set(), marcas: new Set(), cores: new Set() }
    };
    
    // Analisar produtos de roupas (baseado no tipo da planilha)
    // console.log(`Analisando ${products.length} produtos de roupas...`);
    products.forEach(product => {
        // Verificar se o produto é do tipo "roupas" baseado na planilha
        if (product.category === 'roupas' || product.category === 'elegante' || product.category === 'casual' || product.type === 'roupas') {
            // console.log(`Produto de roupa: ${product.name}, Categoria (coluna B): ${product.publico}, Tamanhos: ${product.sizes}, Preço: ${product.price}`);
            // Adicionar público se o produto estiver na categoria de roupas
            if (product.publico && product.publico.trim() !== '') {
                filterData.roupas.publicos.add(product.publico.trim());
            }
            if (product.sizes && product.sizes.length > 0) {
                product.sizes.forEach(size => {
                    // Só adicionar tamanhos típicos de roupas (P, M, G, GG, XG, etc.)
                    if (typeof size === 'string' && size.match(/^[A-Z]+$/)) {
                        filterData.roupas.tamanhos.add(size);
                    }
                });
            }
            if (product.colors && product.colors.length > 0) {
                // console.log(`🎨 Processando cores do produto ${product.name}:`, product.colors);
                product.colors.forEach(color => {
                    if (color && color.name && color.name.trim() !== '') {
                        filterData.roupas.cores.add(color.name.trim());
                        // console.log(`🎨 Adicionando cor "${color.name.trim()}" para roupas`);
                    }
                });
            } else {
                console.log(`⚠️ Produto ${product.name} não tem cores ou array vazio`);
            }
            if (product.price && product.price > 0) filterData.roupas.precos.add(getPriceRange(product.price));
            if (product.type && product.type.trim() !== '') filterData.roupas.tipos.add(product.type.trim());
            if (product.brand && product.brand.trim() !== '') filterData.roupas.marcas.add(product.brand.trim());
        }
    });
    
    // Analisar produtos de calçados (baseado no tipo da planilha)
    // console.log(`Analisando ${calcadosProducts.length} produtos de calçados...`);
    calcadosProducts.forEach(product => {
        // Verificar se o produto é do tipo "calcados" baseado na planilha
        if (product.category === 'calcados' || product.type === 'calcados') {
            // console.log(`Produto de calçado: ${product.name}, Categoria (coluna B): ${product.publico}, Tamanhos: ${product.sizes}, Preço: ${product.price}, Tipo: ${product.type}`);
            // Adicionar público se o produto estiver na categoria de calçados
            if (product.publico && product.publico.trim() !== '') {
                filterData.calcados.publicos.add(product.publico.trim());
            }
            if (product.sizes && product.sizes.length > 0) {
                product.sizes.forEach(size => {
                    // Só adicionar tamanhos típicos de calçados (números de 35 a 44)
                    if (typeof size === 'string' && size.match(/^\d{2}$/) && parseInt(size) >= 35 && parseInt(size) <= 44) {
                        filterData.calcados.tamanhos.add(size);
                    }
                });
            }
            if (product.colors && product.colors.length > 0) {
                // console.log(`🎨 Processando cores do calçado ${product.name}:`, product.colors);
                product.colors.forEach(color => {
                    if (color && color.name && color.name.trim() !== '') {
                        filterData.calcados.cores.add(color.name.trim());
                        // console.log(`🎨 Adicionando cor "${color.name.trim()}" para calçados`);
                    }
                });
            } else {
                console.log(`⚠️ Calçado ${product.name} não tem cores ou array vazio`);
            }
            if (product.price && product.price > 0) filterData.calcados.precos.add(getPriceRange(product.price));
            if (product.type && product.type.trim() !== '') filterData.calcados.tipos.add(product.type.trim());
            if (product.brand && product.brand.trim() !== '') filterData.calcados.marcas.add(product.brand.trim());
        }
    });
    
    // Analisar produtos de acessórios (baseado no tipo da planilha)
    // console.log(`Analisando ${acessoriosProducts.length} produtos de acessórios...`);
    acessoriosProducts.forEach(product => {
        // Verificar se o produto é do tipo "acessorios" baseado na planilha
        if (product.category === 'acessorios' || product.type === 'acessorios') {
            // console.log(`Produto de acessório: ${product.name}, Categoria (coluna B): ${product.publico}, Tipo: ${product.type}, Preço: ${product.price}, Material: ${product.material}`);
            // Adicionar público se o produto estiver na categoria de acessórios
            if (product.publico && product.publico.trim() !== '') {
                filterData.acessorios.publicos.add(product.publico.trim());
            }
            if (product.colors && product.colors.length > 0) {
                // console.log(`🎨 Processando cores do acessório ${product.name}:`, product.colors);
                product.colors.forEach(color => {
                    if (color && color.name && color.name.trim() !== '') {
                        filterData.acessorios.cores.add(color.name.trim());
                        // console.log(`🎨 Adicionando cor "${color.name.trim()}" para acessórios`);
                    }
                });
            } else {
                console.log(`⚠️ Acessório ${product.name} não tem cores ou array vazio`);
            }
            if (product.type && product.type.trim() !== '') filterData.acessorios.tipos.add(product.type.trim());
            if (product.price && product.price > 0) filterData.acessorios.precos.add(getPriceRange(product.price));
            if (product.material && product.material.trim() !== '') filterData.acessorios.materiais.add(product.material.trim());
            if (product.brand && product.brand.trim() !== '') filterData.acessorios.marcas.add(product.brand.trim());
        }
    });
    
    // Atualizar os filtros no HTML
    updateFilterOptions('roupas', filterData.roupas);
    updateFilterOptions('calcados', filterData.calcados);
    updateFilterOptions('acessorios', filterData.acessorios);
    
    console.log('Filtros dinâmicos gerados:', filterData);
    console.log('Categorias encontradas na coluna B da planilha:');
    console.log('- Roupas:', Array.from(filterData.roupas.publicos));
    console.log('- Calçados:', Array.from(filterData.calcados.publicos));
    console.log('- Acessórios:', Array.from(filterData.acessorios.publicos));
    
    console.log('🎨 Cores coletadas por categoria:');
    console.log('- Roupas:', Array.from(filterData.roupas.cores));
    console.log('- Calçados:', Array.from(filterData.calcados.cores));
    console.log('- Acessórios:', Array.from(filterData.acessorios.cores));
    
    // Configurar os event listeners após gerar os filtros
    setupFilters();
}

// Função auxiliar para determinar faixa de preço
function getPriceRange(price) {
    if (price <= 50) return '0-50';
    if (price <= 100) return '50-100';
    if (price <= 200) return '100-200';
    if (price <= 500) return '200-500';
    return '500+';
}

// Função para atualizar as opções dos filtros no HTML
function updateFilterOptions(category, filterData) {
    const filtersContainer = document.getElementById(`${category}Filters`);
    if (!filtersContainer) return;
    
    // Atualizar filtro de público
    if (filterData.publicos && filterData.publicos.size > 0) {
        let publicoFilterId;
        if (category === 'roupas') {
            publicoFilterId = '#publicoRoupasFilter';
        } else if (category === 'calcados') {
            publicoFilterId = '#publicoCalcadosFilter';
        } else if (category === 'acessorios') {
            publicoFilterId = '#publicoAcessoriosFilter';
        }
        
        if (publicoFilterId) {
            const publicoFilter = filtersContainer.querySelector(publicoFilterId);
            if (publicoFilter) {
                console.log(`Atualizando filtro de público (coluna B) para ${category}:`, Array.from(filterData.publicos));
                publicoFilter.innerHTML = '';
                Array.from(filterData.publicos).sort().forEach(publico => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" value="${publico}"> ${publico.charAt(0).toUpperCase() + publico.slice(1)}`;
                    publicoFilter.appendChild(label);
                });
                
                // Mostrar o grupo de filtro de público
                const publicoGroup = publicoFilter.closest('.filter-group');
                if (publicoGroup) {
                    publicoGroup.style.display = 'block';
                }
                console.log(`Filtro de público atualizado com ${publicoFilter.children.length} opções`);
            }
        }
    } else {
        // Ocultar o grupo de filtro de público se não houver dados
        let publicoFilterId;
        if (category === 'roupas') {
            publicoFilterId = '#publicoRoupasFilter';
        } else if (category === 'calcados') {
            publicoFilterId = '#publicoCalcadosFilter';
        } else if (category === 'acessorios') {
            publicoFilterId = '#publicoAcessoriosFilter';
        }
        
        if (publicoFilterId) {
            const publicoFilter = filtersContainer.querySelector(publicoFilterId);
            if (publicoFilter) {
                const publicoGroup = publicoFilter.closest('.filter-group');
                if (publicoGroup) {
                    publicoGroup.style.display = 'none';
                }
            }
        }
        console.log(`Filtro de público (coluna B) não encontrado ou sem dados para ${category}`);
    }
    
    // Atualizar filtro de tamanho (específico por categoria)
    if (filterData.tamanhos && filterData.tamanhos.size > 0) {
        let tamanhoFilterId;
        if (category === 'roupas') {
            tamanhoFilterId = '#tamanhoFilter';
        } else if (category === 'calcados') {
            tamanhoFilterId = '#tamanhoCalcadosFilter';
        }
        
        if (tamanhoFilterId) {
            const tamanhoFilter = filtersContainer.querySelector(tamanhoFilterId);
            if (tamanhoFilter) {
                tamanhoFilter.innerHTML = '';
                Array.from(filterData.tamanhos).sort().forEach(tamanho => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" value="${tamanho}"> ${tamanho}`;
                    tamanhoFilter.appendChild(label);
                });
                
                // Mostrar o grupo de filtro de tamanho
                const tamanhoGroup = tamanhoFilter.closest('.filter-group');
                if (tamanhoGroup) {
                    tamanhoGroup.style.display = 'block';
                }
            }
        }
    } else {
        // Ocultar o grupo de filtro de tamanho se não houver dados
        let tamanhoFilterId;
        if (category === 'roupas') {
            tamanhoFilterId = '#tamanhoFilter';
        } else if (category === 'calcados') {
            tamanhoFilterId = '#tamanhoCalcadosFilter';
        }
        
        if (tamanhoFilterId) {
            const tamanhoFilter = filtersContainer.querySelector(tamanhoFilterId);
            if (tamanhoFilter) {
                const tamanhoGroup = tamanhoFilter.closest('.filter-group');
                if (tamanhoGroup) {
                    tamanhoGroup.style.display = 'none';
                }
            }
        }
    }
    
    // Atualizar filtro de cor
    if (filterData.cores && filterData.cores.size > 0) {
        let corFilterId;
        if (category === 'roupas') {
            corFilterId = '#corRoupasFilter';
        } else if (category === 'calcados') {
            corFilterId = '#corCalcadosFilter';
        } else if (category === 'acessorios') {
            corFilterId = '#corAcessoriosFilter';
        }
        
        if (corFilterId) {
            console.log(`🔍 Procurando filtro de cor com ID: ${corFilterId} para ${category}`);
            const corFilter = filtersContainer.querySelector(corFilterId);
            if (corFilter) {
                console.log(`✅ Filtro de cor encontrado para ${category}:`, corFilter);
                console.log(`Atualizando filtro de cor para ${category}:`, Array.from(filterData.cores));
                corFilter.innerHTML = '';
                Array.from(filterData.cores).sort().forEach(cor => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" value="${cor}"> ${cor.charAt(0).toUpperCase() + cor.slice(1)}`;
                    corFilter.appendChild(label);
                });
                
                // Mostrar o grupo de filtro de cor
                const corGroup = corFilter.closest('.filter-group');
                if (corGroup) {
                    corGroup.style.display = 'block';
                    console.log(`✅ Grupo de filtro de cor mostrado para ${category}`);
                } else {
                    console.log(`❌ Grupo de filtro de cor não encontrado para ${category}`);
                }
                console.log(`Filtro de cor atualizado com ${corFilter.children.length} opções`);
            } else {
                console.log(`❌ Filtro de cor não encontrado com ID: ${corFilterId} para ${category}`);
                console.log(`🔍 Container de filtros:`, filtersContainer);
                console.log(`🔍 Todos os elementos com ID contendo 'cor':`, filtersContainer.querySelectorAll('[id*="cor"]'));
            }
        }
    } else {
        // Ocultar o grupo de filtro de cor se não houver dados
        let corFilterId;
        if (category === 'roupas') {
            corFilterId = '#corRoupasFilter';
        } else if (category === 'calcados') {
            corFilterId = '#corCalcadosFilter';
        } else if (category === 'acessorios') {
            corFilterId = '#corAcessoriosFilter';
        }
        
        if (corFilterId) {
            const corFilter = filtersContainer.querySelector(corFilterId);
            if (corFilter) {
                const corGroup = corFilter.closest('.filter-group');
                if (corGroup) {
                    corGroup.style.display = 'none';
                }
            }
        }
        console.log(`Filtro de cor não encontrado ou sem dados para ${category}`);
    }
    
    // Atualizar filtro de preço
    if (filterData.precos && filterData.precos.size > 0) {
        let precoFilterId;
        if (category === 'roupas') {
            precoFilterId = '#precoFilter';
        } else if (category === 'calcados') {
            precoFilterId = '#precoCalcadosFilter';
        } else if (category === 'acessorios') {
            precoFilterId = '#precoAcessoriosFilter';
        }
        
        if (precoFilterId) {
            const precoFilter = filtersContainer.querySelector(precoFilterId);
            if (precoFilter) {
                precoFilter.innerHTML = '';
                const priceRanges = ['0-50', '50-100', '100-200', '200-500', '500+'];
                priceRanges.forEach(range => {
                    if (filterData.precos.has(range)) {
                        const label = document.createElement('label');
                        const labelText = getPriceLabel(range);
                        label.innerHTML = `<input type="checkbox" value="${range}"> ${labelText}`;
                        precoFilter.appendChild(label);
                    }
                });
                
                // Mostrar o grupo de filtro de preço
                const precoGroup = precoFilter.closest('.filter-group');
                if (precoGroup) {
                    precoGroup.style.display = 'block';
                }
            }
        }
    } else {
        // Ocultar o grupo de filtro de preço se não houver dados
        let precoFilterId;
        if (category === 'roupas') {
            precoFilterId = '#precoFilter';
        } else if (category === 'calcados') {
            precoFilterId = '#precoCalcadosFilter';
        } else if (category === 'acessorios') {
            precoFilterId = '#precoAcessoriosFilter';
        }
        
        if (precoFilterId) {
            const precoFilter = filtersContainer.querySelector(precoFilterId);
            if (precoFilter) {
                const precoGroup = precoFilter.closest('.filter-group');
                if (precoGroup) {
                    precoGroup.style.display = 'none';
                }
            }
        }
    }
    
    // Atualizar filtros específicos por categoria
    
    if (category === 'calcados' && filterData.tipos && filterData.tipos.size > 0) {
        const tipoFilter = filtersContainer.querySelector('#tipoCalcadosFilter');
        if (tipoFilter) {
            tipoFilter.innerHTML = '';
            Array.from(filterData.tipos).sort().forEach(tipo => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" value="${tipo}"> ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
                tipoFilter.appendChild(label);
            });
            
            // Mostrar o grupo de filtro de tipo
            const tipoGroup = tipoFilter.closest('.filter-group');
            if (tipoGroup) {
                tipoGroup.style.display = 'block';
            }
        }
    } else if (category === 'calcados') {
        // Ocultar o grupo de filtro de tipo se não houver dados
        const tipoFilter = filtersContainer.querySelector('#tipoCalcadosFilter');
        if (tipoFilter) {
            const tipoGroup = tipoFilter.closest('.filter-group');
            if (tipoGroup) {
                tipoGroup.style.display = 'none';
            }
        }
    }
    
    if (category === 'acessorios') {
        // Atualizar filtro de tipo para acessórios
        if (filterData.tipos && filterData.tipos.size > 0) {
            const tipoFilter = filtersContainer.querySelector('#tipoAcessoriosFilter');
            if (tipoFilter) {
                tipoFilter.innerHTML = '';
                Array.from(filterData.tipos).sort().forEach(tipo => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" value="${tipo}"> ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
                    tipoFilter.appendChild(label);
                });
                
                // Mostrar o grupo de filtro de tipo
                const tipoGroup = tipoFilter.closest('.filter-group');
                if (tipoGroup) {
                    tipoGroup.style.display = 'block';
                }
            }
        } else {
            // Ocultar o grupo de filtro de tipo se não houver dados
            const tipoFilter = filtersContainer.querySelector('#tipoAcessoriosFilter');
            if (tipoFilter) {
                const tipoGroup = tipoFilter.closest('.filter-group');
                if (tipoGroup) {
                    tipoGroup.style.display = 'none';
                }
            }
        }
        
        // Atualizar filtro de material para acessórios
        if (filterData.materiais && filterData.materiais.size > 0) {
            const materialFilter = filtersContainer.querySelector('#materialAcessoriosFilter');
            if (materialFilter) {
                materialFilter.innerHTML = '';
                Array.from(filterData.materiais).sort().forEach(material => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" value="${material}"> ${material.charAt(0).toUpperCase() + material.slice(1)}`;
                    materialFilter.appendChild(label);
                });
                
                // Mostrar o grupo de filtro de material
                const materialGroup = materialFilter.closest('.filter-group');
                if (materialGroup) {
                    materialGroup.style.display = 'block';
                }
            }
        } else {
            // Ocultar o grupo de filtro de material se não houver dados
            const materialFilter = filtersContainer.querySelector('#materialAcessoriosFilter');
            if (materialFilter) {
                const materialGroup = materialFilter.closest('.filter-group');
                if (materialGroup) {
                    materialGroup.style.display = 'none';
                }
            }
        }
    }
    
    // Atualizar filtro de tipo para roupas
    if (category === 'roupas' && filterData.tipos && filterData.tipos.size > 0) {
        const tipoFilter = filtersContainer.querySelector('#tipoRoupasFilter');
        if (tipoFilter) {
            console.log(`Atualizando filtro de tipo para roupas:`, Array.from(filterData.tipos));
            tipoFilter.innerHTML = '';
            Array.from(filterData.tipos).sort().forEach(tipo => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox" value="${tipo}"> ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
                tipoFilter.appendChild(label);
            });
            
            // Mostrar o grupo de filtro de tipo
            const tipoGroup = tipoFilter.closest('.filter-group');
            if (tipoGroup) {
                tipoGroup.style.display = 'block';
            }
            console.log(`Filtro de tipo atualizado com ${tipoFilter.children.length} opções`);
        }
    } else if (category === 'roupas') {
        // Ocultar o grupo de filtro de tipo se não houver dados
        const tipoFilter = filtersContainer.querySelector('#tipoRoupasFilter');
        if (tipoFilter) {
            const tipoGroup = tipoFilter.closest('.filter-group');
            if (tipoGroup) {
                tipoGroup.style.display = 'none';
            }
        }
        console.log(`Filtro de tipo não encontrado ou sem dados para roupas`);
    }
    
    // Atualizar filtro de marca para todas as categorias
    if (filterData.marcas && filterData.marcas.size > 0) {
        let marcaFilterId;
        if (category === 'roupas') {
            marcaFilterId = '#marcaFilter';
        } else if (category === 'calcados') {
            marcaFilterId = '#marcaCalcadosFilter';
        } else if (category === 'acessorios') {
            marcaFilterId = '#marcaAcessoriosFilter';
        }
        
        if (marcaFilterId) {
            const marcaFilter = filtersContainer.querySelector(marcaFilterId);
            if (marcaFilter) {
                console.log(`Atualizando filtro de marca para ${category}:`, Array.from(filterData.marcas));
                marcaFilter.innerHTML = '';
                Array.from(filterData.marcas).sort().forEach(marca => {
                    const label = document.createElement('label');
                    label.innerHTML = `<input type="checkbox" value="${marca}"> ${marca.charAt(0).toUpperCase() + marca.slice(1)}`;
                    marcaFilter.appendChild(label);
                });
                
                // Mostrar o grupo de filtro de marca
                const marcaGroup = marcaFilter.closest('.filter-group');
                if (marcaGroup) {
                    marcaGroup.style.display = 'block';
                }
                console.log(`Filtro de marca atualizado com ${marcaFilter.children.length} opções`);
            }
        }
    } else {
        // Ocultar o grupo de filtro de marca se não houver dados
        let marcaFilterId;
        if (category === 'roupas') {
            marcaFilterId = '#marcaFilter';
        } else if (category === 'calcados') {
            marcaFilterId = '#marcaCalcadosFilter';
        } else if (category === 'acessorios') {
            marcaFilterId = '#marcaAcessoriosFilter';
        }
        
        if (marcaFilterId) {
            const marcaFilter = filtersContainer.querySelector(marcaFilterId);
            if (marcaFilter) {
                const marcaGroup = marcaFilter.closest('.filter-group');
                if (marcaGroup) {
                    marcaGroup.style.display = 'none';
                }
            }
        }
        console.log(`Filtro de marca não encontrado ou sem dados para ${category}`);
    }
    
    // Reconfigurar event listeners para os novos elementos
    setupCategoryFilters(category);
}

// Função auxiliar para obter label do preço
function getPriceLabel(range) {
    const labels = {
        '0-50': 'Até R$ 50',
        '50-100': 'R$ 50 - R$ 100',
        '100-200': 'R$ 100 - R$ 200',
        '200-500': 'R$ 200 - R$ 500',
        '500+': 'Acima de R$ 500'
    };
    return labels[range] || range;
}

function setupCategoryFilters(category) {
    const filtersContainer = document.getElementById(`${category}Filters`);
    console.log(`Configurando filtros para ${category}:`, filtersContainer);
    if (!filtersContainer) {
        console.error(`Container de filtros não encontrado para ${category}`);
        return;
    }

    // Configurar toggles dos filtros
    const filterToggles = filtersContainer.querySelectorAll('.filter-toggle');
    console.log(`Encontrados ${filterToggles.length} toggles para ${category}`);
    
    filterToggles.forEach(toggle => {
        // Verificar se o elemento ainda existe no DOM
        if (!document.contains(toggle)) {
            console.log('Toggle removido do DOM, pulando configuração');
            return;
        }
        
        // Remover event listeners antigos
        toggle.onclick = null;
        
        // Adicionar novo event listener
        toggle.onclick = function(event) {
            event.preventDefault();
            event.stopPropagation();
            console.log('=== FILTRO CLICADO ===');
            console.log('Filtro:', this.dataset.filter);
            console.log('Elemento:', this);
            console.log('Classe active antes:', this.classList.contains('active'));
            const filterType = this.dataset.filter;
            let options;
            
            // Mapear os IDs corretos baseado na categoria
            if (category === 'roupas') {
                if (filterType === 'publico') {
                    options = document.getElementById('publicoRoupasFilter');
                } else if (filterType === 'tipo') {
                    options = document.getElementById('tipoRoupasFilter');
                } else {
                options = document.getElementById(`${filterType}Filter`);
                }
            } else if (category === 'calcados') {
                if (filterType === 'publico') {
                    options = document.getElementById('publicoCalcadosFilter');
                } else {
                options = document.getElementById(`${filterType}CalcadosFilter`);
                }
            } else if (category === 'acessorios') {
                if (filterType === 'publico') {
                    options = document.getElementById('publicoAcessoriosFilter');
                } else {
                options = document.getElementById(`${filterType}AcessoriosFilter`);
                }
            }
            
            if (options) {
                // Verificar se o filtro atual já está aberto
                const isCurrentlyActive = this.classList.contains('active');
                console.log('Options encontradas:', options);
                console.log('Está ativo antes:', isCurrentlyActive);
                
                if (isCurrentlyActive) {
                    // Se já estiver aberto, fechar apenas este filtro
                    this.classList.remove('active');
                    options.classList.remove('active');
                    console.log(`Filtro ${filterType} fechado`);
                    console.log('Classe active depois:', this.classList.contains('active'));
                } else {
                    // Se estiver fechado, fechar outros e abrir este
                    console.log('Fechando outros filtros...');
                    const allFilterOptions = filtersContainer.querySelectorAll('.filter-options');
                    allFilterOptions.forEach(opt => {
                        opt.classList.remove('active');
                    });
                    
                    const allToggles = filtersContainer.querySelectorAll('.filter-toggle');
                    allToggles.forEach(t => {
                        t.classList.remove('active');
                    });
                    
                    // Abrir o filtro atual
                    this.classList.add('active');
                    options.classList.add('active');
                    console.log(`Filtro ${filterType} aberto`);
                    console.log('Classe active depois:', this.classList.contains('active'));
                }
            } else {
                console.log('Options não encontradas para:', filterType);
            }
        };
    });

    // Configurar checkboxes dos filtros
    const filterOptions = filtersContainer.querySelectorAll('.filter-options input[type="checkbox"]');
    filterOptions.forEach(checkbox => {
        // Remover event listeners antigos
        checkbox.onchange = null;
        
        // Adicionar novo event listener
        checkbox.onchange = function() {
            console.log('Checkbox clicado:', this.value);
            applyFilters(category);
        };
    });

    // Configurar botão limpar filtros
    const clearButton = document.getElementById(`clear${category.charAt(0).toUpperCase() + category.slice(1)}Filters`);
    if (clearButton) {
        // Remover event listeners antigos
        clearButton.onclick = null;
        
        // Adicionar novo event listener
        clearButton.onclick = function() {
            console.log('Botão limpar clicado');
            clearFilters(category);
        };
    }
}

function applyFilters(category) {
    console.log(`🔧 Aplicando filtros para categoria: ${category}`);
    
    const filtersContainer = document.getElementById(`${category}Filters`);
    if (!filtersContainer) {
        console.log(`❌ Container de filtros não encontrado: ${category}Filters`);
        return;
    }

    // Coletar filtros ativos
    const activeFilters = {};
    const filterOptions = filtersContainer.querySelectorAll('.filter-options');
    
    console.log(`📋 Encontrados ${filterOptions.length} filtros para ${category}`);
    
    filterOptions.forEach(options => {
        let filterType;
        
        // Extrair o tipo do filtro baseado no ID
        if (category === 'roupas') {
            if (options.id === 'publicoRoupasFilter') {
                filterType = 'publico';
            } else if (options.id === 'tipoRoupasFilter') {
                filterType = 'tipo';
            } else {
            filterType = options.id.replace('Filter', '').toLowerCase();
            }
        } else if (category === 'calcados') {
            if (options.id === 'publicoCalcadosFilter') {
                filterType = 'publico';
            } else {
            filterType = options.id.replace('CalcadosFilter', '').toLowerCase();
            }
        } else if (category === 'acessorios') {
            if (options.id === 'publicoAcessoriosFilter') {
                filterType = 'publico';
            } else {
            filterType = options.id.replace('AcessoriosFilter', '').toLowerCase();
            }
        }
        
        const checkedBoxes = options.querySelectorAll('input[type="checkbox"]:checked');
        const values = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (values.length > 0) {
            activeFilters[filterType] = values;
        }
    });

    // Aplicar filtros aos produtos
    let productsToFilter = [];
    if (category === 'roupas') {
        productsToFilter = products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual');
    } else if (category === 'calcados') {
        productsToFilter = calcadosProducts;
    } else if (category === 'acessorios') {
        productsToFilter = acessoriosProducts;
    }

    let filteredProducts = productsToFilter.filter(product => {
        return Object.keys(activeFilters).every(filterType => {
            const filterValues = activeFilters[filterType];
            
            switch (filterType) {
                case 'marca':
                    // Comparação case-insensitive e flexível
                    if (!product.brand) return false;
                    const productBrand = product.brand.toLowerCase();
                    return filterValues.some(filterValue => {
                        const filterValueLower = filterValue.toLowerCase();
                        return productBrand === filterValueLower || 
                               productBrand.includes(filterValueLower) || 
                               filterValueLower.includes(productBrand);
                    });
                case 'tamanho':
                    return product.sizes && filterValues.some(size => product.sizes.includes(size));
                case 'preco':
                    return filterValues.some(range => {
                        const [min, max] = range.split('-').map(v => v === '+' ? Infinity : parseFloat(v));
                        return product.price >= min && (max === Infinity ? true : product.price <= max);
                    });
                case 'cor':
                    return product.colors && product.colors.some(color => 
                        color && color.name && filterValues.includes(color.name)
                    );
                case 'tipo':
                    // Comparação case-insensitive e flexível
                    if (!product.type) return false;
                    const productType = product.type.toLowerCase();
                    return filterValues.some(filterValue => {
                        const filterValueLower = filterValue.toLowerCase();
                        return productType === filterValueLower || 
                               productType.includes(filterValueLower) || 
                               filterValueLower.includes(productType);
                    });
                case 'material':
                    // Comparação case-insensitive
                    if (!product.material) return false;
                    const productMaterial = product.material.toLowerCase();
                    return filterValues.some(filterValue => 
                        productMaterial === filterValue.toLowerCase()
                    );
                case 'publico':
                    // Comparação case-insensitive
                    if (!product.publico) return false;
                    const productPublico = product.publico.toLowerCase();
                    return filterValues.some(filterValue => 
                        productPublico === filterValue.toLowerCase()
                    );
                default:
                    return true;
            }
        });
    });

    // Atualizar filtros dinamicamente baseado nos produtos filtrados
    updateDynamicFilters(category, filteredProducts, activeFilters);

    // 🎨 Agrupar produtos por tipo e ordenar por cor ANTES de renderizar
    if (filteredProducts.length > 0) {
        filteredProducts = groupProductsByTypeWithCustomOrder(filteredProducts, category);
    }

    // Renderizar produtos filtrados
    const grid = document.getElementById(`${category}Grid`);
    const section = document.getElementById(category);
    
    if (grid) {
        grid.innerHTML = '';
        
        if (filteredProducts.length > 0) {
            // Mostrar produtos filtrados
        filteredProducts.forEach(product => {
            const productCard = createProductCard(product);
            grid.appendChild(productCard);
        });
            
            // Mostrar seção se estava oculta
            if (section) {
                section.style.display = 'block';
            }
        } else {
            // Se há filtros ativos e nenhum produto, mostrar mensagem personalizada
            const noProductsMessage = document.createElement('div');
            noProductsMessage.className = 'no-products-message';
            noProductsMessage.innerHTML = `
                <div class="no-products-content">
                    <i class="fas fa-box-open"></i>
                    <h3>Produtos em breve!</h3>
                    <p>Esta seção não tem produtos disponíveis ainda, mas aguarde novidades em breve! Estamos trabalhando para trazer os melhores produtos para você.</p>
                    <p style="margin-top: 12px;">Fique à vontade para navegar por outras seções.</p>
                    <div style="margin-top: 30px; display: flex; justify-content: center;">
                        <a href="index.html" class="btn-back-home-styled">
                            <i class="fas fa-home"></i>
                            Voltar para Home
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(noProductsMessage);
            grid.classList.add('empty-grid');

    if (section) {
        section.style.display = 'block';
            }
        }
    }
}

// Função para detectar o primeiro filtro usado
function getFirstActiveFilter(activeFilters) {
    const filterOrder = ['marca', 'tipo', 'publico', 'tamanho', 'preco', 'material'];
    for (const filterType of filterOrder) {
        if (activeFilters[filterType] && activeFilters[filterType].length > 0) {
            return filterType;
        }
    }
    return null;
}

// Função para atualizar filtros dinamicamente baseado nos produtos filtrados
function updateDynamicFilters(category, filteredProducts, activeFilters) {
    console.log(`Atualizando filtros dinâmicos para ${category} baseado em ${filteredProducts.length} produtos filtrados`);
    
    // Detectar o primeiro filtro usado
    const firstFilter = getFirstActiveFilter(activeFilters);
    console.log('Primeiro filtro usado:', firstFilter);
    
    // Coletar dados dos produtos filtrados
    const dynamicFilterData = {
        marcas: new Set(),
        tamanhos: new Set(),
        precos: new Set(),
        tipos: new Set(),
        materiais: new Set(),
        publicos: new Set()
    };
    
    // Analisar produtos filtrados para coletar opções disponíveis
    filteredProducts.forEach(product => {
        if (product.brand && product.brand.trim() !== '') {
            dynamicFilterData.marcas.add(product.brand.trim());
        }
        if (product.sizes && product.sizes.length > 0) {
            product.sizes.forEach(size => {
                if (typeof size === 'string') {
                    dynamicFilterData.tamanhos.add(size);
                }
            });
        }
        if (product.price && product.price > 0) {
            dynamicFilterData.precos.add(getPriceRange(product.price));
        }
        if (product.type && product.type.trim() !== '') {
            dynamicFilterData.tipos.add(product.type.trim());
        }
        if (product.material && product.material.trim() !== '') {
            dynamicFilterData.materiais.add(product.material.trim());
        }
        if (product.publico && product.publico.trim() !== '') {
            dynamicFilterData.publicos.add(product.publico.trim());
        }
    });
    
    // Atualizar cada filtro individualmente com lógica hierárquica
    updateFilterOptionsDynamic(category, dynamicFilterData, activeFilters, firstFilter);
}

// Função para atualizar opções de filtro dinamicamente
function updateFilterOptionsDynamic(category, filterData, activeFilters, firstFilter) {
    const filtersContainer = document.getElementById(`${category}Filters`);
    if (!filtersContainer) return;
    
    
    // Atualizar filtro de marca
    if (firstFilter === 'marca') {
        // Se marca é o primeiro filtro, mostrar todas as marcas disponíveis (não adaptar)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allMarcas = new Set();
        allProducts.forEach(product => {
            if (product.brand && product.brand.trim() !== '') {
                allMarcas.add(product.brand.trim());
            }
        });
        updateSingleFilter(category, 'marca', allMarcas, activeFilters.marca);
    } else {
        // Se não é o primeiro filtro, mostrar TODAS as marcas disponíveis (não apenas as filtradas)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allMarcas = new Set();
        allProducts.forEach(product => {
            if (product.brand && product.brand.trim() !== '') {
                allMarcas.add(product.brand.trim());
            }
        });
        updateSingleFilter(category, 'marca', allMarcas, activeFilters.marca);
    }
    
    // Atualizar filtro de tamanho
    if (firstFilter === 'tamanho') {
        // Se tamanho é o primeiro filtro, mostrar todos os tamanhos disponíveis (não adaptar)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allTamanhos = new Set();
        allProducts.forEach(product => {
            if (product.sizes && product.sizes.length > 0) {
                product.sizes.forEach(size => {
                    if (typeof size === 'string') {
                        allTamanhos.add(size);
                    }
                });
            }
        });
        updateSingleFilter(category, 'tamanho', allTamanhos, activeFilters.tamanho);
    } else {
        // Se não é o primeiro filtro, mostrar TODOS os tamanhos disponíveis (não apenas os filtrados)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allTamanhos = new Set();
        allProducts.forEach(product => {
            if (product.sizes && product.sizes.length > 0) {
                product.sizes.forEach(size => {
                    if (typeof size === 'string') {
                        allTamanhos.add(size);
                    }
                });
            }
        });
        updateSingleFilter(category, 'tamanho', allTamanhos, activeFilters.tamanho);
    }
    
    // Atualizar filtro de preço
    if (firstFilter === 'preco') {
        // Se preço é o primeiro filtro, mostrar todas as faixas de preço disponíveis (não adaptar)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allPrecos = new Set();
        allProducts.forEach(product => {
            if (product.price && product.price > 0) {
                allPrecos.add(getPriceRange(product.price));
            }
        });
        updateSingleFilter(category, 'preco', allPrecos, activeFilters.preco);
    } else {
        // Se não é o primeiro filtro, mostrar TODAS as faixas de preço disponíveis (não apenas as filtradas)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allPrecos = new Set();
        allProducts.forEach(product => {
            if (product.price && product.price > 0) {
                allPrecos.add(getPriceRange(product.price));
            }
        });
        updateSingleFilter(category, 'preco', allPrecos, activeFilters.preco);
    }
    
    // Atualizar filtro de tipo
    if (firstFilter === 'tipo') {
        // Se tipo é o primeiro filtro, mostrar todos os tipos disponíveis (não adaptar)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allTipos = new Set();
        allProducts.forEach(product => {
            if (product.type && product.type.trim() !== '') {
                allTipos.add(product.type.trim());
            }
        });
        
        if (category === 'roupas') {
            updateSingleFilter(category, 'tipo', allTipos, activeFilters.tipo, 'tipoRoupasFilter');
        } else if (category === 'calcados') {
            updateSingleFilter(category, 'tipo', allTipos, activeFilters.tipo, 'tipoCalcadosFilter');
        } else if (category === 'acessorios') {
            updateSingleFilter(category, 'tipo', allTipos, activeFilters.tipo, 'tipoAcessoriosFilter');
        }
    } else {
        // Se não é o primeiro filtro, mostrar TODOS os tipos disponíveis (não apenas os filtrados)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allTipos = new Set();
        allProducts.forEach(product => {
            if (product.type && product.type.trim() !== '') {
                allTipos.add(product.type.trim());
            }
        });
        
        if (category === 'roupas') {
            updateSingleFilter(category, 'tipo', allTipos, activeFilters.tipo, 'tipoRoupasFilter');
        } else if (category === 'calcados') {
            updateSingleFilter(category, 'tipo', allTipos, activeFilters.tipo, 'tipoCalcadosFilter');
        } else if (category === 'acessorios') {
            updateSingleFilter(category, 'tipo', allTipos, activeFilters.tipo, 'tipoAcessoriosFilter');
        }
    }
    
    // Atualizar filtro de material (apenas acessórios)
    if (category === 'acessorios') {
        if (firstFilter === 'material') {
            // Se material é o primeiro filtro, mostrar todos os materiais disponíveis (não adaptar)
            const allProducts = acessoriosProducts;
            
            const allMateriais = new Set();
            allProducts.forEach(product => {
                if (product.material && product.material.trim() !== '') {
                    allMateriais.add(product.material.trim());
                }
            });
            updateSingleFilter(category, 'material', allMateriais, activeFilters.material, 'materialAcessoriosFilter');
        } else {
            // Se não é o primeiro filtro, mostrar TODOS os materiais disponíveis (não apenas os filtrados)
            const allProducts = acessoriosProducts;
            
            const allMateriais = new Set();
            allProducts.forEach(product => {
                if (product.material && product.material.trim() !== '') {
                    allMateriais.add(product.material.trim());
                }
            });
            updateSingleFilter(category, 'material', allMateriais, activeFilters.material, 'materialAcessoriosFilter');
        }
    }
    
    // Atualizar filtro de público
    if (firstFilter === 'publico') {
        // Se público é o primeiro filtro, mostrar todos os públicos disponíveis (não adaptar)
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allPublicos = new Set();
        allProducts.forEach(product => {
            if (product.publico && product.publico.trim() !== '') {
                allPublicos.add(product.publico.trim());
            }
        });
        
        if (category === 'roupas') {
            updateSingleFilter(category, 'publico', allPublicos, activeFilters.publico, 'publicoRoupasFilter');
        } else if (category === 'calcados') {
            updateSingleFilter(category, 'publico', allPublicos, activeFilters.publico, 'publicoCalcadosFilter');
        } else if (category === 'acessorios') {
            updateSingleFilter(category, 'publico', allPublicos, activeFilters.publico, 'publicoAcessoriosFilter');
        }
    } else {
        // Se não é o primeiro filtro, mostrar TODOS os públicos disponíveis (não apenas os filtrados)
        // Isso permite que o usuário veja todas as opções e escolha múltiplas
        const allProducts = category === 'roupas' ? 
            products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual') :
            category === 'calcados' ? calcadosProducts : acessoriosProducts;
        
        const allPublicos = new Set();
        allProducts.forEach(product => {
            if (product.publico && product.publico.trim() !== '') {
                allPublicos.add(product.publico.trim());
            }
        });
        
        if (category === 'roupas') {
            updateSingleFilter(category, 'publico', allPublicos, activeFilters.publico, 'publicoRoupasFilter');
        } else if (category === 'calcados') {
            updateSingleFilter(category, 'publico', allPublicos, activeFilters.publico, 'publicoCalcadosFilter');
        } else if (category === 'acessorios') {
            updateSingleFilter(category, 'publico', allPublicos, activeFilters.publico, 'publicoAcessoriosFilter');
        }
    }
    
    // Reconfigurar event listeners uma única vez no final com pequeno delay
    setTimeout(() => {
        setupCategoryFilters(category);
        setupFilterDoubleClickClose(category);
    }, 10);
    
    // Configurar fechamento da aba imediatamente (sempre ativo)
    setupFilterClickOutside(category);
}

// Função auxiliar para atualizar um filtro específico
function updateSingleFilter(category, filterType, availableValues, activeValues, customFilterId = null) {
    const filtersContainer = document.getElementById(`${category}Filters`);
    if (!filtersContainer) return;
    
    let filterId;
    if (customFilterId) {
        filterId = customFilterId;
    } else {
        if (category === 'roupas') {
            filterId = `${filterType}Filter`;
        } else if (category === 'calcados') {
            filterId = `${filterType}CalcadosFilter`;
        } else if (category === 'acessorios') {
            filterId = `${filterType}AcessoriosFilter`;
        }
    }
    
    const filterElement = filtersContainer.querySelector(`#${filterId}`);
    if (!filterElement) return;
    
    // Limpar opções existentes
    filterElement.innerHTML = '';
    
    if (availableValues.size > 0) {
        // Mostrar opções disponíveis
        Array.from(availableValues).sort().forEach(value => {
            const isChecked = activeValues && activeValues.includes(value);
            
            // Verificar se este valor é compatível com os outros filtros ativos
            const allActiveFilters = getCurrentActiveFilters(category);
            const isCompatible = isFilterValueCompatible(category, filterType, value, allActiveFilters);
            
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${value}" ${isChecked ? 'checked' : ''} ${!isCompatible ? 'disabled' : ''}> ${value.charAt(0).toUpperCase() + value.slice(1)}`;
            
            // Adicionar estilo visual para opções desabilitadas
            if (!isCompatible) {
                label.style.opacity = '0.5';
                label.style.cursor = 'not-allowed';
            }
            
            filterElement.appendChild(label);
        });
        
        // Mostrar o grupo de filtro
        const filterGroup = filterElement.closest('.filter-group');
        if (filterGroup) {
            filterGroup.style.display = 'block';
        }
    } else {
        // Ocultar o grupo de filtro se não há opções
        const filterGroup = filterElement.closest('.filter-group');
        if (filterGroup) {
            filterGroup.style.display = 'none';
        }
    }
    
    // Event listeners serão reconfigurados no final da atualização
}

// Função para obter todos os filtros ativos atualmente
function getCurrentActiveFilters(category) {
    const filtersContainer = document.getElementById(`${category}Filters`);
    if (!filtersContainer) return {};

    const activeFilters = {};
    const filterOptions = filtersContainer.querySelectorAll('.filter-options');
    
    filterOptions.forEach(options => {
        let filterType;
        
        if (category === 'roupas') {
            if (options.id === 'publicoRoupasFilter') {
                filterType = 'publico';
            } else if (options.id === 'tipoRoupasFilter') {
                filterType = 'tipo';
            } else {
                filterType = options.id.replace('Filter', '').toLowerCase();
            }
        } else if (category === 'calcados') {
            if (options.id === 'publicoCalcadosFilter') {
                filterType = 'publico';
            } else {
                filterType = options.id.replace('CalcadosFilter', '').toLowerCase();
            }
        } else if (category === 'acessorios') {
            if (options.id === 'publicoAcessoriosFilter') {
                filterType = 'publico';
            } else {
                filterType = options.id.replace('AcessoriosFilter', '').toLowerCase();
            }
        }
        
        const checkedBoxes = options.querySelectorAll('input[type="checkbox"]:checked');
        const values = Array.from(checkedBoxes).map(cb => cb.value);
        
        if (values.length > 0) {
            activeFilters[filterType] = values;
        }
    });

    return activeFilters;
}

// Função para verificar se um valor de filtro é compatível com os outros filtros ativos
function isFilterValueCompatible(category, filterType, value, activeFilters) {
    // Obter todos os produtos da categoria
    let allProducts = [];
    if (category === 'roupas') {
        allProducts = products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual');
    } else if (category === 'calcados') {
        allProducts = calcadosProducts;
    } else if (category === 'acessorios') {
        allProducts = acessoriosProducts;
    }
    
    // Aplicar todos os filtros ativos EXCETO o filtro atual
    const otherFilters = { ...activeFilters };
    delete otherFilters[filterType];
    
    // Filtrar produtos com base nos outros filtros
    let filteredProducts = allProducts.filter(product => {
        return Object.keys(otherFilters).every(otherFilterType => {
            const filterValues = otherFilters[otherFilterType];
            
            switch (otherFilterType) {
                case 'marca':
                    return filterValues.includes(product.brand);
                case 'tamanho':
                    return filterValues.some(size => product.sizes.includes(size));
                case 'preco':
                    return filterValues.some(range => {
                        const [min, max] = range.split('-').map(v => v === '+' ? Infinity : parseFloat(v));
                        return product.price >= min && product.price <= max;
                    });
                case 'cor':
                    return product.colors && product.colors.some(color => 
                        color && color.name && filterValues.includes(color.name)
                    );
                case 'tipo':
                    return filterValues.includes(product.type);
                case 'material':
                    return filterValues.includes(product.material);
                case 'publico':
                    return filterValues.includes(product.publico);
                default:
                    return true;
            }
        });
    });
    
    // Verificar se existe pelo menos um produto que corresponde ao valor do filtro atual
    return filteredProducts.some(product => {
        switch (filterType) {
            case 'marca':
                return product.brand === value;
            case 'tamanho':
                return product.sizes.includes(value);
            case 'preco':
                const [min, max] = value.split('-').map(v => v === '+' ? Infinity : parseFloat(v));
                return product.price >= min && product.price <= max;
            case 'cor':
                return product.colors && product.colors.some(color => 
                    color && color.name && color.name === value
                );
            case 'tipo':
                return product.type === value;
            case 'material':
                return product.material === value;
            case 'publico':
                return product.publico === value;
            default:
                return true;
        }
    });
}

// Função para configurar fechamento da aba de filtros ao clicar fora
function setupFilterClickOutside(category) {
    console.log(`🔧 Configurando fechamento da aba de filtros para ${category}`);
    console.log(`🔧 Função setupFilterClickOutside chamada para: ${category}`);
    
    // Remover event listener antigo se existir
    const oldListener = document[`${category}FilterClickOutside`];
    if (oldListener) {
        document.removeEventListener('click', oldListener);
    }
    
    // Criar event listener para cliques fora da aba de filtros
    const clickOutsideHandler = function(event) {
        console.log(`🔍 DEBUG: Clique detectado - Target:`, event.target);
        console.log(`🔍 DEBUG: Tag:`, event.target.tagName, 'Classes:', event.target.className);
        
        const filtersContainer = document.getElementById(`${category}Filters`);
        const toggleButton = document.getElementById(`toggle${category.charAt(0).toUpperCase() + category.slice(1)}Filters`);
        
        console.log(`🔍 DEBUG: Container encontrado:`, !!filtersContainer);
        console.log(`🔍 DEBUG: Toggle encontrado:`, !!toggleButton);
        
        if (!filtersContainer || !toggleButton) {
            console.log(`❌ DEBUG: Elementos não encontrados`);
            return;
        }
        
        // Verificar se a aba de filtros está aberta
        const isFiltersOpen = filtersContainer.classList.contains('show');
        console.log(`🔍 DEBUG: Aba aberta:`, isFiltersOpen);
        console.log(`🔍 DEBUG: Classes do container:`, filtersContainer.className);
        
        if (!isFiltersOpen) {
            console.log(`⏭️ DEBUG: Aba não está aberta, ignorando`);
            return;
        }
        
        // Verificar se o clique foi no botão toggle
        const isClickOnToggleButton = toggleButton.contains(event.target);
        console.log(`🔍 DEBUG: Clique no toggle:`, isClickOnToggleButton);
        
        if (isClickOnToggleButton) {
            console.log(`🔄 Clique no botão toggle detectado - não fechando`);
            return; // Não fazer nada se clicou no botão toggle
        }
        
        // Verificar se o clique foi fora da aba de filtros
        const isClickOnFiltersContainer = filtersContainer.contains(event.target);
        console.log(`🔍 DEBUG: Clique dentro do container:`, isClickOnFiltersContainer);
        
        if (!isClickOnFiltersContainer) {
            console.log(`❌ Fechando aba de filtros ${category} - clique fora detectado`);
            
            // Fechar imediatamente - usar a mesma lógica do botão toggle
            filtersContainer.classList.remove('show');
            setTimeout(() => {
                filtersContainer.classList.add('hidden');
            }, 300);
            toggleButton.classList.remove('active');
            
            // Fechar todas as listas de filtros individuais
            const filterToggles = filtersContainer.querySelectorAll('.filter-toggle');
            const filterOptions = filtersContainer.querySelectorAll('.filter-options');
            
            filterToggles.forEach(toggle => toggle.classList.remove('active'));
            filterOptions.forEach(options => options.classList.remove('active'));
            
            console.log(`✅ Aba de filtros ${category} fechada com sucesso`);
            console.log(`🔍 DEBUG: Classes após fechar:`, filtersContainer.className);
        } else {
            console.log(`🔄 Clique dentro do container - não fechando`);
        }
    };
    
    // Armazenar referência para poder remover depois
    document[`${category}FilterClickOutside`] = clickOutsideHandler;
    
    // Adicionar event listener
    document.addEventListener('click', clickOutsideHandler);
    console.log(`✅ Event listener adicionado para fechamento da aba ${category}`);
    
    // Teste: adicionar um log quando o event listener é executado
    console.log(`🧪 Teste: Event listener configurado para ${category}. Clique em qualquer lugar para testar.`);
}

// Função para configurar fechamento de filtros com duplo clique no toggle
function setupFilterDoubleClickClose(category) {
    const filtersContainer = document.getElementById(`${category}Filters`);
    if (!filtersContainer) return;
    
    // Remover event listener antigo se existir
    if (filtersContainer.doubleClickHandler) {
        filtersContainer.removeEventListener('dblclick', filtersContainer.doubleClickHandler);
    }
    
    // Criar novo event listener para duplo clique
    filtersContainer.doubleClickHandler = function(event) {
        if (event.target.closest('.filter-toggle')) {
            const toggle = event.target.closest('.filter-toggle');
            const filterType = toggle.dataset.filter;
            let options;
            
            // Mapear os IDs corretos baseado na categoria
            if (category === 'roupas') {
                if (filterType === 'publico') {
                    options = document.getElementById('publicoRoupasFilter');
                } else if (filterType === 'tipo') {
                    options = document.getElementById('tipoRoupasFilter');
                } else {
                    options = document.getElementById(`${filterType}Filter`);
                }
            } else if (category === 'calcados') {
                if (filterType === 'publico') {
                    options = document.getElementById('publicoCalcadosFilter');
                } else {
                    options = document.getElementById(`${filterType}CalcadosFilter`);
                }
            } else if (category === 'acessorios') {
                if (filterType === 'publico') {
                    options = document.getElementById('publicoAcessoriosFilter');
                } else {
                    options = document.getElementById(`${filterType}AcessoriosFilter`);
                }
            }
            
            if (options) {
                // Fechar o filtro atual
                toggle.classList.remove('active');
                options.classList.remove('active');
                console.log('Filtro fechado por duplo clique:', filterType);
            }
        }
    };
    
    // Adicionar event listener para duplo clique
    filtersContainer.addEventListener('dblclick', filtersContainer.doubleClickHandler);
}

function clearFilters(category) {
    const filtersContainer = document.getElementById(`${category}Filters`);
    if (!filtersContainer) return;

    // Desmarcar todos os checkboxes
    const checkboxes = filtersContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // Fechar todos os filtros
    const toggles = filtersContainer.querySelectorAll('.filter-toggle');
    toggles.forEach(toggle => {
        toggle.classList.remove('active');
    });

    const options = filtersContainer.querySelectorAll('.filter-options');
    options.forEach(option => {
        option.classList.remove('active');
    });

    // Resetar filtros para mostrar todos os produtos da categoria
    let allProducts = [];
    if (category === 'roupas') {
        allProducts = products.filter(p => p.category === 'roupas' || p.category === 'elegante' || p.category === 'casual');
    } else if (category === 'calcados') {
        allProducts = calcadosProducts;
    } else if (category === 'acessorios') {
        allProducts = acessoriosProducts;
    }

    // Atualizar filtros com todos os produtos
    updateDynamicFilters(category, allProducts, {});

    // Re-renderizar produtos originais
    renderCategoryProducts();
    
    // Garantir que a seção esteja visível
    const section = document.getElementById(category);
    if (section) {
        section.style.display = 'block';
    }
}

// Funcionalidade para esconder botões de filtro quando navbar passar por eles
function setupFilterButtonVisibility() {
    const navbar = document.querySelector('.navbar');
    const filterButtons = document.querySelectorAll('.filter-toggle-btn');
    
    if (!navbar || filterButtons.length === 0) return;
    
    function handleScroll() {
        const navbarRect = navbar.getBoundingClientRect();
        const navbarBottom = navbarRect.bottom;
        
        filterButtons.forEach(button => {
            const buttonRect = button.getBoundingClientRect();
            const buttonTop = buttonRect.top;
            
            // Se o navbar passou pelo botão (navbar bottom > button top)
            if (navbarBottom > buttonTop) {
                button.style.opacity = '0';
                button.style.visibility = 'hidden';
                button.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
            } else {
                button.style.opacity = '1';
                button.style.visibility = 'visible';
            }
        });
    }
    
    // Adicionar event listener de scroll
    window.addEventListener('scroll', handleScroll);
    
    // Executar uma vez para verificar estado inicial
    handleScroll();
}

// Inicializar funcionalidade de visibilidade dos botões de filtro
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que todos os elementos estejam carregados
    setTimeout(setupFilterButtonVisibility, 1000);
});

// Função para configurar o player de vídeo customizado
function setupCustomVideoPlayer() {
    const video = document.getElementById('mainImage');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (!video || !playPauseBtn) {
        console.log('⚠️ Elementos do player de vídeo não encontrados');
        return;
    }
    
    console.log('🎬 Configurando player de vídeo customizado');
    console.log('📹 URL do vídeo:', video.src || video.querySelector('source')?.src);
    
    // Play/Pause
    playPauseBtn.addEventListener('click', async () => {
        try {
            if (video.paused) {
                console.log('▶️ Iniciando reprodução do vídeo');
                await video.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                console.log('✅ Vídeo reproduzindo');
            } else {
                console.log('⏸️ Pausando vídeo');
                video.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        } catch (error) {
            console.error('❌ Erro ao reproduzir vídeo:', error.message);
            console.error('🔍 Detalhes do erro:', error);
            
            // Se der erro, mostrar mensagem e pausar
            video.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            playPauseBtn.title = 'Erro ao carregar vídeo';
            
            // Tentar recarregar o vídeo após 2 segundos
            setTimeout(() => {
                console.log('🔄 Tentando recarregar vídeo...');
                video.load();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                playPauseBtn.title = '';
            }, 2000);
        }
    });
    
    // Atualizar progresso
    video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTimeEl.textContent = formatTime(video.currentTime);
    });
    
    // Atualizar duração
    video.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(video.duration);
    });
    
    // Tratar erros de carregamento
    video.addEventListener('error', (e) => {
        console.error('❌ Erro ao carregar vídeo:', e);
        console.error('🔍 Código do erro:', video.error?.code);
        console.error('🔍 Mensagem do erro:', video.error?.message);
        
        playPauseBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        playPauseBtn.disabled = true;
        playPauseBtn.title = 'Erro ao carregar vídeo';
        
        // Mostrar mensagem de erro mais específica
        if (video.error) {
            switch (video.error.code) {
                case 1:
                    console.log('🚫 Erro: Abortado');
                    break;
                case 2:
                    console.log('🌐 Erro: Problema de rede');
                    break;
                case 3:
                    console.log('🔧 Erro: Decodificação');
                    break;
                case 4:
                    console.log('📁 Erro: Formato não suportado');
                    break;
            }
        }
    });
    
    // Tratar interrupções de play
    video.addEventListener('abort', () => {
        console.log('Reprodução interrompida');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
    
    // Clique na barra de progresso
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        });
    }
    
    // Controle de volume
    volumeSlider.addEventListener('input', () => {
        video.volume = volumeSlider.value / 100;
        if (video.volume === 0) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (video.volume < 0.5) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    });
    
    volumeBtn.addEventListener('click', () => {
        if (video.volume === 0) {
            video.volume = 1;
            volumeSlider.value = 100;
            volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        } else {
            video.volume = 0;
            volumeSlider.value = 0;
            volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
    });
    
    // Tela cheia
    fullscreenBtn.addEventListener('click', () => {
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
        }
    });
    
    // Atualizar ícone de tela cheia
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });
    
    // Mostrar/ocultar controles ao passar o mouse
    const videoPlayer = document.querySelector('.custom-video-player');
    if (videoPlayer) {
        let hideControlsTimeout;
        
        videoPlayer.addEventListener('mouseenter', () => {
            clearTimeout(hideControlsTimeout);
            videoPlayer.querySelector('.video-controls').style.opacity = '1';
        });
        
        videoPlayer.addEventListener('mouseleave', () => {
            hideControlsTimeout = setTimeout(() => {
                videoPlayer.querySelector('.video-controls').style.opacity = '0';
            }, 2000);
        });
    }
}

// Função para formatar tempo
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Função para detectar e ajustar vídeos verticais
function detectAndAdjustVerticalVideos() {
    console.log('🎬 Iniciando detecção de vídeos verticais...');
    
    const videoContainers = document.querySelectorAll('.video-container');
    console.log(`📹 Encontrados ${videoContainers.length} containers de vídeo`);
    
    videoContainers.forEach((container, index) => {
        const iframe = container.querySelector('iframe');
        if (iframe) {
            console.log(`🔍 Analisando container ${index + 1}:`, {
                src: iframe.src,
                className: iframe.className,
                containerClass: container.className
            });
            
            // Detectar se é vídeo vertical baseado na URL ou outras características
            const isVerticalVideo = detectVerticalVideo(iframe.src);
            
            if (isVerticalVideo) {
                console.log('📱 Vídeo vertical detectado! Aplicando classe...');
                container.classList.add('vertical-video');
                
                // Log das dimensões após ajuste
                setTimeout(() => {
                    const rect = container.getBoundingClientRect();
                    console.log('📏 Dimensões do container vertical:', {
                        width: rect.width,
                        height: rect.height,
                        aspectRatio: rect.width / rect.height
                    });
                }, 100);
            } else {
                console.log('📺 Vídeo horizontal detectado');
            }
        }
    });
}

// Função para detectar se um vídeo é vertical
function detectVerticalVideo(url) {
    if (!url) return false;
    
    console.log('🔍 Analisando URL do vídeo:', url);
    
    // Detectar vídeos verticais baseado em padrões na URL
    const verticalPatterns = [
        'vertical',
        'portrait',
        'mobile',
        'story',
        'reel',
        'shorts'
    ];
    
    const urlLower = url.toLowerCase();
    const hasVerticalPattern = verticalPatterns.some(pattern => urlLower.includes(pattern));
    
    if (hasVerticalPattern) {
        console.log('✅ Padrão vertical encontrado na URL');
        return true;
    }
    
    // Para Google Drive, assumir que pode ser vertical se não tiver indicadores horizontais
    if (urlLower.includes('drive.google.com')) {
        const horizontalPatterns = ['landscape', 'horizontal', 'wide'];
        const hasHorizontalPattern = horizontalPatterns.some(pattern => urlLower.includes(pattern));
        
        if (!hasHorizontalPattern) {
            console.log('📱 Assumindo vídeo vertical do Google Drive');
            return true;
        }
    }
    
    console.log('📺 Assumindo vídeo horizontal');
    return false;
}

// Função para aplicar detecção quando o modal é aberto
function applyVideoDetection() {
    console.log('🎬 Aplicando detecção de vídeos...');
    setTimeout(detectAndAdjustVerticalVideos, 500);
}

// Garantir que a função openProductModal esteja disponível globalmente
window.openProductModal = openProductModal;

// Função de teste para debug
window.testSheetsConnection = async function() {
    console.log('🧪 Testando conexão com Google Sheets...');
    try {
        const url = buildGvizUrl('1Uxb3myMXc8SFklQQAk6LJB85yoMHl39tjdnC5wsu3xY', 'Produtos');
        console.log('URL:', url);
        
        const response = await fetch(url, { cache: 'no-store' });
        console.log('Status:', response.status);
        
        if (response.ok) {
            const text = await response.text();
            console.log('Resposta (primeiros 500 chars):', text.substring(0, 500));
            return true;
        } else {
            console.error('Erro na requisição:', response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Erro no teste:', error);
        return false;
    }
};

// Função de teste para parseNumberBR
window.testParseNumber = function() {
    console.log('🧪 Testando parseNumberBR...');
    const testValues = [
        '250,00',
        '1.250,50',
        '250.00',
        '1250.50',
        '699,99',
        '710,99',
        'preto=250,00. branco=255,00. azul=260,00',
        'Prata=699,99. Preto=710,99'
    ];
    
    testValues.forEach(value => {
        const result = parseNumberBR(value);
        console.log(`"${value}" -> ${result}`);
    });
    
    // Teste específico para o formato de preços por cor
    const precoPorCor = 'Prata=699,99. Preto=710,99';
    const pairs = precoPorCor.split('.').filter(Boolean);
    console.log('🔍 Pares extraídos:', pairs);
    
    pairs.forEach(pair => {
        const trimmedPair = pair.trim();
        if (trimmedPair.includes('=')) {
            const [color, priceStr] = trimmedPair.split('=');
            const priceValue = parseNumberBR(priceStr.trim());
            console.log(`"${color.trim()}" = "${priceStr.trim()}" -> ${priceValue}`);
        }
    });
};

// =====================
// APLICAR FILTROS DA URL (Deep Linking)
// =====================

function applyFiltersFromURL() {
    // Aguardar um pouco para garantir que os produtos foram carregados
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const categoria = urlParams.get('categoria');
        const tipo = urlParams.get('tipo');
        const marca = urlParams.get('marca');
        
        console.log(`🌐 URL atual: ${window.location.href}`);
        console.log(`📋 Parâmetros encontrados: categoria=${categoria}, tipo=${tipo}, marca=${marca}`);
        
        // Se não há nenhum parâmetro, não faz nada
        if (!categoria && !tipo && !marca) {
            console.log(`ℹ️ Nenhum parâmetro de filtro encontrado na URL`);
            return;
        }
        
        // Se há marca mas não há tipo, aplicar marca em TODAS as categorias
        if (marca && !tipo) {
            setTimeout(() => {
                applyBrandFilterToAllCategories(marca);
                // Scroll para a primeira categoria com produtos dessa marca
                scrollToFirstCategoryWithBrand(marca);
            }, 1000);
            return;
        }
        
        // Se há categoria específica, aplicar filtros nela
        if (categoria) {
            // Scroll para a seção
            const section = document.getElementById(categoria);
            if (section) {
                setTimeout(() => {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 500);
            }
            
            // Aplicar filtros se especificados
            if (tipo || marca) {
                setTimeout(() => {
                    applyURLFilters(categoria, tipo, marca);
                }, 1000); // Aguardar produtos renderizarem
            }
        }
    }, 1500); // Aguardar carregamento inicial
}

// Nova função que aguarda a conclusão dos filtros
async function applyFiltersFromURLWithDelay() {
    return new Promise((resolve) => {
        const urlParams = new URLSearchParams(window.location.search);
        const categoria = urlParams.get('categoria');
        const tipo = urlParams.get('tipo');
        const marca = urlParams.get('marca');
        
        console.log(`🌐 URL atual: ${window.location.href}`);
        console.log(`📋 Parâmetros encontrados: categoria=${categoria}, tipo=${tipo}, marca=${marca}`);
        
        // Se não há nenhum parâmetro, resolver imediatamente
        if (!categoria && !tipo && !marca) {
            console.log(`ℹ️ Nenhum parâmetro de filtro encontrado na URL`);
            resolve();
            return;
        }
        
        // Se há marca mas não há tipo, aplicar marca em TODAS as categorias
        if (marca && !tipo) {
            setTimeout(() => {
                applyBrandFilterToAllCategories(marca);
                // Scroll para a primeira categoria com produtos dessa marca
                scrollToFirstCategoryWithBrand(marca);
                // Aguardar um pouco mais para garantir que tudo foi aplicado
                setTimeout(resolve, 500);
            }, 1000);
        } else {
            // Aplicar filtros específicos
            setTimeout(() => {
                if (categoria && tipo) {
                    applyURLFilters(categoria, tipo, marca);
                } else if (categoria) {
                    applyURLFilters(categoria, null, marca);
                }
                // Aguardar um pouco mais para garantir que tudo foi aplicado
                setTimeout(resolve, 500);
            }, 1500); // Aguardar carregamento inicial
        }
    });
}

function applyURLFilters(categoria, tipo, marca) {
    console.log(`🔗 Aplicando filtros da URL: categoria=${categoria}, tipo=${tipo}, marca=${marca}`);
    
    const filtersContainer = document.getElementById(`${categoria}Filters`);
    if (!filtersContainer) {
        console.log(`❌ Container de filtros não encontrado: ${categoria}Filters`);
        return;
    }
    
    // Aplicar filtro de tipo
    if (tipo) {
        let filterId;
        if (categoria === 'roupas') {
            filterId = 'tipoRoupasFilter';
        } else if (categoria === 'calcados') {
            filterId = 'tipoCalcadosFilter';
        } else if (categoria === 'acessorios') {
            filterId = 'tipoAcessoriosFilter';
        }
        
        console.log(`🎯 Procurando filtro de tipo: ${filterId}`);
        
        if (filterId) {
            const filterOptions = document.getElementById(filterId);
            if (filterOptions) {
                const checkboxes = filterOptions.querySelectorAll('input[type="checkbox"]');
                console.log(`📋 Encontrados ${checkboxes.length} checkboxes de tipo`);
                
                checkboxes.forEach(checkbox => {
                    const checkboxValue = checkbox.value.toLowerCase();
                    const tipoLower = tipo.toLowerCase();
                    
                    console.log(`🔍 Comparando: "${checkboxValue}" com "${tipoLower}"`);
                    
                    // Comparação flexível: "sandalia" encontra "sandália" ou "sandalias"
                    const isMatch = checkboxValue === tipoLower || 
                        checkboxValue.includes(tipoLower) || 
                        tipoLower.includes(checkboxValue) ||
                        normalizeTextBasic(checkboxValue) === normalizeTextBasic(tipoLower) ||
                        // Comparações específicas para sandálias
                        (tipoLower === 'sandalia' && (checkboxValue.includes('sand') || checkboxValue.includes('ália'))) ||
                        (checkboxValue === 'sandalia' && tipoLower.includes('sand'));
                    
                    if (isMatch) {
                        checkbox.checked = true;
                        console.log(`✅ Tipo "${checkbox.value}" marcado! Checkbox checked: ${checkbox.checked}`);
                        
                        // Disparar evento de change para garantir que o filtro seja aplicado
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        console.log(`❌ Tipo "${checkbox.value}" não corresponde a "${tipo}"`);
                    }
                });
            }
        }
    }
    
    // Aplicar filtro de marca
    if (marca) {
        let filterId;
        if (categoria === 'roupas') {
            filterId = 'marcaFilter';
        } else if (categoria === 'calcados') {
            filterId = 'marcaCalcadosFilter';
        } else if (categoria === 'acessorios') {
            filterId = 'marcaAcessoriosFilter';
        }
        
        if (filterId) {
            const filterOptions = document.getElementById(filterId);
            if (filterOptions) {
                const checkboxes = filterOptions.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const checkboxValue = checkbox.value.toLowerCase();
                    const marcaLower = marca.toLowerCase();
                    
                    // Comparação flexível: "jorge" encontra "Jorge Bischoff"
                    if (checkboxValue === marcaLower || 
                        checkboxValue.includes(marcaLower) || 
                        marcaLower.includes(checkboxValue)) {
                        checkbox.checked = true;
                    }
                });
            }
        }
    }
    
    // Aplicar os filtros com delay para garantir que os checkboxes sejam marcados
    setTimeout(() => {
        console.log(`🚀 Aplicando filtros para categoria: ${categoria}`);
        applyFilters(categoria);
    }, 100);
    
    // Ocultar outras seções que não correspondem ao filtro
    const allCategories = ['roupas', 'calcados', 'acessorios'];
    allCategories.forEach(cat => {
        if (cat !== categoria) {
            const section = document.getElementById(cat);
            if (section) {
                console.log(`🙈 Ocultando seção: ${cat}`);
                section.style.display = 'none';
            }
        }
    });
    
    // Scroll para a seção
    setTimeout(() => {
        const section = document.getElementById(categoria);
        if (section) {
            console.log(`📍 Fazendo scroll para seção: ${categoria}`);
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 500);
}

// Aplicar filtro de marca em TODAS as categorias
function applyBrandFilterToAllCategories(marca) {
    console.log(`🏷️ Aplicando marca "${marca}" em TODAS as categorias...`);
    
    const categorias = [
        { nome: 'roupas', filterId: 'marcaFilter' },
        { nome: 'calcados', filterId: 'marcaCalcadosFilter' },
        { nome: 'acessorios', filterId: 'marcaAcessoriosFilter' }
    ];
    
    categorias.forEach(({ nome, filterId }) => {
        const filterOptions = document.getElementById(filterId);
        if (!filterOptions) {
            console.log(`  ⚠️ ${nome}: filtro ${filterId} não encontrado`);
            // Ocultar seção se filtro não existe
            const section = document.getElementById(nome);
            if (section) section.style.display = 'none';
            return;
        }
        
        const checkboxes = filterOptions.querySelectorAll('input[type="checkbox"]');
        let marcaEncontrada = false;
        
        console.log(`  🔍 ${nome}: Procurando marca "${marca}" entre ${checkboxes.length} opções...`);
        
        // Desmarcar todos primeiro
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Marcar apenas se encontrar a marca
        checkboxes.forEach(checkbox => {
            const checkboxValue = checkbox.value.toLowerCase();
            const marcaLower = marca.toLowerCase();
            
            // Comparação flexível
            if (checkboxValue === marcaLower || 
                checkboxValue.includes(marcaLower) || 
                marcaLower.includes(checkboxValue)) {
                checkbox.checked = true;
                marcaEncontrada = true;
                console.log(`    ✅ ${nome}: Marca "${checkbox.value}" encontrada e marcada!`);
            }
        });
        
        if (marcaEncontrada) {
            // Marca encontrada - aplicar filtro normalmente
            applyFilters(nome);
        } else {
            // Marca NÃO encontrada - ocultar seção diretamente
            console.log(`    ❌ ${nome}: Marca "${marca}" NÃO encontrada - OCULTANDO seção`);
            const section = document.getElementById(nome);
            if (section) {
                section.style.display = 'none';
            }
        }
    });
    
    console.log(`✅ Filtros aplicados em todas as categorias`);
}

// Scroll para primeira categoria que tem produtos da marca
function scrollToFirstCategoryWithBrand(marca) {
    // Aguardar um pouco para as seções serem ocultadas
    setTimeout(() => {
        const categorias = ['roupas', 'calcados', 'acessorios'];
        
        for (const categoria of categorias) {
            const section = document.getElementById(categoria);
            
            // Verificar se a seção está visível (não foi ocultada)
            if (section && section.style.display !== 'none') {
                const grid = document.getElementById(`${categoria}Grid`);
                
                // Verificar se tem produtos
                if (grid && grid.children.length > 0) {
                    const hasProducts = !grid.querySelector('.no-products-message');
                    
                    if (hasProducts) {
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        break;
                    }
                }
            }
        }
    }, 1200); // Aguardar filtros serem aplicados e seções ocultadas
}

// Função para verificar se os produtos foram renderizados
function checkIfProductsAreRendered() {
    const urlParams = new URLSearchParams(window.location.search);
    const categoria = urlParams.get('categoria');
    
    if (categoria) {
        // Se há filtro de categoria, verificar se essa categoria tem produtos
        const grid = document.getElementById(`${categoria}Grid`);
        if (grid) {
            const productCards = grid.querySelectorAll('.product-card');
            return productCards.length > 0;
        }
    } else {
        // Se não há filtro, verificar se pelo menos uma categoria tem produtos
        const grids = ['roupasGrid', 'calcadosGrid', 'acessoriosGrid'];
        return grids.some(gridId => {
            const grid = document.getElementById(gridId);
            if (grid) {
                const productCards = grid.querySelectorAll('.product-card');
                return productCards.length > 0;
            }
            return false;
        });
    }
    
    return false;
}

// Configurar balão de ajuda
function setupHelpTooltip() {
    const helpTooltip = document.getElementById('helpTooltip');
    const helpFloatingBtn = document.getElementById('helpFloatingBtn');
    const helpTooltipClose = document.getElementById('helpTooltipClose');
    const helpTooltipDismiss = document.getElementById('helpTooltipDismiss');
    
    // Verificar se o usuário já viu o tutorial
    const hasSeenHelp = localStorage.getItem('stylus-help-seen');
    
    // Mostrar automaticamente após 3 segundos se não viu antes
    if (!hasSeenHelp) {
        setTimeout(() => {
            showHelpTooltip();
        }, 3000);
    }
    
    // Botão flutuante para mostrar ajuda
    if (helpFloatingBtn) {
        helpFloatingBtn.addEventListener('click', showHelpTooltip);
    }
    
    // Botão fechar (X)
    if (helpTooltipClose) {
        helpTooltipClose.addEventListener('click', hideHelpTooltip);
    }
    
    // Botão "Entendi!"
    if (helpTooltipDismiss) {
        helpTooltipDismiss.addEventListener('click', function() {
            hideHelpTooltip();
            localStorage.setItem('stylus-help-seen', 'true');
        });
    }
    
    // Fechar clicando fora do balão
    if (helpTooltip) {
        helpTooltip.addEventListener('click', function(e) {
            if (e.target === helpTooltip) {
                hideHelpTooltip();
            }
        });
    }
    
    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && helpTooltip && helpTooltip.classList.contains('active')) {
            hideHelpTooltip();
        }
    });
}

function showHelpTooltip() {
    const helpTooltip = document.getElementById('helpTooltip');
    if (helpTooltip) {
        helpTooltip.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Animação do botão flutuante
        const helpFloatingBtn = document.getElementById('helpFloatingBtn');
        if (helpFloatingBtn) {
            helpFloatingBtn.style.transform = 'scale(0.9)';
            helpFloatingBtn.style.opacity = '0.7';
        }
    }
}

function hideHelpTooltip() {
    const helpTooltip = document.getElementById('helpTooltip');
    if (helpTooltip) {
        helpTooltip.classList.remove('active');
        document.body.style.overflow = '';
        
        // Restaurar botão flutuante
        const helpFloatingBtn = document.getElementById('helpFloatingBtn');
        if (helpFloatingBtn) {
            helpFloatingBtn.style.transform = '';
            helpFloatingBtn.style.opacity = '';
        }
    }
}