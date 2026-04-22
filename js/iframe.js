



function sendHeightToParent() {
  const height = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight
  );
  
  window.parent.postMessage({
    type: 'iframeHeight',
    height: height
  }, '*');
}

// Send height when content loads and on resize
window.addEventListener('load', () => {
  setTimeout(sendHeightToParent, 100);
});

window.addEventListener('resize', () => {
  setTimeout(sendHeightToParent, 100);
});

// Also listen for height requests
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'requestHeight') {
    sendHeightToParent();
  }
});






        // ========== REAL-TIME THEME SYNC FROM PARENT PAGE ==========
        // Function to apply theme to iframe
        function applyTheme(theme) {
            const body = document.body;
            if (theme === 'dark') {
                body.classList.remove('light-mode');
            } else if (theme === 'light') {
                body.classList.add('light-mode');
            }
        }

        // Listen for theme messages from parent page
        window.addEventListener('message', function(event) {
            // Receive theme update from parent
            if (event.data && event.data.type === 'themeChange') {
                const theme = event.data.theme;
                console.log('Iframe received theme:', theme); // Debug
                applyTheme(theme);
            }
            
            // Handle theme request from parent
            if (event.data && event.data.type === 'requestTheme') {
                const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
                window.parent.postMessage({ 
                    type: 'themeResponse', 
                    theme: currentTheme 
                }, '*');
            }
        });

        // Send ready signal to parent page when iframe loads
        window.addEventListener('load', function() {
            // Small delay to ensure everything is loaded
            setTimeout(() => {
                window.parent.postMessage({ 
                    type: 'iframeReady', 
                    iframeId: 'dynamicIframe' 
                }, '*');
                console.log('Iframe ready signal sent to parent');
            }, 500);
        });

        // Also send initial theme to parent (so parent knows current theme)
        const initialTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        window.parent.postMessage({ 
            type: 'iframeInitialTheme', 
            theme: initialTheme 
        }, '*');

        // Optional: Apply saved theme from localStorage (if any)
        const savedIframeTheme = localStorage.getItem('iframeTheme');
        if (savedIframeTheme) {
            applyTheme(savedIframeTheme);
        }

        // ========== EXISTING SWIPER AND SCRATCH CODE ==========
        const commonOptions = {
            effect: "coverflow",
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: "auto",
            loop: true,
            initialSlide: 1, 
            coverflowEffect: { 
                rotate: 25, 
                stretch: 2, 
                depth: 200, 
                modifier: 1, 
                slideShadows: false 
            },
            autoplay: { delay: 4000, disableOnInteraction: false },
        };

        new Swiper(".transformSwiper", commonOptions);
        new Swiper(".whyUsSwiper", commonOptions);
        new Swiper(".expertSwiper", commonOptions);
        new Swiper(".reviewSwiper", commonOptions);

        // Scratch Logic: supports tap & scratch, thumbnail with BEFORE label half inside/outside
        document.querySelectorAll('.scratch-card').forEach(box => {
            const canvas = box.querySelector('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const label = box.querySelector('.status-label');
            const thumbContainer = box.querySelector('.before-thumb-container');
            
            let scratchedCompleted = false;
            
            const initCanvas = () => {
                canvas.width = box.offsetWidth;
                canvas.height = box.offsetHeight;
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = canvas.getAttribute('data-src');
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
            };
            
            initCanvas();
            
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    if (canvas && canvas.parentElement && canvas.style.display !== 'none') {
                        const oldSrc = canvas.getAttribute('data-src');
                        canvas.width = box.offsetWidth;
                        canvas.height = box.offsetHeight;
                        const imgReload = new Image();
                        imgReload.crossOrigin = "anonymous";
                        imgReload.src = oldSrc;
                        imgReload.onload = () => ctx.drawImage(imgReload, 0, 0, canvas.width, canvas.height);
                    }
                }, 150);
            });

            const revealFully = () => {
                if (scratchedCompleted) return;
                scratchedCompleted = true;
                canvas.style.opacity = '0';
                label.innerText = "After";
                label.style.background = "rgba(0, 0, 0, 0.75)";
                label.style.backdropFilter = "blur(6px)";
                label.style.borderLeft = "2px solid var(--accent-gold)";
                thumbContainer.classList.add('show');
                setTimeout(() => {
                    if(canvas && canvas.parentNode) canvas.style.display = 'none';
                }, 500);
            };

            let isDrawing = false;
            
            const scratch = (e) => {
                if (isDrawing && !scratchedCompleted) {
                    const rect = canvas.getBoundingClientRect();
                    if (rect.width === 0) return;
                    let clientX, clientY;
                    if (e.touches) {
                        clientX = e.touches[0].clientX;
                        clientY = e.touches[0].clientY;
                    } else {
                        clientX = e.clientX;
                        clientY = e.clientY;
                    }
                    const x = clientX - rect.left;
                    const y = clientY - rect.top;
                    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath(); 
                    ctx.arc(x, y, 28, 0, Math.PI * 2); 
                    ctx.fill();
                    
                    const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
                    let transparentPixels = 0;
                    const totalPixels = data.length / 4;
                    for(let i=3; i<data.length; i+=4) if(data[i] === 0) transparentPixels++;
                    const scratchRatio = transparentPixels / totalPixels;
                    if(scratchRatio > 0.20 && !scratchedCompleted) {
                        revealFully();
                    }
                }
            };

            // Tap detection
            canvas.addEventListener('click', (e) => {
                e.preventDefault();
                if (!scratchedCompleted) revealFully();
            });
            
            canvas.addEventListener('touchstart', (e) => {
                if (!scratchedCompleted) {
                    let moved = false;
                    const touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    const onTouchMove = (moveEvent) => {
                        const dx = moveEvent.touches[0].clientX - touchStart.x;
                        const dy = moveEvent.touches[0].clientY - touchStart.y;
                        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
                    };
                    const onTouchEnd = () => {
                        if (!moved && !scratchedCompleted) {
                            revealFully();
                        }
                        canvas.removeEventListener('touchmove', onTouchMove);
                        canvas.removeEventListener('touchend', onTouchEnd);
                    };
                    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
                    canvas.addEventListener('touchend', onTouchEnd, { once: true });
                    isDrawing = true;
                }
            });
            
            canvas.addEventListener('mousedown', () => { if(!scratchedCompleted) isDrawing = true; });
            window.addEventListener('mouseup', () => { isDrawing = false; });
            canvas.addEventListener('mousemove', scratch);
            canvas.addEventListener('touchmove', (e) => { 
                if(isDrawing && !scratchedCompleted) {
                    e.preventDefault(); 
                    scratch(e); 
                }
            }, {passive: false});
            canvas.addEventListener('touchend', () => { isDrawing = false; });
        });
    

