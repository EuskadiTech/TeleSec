PERMS["chat"] = "Chat"
PERMS["chat:edit"] = "&gt; Escribir"

// Global chat notification system
PAGES.chat_notifications = {
  listener: null,
  Esconder: true,
  lastMessageTime: null, // Start with null to allow all messages initially
  isActive: false,
  
  init: function() {
    console.log("Initializing chat notifications...");
    console.log("isActive:", this.isActive);
    console.log("checkRole available:", typeof checkRole);
    console.log("checkRole('chat'):", typeof checkRole === 'function' ? checkRole("chat") : "function not available");
    
    if (this.isActive) {
      console.log("Chat notifications already active");
      return;
    }
    
    // Check if user has chat permissions (with fallback)
    if (typeof checkRole === 'function' && !checkRole("chat")) {
      console.log("No chat permissions");
      return;
    }
    
    this.isActive = true;
    console.log("Starting chat notifications listener");
    
    var today = new Date().toISOString().split('T')[0];
    var dayPath = `chat_${today}`;
    
    console.log("Listening for notifications on:", dayPath);
    console.log("TABLE:", TABLE);
    
    // Set initial timestamp to current time to only notify for new messages from now on
    if (!this.lastMessageTime) {
      this.lastMessageTime = new Date().toISOString();
      console.log("Set initial lastMessageTime:", this.lastMessageTime);
    }
    
    // Listen for new messages on today's chat
    this.listener = gun.get(TABLE).get(dayPath).map().on((data, messageId, _msg, _ev) => {
      console.log("Notification listener received data:", data, "messageId:", messageId);
      
      if (data === null) return; // Ignore deletions
      
      if (typeof data === "string") {
        // Encrypted message
        console.log("Decrypting notification message...");
        TS_decrypt(data, SECRET, (decryptedData) => {
          console.log("Decrypted notification data:", decryptedData);
          this.handleNewMessage(decryptedData, messageId);
        });
      } else {
        // Unencrypted message
        console.log("Processing unencrypted notification:", data);
        this.handleNewMessage(data, messageId);
      }
    });
    
    // Add to cleanup listeners
    EventListeners.GunJS.push(this.listener);
    console.log("Chat notifications initialized successfully");
  },
  
  handleNewMessage: function(messageData, messageId) {
    console.log("Handling new message for notification:", messageData);
    console.log("Current lastMessageTime:", this.lastMessageTime);
    console.log("Message timestamp:", messageData.timestamp);
    console.log("Message authorId:", messageData.authorId);
    console.log("Current user ID:", SUB_LOGGED_IN_ID);
    
    // Don't notify for our own messages
    if (messageData.authorId === SUB_LOGGED_IN_ID) {
      console.log("Skipping notification - own message");
      return;
    }
    
    // Don't notify for old messages (only if we have a baseline)
    if (this.lastMessageTime && messageData.timestamp && messageData.timestamp <= this.lastMessageTime) {
      console.log("Skipping notification - old message");
      return;
    }
    
    // Don't notify if user is currently viewing the chat page
    var currentHash = location.hash.replace("#", "");
    console.log("Current page hash:", currentHash);
    if (currentHash === 'chat') {
      console.log("Skipping notification - user viewing chat");
      return;
    }
    
    // Update last message time
    if (messageData.timestamp) {
      this.lastMessageTime = messageData.timestamp;
      console.log("Updated lastMessageTime to:", this.lastMessageTime);
    }
    
    // Show notification
    var author = messageData.author || 'Usuario Anónimo';
    var preview = messageData.text.length > 50 ? 
      messageData.text.substring(0, 50) + '...' : 
      messageData.text;
    
    console.log("Showing notification for:", author, "-", preview);
    console.log("Testing toastr availability:", typeof toastr);
    
    // Test notification to verify toastr works
    console.log("Attempting to show notification...");
    
    toastr.info(
      `<strong>${author}:</strong><br>${preview}`,
      '💬 Nuevo mensaje en Chat',
      {
        onclick: function() {
          console.log("Notification clicked, navigating to chat");
          setUrlHash('chat');
        },
        timeOut: 8000,
        extendedTimeOut: 2000,
        closeButton: true,
        progressBar: true,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        newestOnTop: true,
        escapeHtml: false
      }
    );
    
    console.log("Notification call completed");
  },
  
  destroy: function() {
    if (this.listener) {
      this.listener.off();
    }
    this.isActive = false;
  },
  
  // Test function to manually trigger a notification
  testNotification: function() {
    console.log("Testing notification manually...");
    console.log("toastr available:", typeof toastr);
    
    toastr.success("¡Funciona! Esta es una notificación de prueba.", "Test de Notificación", {
      timeOut: 5000,
      closeButton: true,
      progressBar: true,
      positionClass: 'toast-top-right'
    });
  }
};

