// ColabBot - Flagship AI Canvas Companion & Workflow Tutor for ComfyUI
// Designed following Apple Human Interface Guidelines (macOS Sequoia & VisionOS frosted glass)

import { app } from "../../scripts/app.js";

const DEFAULT_SYSTEM_PROMPT = `You are ColabBot, a warm and helpful AI creative companion embedded directly inside the ComfyUI canvas tab.
You communicate in clear, natural, and complete sentences following Apple Human Interface Guidelines (zero staccato fragments).
You can inspect the user's active canvas graph, including node IDs, widget values, model loader filenames, prompt text, and group titles.
Help the user troubleshoot red error nodes, disconnected wiring, prompt structuring with reference tags like <Picture 1>, and sampling parameters.
Keep all explanations encouraging, concise, and easy to understand.`;

app.registerExtension({
    name: "ColabBot.CanvasCompanion",
    async setup() {
        console.log("⚡ ColabBot Canvas Companion initializing...");

        // Inject Stylesheet
        const style = document.createElement("style");
        style.textContent = `
            .colabbot-glass {
                background: rgba(18, 18, 24, 0.82) !important;
                backdrop-filter: blur(28px) saturate(190%) !important;
                -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
                border: 1px solid rgba(255, 255, 255, 0.14) !important;
                box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif !important;
                color: #F5F5F7 !important;
            }
            .colabbot-pill-btn {
                position: fixed;
                bottom: 24px;
                right: 24px;
                height: 42px;
                padding: 0 18px;
                border-radius: 9999px;
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                z-index: 10000;
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
                user-select: none;
            }
            .colabbot-pill-btn:hover {
                transform: scale(1.03);
                box-shadow: 0 20px 40px rgba(0, 122, 255, 0.35);
            }
            .colabbot-pill-btn:active {
                transform: scale(0.97);
            }
            .colabbot-panel {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 420px;
                max-width: calc(100vw - 48px);
                height: 600px;
                max-height: calc(100vh - 48px);
                border-radius: 22px;
                display: none;
                flex-direction: column;
                z-index: 10001;
                overflow: hidden;
                transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .colabbot-panel.active {
                display: flex;
            }
            .colabbot-header {
                padding: 14px 18px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(255, 255, 255, 0.04);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                cursor: move;
            }
            .colabbot-action-btn {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #FFFFFF;
                border-radius: 8px;
                padding: 4px 10px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.15s, transform 0.1s;
            }
            .colabbot-action-btn:hover {
                background: rgba(255, 255, 255, 0.18);
            }
            .colabbot-action-btn:active {
                transform: scale(0.96);
            }
            .colabbot-badge-blue {
                background: rgba(0, 122, 255, 0.2);
                border: 1px solid rgba(0, 122, 255, 0.4);
                color: #60A5FA;
                padding: 2px 7px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
            }
            .colabbot-badge-orange {
                background: rgba(255, 149, 0, 0.2);
                border: 1px solid rgba(255, 149, 0, 0.4);
                color: #FBBF24;
                padding: 2px 7px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
            }
            .colabbot-badge-red {
                background: rgba(255, 59, 48, 0.2);
                border: 1px solid rgba(255, 59, 48, 0.4);
                color: #F87171;
                padding: 2px 7px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
            }
            .colabbot-chat-stream {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                font-size: 13.5px;
                line-height: 1.5;
            }
            .colabbot-bubble-ai {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 14px;
                padding: 12px 14px;
                color: #E2E8F0;
            }
            .colabbot-bubble-user {
                background: #007AFF;
                border-radius: 14px;
                padding: 10px 14px;
                color: #FFFFFF;
                align-self: flex-end;
                max-width: 85%;
            }
            .colabbot-input-box {
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.03);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .colabbot-textarea {
                width: 100%;
                background: rgba(0, 0, 0, 0.35);
                border: 1px solid rgba(255, 255, 255, 0.14);
                border-radius: 10px;
                padding: 10px 12px;
                color: #FFFFFF;
                font-size: 13px;
                resize: none;
                height: 48px;
                outline: none;
                font-family: inherit;
            }
            .colabbot-textarea:focus {
                border-color: #007AFF;
            }
        `;
        document.head.appendChild(style);

        // Build Collapsed Pill Button
        const pillBtn = document.createElement("div");
        pillBtn.id = "colabbot-floating-pill";
        pillBtn.className = "colabbot-glass colabbot-pill-btn";
        pillBtn.innerHTML = `
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#34C759; box-shadow:0 0 8px #34C759;"></span>
            <span style="font-weight:600; font-size:13px; letter-spacing:-0.2px;">⚡ ColabBot</span>
        `;
        document.body.appendChild(pillBtn);

        // Build Main Expanded Panel
        const panel = document.createElement("div");
        panel.id = "colabbot-main-panel";
        panel.className = "colabbot-glass colabbot-panel";
        panel.innerHTML = `
            <div class="colabbot-header" id="colabbot-drag-handle">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:16px;">⚡</span>
                    <strong style="font-size:14px; font-weight:600; color:#FFFFFF;">ColabBot Canvas Companion</strong>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <button id="colabbot-scan-btn" class="colabbot-action-btn" title="Scan live canvas for errors">🩺 Scan</button>
                    <button id="colabbot-key-btn" class="colabbot-action-btn" title="Configure Gemini API Key">⚙️ Key</button>
                    <button id="colabbot-minimize-btn" class="colabbot-action-btn" title="Minimize">—</button>
                </div>
            </div>
            
            <div id="colabbot-stream" class="colabbot-chat-stream">
                <div class="colabbot-bubble-ai">
                    👋 <b>Welcome to ColabBot!</b><br>
                    I am your in-canvas assistant. You can click <b>🩺 Scan</b> at any time to inspect your workflow nodes, check for missing connections, or ask me any question below.
                </div>
            </div>

            <div class="colabbot-input-box">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#94A3B8;">
                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                        <input type="checkbox" id="colabbot-attach-graph" checked style="cursor:pointer; accent-color:#007AFF;">
                        Include live canvas snapshot
                    </label>
                    <span id="colabbot-model-badge" style="font-size:10px; color:#60A5FA;">Gemini 2.0 Flash</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <textarea id="colabbot-user-input" class="colabbot-textarea" placeholder="Ask anything about your workflow or red nodes..."></textarea>
                    <button id="colabbot-send-btn" class="colabbot-action-btn" style="background:#007AFF; border:none; padding:0 16px; border-radius:10px; font-weight:600;">Send</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        const stream = document.getElementById("colabbot-stream");
        const userInput = document.getElementById("colabbot-user-input");
        const sendBtn = document.getElementById("colabbot-send-btn");
        const scanBtn = document.getElementById("colabbot-scan-btn");
        const keyBtn = document.getElementById("colabbot-key-btn");
        const minimizeBtn = document.getElementById("colabbot-minimize-btn");
        const attachGraphCheck = document.getElementById("colabbot-attach-graph");

        // Toggle Expand / Collapse
        pillBtn.onclick = () => {
            panel.classList.add("active");
            pillBtn.style.display = "none";
            userInput.focus();
        };

        minimizeBtn.onclick = () => {
            panel.classList.remove("active");
            pillBtn.style.display = "flex";
        };

        // Jump to node and pulse canvas highlight
        window.colabBotJump = (nodeId) => {
            if (!app.graph || !app.canvas) return;
            const node = app.graph.getNodeById(Number(nodeId));
            if (node) {
                app.canvas.centerOnNode(node);
                const originalColor = node.color;
                node.color = "#007AFF";
                app.canvas.setDirty(true, true);
                setTimeout(() => {
                    node.color = originalColor;
                    app.canvas.setDirty(true, true);
                }, 1400);
            }
        };

        // Draggable Header
        let isDragging = false, startX, startY, initialX, initialY;
        const dragHandle = document.getElementById("colabbot-drag-handle");
        dragHandle.onmousedown = (e) => {
            if (e.target.tagName === "BUTTON") return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            document.onmousemove = onDrag;
            document.onmouseup = onStopDrag;
        };
        function onDrag(e) {
            if (!isDragging) return;
            panel.style.left = `${Math.max(10, initialX + (e.clientX - startX))}px`;
            panel.style.top = `${Math.max(10, initialY + (e.clientY - startY))}px`;
            panel.style.bottom = "auto";
            panel.style.right = "auto";
        }
        function onStopDrag() {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        }

        // Live Canvas Graph Diagnostic Engine
        function analyzeCanvasGraph() {
            if (!app.graph) return { error: "No active canvas graph found." };
            const nodes = app.graph._nodes || [];
            const groups = (app.graph._groups || []).map(g => g.title);

            const issues = [];
            const summaries = [];
            let unetName = null;
            let clipName = null;
            let stepCount = null;
            let promptText = null;

            nodes.forEach(node => {
                const title = node.title || node.type || "Untitled Node";
                const isRegistered = window.LiteGraph && window.LiteGraph.registered_node_types && window.LiteGraph.registered_node_types[node.type];
                
                // Red / Missing node check
                if (!isRegistered) {
                    issues.push({
                        level: "error",
                        nodeId: node.id,
                        title,
                        message: `Node #${node.id} (${title}) is missing or unrecognized by ComfyUI.`
                    });
                }

                // Disconnected inputs check
                if (node.inputs) {
                    node.inputs.forEach(slot => {
                        if (slot.link === null && !slot.optional && slot.type !== "IMAGE" && slot.type !== "MASK") {
                            issues.push({
                                level: "warning",
                                nodeId: node.id,
                                title,
                                message: `Node #${node.id} (${title}) is missing connection for slot: "${slot.name}".`
                            });
                        }
                    });
                }

                const widgetMap = {};
                if (node.widgets) {
                    node.widgets.forEach(w => {
                        if (w.name) widgetMap[w.name] = w.value;
                    });
                }

                if (widgetMap.unet_name) unetName = widgetMap.unet_name;
                if (widgetMap.clip_name) clipName = widgetMap.clip_name;
                if (widgetMap.steps !== undefined) stepCount = widgetMap.steps;
                if (widgetMap.text && (node.type.toLowerCase().includes("clip") || node.type.toLowerCase().includes("prompt"))) {
                    promptText = widgetMap.text;
                }

                summaries.push({
                    id: node.id,
                    type: node.type,
                    title,
                    widgets: widgetMap
                });
            });

            return {
                totalNodes: nodes.length,
                groups,
                issues,
                unetName,
                clipName,
                stepCount,
                promptText,
                nodes: summaries
            };
        }

        function appendMessage(sender, htmlContent) {
            const bubble = document.createElement("div");
            bubble.className = sender === "user" ? "colabbot-bubble-user" : "colabbot-bubble-ai";
            bubble.innerHTML = htmlContent;
            stream.appendChild(bubble);
            stream.scrollTop = stream.scrollHeight;
            return bubble;
        }

        // Quick Scan Action
        scanBtn.onclick = () => {
            const data = analyzeCanvasGraph();
            let html = `<b>🩺 Live Canvas Diagnostics:</b><br>`;
            html += `• <b>Total Nodes:</b> ${data.totalNodes} | <b>Groups:</b> ${data.groups.join(", ") || "None"}<br>`;
            
            if (data.unetName) {
                html += `• <b>Diffusion Model:</b> <code>${data.unetName}</code><br>`;
            }
            if (data.stepCount !== null) {
                html += `• <b>Sampling Steps:</b> ${data.stepCount} ${data.stepCount === 8 ? "✅ (Optimal for FastH3)" : "⚠️ (FastH3 recommends 8 steps)"}<br>`;
            }

            if (data.issues.length === 0) {
                html += `<div style="margin-top:8px; color:#34C759;">✨ <b>All clear!</b> Your canvas connections look solid and ready to generate.</div>`;
            } else {
                html += `<div style="margin-top:8px;"><b>Attention Needed:</b></div>`;
                data.issues.forEach(issue => {
                    const badgeClass = issue.level === "error" ? "colabbot-badge-red" : "colabbot-badge-orange";
                    html += `
                        <div style="margin-top:5px; font-size:12.5px;">
                            <span class="${badgeClass}" onclick="window.colabBotJump(${issue.nodeId})">Jump to Node #${issue.nodeId}</span>
                            <span style="color:#CBD5E1;"> ${issue.message}</span>
                        </div>
                    `;
                });
            }
            appendMessage("ai", html);
        };

        // API Key configuration
        keyBtn.onclick = () => {
            const currentKey = localStorage.getItem("colabbot_gemini_key") || "";
            const newKey = prompt("Enter your Google Gemini API Key (stored securely in your local browser storage):", currentKey);
            if (newKey !== null) {
                localStorage.setItem("colabbot_gemini_key", newKey.trim());
                appendMessage("ai", "✅ Gemini API Key updated successfully!");
            }
        };

        // Conversational LLM Request
        async function handleUserSend() {
            const text = userInput.value.trim();
            if (!text) return;

            appendMessage("user", text);
            userInput.value = "";

            const apiKey = localStorage.getItem("colabbot_gemini_key");
            if (!apiKey) {
                appendMessage("ai", `
                    ⚠️ <b>Gemini API Key Required</b><br>
                    To enable live conversational intelligence, click <b>⚙️ Key</b> above and paste your Gemini API key.<br>
                    <i>(Tip: You can get a free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#60A5FA;">aistudio.google.com</a>)</i>
                `);
                return;
            }

            const thinkingBubble = appendMessage("ai", `<i>Analyzing your canvas and thinking...</i>`);

            try {
                const graphSnapshot = attachGraphCheck.checked ? analyzeCanvasGraph() : null;
                const promptPayload = `
User Question: ${text}

${graphSnapshot ? `Current Canvas State:
- Total Nodes: ${graphSnapshot.totalNodes}
- Groups: ${JSON.stringify(graphSnapshot.groups)}
- Active Issues: ${JSON.stringify(graphSnapshot.issues)}
- Diffusion Model: ${graphSnapshot.unetName}
- Step Count: ${graphSnapshot.stepCount}
- Active Prompt: ${graphSnapshot.promptText}
- Detailed Nodes: ${JSON.stringify(graphSnapshot.nodes.slice(0, 30))}
` : "Canvas snapshot was not attached."}
                `.trim();

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: DEFAULT_SYSTEM_PROMPT }]
                        },
                        contents: [
                            { role: "user", parts: [{ text: promptPayload }] }
                        ]
                    })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error?.message || `HTTP ${response.status}`);
                }

                const data = await response.json();
                let answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
                
                answer = answer
                    .replace(/\n\n/g, "<br><br>")
                    .replace(/\n/g, "<br>")
                    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                    .replace(/`(.*?)`/g, "<code>$1</code>");

                thinkingBubble.innerHTML = answer;
            } catch (err) {
                thinkingBubble.innerHTML = `❌ <b>Request Error:</b> ${err.message}<br><small>Please verify your Gemini API key in ⚙️ Key.</small>`;
            }
        }

        sendBtn.onclick = handleUserSend;
        userInput.onkeydown = (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleUserSend();
            }
        };

        console.log("⚡ ColabBot Canvas Companion ready.");
    }
});
