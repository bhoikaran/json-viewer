// Global variable to store current JSON data
let currentData = null;
let currentSearchTerm = '';
let searchMatches = [];
let currentMatchIndex = -1;
let parseTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const jsonInput = document.getElementById('jsonInput');
  const treeContainer = document.getElementById('treeContainer');
  const fullscreenTree = document.getElementById('fullscreenTree');
  const errorMsg = document.getElementById('errorMsg');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const formatBtn = document.getElementById('formatBtn');
  const validateBtn = document.getElementById('validateBtn');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput');
  const downloadBtn = document.getElementById('downloadBtn');
  const expandAllBtn = document.getElementById('expandAllBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const fullPageBtn = document.getElementById('fullPageBtn');
  const fullscreenModal = document.getElementById('fullscreenModal');
  const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');
  const modalExpandAllBtn = document.getElementById('modalExpandAllBtn');
  const modalCollapseAllBtn = document.getElementById('modalCollapseAllBtn');
  const themeSelect = document.getElementById('themeSelect');
  const searchInput = document.getElementById('searchInput');
  const searchInfo = document.getElementById('searchInfo');
  
  // Load saved theme
  const savedTheme = localStorage.getItem('jsonViewerTheme');
  if (savedTheme) {
    themeSelect.value = savedTheme;
    changeTheme();
  }
  
  // Auto-parse JSON on input with debounce
  jsonInput.addEventListener('input', () => {
    clearTimeout(parseTimeout);
    parseTimeout = setTimeout(parseJSON, 500);
  });
  
  // Event listeners
  loadSampleBtn.addEventListener('click', loadSampleJSON);
  clearBtn.addEventListener('click', clearAll);
  formatBtn.addEventListener('click', formatJSON);
  validateBtn.addEventListener('click', validateJSON);
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);
  downloadBtn.addEventListener('click', downloadJSON);
  expandAllBtn.addEventListener('click', () => expandAllNodes(treeContainer));
  collapseAllBtn.addEventListener('click', () => collapseAllNodes(treeContainer));
  fullPageBtn.addEventListener('click', openFullscreenView);
  closeFullscreenBtn.addEventListener('click', closeFullscreenView);
  modalExpandAllBtn.addEventListener('click', () => expandAllNodes(fullscreenTree));
  modalCollapseAllBtn.addEventListener('click', () => collapseAllNodes(fullscreenTree));
  themeSelect.addEventListener('change', changeTheme);
  searchInput.addEventListener('input', handleSearch);
  
  // Close modal when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fullscreenModal.style.display === 'block') {
      closeFullscreenView();
    }
    
    // Search navigation with F3 and Shift+F3
    if (e.key === 'F3') {
      e.preventDefault();
      navigateSearchResults(!e.shiftKey);
    }
  });
  
  // Load sample JSON on page load
  loadSampleJSON();
  
  // Functions
  function parseJSON() {
    const input = jsonInput.value.trim();
    treeContainer.innerHTML = '';
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
    searchInfo.textContent = '';
    currentSearchTerm = '';
    searchMatches = [];
    currentMatchIndex = -1;
    
    if (!input) {
      treeContainer.innerHTML = '<div class="empty-message">Enter JSON to visualize</div>';
      currentData = null;
      return;
    }
    
    try {
      currentData = JSON.parse(input);
      renderTree(treeContainer, currentData);
    } catch (e) {
      showError('Invalid JSON: ' + e.message);
      currentData = null;
    }
  }
  
  function renderTree(container, data) {
    container.innerHTML = '';
    const rootNode = buildNode(data, '');
    container.appendChild(rootNode);
  }
  
  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
  }
  
  function buildNode(node, nodeKey, path = '') {
    const isObject = node !== null && typeof node === 'object';
    
    if (!isObject) {
      const li = document.createElement('li');
      
      if (nodeKey) {
        const keySpan = document.createElement('span');
        keySpan.className = 'key';
        keySpan.textContent = nodeKey + ': ';
        li.appendChild(keySpan);
      }
      
      const valSpan = document.createElement('span');
      valSpan.className = 'value';
      
      // Add type-specific class
      const type = typeof node;
      if (type === 'string') {
        valSpan.classList.add('string');
        valSpan.textContent = `"${node}"`;
      } else if (type === 'number') {
        valSpan.classList.add('number');
        valSpan.textContent = node;
      } else if (type === 'boolean') {
        valSpan.classList.add('boolean');
        valSpan.textContent = node;
      } else if (node === null) {
        valSpan.classList.add('null');
        valSpan.textContent = 'null';
      }
      
      li.appendChild(valSpan);
      
      // Add data attribute for search
      li.setAttribute('data-path', path);
      
      return li;
    }
    
    const isArray = Array.isArray(node);
    const count = isArray ? node.length : Object.keys(node).length;
    const li = document.createElement('li');
    li.classList.add('collapsible');
    
    // Add data attribute for search
    li.setAttribute('data-path', path);
    
    // Create toggle arrow
    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'toggle-arrow';
    arrowSpan.textContent = '▾';
    arrowSpan.setAttribute('tabindex', '0');
    arrowSpan.setAttribute('role', 'button');
    arrowSpan.setAttribute('aria-label', 'Toggle node');
    arrowSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      li.classList.toggle('collapsed');
    });
    arrowSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        li.classList.toggle('collapsed');
      }
    });
    li.appendChild(arrowSpan);
    
    // Create node header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'node-header';
    headerDiv.setAttribute('tabindex', '0');
    headerDiv.setAttribute('role', 'button');
    
    if (nodeKey) {
      const keySpan = document.createElement('span');
      keySpan.className = 'key';
      keySpan.textContent = nodeKey + ': ';
      headerDiv.appendChild(keySpan);
    }
    
    // Add brackets
    const openBracket = document.createElement('span');
    openBracket.className = 'bracket';
    openBracket.textContent = isArray ? '[' : '{';
    
    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = count + ' item' + (count === 1 ? '' : 's');
    
    const closeBracket = document.createElement('span');
    closeBracket.className = 'bracket';
    closeBracket.textContent = isArray ? ']' : '}';
    
    headerDiv.appendChild(openBracket);
    headerDiv.appendChild(countSpan);
    headerDiv.appendChild(closeBracket);
    
    headerDiv.addEventListener('click', () => {
      li.classList.toggle('collapsed');
    });
    
    headerDiv.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        li.classList.toggle('collapsed');
      }
    });
    
    li.appendChild(headerDiv);
    
    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'node-content';
    
    if (count > 0) {
      const ul = document.createElement('ul');
      
      if (isArray) {
        // Limit initial display for large arrays
        const displayCount = Math.min(node.length, 100);
        
        for (let idx = 0; idx < displayCount; idx++) {
          const item = node[idx];
          const itemPath = path + (path ? '.' : '') + `[${idx}]`;
          const itemLi = document.createElement('li');
          
          const indexSpan = document.createElement('span');
          indexSpan.className = 'array-index';
          indexSpan.textContent = `[${idx}]:`;
          
          itemLi.appendChild(indexSpan);
          
          if (item !== null && typeof item === 'object') {
            itemLi.appendChild(buildNode(item, '', itemPath));
          } else {
            const valSpan = document.createElement('span');
            valSpan.className = 'value';
            
            if (typeof item === 'string') {
              valSpan.classList.add('string');
              valSpan.textContent = `"${item}"`;
            } else if (typeof item === 'number') {
              valSpan.classList.add('number');
              valSpan.textContent = item;
            } else if (typeof item === 'boolean') {
              valSpan.classList.add('boolean');
              valSpan.textContent = item;
            } else if (item === null) {
              valSpan.classList.add('null');
              valSpan.textContent = 'null';
            }
            
            itemLi.appendChild(valSpan);
          }
          
          // Add data attribute for search
          itemLi.setAttribute('data-path', itemPath);
          
          ul.appendChild(itemLi);
        }
        
        // Add "Show more" button for large arrays
        if (node.length > 100) {
          const showMoreLi = document.createElement('li');
          const showMoreBtn = document.createElement('button');
          showMoreBtn.className = 'show-more';
          showMoreBtn.textContent = `Show ${node.length - 100} more items...`;
          showMoreBtn.addEventListener('click', () => {
            // Remove the show more button
            showMoreLi.remove();
            
            // Render remaining items
            for (let idx = 100; idx < node.length; idx++) {
              const item = node[idx];
              const itemPath = path + (path ? '.' : '') + `[${idx}]`;
              const itemLi = document.createElement('li');
              
              const indexSpan = document.createElement('span');
              indexSpan.className = 'array-index';
              indexSpan.textContent = `[${idx}]:`;
              
              itemLi.appendChild(indexSpan);
              
              if (item !== null && typeof item === 'object') {
                itemLi.appendChild(buildNode(item, '', itemPath));
              } else {
                const valSpan = document.createElement('span');
                valSpan.className = 'value';
                
                if (typeof item === 'string') {
                  valSpan.classList.add('string');
                  valSpan.textContent = `"${item}"`;
                } else if (typeof item === 'number') {
                  valSpan.classList.add('number');
                  valSpan.textContent = item;
                } else if (typeof item === 'boolean') {
                  valSpan.classList.add('boolean');
                  valSpan.textContent = item;
                } else if (item === null) {
                  valSpan.classList.add('null');
                  valSpan.textContent = 'null';
                }
                
                itemLi.appendChild(valSpan);
              }
              
              // Add data attribute for search
              itemLi.setAttribute('data-path', itemPath);
              
              ul.appendChild(itemLi);
            }
          });
          
          showMoreLi.appendChild(showMoreBtn);
          ul.appendChild(showMoreLi);
        }
      } else {
        for (const [key, val] of Object.entries(node)) {
          const itemPath = path + (path ? '.' : '') + key;
          ul.appendChild(buildNode(val, key, itemPath));
        }
      }
      
      contentDiv.appendChild(ul);
    }
    
    li.appendChild(contentDiv);
    return li;
  }
  
 function loadSampleJSON() {
        const sampleJSON = `{"data":[{"id":"036feed0-da8a-42c9-ab9a-57449b530b13","type":"breed","attributes":{"name":"Affenpinscher","description":"The Affenpinscher is a small and playful breed of dog that was originally bred in Germany for hunting small game. They are intelligent, energetic, and affectionate, and make excellent companion dogs.","life":{"max":16,"min":14},"male_weight":{"max":5,"min":3},"female_weight":{"max":5,"min":3},"hypoallergenic":true},"relationships":{"group":{"data":{"id":"f56dc4b1-ba1a-4454-8ce2-bd5d41404a0c","type":"group"}}}},{"id":"dd9362cc-52e0-462d-b856-fccdcf24b140","type":"breed","attributes":{"name":"Afghan Hound","description":"The Afghan Hound is a large and elegant breed of dog that was originally bred in Afghanistan for hunting small game. They are intelligent, independent, and athletic, and make excellent companion dogs.","life":{"max":14,"min":12},"male_weight":{"max":27,"min":23},"female_weight":{"max":25,"min":20},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"be0147df-7755-4228-b132-2518c0c6d10d","type":"group"}}}},{"id":"1460844f-841c-4de8-b788-271aa4d63224","type":"breed","attributes":{"name":"Airedale Terrier","description":"The Airedale Terrier is a large and powerful breed of dog that was originally bred in England for hunting small game. They are intelligent, energetic, and determined, and make excellent hunting dogs.","life":{"max":14,"min":12},"male_weight":{"max":23,"min":20},"female_weight":{"max":20,"min":18},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"1bbf373b-1937-4e73-9863-45385daa4979","type":"group"}}}},{"id":"e7e99424-d514-4b56-9f0c-05736f6dd22d","type":"breed","attributes":{"name":"Akita","description":"The Akita is a large, muscular dog breed that originated in Japan. They are known for their loyalty and courage.","life":{"max":12,"min":10},"male_weight":{"max":60,"min":35},"female_weight":{"max":50,"min":35},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"56081cf0-fdf2-4114-9bf7-23a3f5b6af91","type":"group"}}}},{"id":"667c7359-a739-4f2b-abb4-98867671e375","type":"breed","attributes":{"name":"Alaskan Klee Kai","description":"The Alaskan Klee Kai is a small to medium-sized breed of dog that was developed in Alaska in the 1970s. It is an active and intelligent breed that is loyal and friendly. The Alaskan Klee Kai stands between 13-17 inches at the shoulder and has a double-coat that can come in various colors and patterns.","life":{"max":15,"min":12},"male_weight":{"max":7,"min":6},"female_weight":{"max":7,"min":6},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"8000793f-a1ae-4ec4-8d55-ef83f1f644e5","type":"group"}}}},{"id":"5328d59b-b4e4-48e9-98ec-0545c66c4385","type":"breed","attributes":{"name":"Alaskan Malamute","description":"The Alaskan Malamute is a large and powerful sled dog from Alaska. They are strong and hardworking, yet friendly and loyal. Alaskan Malamutes have a thick, double coat that can be any color. They are active and require plenty of exercise and mental stimulation to stay healthy and happy.","life":{"max":15,"min":12},"male_weight":{"max":39,"min":34},"female_weight":{"max":34,"min":25},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"56081cf0-fdf2-4114-9bf7-23a3f5b6af91","type":"group"}}}},{"id":"f72528b5-a5d7-4a17-b709-aba2db722307","type":"breed","attributes":{"name":"American Bulldog","description":"The American Bulldog is a large and powerful breed of dog that was originally bred in the United States for working on farms. They are intelligent, loyal, and protective, and make excellent guard dogs.","life":{"max":14,"min":12},"male_weight":{"max":50,"min":25},"female_weight":{"max":45,"min":25},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"8000793f-a1ae-4ec4-8d55-ef83f1f644e5","type":"group"}}}},{"id":"4524645f-dda7-4031-9272-dee29f5f91ea","type":"breed","attributes":{"name":"American English Coonhound","description":"The American English Coonhound is a large and athletic breed of dog that was originally bred in the United States for hunting raccoons. They are intelligent, energetic, and determined, and make excellent hunting dogs.","life":{"max":14,"min":12},"male_weight":{"max":30,"min":20},"female_weight":{"max":30,"min":20},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"be0147df-7755-4228-b132-2518c0c6d10d","type":"group"}}}},{"id":"e1c0664d-aa61-4c85-970d-6c86ba197bee","type":"breed","attributes":{"name":"American Eskimo Dog","description":"The American Eskimo Dog is a small to medium-sized breed with a thick, fluffy coat that comes in white, cream, or biscuit colors. It is known for its intelligence and its ability to learn a wide variety of tricks.","life":{"max":15,"min":12},"male_weight":{"max":20,"min":9},"female_weight":{"max":20,"min":9},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"7f6ea988-366a-4e20-b4ba-4d04274fea61","type":"group"}}}},{"id":"8355b9c9-3724-477d-858a-c1c1c0f1743f","type":"breed","attributes":{"name":"American Foxhound","description":"The American Foxhound is a large and athletic breed of dog that was originally bred in the United States for hunting foxes. They are intelligent, energetic, and determined, and make excellent hunting dogs.","life":{"max":15,"min":12},"male_weight":{"max":34,"min":20},"female_weight":{"max":34,"min":20},"hypoallergenic":false},"relationships":{"group":{"data":{"id":"be0147df-7755-4228-b132-2518c0c6d10d","type":"group"}}}}],"meta":{"pagination":{"current":1,"next":2,"last":29,"records":283}},"links":{"self":"https://dogapi.dog/api/v2/breeds","current":"https://dogapi.dog/api/v2/breeds?page[number]=1","next":"https://dogapi.dog/api/v2/breeds?page[number]=2","last":"https://dogapi.dog/api/v2/breeds?page[number]=29"}}`;
        
        jsonInput.value = sampleJSON;
        parseJSON();
   }



  function formatJSON() {
    try {
      const parsed = JSON.parse(jsonInput.value);
      jsonInput.value = JSON.stringify(parsed, null, 2);
      parseJSON();
    } catch (e) {
      showError('Cannot format invalid JSON: ' + e.message);
    }
  }
  
  function validateJSON() {
    try {
      JSON.parse(jsonInput.value);
      showError('Valid JSON!', 'success');
    } catch (e) {
      showError('Invalid JSON: ' + e.message);
    }
  }
  
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      jsonInput.value = e.target.result;
      parseJSON();
    };
    reader.readAsText(file);
  }
  
  function downloadJSON() {
    if (!currentData) {
      showError('No JSON data to download');
      return;
    }
    
    const dataStr = JSON.stringify(currentData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
  
  function expandAllNodes(container) {
    const collapsibleItems = container.querySelectorAll('li.collapsible');
    collapsibleItems.forEach(item => {
      item.classList.remove('collapsed');
    });
  }
  
  function collapseAllNodes(container) {
    const collapsibleItems = container.querySelectorAll('li.collapsible');
    collapsibleItems.forEach(item => {
      item.classList.add('collapsed');
    });
  }
  
  function openFullscreenView() {
    if (!currentData) {
      showError('No valid JSON data to display in full screen');
      return;
    }
    
    // Render tree in fullscreen view
    renderTree(fullscreenTree, currentData);
    
    // Expand all nodes by default
    expandAllNodes(fullscreenTree);
    
    // Show the modal
    fullscreenModal.style.display = 'block';
  }
  
  function closeFullscreenView() {
    fullscreenModal.style.display = 'none';
  }
  
  function changeTheme() {
    const theme = themeSelect.value;
    document.body.className = '';
    
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else if (theme === 'original-dark') {
      document.body.classList.add('original-dark');
    }
    
    // Save theme preference
    localStorage.setItem('jsonViewerTheme', theme);
  }
  
  function handleSearch(event) {
    currentSearchTerm = event.target.value.toLowerCase();
    searchMatches = [];
    currentMatchIndex = -1;
    
    if (!currentSearchTerm) {
      searchInfo.textContent = '';
      clearHighlights();
      return;
    }
    
    // Find all matches
    const treeNodes = treeContainer.querySelectorAll('li');
    treeNodes.forEach(node => {
      const text = node.textContent.toLowerCase();
      if (text.includes(currentSearchTerm)) {
        searchMatches.push(node);
      }
    });
    
    // Update search info
    searchInfo.textContent = searchMatches.length > 0 
      ? `${currentMatchIndex + 1} of ${searchMatches.length}` 
      : 'No matches found';
    
    // Highlight matches
    clearHighlights();
    if (searchMatches.length > 0) {
      highlightMatches();
      navigateSearchResults(true); // Go to first match
    }
  }
  
  function clearHighlights() {
    const highlighted = document.querySelectorAll('.highlight');
    highlighted.forEach(el => {
      el.classList.remove('highlight');
    });
  }
  
  function highlightMatches() {
    searchMatches.forEach(node => {
      // Simple highlighting - in a real app you might want to highlight specific text
      node.classList.add('highlight');
    });
  }
  
  function navigateSearchResults(forward) {
    if (searchMatches.length === 0) return;
    
    // Remove highlight from current match
    if (currentMatchIndex >= 0) {
      searchMatches[currentMatchIndex].classList.remove('highlight-current');
    }
    
    // Calculate new index
    if (forward) {
      currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
    } else {
      currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    }
    
    // Highlight new match
    searchMatches[currentMatchIndex].classList.add('highlight-current');
    
    // Scroll to match
    searchMatches[currentMatchIndex].scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Update search info
    searchInfo.textContent = `${currentMatchIndex + 1} of ${searchMatches.length}`;
  }
  
  
      
  function clearAll() {
    jsonInput.value = '';
    treeContainer.innerHTML = '<div class="empty-message">Enter JSON to visualize</div>';
    fullscreenTree.innerHTML = '';
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
    searchInfo.textContent = '';
    currentSearchTerm = '';
    searchMatches = [];
    currentMatchIndex = -1;
    currentData = null;
  }
});