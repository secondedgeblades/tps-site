(function () {
  const projectLabels = {
    all: 'All',
    seb: 'Second Edge Blades',
    softdark: 'The Soft Dark',
    tales: 'Tales from the Middle',
    ruby: 'Ruby & The Guardian',
    hoptwice: 'Hop Twice',
    stories: 'Short Stories',
    general: 'Studio'
  };

  function productMatchesProject(product, project) {
    return !project || project === 'all' || product.project === project;
  }

  function makeProductCard(product) {
    const link = document.createElement('a');
    link.href = product.url || 'https://www.etsy.com/shop/ThePigletsSatchel';
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'shop-product-card';

    const image = document.createElement('img');
    image.src = resolveAssetPath(product.image || 'assets/images/logo-v3.png');
    image.alt = product.title ? product.title + ' preview' : 'Shop product preview';

    const meta = document.createElement('p');
    meta.className = 'shop-product-meta';
    meta.textContent = projectLabels[product.project] || product.projectName || 'Studio';

    const title = document.createElement('span');
    title.textContent = product.title || 'Studio product';

    link.append(image, meta, title);

    if (product.editionSize) {
      const edition = document.createElement('small');
      edition.textContent = 'Limited run of ' + product.editionSize + (product.editionUnit ? ' ' + product.editionUnit : '');
      link.append(edition);
    }

    if (product.price) {
      const price = document.createElement('small');
      price.textContent = product.price;
      link.append(price);
    }

    return link;
  }

  function resolveAssetPath(path) {
    if (!path || /^(https?:|data:|\/)/.test(path)) return path;
    return new URL(path, window.location.origin + '/').href;
  }

  function getProducts(project, limit) {
    return (window.TPS_SHOP_PRODUCTS || [])
      .filter((product) => productMatchesProject(product, project))
      .slice(0, limit);
  }

  function renderProducts(container, project) {
    const limit = Number(container.dataset.limit || 4);
    const products = getProducts(project, limit);

    if (!products.length) {
      const shelf = container.closest('.project-shop-shelf');
      if (shelf) {
        shelf.hidden = true;
        return;
      }
      container.innerHTML = '<p class="shop-empty">No linked products yet.</p>';
      return;
    }

    container.replaceChildren(...products.map(makeProductCard));
  }

  function renderShopPreview(container) {
    renderProducts(container, container.dataset.project || 'all');
  }

  function renderShopFilters(wrapper) {
    const targetSelector = wrapper.dataset.shopFilters;
    const target = document.querySelector(targetSelector);
    if (!target) return;

    const products = window.TPS_SHOP_PRODUCTS || [];
    const preferredOrder = ['all', 'seb', 'softdark', 'tales', 'ruby', 'hoptwice', 'stories', 'general'];
    const available = new Set(products.map((product) => product.project).filter(Boolean));
    const projects = preferredOrder.filter((project) => project === 'all' || available.has(project));

    wrapper.replaceChildren(...projects.map((project) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = projectLabels[project] || project;
      button.dataset.project = project;
      if (project === 'all') button.classList.add('active');

      button.addEventListener('click', () => {
        wrapper.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        renderProducts(target, project);
      });

      return button;
    }));
  }

  document.querySelectorAll('[data-shop-preview]').forEach(renderShopPreview);
  document.querySelectorAll('[data-shop-filters]').forEach(renderShopFilters);
})();
