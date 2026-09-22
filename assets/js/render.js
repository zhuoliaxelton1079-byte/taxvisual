// Reads window.TOOLS / window.CATEGORIES (assets/js/tools-data.js) and
// builds .tool-grid/.tool-card markup. Call after tools-data.js has loaded,
// and before assets/js/reveal.js so scroll-reveal picks up the new cards.
(function () {
  function categoryLabel(key) {
    var categories = window.CATEGORIES || [];
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].key === key) return categories[i].label;
    }
    return key;
  }

  function buildCard(tool, basePath) {
    var card = document.createElement('article');
    card.className = 'tool-card reveal';

    var tag = document.createElement('span');
    tag.className = 'tool-tag';
    tag.textContent = categoryLabel(tool.category);
    card.appendChild(tag);

    var h3 = document.createElement('h3');
    h3.textContent = tool.title;
    card.appendChild(h3);

    var p = document.createElement('p');
    p.textContent = tool.description;
    card.appendChild(p);

    var meta = document.createElement('div');
    meta.className = 'tool-meta';

    var isLive = tool.status === 'live';
    var status = document.createElement('span');
    status.className = 'tool-status ' + (isLive ? 'is-live' : 'is-planned');
    status.textContent = isLive ? 'Live' : (tool.status === 'in-progress' ? 'In progress' : 'Planned');
    meta.appendChild(status);

    if (isLive && tool.url) {
      var link = document.createElement('a');
      link.className = 'tool-link';
      link.href = basePath + tool.url;
      link.textContent = 'Launch Tool';
      meta.appendChild(link);
    } else {
      var soon = document.createElement('span');
      soon.textContent = 'Coming soon';
      meta.appendChild(soon);
    }

    card.appendChild(meta);
    return card;
  }

  function buildGrid(tools, basePath) {
    var grid = document.createElement('div');
    grid.className = 'tool-grid';

    if (!tools.length) {
      var empty = document.createElement('p');
      empty.className = 'tool-grid-empty';
      empty.textContent = 'No tools in this category yet.';
      grid.appendChild(empty);
      return grid;
    }

    for (var i = 0; i < tools.length; i++) {
      grid.appendChild(buildCard(tools[i], basePath));
    }
    return grid;
  }

  function sortedTools() {
    return (window.TOOLS || []).slice().sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  }

  // options: { basePath, onlyFeatured, groupByCategory }
  function renderToolGrid(mountEl, options) {
    options = options || {};
    var basePath = options.basePath || '';
    var tools = sortedTools();

    if (options.onlyFeatured) {
      tools = tools.filter(function (t) { return t.featured; });
    }

    mountEl.innerHTML = '';

    if (!options.groupByCategory) {
      mountEl.appendChild(buildGrid(tools, basePath));
      return;
    }

    var categories = window.CATEGORIES || [];
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var inCategory = tools.filter(function (t) { return t.category === cat.key; });
      if (!inCategory.length) continue;

      var heading = document.createElement('div');
      heading.className = 'section-head reveal';
      var h2 = document.createElement('h2');
      h2.textContent = cat.label;
      heading.appendChild(h2);
      mountEl.appendChild(heading);

      mountEl.appendChild(buildGrid(inCategory, basePath));
    }
  }

  window.TaxVisual = window.TaxVisual || {};
  window.TaxVisual.renderToolGrid = renderToolGrid;
})();
