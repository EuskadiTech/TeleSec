PAGES.buscar = {
  navcss: "btn1",
  icon: "static/appico/File_Plugin.svg",
  Title: "Buscar",
  AccessControl: true,
  Esconder: true,
  
  index: function() {
    const searchInput = safeuuid();
    const resultsContainer = safeuuid();
    const searchButton = safeuuid();
    const recentSearches = safeuuid();
    const moduleFilter = safeuuid();
    
    container.innerHTML = `
      <h1>🔍 Búsqueda Global</h1>
      <p>Busca en todos los módulos: personas, materiales, café, comedor, notas y avisos</p>
      
      <fieldset>
        <legend>Opciones de búsqueda</legend>
        <input type="text" id="${searchInput}" 
               placeholder="Escribe aquí para buscar..." 
               onkeypress="if(event.key==='Enter') document.getElementById('${searchButton}').click()">
        <select id="${moduleFilter}">
          <option value="">Todos los módulos</option>
          <!-- Options will be populated dynamically based on user permissions -->
        </select>
        <button id="${searchButton}" class="btn5">
          Buscar
        </button>
      </fieldset>
      
      <div id="${recentSearches}"></div>
      
      <div id="${resultsContainer}">
        <fieldset>
          <legend>Resultados</legend>
          <div>🔍 Introduce un término de búsqueda para comenzar</div>
          <p>Puedes buscar por nombres, referencias, fechas, ubicaciones...</p>
          
          <details>
            <summary>💡 Consejos de búsqueda</summary>
            <ul>
              <li><strong>Busca por nombres:</strong> "María", "García"</li>
              <li><strong>Busca por fechas:</strong> "2024-10-01" o "01/10/2024"</li>
              <li><strong>Busca por ubicación:</strong> "aula", "laboratorio"</li>
              <li><strong>Usa filtros:</strong> selecciona un módulo específico</li>
              <li><strong>Atajos de teclado:</strong> Ctrl+F para buscar, Esc para limpiar</li>
            </ul>
          </details>
        </fieldset>
      </div>
    `;
    
    // Initialize global search
    const globalSearch = GlobalSearch();
    globalSearch.loadAllData();
    
    // Get accessible modules for the current user
    const accessibleModules = globalSearch.getAccessibleModules();
    
    const searchInputEl = document.getElementById(searchInput);
    const resultsEl = document.getElementById(resultsContainer);
    const searchButtonEl = document.getElementById(searchButton);
    const recentSearchesEl = document.getElementById(recentSearches);
    const moduleFilterEl = document.getElementById(moduleFilter);
    
    // Populate module filter dropdown with only accessible modules
    function populateModuleFilter() {
      // Clear existing options except "Todos los módulos"
      moduleFilterEl.innerHTML = '<option value="">Todos los módulos</option>';
      
      // Add only accessible modules
      accessibleModules.forEach(module => {
        const option = document.createElement('option');
        option.value = module.key;
        option.textContent = `${getModuleIcon(module.key)} ${module.title}`;
        moduleFilterEl.appendChild(option);
      });
    }
    
    // Helper function to get module icons (fallback for older module mappings)
    function getModuleIcon(moduleKey) {
      const iconMap = {
        'personas': '👤',
        'materiales': '📦', 
        'supercafe': '☕',
        'comedor': '🍽️',
        'avisos': '🔔',
        'aulas': '🏫',
        'resumen_diario': '📊'
      };
      return iconMap[moduleKey] || '📋';
    }
    
    // Load recent searches from localStorage
    function loadRecentSearches() {
      const recent = JSON.parse(localStorage.getItem('telesec_recent_searches') || '[]');
      if (recent.length > 0) {
        recentSearchesEl.innerHTML = `
          <fieldset>
            <legend>Búsquedas recientes</legend>
            ${recent.map(term => `
              <button onclick="document.getElementById('${searchInput}').value='${term}'; document.getElementById('${searchButton}').click();" class="btn4">
                ${term}
              </button>
            `).join('')}
            <button onclick="localStorage.removeItem('telesec_recent_searches'); this.parentElement.style.display='none';" class="rojo">
              Limpiar
            </button>
          </fieldset>
        `;
      }
    }
    
    // Populate the module filter dropdown
    populateModuleFilter();
    
    // Save search term to recent searches
    function saveToRecent(term) {
      if (!term || term.length < 2) return;
      
      let recent = JSON.parse(localStorage.getItem('telesec_recent_searches') || '[]');
      recent = recent.filter(t => t !== term); // Remove if exists
      recent.unshift(term); // Add to beginning
      recent = recent.slice(0, 5); // Keep only 5 most recent
      
      localStorage.setItem('telesec_recent_searches', JSON.stringify(recent));
      loadRecentSearches();
    }
    
    // Perform search
    function performSearch() {
      const searchTerm = searchInputEl.value.trim();
      const selectedModule = moduleFilterEl.value;
      
      if (searchTerm.length < 2) {
        resultsEl.innerHTML = `
          <fieldset>
            <legend>Error</legend>
            <div>⚠️ Por favor, introduce al menos 2 caracteres para buscar</div>
          </fieldset>
        `;
        return;
      }
      
      // Show loading
      resultsEl.innerHTML = `
        <fieldset>
          <legend>Buscando...</legend>
          <div>⏳ Procesando búsqueda...</div>
        </fieldset>
      `;
      
      // Add small delay to show loading state
      setTimeout(() => {
        let results = globalSearch.performSearch(searchTerm);
        
        // Filter by module if selected
        if (selectedModule) {
          results = results.filter(result => result._module === selectedModule);
        }
        
        globalSearch.renderResults(results, resultsEl);
        saveToRecent(searchTerm);
        
        // Add stats
        if (results.length > 0) {
          const statsDiv = document.createElement('fieldset');
          const legend = document.createElement('legend');
          legend.textContent = 'Estadísticas';
          statsDiv.appendChild(legend);
          
          let filterText = selectedModule ? ` en ${moduleFilterEl.options[moduleFilterEl.selectedIndex].text}` : '';
          const content = document.createElement('div');
          content.innerHTML = `📊 Se encontraron <strong>${results.length}</strong> resultados para "<strong>${searchTerm}</strong>"${filterText}`;
          statsDiv.appendChild(content);
          
          resultsEl.insertBefore(statsDiv, resultsEl.firstChild);
        }
      }, 500);
    }
    
    // Event listeners
    searchButtonEl.onclick = performSearch;
    
    // Filter change listener
    moduleFilterEl.onchange = () => {
      if (searchInputEl.value.trim().length >= 2) {
        performSearch();
      }
    };
    
    // Auto-search as user types (with debounce)
    let searchTimeout;
    searchInputEl.oninput = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (searchInputEl.value.trim().length >= 2) {
          performSearch();
        }
      }, 1500);
    };
    
    // Focus on search input
    searchInputEl.focus();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Ctrl+F or Cmd+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputEl.focus();
        searchInputEl.select();
      }
      
      // Escape to clear search
      if (e.key === 'Escape') {
        searchInputEl.value = '';
        searchInputEl.focus();
        resultsEl.innerHTML = `
          <fieldset>
            <legend>Resultados</legend>
            <div>🔍 Introduce un término de búsqueda para comenzar</div>
            <p>Puedes buscar por nombres, referencias, fechas, ubicaciones...</p>
            
            <details>
              <summary>💡 Consejos de búsqueda</summary>
              <ul>
                <li><strong>Busca por nombres:</strong> "María", "García"</li>
                <li><strong>Busca por fechas:</strong> "2024-10-01" o "01/10/2024"</li>
                <li><strong>Busca por ubicación:</strong> "aula", "laboratorio"</li>
                <li><strong>Usa filtros:</strong> selecciona un módulo específico</li>
                <li><strong>Atajos de teclado:</strong> Ctrl+F para buscar, Esc para limpiar</li>
              </ul>
            </details>
          </fieldset>
        `;
      }
    });
    
    // Check for quick search term from header
    const quickSearchTerm = sessionStorage.getItem('telesec_quick_search');
    if (quickSearchTerm) {
      searchInputEl.value = quickSearchTerm;
      sessionStorage.removeItem('telesec_quick_search');
      // Perform search automatically
      setTimeout(performSearch, 100);
    }
    
    // Load recent searches
    loadRecentSearches();
  }
};
