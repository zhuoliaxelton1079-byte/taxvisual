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
    if (!mountEl) return;
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

  // Plain link list for the /sitemap/ page — same registry, no cards.
  // options: { basePath }
  function renderToolLinks(mountEl, options) {
    if (!mountEl) return;
    options = options || {};
    var basePath = options.basePath || '';
    var tools = sortedTools();
    var categories = window.CATEGORIES || [];

    mountEl.innerHTML = '';

    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var inCategory = tools.filter(function (t) { return t.category === cat.key; });
      if (!inCategory.length) continue;

      var h2 = document.createElement('h2');
      h2.textContent = cat.label;
      mountEl.appendChild(h2);

      var list = document.createElement('ul');
      for (var j = 0; j < inCategory.length; j++) {
        var tool = inCategory[j];
        var li = document.createElement('li');

        if (tool.status === 'live' && tool.url) {
          var link = document.createElement('a');
          link.href = basePath + tool.url;
          link.textContent = tool.title;
          li.appendChild(link);
        } else {
          li.appendChild(document.createTextNode(tool.title));
          var note = document.createElement('span');
          note.className = 'sitemap-note';
          note.textContent = tool.status === 'in-progress' ? ' (in progress)' : ' (planned)';
          li.appendChild(note);
        }

        list.appendChild(li);
      }
      mountEl.appendChild(list);
    }
  }

  // Homepage spotlight: the highest-priority live tool, given a full block
  // rather than a card in a row of mostly-empty cards. Reads the same
  // registry, so a new tool promotes itself here the moment it goes live.
  // options: { basePath }
  function renderSpotlight(mountEl, options) {
    if (!mountEl) return;
    options = options || {};
    var basePath = options.basePath || '';
    var tools = sortedTools();

    var live = tools.filter(function (t) { return t.status === 'live' && t.url; });
    var pending = tools.filter(function (t) { return t.status !== 'live'; });

    mountEl.innerHTML = '';

    var tool = live[0];
    if (!tool) {
      var empty = document.createElement('p');
      empty.className = 'tool-grid-empty';
      empty.textContent = 'No tools are live yet.';
      mountEl.appendChild(empty);
      return;
    }

    var panel = document.createElement('div');
    panel.className = 'spotlight';

    var body = document.createElement('div');

    var head = document.createElement('div');
    head.className = 'spotlight-head';
    var chip = document.createElement('span');
    chip.className = 'chip chip-live';
    chip.textContent = 'Live';
    head.appendChild(chip);
    var tag = document.createElement('span');
    tag.className = 'tool-tag';
    tag.textContent = categoryLabel(tool.category);
    head.appendChild(tag);
    body.appendChild(head);

    var h3 = document.createElement('h3');
    h3.textContent = tool.title;
    body.appendChild(h3);

    var desc = document.createElement('p');
    desc.className = 'spotlight-desc';
    desc.textContent = tool.description;
    body.appendChild(desc);

    var actions = document.createElement('p');
    actions.className = 'spotlight-actions';
    var link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = basePath + tool.url;
    link.textContent = 'Open the tool';
    actions.appendChild(link);
    body.appendChild(actions);

    panel.appendChild(body);

    // Key facts, if the registry entry carries them.
    if (tool.facts && tool.facts.length) {
      var facts = document.createElement('dl');
      facts.className = 'spotlight-facts';
      for (var i = 0; i < tool.facts.length; i++) {
        var row = document.createElement('div');
        var dt = document.createElement('dt');
        dt.textContent = tool.facts[i].label;
        var dd = document.createElement('dd');
        dd.textContent = tool.facts[i].value;
        row.appendChild(dt);
        row.appendChild(dd);
        facts.appendChild(row);
      }
      panel.appendChild(facts);
    }

    mountEl.appendChild(panel);

    if (pending.length) {
      var names = pending.map(function (t) { return t.title; });
      var joined = names.length > 1
        ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
        : names[0];

      var note = document.createElement('p');
      note.className = 'upcoming';
      note.appendChild(document.createTextNode(joined + (names.length > 1 ? ' are' : ' is') + ' in development. '));
      var dirLink = document.createElement('a');
      dirLink.href = basePath + 'tools/index.html';
      dirLink.textContent = 'See all tools';
      note.appendChild(dirLink);
      mountEl.appendChild(note);
    }
  }

  window.TaxVisual = window.TaxVisual || {};
  window.TaxVisual.renderToolGrid = renderToolGrid;
  window.TaxVisual.renderToolLinks = renderToolLinks;
  window.TaxVisual.renderSpotlight = renderSpotlight;
})();
