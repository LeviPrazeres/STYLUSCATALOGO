// Initialize AOS (Animate On Scroll) - Otimizado para performance
AOS.init({
    duration: 600, // Reduzido de 1000ms para 600ms
    easing: 'ease-out-cubic',
    once: true,
    offset: 50, // Reduzido de 100px para 50px para animar mais cedo
    delay: 0,
    disable: 'mobile' // Desabilitar em mobile para melhor performance
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Ignorar links que são apenas "#" (usados para modais)
        if (href === '#') {
            return; // Não fazer preventDefault nem smooth scroll
        }
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Newsletter form handler
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = this.querySelector('input[type="email"]').value;
        
        // Aqui você pode integrar com um serviço de e-mail marketing
        // Por enquanto, vamos apenas mostrar uma mensagem de sucesso
        
        // Criar mensagem de sucesso
        const successMessage = document.createElement('div');
        successMessage.style.cssText = `
            background: rgba(81, 207, 102, 0.95);
            color: white;
            padding: 20px 30px;
            border-radius: 50px;
            text-align: center;
            font-weight: 600;
            margin-top: 20px;
            animation: slideDown 0.5s ease;
        `;
        successMessage.innerHTML = `
            <i class="fas fa-check-circle"></i> Cadastro realizado com sucesso! 
            Bem-vindo(a) à família Stylus Concept!
        `;
        
        // Inserir mensagem
        const formGroup = this.querySelector('.form-group');
        formGroup.style.display = 'none';
        this.querySelector('.form-note').style.display = 'none';
        this.appendChild(successMessage);
        
        // Resetar após 3 segundos
        setTimeout(() => {
            formGroup.style.display = 'flex';
            this.querySelector('.form-note').style.display = 'flex';
            successMessage.remove();
            this.reset();
        }, 3000);
        
        console.log('Newsletter cadastro:', email);
    });
}

// Efeito parallax removido para evitar problema da cor cinza aparecer
// Comentado para manter a imagem de fundo fixa
/*
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    
    if (hero && scrolled < window.innerHeight) {
        hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
    }
});
*/

// Remover IntersectionObserver redundante - AOS já cuida das animações
// Comentado para evitar conflitos e melhorar performance
/*
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

// Observar cards que ainda não têm AOS
document.querySelectorAll('.brand-card, .trending-card, .testimonial-card').forEach(card => {
    if (!card.hasAttribute('data-aos')) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    }
});
*/

// Counter animation for stats (se houver)
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start) + '+';
        }
    }, 16);
}

// Hover effect para os social buttons
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px) scale(1.05)';
    });
    
    btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Loading animation
window.addEventListener('load', function() {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// Adicionar efeito de brilho nos botões ao passar o mouse
document.querySelectorAll('.btn-catalog, .btn-outline, .btn-submit').forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.style.setProperty('--mouse-x', x + 'px');
        this.style.setProperty('--mouse-y', y + 'px');
    });
});

console.log('%c✨ Stylus Concept - Home Page ✨', 'color: #D4AF37; font-size: 20px; font-weight: bold;');
console.log('%cOnde moda encontra identidade', 'color: #8B7355; font-size: 14px; font-style: italic;');

// Funções para modais de suporte
function openSupportModal(modalId) {
    console.log('🔍 DEBUG: Tentando abrir modal:', modalId);
    const modal = document.getElementById(modalId);
    console.log('🔍 DEBUG: Modal encontrado:', modal);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('✅ DEBUG: Modal aberto com sucesso:', modalId);
    } else {
        console.error('❌ DEBUG: Modal não encontrado:', modalId);
    }
}

function closeSupportModal(modalId) {
    console.log('🔍 DEBUG: Tentando fechar modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        console.log('✅ DEBUG: Modal fechado com sucesso:', modalId);
    }
}

function setupSupportModals() {
    console.log('🔍 DEBUG: Iniciando configuração dos modais...');
    
    // Verificar se existem links com data-modal
    const modalLinks = document.querySelectorAll('[data-modal]');
    console.log('🔍 DEBUG: Links com data-modal encontrados:', modalLinks.length);
    modalLinks.forEach((link, index) => {
        console.log(`🔍 DEBUG: Link ${index + 1}:`, link.textContent.trim(), '->', link.getAttribute('data-modal'));
    });
    
    // Verificar se existem modais
    const modals = document.querySelectorAll('.support-modal');
    console.log('🔍 DEBUG: Modais encontrados:', modals.length);
    modals.forEach((modal, index) => {
        console.log(`🔍 DEBUG: Modal ${index + 1}:`, modal.id);
    });
    
    // Event listeners para abrir modais
    document.querySelectorAll('[data-modal]').forEach(link => {
        link.addEventListener('click', function(e) {
            console.log('🔍 DEBUG: Link clicado:', this.textContent.trim());
            console.log('🔍 DEBUG: Evento:', e);
            e.preventDefault();
            const modalId = this.getAttribute('data-modal');
            console.log('🔍 DEBUG: Modal ID extraído:', modalId);
            openSupportModal(modalId);
        });
    });

    // Event listeners para fechar modais
    document.querySelectorAll('.close-support-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('🔍 DEBUG: Botão fechar clicado');
            const modalId = this.getAttribute('data-modal');
            closeSupportModal(modalId);
        });
    });

    // Fechar modal clicando fora dele
    document.querySelectorAll('.support-modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                console.log('🔍 DEBUG: Clique fora do modal detectado');
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // FAQ accordion functionality
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', function() {
            console.log('🔍 DEBUG: FAQ question clicada:', this.textContent.trim());
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Fechar todos os outros itens
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Abrir o item clicado se não estava ativo
            if (!isActive) {
                faqItem.classList.add('active');
                console.log('✅ DEBUG: FAQ item aberto');
            } else {
                console.log('🔍 DEBUG: FAQ item fechado');
            }
        });
    });

    // Fechar modais com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            console.log('🔍 DEBUG: Tecla ESC pressionada');
            document.querySelectorAll('.support-modal.active').forEach(modal => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    });
    
    console.log('✅ DEBUG: Configuração dos modais concluída');
}

// Inicializar modais quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DEBUG: DOM carregado, inicializando modais...');
    setupSupportModals();
    setupHelpTooltip();
});

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


