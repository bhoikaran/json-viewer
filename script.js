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
        const sampleJSON = `{
  "status": "success",
  "resultflag": "1",
  "player_data": {
    "id": "Cb3mriayCeTIKLJ1P0fsug==",
    "title": "cEN9zSisIEQdI+49uRds2A==",
    "ms_districts_id": "AD5eV/SBMMCO8TYXGvDk2A==",
    "reference_number": "ZwfaBA/XyOgSV/Ocj1IKU7w==",
    "email": "IHqI6emGsJSTb4hXmz71zDvowjzIfgOVyDVOSbhHTLg=",
    "mobile_number": "V7RvmztUjkodzNvWrfjWTw==",
    "first_name": "C2+7Kg2TxKKLzdv9B0s9Qg==",
    "last_name": "p6KgRUYTzJO1KRFePzJuaO==",
    "gender": "Ad5wYIHBggps51DEN2PUA==",
    "date_of_birth": "UGygf+iCfeJ367xygeiSg==",
    "aadhaar_card_number": "P4$lnxrIMIOwC+6SEXV/fQQ==",
    "district_name": "VD0vj2RuLSkISXOHChmgg==",
    "user_category": "mmH13IR3Kp6vk7zJmou6Sw==",
    "age": "981LdmefA/GAMMW5Cwhpa==",
    "blood_group": "P4$lnxrIMIOwC+6SEXV/fQQ==",
    "sports_title": "3GDuFLV/dG1joVBw9jsqDCQ==",
    "ms_sports_id": "dFZl0464Mn3Tpzv910890w==",
    "profile_description": "P4$lnxrIMIOwC+6SEXV/fQQ==",
    "taluka_name": "HttpV/DhtvVx57VoE8910ng==",
    "ms_talukas_id": "FOAX7DDYE1514MVIPjrE0w==",
    "ms_villages_id": "qxRTfzc6KPoS7mb8nHgw==",
    "address": "WM1zb5hGUpmzrfy95rXakH03MWvBeM037KYZD+qNcuU=",
    "pincode": "EJ6A1QbAK4kNnv9PAId+QA==",
    "village_name": "HttpV/DhtvVx57voE8910ng==",
    "middle_name": "p6KgRUYTzJO1KRFePzJuaO==",
    "atelic_category": "PPc+mED5F7rXC+HC7mncQnYncBCcgUFV/kZK8JV/shMg=",
    "upload_photo": "7a96Xlm6WejYGIc9MghcEqfmk5WH+cHgpgb1N3Dz4q5yblV3DV/RSZwi+kN94SqKh",
    "user_roles_id": "luMCKrFYXwn1etXH6NBd3A==",
    "para_sub_category": "f&XV/08YSsxOp6M0wxz1CnQ==",
    "taluka_profile": "U3zeVYY7TM80nhN02eYG4MGnpg1hQSzMwKfP2LnSMPrrCVCVnpENEBHAPVxJ9KKsGLV/27sxYA0PGPUqm8K+HOkg3DASYBRI8Ouqax62me2JyISamsI1XV/Vq6ddZaqR2Rh22cvPZ1zHKKvjwGZojnMFcZmX8qKobaKMpneS2fdJphrkJYUcnMR2"
  },
  "state_profile": "USrevY7TNWbDnNWOz8YcFwCQgKqYgKK8QqQMhHX3BkmDkWrXbDt1ffQdss2OquNXkRh+pUXn0em8k/v8tYgHbaNWP6ZGqp/szAojfIYb49UvKJ+fCoCm6GTMDLEgMo/vVMy9x30ByymBwoYpKxDPUmmWxjkaAnzykW770DJ5claOBkrqtDuncTJUpOVAQFuMeESUZMewrIdj12yG4W8xOP4GLxuyDUz4sFCXXmgmu1wQHsmXtNahxlZq4btzCvKISBZACoogkLSznXsl+4ma783z2hi9rePeENJoHoehXR3hmNNAsBuWTtsAOomRUnr4SdoOZCB3PlATzkYJgtMOinOpARilpxluyk6K3Bpg6to31Ebh923VONgFqSptFSmMqB9P3sHI1qrEXpRyw==",
  "national_profile": "6w27Ockmejz9TpcueD6qUm63C4HbQl/adInoSasGchmZZYonj9p1SmHZooOKDdwsjcs7Thwae9ds3J5PLsXp/1ctDr7euOuelAhB8*qap4YqpZjou2hdqWQtaw8I86ngjdai2DF6CF8LokNBfaFbwgGp/ccsMTxxDCDLDxNYc7hp+W4Q/immRihvHaOourOYPfmLCGFzHMdd6dpDYMj8FKcyEF3zysCLNpYoICkZOpZSLjkvRuhjKnRLKrkscMYOhSoOmcizLKxd1SKNszl1s8QOozPzq/JyKeaYZ1012GavB6xweFUUGQLa+Hkyy2OOK1aMaDIHCtjz9Vhohaa9Ka3XNw62uekwBCBMNORB8PXixlgcSIOqpbMoadJUkbwPOqLEXiSCaEYjYLwRTafqnTCc5eiRe6CKpiFX6ko87dqN0toQBFe/Ma4e",
  "international_profile": "6w27Ockmejz9TpcueD6qUm63C4HbQl/adInoSasGchmsXE+XT77252Uott7H4jcX0vKChPME6cUo774g011J7Hyc7VEra/TEQGmR9Waefgpef+5Kg9Dnkwa76M3jEC5pbV46yfekHdbwwvsHKID72+Hwrfrfc/A3ziB/qYq/REjMPLMZKfWvd1AFYgmkJ35D+E4mpgX777TXQ8Obmp6xM9ByzmQIrjELKzHz5bXzvfyj6SAunjxA61+Zv61+aP8/Zos6Tkf15ZiXL2qsMSQYY2/201goU68+pce/whr/8XRcUDEAX8cCSuULesKDUVgq8BKOUEQdKeAKLpmtDEm4e21G0EPu/IOKKOpJ6CPsh6+mpjWUFwz4CCFRg+h+Acy04ELZXD9fgj2fevy0lOSKbWLfwt7uaKXOLBN71ufng/+usKliyMi9ghqjzj9001FDHv6s/DBrxqpjZzybFy+mz81Br8MoKgs9wdAb9UxH/phF2ModHFL0gVnBFmfasZX9YBpcVULZpqJ55yOQX8/A==",
  "data": [],
  "message": "Success"
}`;
        
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