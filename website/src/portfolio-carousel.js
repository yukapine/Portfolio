class PortfolioCarousel {
    constructor() {
      this.rotation = 180;
      this.isDragging = false;
      this.startX = 0;
      this.isActive = false;
      this.animationFrameId = null;
      this.items = [
        { id: 1, title: '', image: 'website/portfolio/1.jpeg' },
        { id: 2, title: '', image: 'website/portfolio/2.jpeg' },
        { id: 3, title: '', image: 'website/portfolio/3.jpeg' },
        { id: 4, title: '', image: 'website/portfolio/4.jpeg' },
        { id: 5, title: '', image: 'website/portfolio/5.jpeg' },
        { id: 6, title: '', image: 'website/portfolio/6.jpeg' },
        { id: 7, title: '', image: 'website/portfolio/7.jpeg' },
        { id: 8, title: '', image: 'website/portfolio/8.jpeg' }
      ];

      this.container = document.querySelector('.carousel-container');
      this.carousel = document.querySelector('.carousel');
      
      this.setupItems();
      this.setupEventListeners();
    }

    setupItems() {
      this.items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'item';
        let height, width = this.getImageSize(item.image);
        
        itemElement.innerHTML = `
          <div class="card">
            <img src="${item.image}" alt="${item.title}"
              style="height:${height};width:${width};">
            <div class="card-title">${item.title}</div>
          </div>
        `;
        
        this.carousel.appendChild(itemElement);
      });

      this.updatePositions();
    }

    getImageSize(src) {
      var img = new Image();
      img.src = src;
      return img.height, img.width
    }

    setupEventListeners() {
      this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
      this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
      this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
      this.container.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    }

    handleMouseDown(e) {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.startX = e.clientX;
      this.container.classList.add('dragging');
    }

    handleMouseMove(e) {
      if (!this.isDragging) return;
      
      const sensitivity = 0.5;
      const delta = (e.clientX - this.startX) * sensitivity;
      this.rotation += delta;
      this.startX = e.clientX;
      
      this.updatePositions();
    }

    handleMouseUp() {
      this.isDragging = false;
      this.container.classList.remove('dragging');
    }

    updatePositions() {
      if (!this.isActive) return;
      
      const radius = 400;
      const itemElements = this.carousel.querySelectorAll('.item');
      
      itemElements.forEach((element, index) => {
        const angle = (index * (360 / this.items.length) + this.rotation) * (Math.PI / 180);
        const itemRotation = index * (360 / this.items.length) + this.rotation + 0;
        
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        const opacity = (z + radius) / (2 * radius);

        element.style.transform = `
          translate(-50%, -50%)
          translateX(${x}px)
          translateZ(${z}px)
          rotateY(${itemRotation}deg)
        `;
        element.style.opacity = Math.max(0.3, opacity);
        element.style.zIndex = Math.floor((z + radius) * 10);
      });
    }

    activate() {
      this.isActive = true;
      this.updatePositions();
    }

    deactivate() {
      this.isActive = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
}
window.PortfolioCarousel = PortfolioCarousel;
