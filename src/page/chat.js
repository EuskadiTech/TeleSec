PERMS["chat"] = "Chat"
PERMS["chat:edit"] = "&gt; Escribir"

PAGES.chat = {
  navcss: "btn4",
  icon: "static/appico/Chat.svg",
  AccessControl: true,
  Title: "Chat",
  index: function() {
    if (!checkRole("chat")) {setUrlHash("index");return}
    
    var messagesList = safeuuid();
    var messageInput = safeuuid();
    var sendButton = safeuuid();
    var daySelector = safeuuid();
    var currentDay = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    container.innerHTML = `
      <h1>💬 Chat - ${GROUPID}</h1>
      <div style="margin-bottom: 15px;">
        <label for="${daySelector}">Seleccionar día:</label>
        <input type="date" id="${daySelector}" value="${currentDay}" 
               style="margin-left: 10px; padding: 5px;">
        <button onclick="PAGES.chat.loadDay()" style="margin-left: 10px;">Cargar</button>
      </div>
      
      <div style="border: 2px solid #ccc; border-radius: 8px; padding: 10px; 
                  height: 400px; overflow-y: auto; background-color: #f9f9f9; 
                  margin-bottom: 15px;" id="chat-container">
        <ul id="${messagesList}" style="list-style: none; padding: 0; margin: 0;">
          <!-- Los mensajes aparecerán aquí -->
        </ul>
      </div>
      
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" id="${messageInput}" placeholder="Escribe tu mensaje..." 
               style="flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px;"
               onkeypress="if(event.key==='Enter') document.getElementById('${sendButton}').click()">
        <button id="${sendButton}" class="btn5" style="padding: 10px 20px;">
          Enviar
        </button>
      </div>
      
      <div style="margin-top: 10px; font-size: 12px; color: #666;">
        <strong>Usuario:</strong> ${SUB_LOGGED_IN_DETAILS.Nombre || 'Usuario Anónimo'} 
        | <strong>Conectado como:</strong> ${GROUPID}
      </div>
    `;

    // Store element references
    PAGES.chat.messagesList = document.getElementById(messagesList);
    PAGES.chat.messageInput = document.getElementById(messageInput);
    PAGES.chat.sendButton = document.getElementById(sendButton);
    PAGES.chat.daySelector = document.getElementById(daySelector);
    PAGES.chat.currentDay = currentDay;

    // Set up event listeners
    PAGES.chat.sendButton.onclick = PAGES.chat.sendMessage;
    
    // Load today's messages
    PAGES.chat.loadDay();
  },

  loadDay: function() {
    var selectedDay = PAGES.chat.daySelector.value;
    PAGES.chat.currentDay = selectedDay;
    
    // Clear current messages
    PAGES.chat.messagesList.innerHTML = '<li style="text-align: center; color: #666; padding: 10px;">Cargando mensajes...</li>';
    
    // Clear any existing listeners
    if (PAGES.chat.currentListener) {
      PAGES.chat.currentListener.off();
    }
    
    // Listen for messages from the selected day
    var dayPath = `chat_${selectedDay}`;
    PAGES.chat.currentListener = gun.get(TABLE).get(dayPath).map().on((data, messageId, _msg, _ev) => {
      if (data === null) {
        // Message deleted
        PAGES.chat.removeMessage(messageId);
        return;
      }
      
      if (typeof data === "string") {
        // Encrypted message
        TS_decrypt(data, SECRET, (decryptedData) => {
          PAGES.chat.displayMessage(decryptedData, messageId);
        });
      } else {
        // Unencrypted message (shouldn't happen in production)
        PAGES.chat.displayMessage(data, messageId);
      }
    });
    
    // Add listener to cleanup
    EventListeners.GunJS.push(PAGES.chat.currentListener);
    
    // Clear loading message after a short delay
    setTimeout(() => {
      var loadingMsg = PAGES.chat.messagesList.querySelector('li');
      if (loadingMsg && loadingMsg.textContent.includes('Cargando')) {
        loadingMsg.remove();
      }
    }, 1000);
  },

  sendMessage: function() {
    var messageText = PAGES.chat.messageInput.value.trim();
    
    if (!messageText) {
      toastr.warning("Por favor escribe un mensaje");
      return;
    }
    
    if (!checkRole("chat:edit")) {
      toastr.error("No tienes permisos para escribir en el chat");
      return;
    }

    // Create message object
    var messageData = {
      text: messageText,
      author: SUB_LOGGED_IN_DETAILS.Nombre || 'Usuario Anónimo',
      authorId: SUB_LOGGED_IN_ID || 'unknown',
      timestamp: new Date().toISOString(),
      day: PAGES.chat.currentDay
    };

    // Generate unique message ID
    var messageId = safeuuid();
    
    // Encrypt and save message
    TS_encrypt(messageData, SECRET, (encrypted) => {
      var dayPath = `chat_${PAGES.chat.currentDay}`;
      betterGunPut(gun.get(TABLE).get(dayPath).get(messageId), encrypted);
      
      // Clear input
      PAGES.chat.messageInput.value = '';
      
      // Show success feedback
      toastr.success("Mensaje enviado");
    });
  },

  displayMessage: function(messageData, messageId) {
    // Check if message already exists
    var existingMessage = document.getElementById(`msg-${messageId}`);
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create message element
    var messageItem = document.createElement('li');
    messageItem.id = `msg-${messageId}`;
    messageItem.style.cssText = `
      margin-bottom: 10px; 
      padding: 10px; 
      border-radius: 8px; 
      background-color: white; 
      border-left: 4px solid #007cba;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;

    // Format timestamp
    var timestamp = new Date(messageData.timestamp);
    var timeString = timestamp.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Check if message is from current user
    var isOwnMessage = messageData.authorId === SUB_LOGGED_IN_ID;
    var messageColor = isOwnMessage ? '#e3f2fd' : 'white';
    var borderColor = isOwnMessage ? '#2196f3' : '#007cba';
    
    messageItem.style.backgroundColor = messageColor;
    messageItem.style.borderLeftColor = borderColor;

    // Create message content
    var messageContent = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
        <strong style="color: #333; font-size: 14px;">${messageData.author}</strong>
        <span style="color: #666; font-size: 12px;">${timeString}</span>
      </div>
      <div style="color: #444; line-height: 1.4;">
        ${messageData.text.replace(/\n/g, '<br>')}
      </div>
    `;

    // Add delete button for own messages or if user has admin permissions
    if (isOwnMessage || checkRole("admin")) {
      messageContent += `
        <div style="text-align: right; margin-top: 8px;">
          <button onclick="PAGES.chat.deleteMessage('${messageId}')" 
                  style="background: none; border: none; color: #f44336; 
                         cursor: pointer; font-size: 12px; padding: 2px 5px;"
                  title="Borrar mensaje">
            🗑️ Borrar
          </button>
        </div>
      `;
    }

    messageItem.innerHTML = messageContent;

    // Insert message in chronological order
    var inserted = false;
    var existingMessages = Array.from(PAGES.chat.messagesList.children);
    
    for (var i = 0; i < existingMessages.length; i++) {
      var existingMsg = existingMessages[i];
      var existingId = existingMsg.id.replace('msg-', '');
      var existingData = PAGES.chat.messageCache && PAGES.chat.messageCache[existingId];
      
      if (existingData && new Date(messageData.timestamp) < new Date(existingData.timestamp)) {
        PAGES.chat.messagesList.insertBefore(messageItem, existingMsg);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      PAGES.chat.messagesList.appendChild(messageItem);
    }

    // Cache message data for sorting
    if (!PAGES.chat.messageCache) {
      PAGES.chat.messageCache = {};
    }
    PAGES.chat.messageCache[messageId] = messageData;

    // Auto-scroll to bottom if user is viewing current day
    var today = new Date().toISOString().split('T')[0];
    if (PAGES.chat.currentDay === today) {
      var chatContainer = document.getElementById('chat-container');
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  },

  removeMessage: function(messageId) {
    var messageElement = document.getElementById(`msg-${messageId}`);
    if (messageElement) {
      messageElement.remove();
    }
    
    // Remove from cache
    if (PAGES.chat.messageCache) {
      delete PAGES.chat.messageCache[messageId];
    }
  },

  deleteMessage: function(messageId) {
    if (confirm("¿Estás seguro de que quieres borrar este mensaje?")) {
      var dayPath = `chat_${PAGES.chat.currentDay}`;
      betterGunPut(gun.get(TABLE).get(dayPath).get(messageId), null);
      toastr.success("Mensaje borrado");
    }
  },

  // Cleanup when leaving the page
  cleanup: function() {
    if (PAGES.chat.currentListener) {
      PAGES.chat.currentListener.off();
    }
    PAGES.chat.messageCache = {};
  }
};

// Add cleanup to the global page change handler
(function() {
  var originalOpenPage = open_page;
  open_page = function(params) {
    // Cleanup chat if we're leaving it
    if (PAGES.chat && PAGES.chat.cleanup) {
      PAGES.chat.cleanup();
    }
    return originalOpenPage(params);
  };
})();