PAGES.chat = {
  navcss: "btn4",
  icon: "static/appico/Chat.svg",
  AccessControl: true,
  Title: "Chat",
  index: function() {
    console.log("Chat index function called");
    console.log("SUB_LOGGED_IN:", SUB_LOGGED_IN);
    console.log("checkRole function exists:", typeof checkRole);
    
    if (!checkRole("chat")) {
      console.log("No chat permission, redirecting to index");
      setUrlHash("index");
      return;
    }
    
    console.log("Chat permission granted, initializing chat");
    
    // Stop global notifications when viewing chat
    PAGES.chat_notifications.destroy();
    
    var messagesList = safeuuid();
    var messageInput = safeuuid();
    var sendButton = safeuuid();
    var daySelector = safeuuid();
    var currentDay = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log("Creating chat UI with currentDay:", currentDay);
    
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
    
    console.log("Loading chat for day:", selectedDay);
    console.log("TABLE:", TABLE);
    console.log("SECRET:", SECRET ? "SET" : "NOT SET");
    
    // Clear current messages
    PAGES.chat.messagesList.innerHTML = '<li style="text-align: center; color: #666; padding: 10px;">Cargando mensajes...</li>';
    
    // Clear any existing listeners
    if (PAGES.chat.currentListener) {
      PAGES.chat.currentListener.off();
    }
    
    // Listen for messages from the selected day
    var dayPath = `chat_${selectedDay}`;
    console.log("Listening on path:", dayPath);
    
    PAGES.chat.currentListener = gun.get(TABLE).get(dayPath).map().on((data, messageId, _msg, _ev) => {
      console.log("Received chat data:", data, "messageId:", messageId);
      
      if (data === null) {
        // Message deleted
        PAGES.chat.removeMessage(messageId);
        return;
      }
      
      if (typeof data === "string") {
        // Encrypted message
        console.log("Decrypting message...");
        TS_decrypt(data, SECRET, (decryptedData) => {
          console.log("Decrypted data:", decryptedData);
          PAGES.chat.displayMessage(decryptedData, messageId);
        });
      } else {
        // Unencrypted message (shouldn't happen in production)
        console.log("Displaying unencrypted message:", data);
        PAGES.chat.displayMessage(data, messageId);
      }
    });
    
    // Add listener to cleanup
    EventListeners.GunJS.push(PAGES.chat.currentListener);
    
    // Clear loading message after a short delay
    setTimeout(() => {
      var loadingMsg = PAGES.chat.messagesList.querySelector('li');
      if (loadingMsg && loadingMsg.textContent.includes('Cargando')) {
        console.log("Clearing loading message");
        loadingMsg.remove();
      }
    }, 1000);
  },

  sendMessage: function() {
    var messageText = PAGES.chat.messageInput.value.trim();
    
    console.log("Sending message:", messageText);
    console.log("User details:", SUB_LOGGED_IN_DETAILS);
    console.log("User ID:", SUB_LOGGED_IN_ID);
    
    if (!messageText) {
      toastr.warning("Por favor escribe un mensaje");
      return;
    }
    
    if (!checkRole("chat:edit")) {
      toastr.error("No tienes permisos para escribir en el chat");
      console.log("Permission denied for chat:edit");
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

    console.log("Message data:", messageData);

    // Generate unique message ID
    var messageId = safeuuid();
    console.log("Generated message ID:", messageId);
    
    // Encrypt and save message
    TS_encrypt(messageData, SECRET, (encrypted) => {
      var dayPath = `chat_${PAGES.chat.currentDay}`;
      console.log("Saving to path:", dayPath);
      console.log("Encrypted data:", encrypted);
      
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
    
    // Restart global notifications when leaving chat
    setTimeout(() => {
      PAGES.chat_notifications.init();
    }, 1000);
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

// Initialize global chat notifications when user is logged in
(function() {
  function initChatNotifications() {
    console.log("Attempting to initialize chat notifications...");
    console.log("SUB_LOGGED_IN:", SUB_LOGGED_IN);
    console.log("checkRole available:", typeof checkRole);
    
    // More robust check for login status and permissions
    if (SUB_LOGGED_IN === true) {
      console.log("User is logged in, checking permissions...");
      if (typeof checkRole === 'function') {
        var hasPermission = checkRole("chat");
        console.log("User has chat permission:", hasPermission);
        if (hasPermission) {
          setTimeout(() => {
            console.log("Calling PAGES.chat_notifications.init()");
            PAGES.chat_notifications.init();
          }, 2000);
        }
      } else {
        // Fallback if checkRole is not available yet
        console.log("checkRole not available, trying to initialize anyway...");
        setTimeout(() => {
          PAGES.chat_notifications.init();
        }, 3000);
      }
    }
  }
  
  // Try to initialize immediately if already logged in
  console.log("Initial check for chat notifications...");
  if (typeof SUB_LOGGED_IN !== 'undefined') {
    initChatNotifications();
  }
  
  // Also listen for login events by checking periodically
  var initInterval = setInterval(() => {
    if (SUB_LOGGED_IN === true && !PAGES.chat_notifications.isActive) {
      console.log("Periodic check - attempting notification init");
      initChatNotifications();
    }
    
    // Stop checking after user is logged in and notifications are active
    if (SUB_LOGGED_IN === true && PAGES.chat_notifications.isActive) {
      console.log("Notifications active, stopping periodic checks");
      clearInterval(initInterval);
    }
  }, 3000);
  
  // Also try to initialize when page loads
  setTimeout(() => {
    if (!PAGES.chat_notifications.isActive) {
      console.log("Final attempt to initialize notifications");
      initChatNotifications();
    }
  }, 10000);
})();