// ==================== FAQ ACCORDION ====================
// Only one answer open at a time
function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length === 0) return;
    
    function openSingleFaq(clickedItem) {
        faqItems.forEach(item => {
            if (item === clickedItem && !item.classList.contains('active')) {
                item.classList.add('active');
            } else if (item !== clickedItem && item.classList.contains('active')) {
                item.classList.remove('active');
            }
        });
    }
    
    faqItems.forEach(item => {
        const questionDiv = item.querySelector('.faq-question');
        if (questionDiv) {
            // Remove any existing listeners to avoid duplicates
            const newQuestion = questionDiv.cloneNode(true);
            questionDiv.parentNode.replaceChild(newQuestion, questionDiv);
            item.querySelector('.faq-question', newQuestion);
            
            newQuestion.addEventListener('click', (e) => {
                e.stopPropagation();
                if (item.classList.contains('active')) {
                    item.classList.remove('active');
                } else {
                    openSingleFaq(item);
                }
            });
        }
    });
}



// ==================== PAGE HEIGHT DETECTION (for iframe) ====================
function updatePageHeight() {
    const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
    );
    
    // Set attribute for external detection
    document.body.setAttribute('data-page-height', height);
    
    // Send to parent iframe if embedded
    if (window.parent && window.parent !== window) {
        try {
            window.parent.postMessage({
                type: 'faqHeightUpdate',
                height: height,
                source: 'mainPage'
            }, '*');
        } catch(e) {
            // Silent fail for cross-origin
        }
    }
    
    return height;
}

// Initialize FAQ when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initFaqAccordion();
        initMoreQuestionsBtn();
        updatePageHeight();
        
        // Watch for FAQ toggles to update height
        const observer = new MutationObserver(() => {
            updatePageHeight();
        });
        
        const faqContainer = document.querySelector('.faq-container');
        if (faqContainer) {
            observer.observe(faqContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
        
        // Update height on window resize
        window.addEventListener('resize', () => {
            setTimeout(updatePageHeight, 100);
        });
    });
} else {
    initFaqAccordion();
    initMoreQuestionsBtn();
    updatePageHeight();
}