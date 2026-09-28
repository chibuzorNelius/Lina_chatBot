/**
 * Lina Assistant - Core Frontend Architecture
 * Pure Vanilla JavaScript implementation of responsive layout, 
 * interactive message states, markdown syntax, and simulated stream processing.
 */
/*=================word searshing
await
=========
*/

(function () {
  'use strict';

  // DOM Elements
  const appShell = document.querySelector('.app-shell');
  const leftSidebar = document.getElementById('leftSidebar');
  const rightSidebar = document.getElementById('rightSidebar');
  const mainPanel = document.getElementById('mainPanel');
  const topbar = document.querySelector('.topbar');
  const chatTitle = document.getElementById('chatTitle');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const messagesContainer = document.getElementById('messagesContainer');
  const messagesList = document.getElementById('messages');
  const scrollToBottomBtn = document.getElementById('scrollToBottom');
  const scrollBadge = document.getElementById('scrollBadge');

  // Composer Elements
  const composer = document.getElementById('composer');
  const textarea = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const stopBtn = document.getElementById('stopBtn');
  const fileInput = document.getElementById('fileInput');
  const imageInput = document.getElementById('imageInput');
  const uploadFileBtn = document.getElementById('uploadFileBtn');
  const uploadImageBtn = document.getElementById('uploadImageBtn');
  const attachmentShelf = document.getElementById('attachmentShelf');

  // Indicators
  const thinkingIndicator = document.getElementById('thinkingIndicator');
  const toggleThinking = document.getElementById('toggleThinking');
  const thinkingDetails = document.getElementById('thinkingDetails');
  const typingIndicator = document.getElementById('typingIndicator');

  // Voice Simulation
  const voiceMsgBtn = document.getElementById('voiceMsgBtn');
  const voiceCallBtn = document.getElementById('voiceCallBtn');
  const voiceOverlay = document.getElementById('voiceOverlay');
  const voiceCancelBtn = document.getElementById('voiceCancelBtn');
  const voiceDoneBtn = document.getElementById('voiceDoneBtn');
  const voiceTimer = document.querySelector('.voice-timer');

  // Drag & Drop
  const dragDropOverlay = document.getElementById('dragDropOverlay');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  // Application State variables
  let isGenerating = false;
  let currentAbortController = null;
  let logsTimeout1 = null;
  let logsTimeout2 = null;
  let attachedFiles = [];
  let unreadMessagesCount = 0;
  let lastUserMessageText = '';
  let messageCount = 0;
  let voiceTimerInterval = null;
  let voiceTimerSeconds = 0;

  // Mock bot replies for stand-alone execution ==mockReplies
  const offlineRelpy = 
    "sorry, Lina Agent is not responding,\n please comfirm your internet connection and try again. \n   OR it can be that our API is not yet responding, \n if that is the case, please arlat Nelius to fix the problem  " 
  ;

  /* ==========================================================================
     Layout & Navigation Event Listeners
     ========================================================================== */

  // Desktop/Mobile sidebar collapsing (uses Event Delegation for collapse-btn)
  document.querySelectorAll('.collapse-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetElement = document.getElementById(targetId);

      if (window.innerWidth <= 680) {
        // Mobile behavior: slides open/closed drawer
        targetElement.classList.toggle('is-open');
        sidebarBackdrop.classList.toggle('active', targetElement.classList.contains('is-open'));
      } else {
        // Desktop behavior: collapses width smoothly
        targetElement.classList.toggle('is-collapsed');
      }
    });
  });

  // Topbar hamburger toggle for left sidebar (mobile drawer trigger)
  document.getElementById('toggleLeft').addEventListener('click', () => {
    leftSidebar.classList.toggle('is-open');
    sidebarBackdrop.classList.add('active');
  });

  // Topbar workspace toggler for right sidebar
  document.getElementById('toggleRight').addEventListener('click', () => {
    if (window.innerWidth <= 880) {
      rightSidebar.classList.toggle('is-open');
      sidebarBackdrop.classList.toggle('active', rightSidebar.classList.contains('is-open'));
    } else {
      rightSidebar.classList.toggle('is-collapsed');
    }
  });

  // Backdrop clicks (close drawers on mobile)
  sidebarBackdrop.addEventListener('click', () => {
    leftSidebar.classList.remove('is-open');
    rightSidebar.classList.remove('is-open');
    sidebarBackdrop.classList.remove('active');
    closeVoiceOverlay();
  });

  // Thinking process header toggles collapsibility
  toggleThinking.addEventListener('click', () => {
    thinkingIndicator.classList.toggle('is-collapsed');
  });

  /* ==========================================================================
     Composer Auto-Growing & Inputs Management
     ========================================================================== */

  function autoGrow() {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  textarea.addEventListener('input', autoGrow);

  // Submit actions
  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    handleMessageSubmission();
  });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSubmission();
    }
  });

  /* ==========================================================================
     Drag & Drop System
     ========================================================================== */

  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      dragDropOverlay.classList.add('active');
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      dragDropOverlay.classList.remove('active');
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dragDropOverlay.classList.remove('active');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  });

  // Standard upload click handlers
  uploadFileBtn.addEventListener('click', () => fileInput.click());
  uploadImageBtn.addEventListener('click', () => imageInput.click());

  fileInput.addEventListener('change', () => {
    handleFilesAdded(fileInput.files);
    fileInput.value = '';
  });

  imageInput.addEventListener('change', () => {
    handleFilesAdded(imageInput.files);
    imageInput.value = '';
  });

  function handleFilesAdded(fileList) {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Avoid duplicate file objects
      if (attachedFiles.some(f => f.name === file.name && f.size === file.size)) continue;

      attachedFiles.push(file);
      renderAttachmentChip(file);
    }
    textarea.focus();
  }

  function renderAttachmentChip(file) {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';

    // Check if it's an image to show preview thumbnail
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      chip.appendChild(img);
    } else {
      const icon = document.createElement('i');
      icon.className = 'fa-regular fa-file-lines';
      chip.appendChild(icon);
    }

    const nameText = document.createElement('span');
    nameText.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
    chip.appendChild(nameText);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'attachment-remove';
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    removeBtn.addEventListener('click', () => {
      attachedFiles = attachedFiles.filter(f => f !== file);
      chip.remove();
    });

    chip.appendChild(removeBtn);
    attachmentShelf.appendChild(chip);
  }

  function clearAttachments() {
    attachedFiles = [];
    attachmentShelf.innerHTML = '';
  }

  /* ==========================================================================
     Voice Recording Simulators
     ========================================================================== */

  function startVoiceRecording() {
    voiceOverlay.classList.add('active');
    voiceTimerSeconds = 0;
    voiceTimer.textContent = '00:00';
    voiceTimerInterval = setInterval(() => {
      voiceTimerSeconds++;
      const mins = Math.floor(voiceTimerSeconds / 60).toString().padStart(2, '0');
      const secs = (voiceTimerSeconds % 60).toString().padStart(2, '0');
      voiceTimer.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  function closeVoiceOverlay() {
    voiceOverlay.classList.remove('active');
    if (voiceTimerInterval) {
      clearInterval(voiceTimerInterval);
      voiceTimerInterval = null;
    }
  }

  voiceMsgBtn.addEventListener('click', startVoiceRecording);
  voiceCallBtn.addEventListener('click', startVoiceRecording);

  voiceCancelBtn.addEventListener('click', closeVoiceOverlay);

  voiceDoneBtn.addEventListener('click', () => {
    closeVoiceOverlay();
    textarea.value = `[Transcribed Audio: Can you draft a quick summary of the workspace calendar sync tasks?]`;
    autoGrow();
    textarea.focus();
  });

  /* ==========================================================================
     Markdown Parser Utility
     ========================================================================== */

  // Global function for code block copies (hooked to onclicks inside markup)
  window.copyCodeText = function (btn) {
    const container = btn.closest('.code-block-container');
    const code = container.querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => {
        btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy code';
      }, 2000);
    });
  };

  function parseMarkdown(text) {
    // 1. Sanitize HTML tags to prevent XSS
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Handle unclosed code blocks during streaming
    const backtickCount = (html.match(/```/g) || []).length;
    if (backtickCount % 2 !== 0) {
      html += '\n```';
    }

    // 2. Code Blocks: ```lang\ncode```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    html = html.replace(codeBlockRegex, (match, lang, code) => {
      const language = lang || 'code';
      const cleanCode = code.trim();
      return `
        <div class="code-block-container">
          <div class="code-block-header">
            <span>${language}</span>
            <button class="code-copy-btn" onclick="window.copyCodeText(this)" type="button">
              <i class="fa-regular fa-copy"></i> Copy code
            </button>
          </div>
          <pre><code class="language-${language}">${cleanCode}</code></pre>
        </div>
      `;
    });

    // 3. Inline Code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 4. Bold: **text**
    const boldCount = (html.match(/\*\*/g) || []).length;
    if (boldCount % 2 !== 0) {
      html += '**';
    }
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');

    // 5. Italic: *text*
    html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');

    // 6. Block elements (paragraphs, lists, headings)
    const blocks = html.split(/(<div class="code-block-container">[\s\S]*?<\/div>)/);

    html = blocks.map(block => {
      if (block.startsWith('<div class="code-block-container">')) return block;

      const lines = block.split('\n');
      const result = [];
      let currentParagraph = [];
      let currentList = [];
      let listType = null; // 'ul' or 'ol'

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          result.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
      };

      const flushList = () => {
        if (currentList.length > 0) {
          result.push(`<${listType}>${currentList.join('')}</${listType}>`);
          currentList = [];
          listType = null;
        }
      };

      lines.forEach(line => {
        const trimmed = line.trim();

        if (!trimmed) {
          flushParagraph();
          flushList();
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          flushParagraph();
          if (listType && listType !== 'ul') flushList();
          listType = 'ul';
          currentList.push(`<li>${trimmed.substring(2).trim()}</li>`);
        } else if (/^\d+\.\s/.test(trimmed)) {
          flushParagraph();
          if (listType && listType !== 'ol') flushList();
          listType = 'ol';
          const dotPos = trimmed.indexOf('.');
          currentList.push(`<li>${trimmed.substring(dotPos + 1).trim()}</li>`);
        } else if (trimmed.startsWith('#')) {
          flushParagraph();
          flushList();
          const level = Math.min(trimmed.match(/^#+/)[0].length, 6);
          const headingText = trimmed.replace(/^#+\s*/, '');
          result.push(`<h${level}>${headingText}</h${level}>`);
        } else {
          flushList();
          currentParagraph.push(line);
        }
      });

      flushParagraph();
      flushList();
      return result.join('\n');
    }).join('\n');

    return html;
  }

  /* ==========================================================================
     Message Actions (Copy, Edit, Delete, Regenerate)
     ========================================================================== */

  // Event Delegation for action clicks inside message container
  messagesList.addEventListener('click', (e) => {
    const btn = e.target.closest('.bubble-action-btn');
    if (!btn) return;

    const row = btn.closest('.message-row');
    const action = btn.dataset.action;

    if (action === 'copy') {
      copyMessageText(row, btn);
    } else if (action === 'delete') {
      deleteMessageRow(row);
    } else if (action === 'edit') {
      enterEditMode(row);
    } else if (action === 'regenerate') {
      triggerRegeneration();
    }
  });

  function copyMessageText(row, btn) {
    const bubble = row.querySelector('.message-bubble');
    // If there is code in container, grab pre innerText, otherwise textContent
    const textToCopy = bubble.innerText || bubble.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const origHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--color-success);"></i>';
      setTimeout(() => {
        btn.innerHTML = origHTML;
      }, 1500);
    });
  }

  function deleteMessageRow(row) {
    // Add smooth scale fade animation
    row.style.transition = 'all 0.2s ease-out';
    row.style.transform = 'scale(0.95)';
    row.style.opacity = '0';
    setTimeout(() => {
      row.remove();
      // If there are no messages left, toggle welcome screen back on
      if (messagesList.children.length === 0) {
        welcomeScreen.classList.remove('is-hidden');
      }
    }, 200);
  }

  function enterEditMode(row) {
    const bubble = row.querySelector('.message-bubble');
    const bubbleWrapper = row.querySelector('.message-bubble-wrapper');
    const originalText = bubble.dataset.originalText || bubble.innerText;

    // Hide actions overlay while editing
    const actions = row.querySelector('.message-actions');
    actions.style.opacity = '0';
    actions.style.pointerEvents = 'none';

    // Create inline editor
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-message-container';

    const editorTextarea = document.createElement('textarea');
    editorTextarea.className = 'edit-message-textarea';
    editorTextarea.value = originalText;
    editorTextarea.rows = 2;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'edit-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-btn edit-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.type = 'button';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-btn edit-save';
    saveBtn.textContent = 'Save & Submit';
    saveBtn.type = 'button';

    actionsDiv.appendChild(cancelBtn);
    actionsDiv.appendChild(saveBtn);
    editContainer.appendChild(editorTextarea);
    editContainer.appendChild(actionsDiv);

    // Save previous bubble state
    const previousContent = bubble.innerHTML;
    bubble.innerHTML = '';
    bubble.appendChild(editContainer);
    editorTextarea.focus();

    // Cancel edit
    cancelBtn.addEventListener('click', () => {
      bubble.innerHTML = previousContent;
      actions.style.opacity = '';
      actions.style.pointerEvents = '';
    });

    // Save edit & regenerate bot response
    saveBtn.addEventListener('click', () => {
      const updatedValue = editorTextarea.value.trim();
      if (!updatedValue) return;

      bubble.innerHTML = '';
      bubble.textContent = updatedValue;
      bubble.dataset.originalText = updatedValue;

      actions.style.opacity = '';
      actions.style.pointerEvents = '';

      // Delete subsequent bot response if it exists
      const nextSibling = row.nextElementSibling;
      if (nextSibling && nextSibling.classList.contains('bot-row')) {
        nextSibling.remove();
      }

      // Trigger bot reply regeneration based on edited text
      lastUserMessageText = updatedValue;
      triggerBotResponse(updatedValue);
    });
  }

  /* ==========================================================================
     Scroll Controls & Floater Bottom Button
     ========================================================================== */

  // Monitor scrolling to hide/show scroll to bottom button
  messagesContainer.addEventListener('scroll', () => {
    const threshold = 120; // px from bottom
    const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight - messagesContainer.scrollTop;

    if (distanceFromBottom > threshold) {
      scrollToBottomBtn.classList.add('visible');
    } else {
      scrollToBottomBtn.classList.remove('visible');
      unreadMessagesCount = 0;
      scrollBadge.style.display = 'none';
    }
  });

  // Action scroll to bottom
  scrollToBottomBtn.addEventListener('click', () => {
    scrollMessagesToBottom(true);
  });

  function scrollMessagesToBottom(force = false) {
    const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight - messagesContainer.scrollTop;
    // Auto scroll if user is close to bottom, or if force is true
    if (force || distanceFromBottom < 160) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      unreadMessagesCount = 0;
      scrollBadge.style.display = 'none';
    }
  }

  /* ==========================================================================
     Message Injection, Backend Integration, and Stream Visualizer
     ========================================================================== */

  function appendMessage(text, sender) {
    messageCount++;
    const rowId = `msg-${messageCount}`;

    const row = document.createElement('div');
    row.className = `message-row ${sender === 'user' ? 'user-row' : 'bot-row'}`;
    row.dataset.id = rowId;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? 'U' : 'L';

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = 'message-bubble-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (sender === 'user') {
      bubble.textContent = text;
      bubble.dataset.originalText = text; // Cache for edit recovery
    } else {
      // Bot message parsed from markdown
      bubble.innerHTML = parseMarkdown(text);
    }

    bubbleWrapper.appendChild(bubble);

    // Create Action Buttons overlay
    const actionsOverlay = document.createElement('div');
    actionsOverlay.className = 'message-actions';

    let actionButtonsHTML = '';
    if (sender === 'user') {
      actionButtonsHTML = `
        <button class="bubble-action-btn" data-action="edit" title="Edit Message"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="bubble-action-btn btn-delete" data-action="delete" title="Delete Message"><i class="fa-regular fa-trash-can"></i></button>
        <button class="bubble-action-btn" data-action="copy" title="Copy Message"><i class="fa-regular fa-copy"></i></button>
      `;
    } else {
      actionButtonsHTML = `
        <button class="bubble-action-btn" data-action="regenerate" title="Regenerate Response"><i class="fa-solid fa-rotate-right"></i></button>
        <button class="bubble-action-btn" data-action="copy" title="Copy Message"><i class="fa-regular fa-copy"></i></button>
      `;
    }

    actionsOverlay.innerHTML = actionButtonsHTML;
    bubbleWrapper.appendChild(actionsOverlay);

    row.appendChild(avatar);
    row.appendChild(bubbleWrapper);
    messagesList.appendChild(row);

    // If user is scrolled up and bot replies, increment badge count
    if (sender === 'bot') {
      const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight - messagesContainer.scrollTop;
      if (distanceFromBottom > 160) {
        unreadMessagesCount++;
        scrollBadge.textContent = unreadMessagesCount;
        scrollBadge.style.display = 'block';
      }
    }

    scrollMessagesToBottom(sender === 'user'); // Force scroll down for user messages
    return bubble;
  }

   function handleMessageSubmission() {
    if (isGenerating) return;

    let text = textarea.value.trim();
    if (!text && attachedFiles.length === 0) return;

    // Build full text with attachment names if files were dragged/attached
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(f => `\`${f.name}\``).join(', ');
      text = text ? `${text}\n\n*[Attached files: ${fileNames}]*` : `*[Attached files: ${fileNames}]*`;
    }

    // Toggle welcome screen visibility
    if (messagesList.children.length === 0) {
      welcomeScreen.classList.add('is-hidden');
    }

    appendMessage(text, 'user');
    lastUserMessageText = text;

    // Reset Composer
    textarea.value = '';
    autoGrow();
    clearAttachments();

    // Trigger reply sequence
    // TODO : replace this with a real Ai responds
    triggerBotResponse(text);//to be replaced
    // =================
  }
  function clearThinkingTimeouts() {
    if (logsTimeout1) clearTimeout(logsTimeout1);
    if (logsTimeout2) clearTimeout(logsTimeout2);
    logsTimeout1 = null;
    logsTimeout2 = null;
  }

  async function triggerBotResponse(userText) {
    if (isGenerating) stopGeneratingResponse();

    isGenerating = true;
    currentAbortController = new AbortController();
    sendBtn.style.display = 'none';
    stopBtn.style.display = 'flex';

    // Show Indicators immediately
    typingIndicator.style.display = 'inline-flex';
    thinkingIndicator.style.display = 'block';
    thinkingIndicator.classList.remove('is-collapsed');
    thinkingDetails.textContent = 'Lina is thinking...';
    scrollMessagesToBottom();

    // 1. Parallel Simulated Thinking Logs (does not delay fetch!)
    clearThinkingTimeouts();
    logsTimeout1 = setTimeout(() => {
      if (isGenerating && thinkingIndicator.style.display !== 'none') {
        thinkingDetails.textContent += '\nAnalyzing query context and planning response...';
        scrollMessagesToBottom();
      }
    }, 600);

    logsTimeout2 = setTimeout(() => {
      if (isGenerating && thinkingIndicator.style.display !== 'none') {
        thinkingDetails.textContent += '\nConsulting model parameters...';
        scrollMessagesToBottom();
      }
    }, 1200);

    // 2. Fetch the stream from the backend immediately
    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
        signal: currentAbortController.signal
      });

      if (!response.ok) {
        throw new Error('API inactive');
      }

      // Read from stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = '';
      let bubble = null;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulatedText += chunk;

          // On first text chunk: hide loaders and create the bubble
          if (!bubble) {
            typingIndicator.style.display = 'none';
            thinkingIndicator.style.display = 'none';
            clearThinkingTimeouts();
            bubble = appendMessage('', 'bot');
          }

          bubble.innerHTML = parseMarkdown(accumulatedText);
          scrollMessagesToBottom();
        }
      }

      completeGeneration();

    } catch (error) {
      if (error.name === 'AbortError') {
        // User aborted the stream manually
        return;
      }
      
      // Handle connection or server errors
      typingIndicator.style.display = 'none';
      thinkingIndicator.style.display = 'none';
      clearThinkingTimeouts();
      
      appendMessage(offlineRelpy, 'bot');
      completeGeneration();
    }
  }

  function stopGeneratingResponse() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    completeGeneration();
  }

  function completeGeneration() {
    isGenerating = false;
    currentAbortController = null;
    clearThinkingTimeouts();
    stopBtn.style.display = 'none';
    sendBtn.style.display = 'flex';
    typingIndicator.style.display = 'none';
    thinkingIndicator.style.display = 'none';
    textarea.focus();
  }

  function triggerRegeneration() {
    if (messagesList.children.length === 0 || !lastUserMessageText) return;

    // Remove last bot message if it's the very last element
    const lastRow = messagesList.lastElementChild;
    if (lastRow && lastRow.classList.contains('bot-row')) {
      lastRow.remove();
    }

    triggerBotResponse(lastUserMessageText);
  }

  stopBtn.addEventListener('click', stopGeneratingResponse);

  /* ==========================================================================
     Suggestions Click Handling
     ========================================================================== */

  document.querySelectorAll('.suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.message;
      textarea.value = msg;
      autoGrow();
      handleMessageSubmission();
    });
  });

  // Action for the 'New chat' button
  document.getElementById('newChatBtn').addEventListener('click', () => {
    if (isGenerating) stopGeneratingResponse();
    messagesList.innerHTML = '';
    welcomeScreen.classList.remove('is-hidden');
    clearAttachments();
    unreadMessagesCount = 0;
    scrollBadge.style.display = 'none';
    scrollToBottomBtn.classList.remove('visible');
    chatTitle.textContent = 'New chat';
    textarea.value = '';
    autoGrow();
  });

  // Init checks
  autoGrow();

})();


