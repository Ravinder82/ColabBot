// ColabBot - Active AI Canvas Companion & Workflow Agent for ComfyUI
// Implements Gemini 2.5 Flash Function Calling (Tool Use) for Direct Canvas Manipulation
// Designed following Apple Human Interface Guidelines (macOS Sequoia & VisionOS frosted glass)

import { app } from "../../scripts/app.js";

const DEFAULT_SYSTEM_PROMPT = `You are ColabBot, an active AI creative agent embedded directly inside the ComfyUI canvas tab.
You communicate in warm, natural, and complete sentences following Apple Human Interface Guidelines (zero staccato fragments).
Unlike a passive chat bot, you have live "superpowers" to directly manipulate the user's ComfyUI canvas graph using your function tools:
- addNode: Create and place new nodes (e.g. VAELoader, SaveImage, CLIPTextEncode, UNETLoader).
- connectNodes: Wire outputs to inputs between nodes (e.g. connecting a model output to a sampler).
- setWidgetValue: Update text prompts, step counts, seeds, denoise, or model filenames.
- disconnectSlot: Disconnect wires from a slot.
- removeNode: Delete unnecessary or corrupted nodes.
- arrangeCanvas: Center and adjust the view.

When the user asks you to modify their workflow, fix an unconnected wire, change steps, or add a node, DO NOT just explain what to do—ALWAYS call the appropriate tool function to perform the change directly on their canvas.
After the action completes, summarize what you changed with an encouraging tone.`;

// Gemini Function Calling Declarations
const GEMINI_GRAPH_TOOLS = [
    {
        name: "connectNodes",
        description: "Connects an output slot of a source node to an input slot of a target node in the active ComfyUI canvas.",
        parameters: {
            type: "OBJECT",
            properties: {
                fromNodeId: { type: "INTEGER", description: "ID of the node providing the output." },
                fromSlot: { type: "INTEGER", description: "0-based index of the output slot (default 0)." },
                toNodeId: { type: "INTEGER", description: "ID of the node receiving the input." },
                toSlot: { type: "INTEGER", description: "0-based index of the input slot (default 0)." }
            },
            required: ["fromNodeId", "toNodeId"]
        }
    },
    {
        name: "setWidgetValue",
        description: "Updates an input widget, parameter, slider, dropdown, or text area on a specific node.",
        parameters: {
            type: "OBJECT",
            properties: {
                nodeId: { type: "INTEGER", description: "ID of the target node." },
                widgetName: { type: "STRING", description: "Name of the widget to change (e.g. 'steps', 'text', 'unet_name', 'seed', 'denoise', 'cfg')." },
                value: { type: "STRING", description: "The new value to set (can be a number, string, or boolean representation)." }
            },
            required: ["nodeId", "widgetName", "value"]
        }
    },
    {
        name: "addNode",
        description: "Creates and places a new node on the live ComfyUI canvas.",
        parameters: {
            type: "OBJECT",
            properties: {
                nodeType: { type: "STRING", description: "The exact node type name (e.g. 'VAELoader', 'CLIPTextEncode', 'SaveImage', 'UNETLoader', 'MiniMaxH3ReferenceToVideo')." },
                title: { type: "STRING", description: "Optional custom title for the node." },
                x: { type: "NUMBER", description: "Optional X coordinate on canvas." },
                y: { type: "NUMBER", description: "Optional Y coordinate on canvas." }
            },
            required: ["nodeType"]
        }
    },
    {
        name: "disconnectSlot",
        description: "Disconnects an input slot from any attached wire on a target node.",
        parameters: {
            type: "OBJECT",
            properties: {
                nodeId: { type: "INTEGER", description: "ID of the target node." },
                slotIndex: { type: "INTEGER", description: "0-based index of the input slot to disconnect." }
            },
            required: ["nodeId", "slotIndex"]
        }
    },
    {
        name: "removeNode",
        description: "Deletes a node from the ComfyUI canvas.",
        parameters: {
            type: "OBJECT",
            properties: {
                nodeId: { type: "INTEGER", description: "ID of the node to remove." }
            },
            required: ["nodeId"]
        }
    },
    {
        name: "arrangeCanvas",
        description: "Adjusts the camera view to center on the active workflow or a specific node.",
        parameters: {
            type: "OBJECT",
            properties: {
                focusNodeId: { type: "INTEGER", description: "Optional node ID to focus the camera on." }
            }
        }
    }
];

app.registerExtension({
    name: "ColabBot.CanvasTutorCompanion",
    async setup() {
        console.log("⚡ ColabBot Active Canvas Agent initializing...");

        // Inject Apple HIG Frosted Glass Styles
        const style = document.createElement("style");
        style.textContent = `
            .colabbot-glass {
                background: rgba(18, 18, 24, 0.84) !important;
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
                width: 440px;
                max-width: calc(100vw - 48px);
                height: 620px;
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
            .colabbot-action-card {
                background: rgba(0, 122, 255, 0.12);
                border: 1px solid rgba(0, 122, 255, 0.3);
                border-radius: 12px;
                padding: 10px 12px;
                margin: 6px 0;
                font-size: 12.5px;
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

        // Build Collapsed Floating Pill
        const pillBtn = document.createElement("div");
        pillBtn.id = "colabbot-floating-pill";
        pillBtn.className = "colabbot-glass colabbot-pill-btn";
        pillBtn.innerHTML = `
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#34C759; box-shadow:0 0 8px #34C759;"></span>
            <span style="font-weight:600; font-size:13px; letter-spacing:-0.2px;">⚡ ColabBot Active Agent</span>
        `;
        document.body.appendChild(pillBtn);

        // Build Expanded Agent Window
        const panel = document.createElement("div");
        panel.id = "colabbot-main-panel";
        panel.className = "colabbot-glass colabbot-panel";
        panel.innerHTML = `
            <div class="colabbot-header" id="colabbot-drag-handle">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:16px;">⚡</span>
                    <strong style="font-size:14px; font-weight:600; color:#FFFFFF;">ColabBot Active Canvas Agent</strong>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <button id="colabbot-scan-btn" class="colabbot-action-btn" title="Scan live canvas for errors">🩺 Scan</button>
                    <button id="colabbot-autofix-btn" class="colabbot-action-btn" style="background:rgba(0,122,255,0.3); border-color:#007AFF;" title="AI Auto-Fix canvas issues">✨ Auto-Fix</button>
                    <button id="colabbot-key-btn" class="colabbot-action-btn" title="Configure Gemini API Key">⚙️ Key</button>
                    <button id="colabbot-minimize-btn" class="colabbot-action-btn" title="Minimize">—</button>
                </div>
            </div>
            
            <div id="colabbot-stream" class="colabbot-chat-stream">
                <div class="colabbot-bubble-ai">
                    👋 <b>Welcome to ColabBot Active Agent!</b><br>
                    I have full tool-calling capabilities to directly build, connect, and configure your ComfyUI canvas.<br><br>
                    Try asking me:<br>
                    • <i>"Connect Node 66 to Node 69"</i><br>
                    • <i>"Add a SaveImage node and connect it"</i><br>
                    • <i>"Set sampling steps to 8"</i><br>
                    • Or click <b>✨ Auto-Fix</b> to automatically repair canvas issues!
                </div>
            </div>

            <div class="colabbot-input-box">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#94A3B8;">
                    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                        <input type="checkbox" id="colabbot-attach-graph" checked style="cursor:pointer; accent-color:#007AFF;">
                        Live canvas synchronization & tool use
                    </label>
                    <span id="colabbot-model-badge" style="font-size:10px; color:#60A5FA;">Gemini 2.5 Flash Tools</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <textarea id="colabbot-user-input" class="colabbot-textarea" placeholder="Ask to connect wires, add nodes, or configure parameters..."></textarea>
                    <button id="colabbot-send-btn" class="colabbot-action-btn" style="background:#007AFF; border:none; padding:0 16px; border-radius:10px; font-weight:600;">Send</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        const stream = document.getElementById("colabbot-stream");
        const userInput = document.getElementById("colabbot-user-input");
        const sendBtn = document.getElementById("colabbot-send-btn");
        const scanBtn = document.getElementById("colabbot-scan-btn");
        const autoFixBtn = document.getElementById("colabbot-autofix-btn");
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

        // Center on Node and Flash Highlight
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

        // Make Header Draggable
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

        // -------------------------------------------------------------
        // GRAPH MODIFICATION TOOLS ENGINE (LiteGraph DOM Manipulation)
        // -------------------------------------------------------------

        async function executeGraphTool(name, args) {
            console.log(`⚡ ColabBot executing graph tool: ${name}`, args);
            if (!app.graph) return { success: false, error: "No active ComfyUI graph available." };

            try {
                switch (name) {
                    case "addNode": {
                        const { nodeType, title, x, y } = args;
                        let targetType = nodeType;
                        
                        // Check registration or find case-insensitive match
                        if (!window.LiteGraph.registered_node_types[targetType]) {
                            const found = Object.keys(window.LiteGraph.registered_node_types).find(
                                k => k.toLowerCase() === targetType.toLowerCase()
                            );
                            if (found) targetType = found;
                        }

                        const node = window.LiteGraph.createNode(targetType);
                        if (!node) {
                            return { success: false, error: `Could not create node of type '${nodeType}'. Please verify node definition exists.` };
                        }

                        // Determine position: explicitly passed or near center of current view
                        if (x !== undefined && y !== undefined && x !== null && y !== null) {
                            node.pos = [Number(x), Number(y)];
                        } else if (app.canvas && app.canvas.ds) {
                            const cx = -app.canvas.ds.offset[0] + (app.canvas.canvas.width / 2) / app.canvas.ds.scale;
                            const cy = -app.canvas.ds.offset[1] + (app.canvas.canvas.height / 2) / app.canvas.ds.scale;
                            node.pos = [cx + (Math.random() * 60 - 30), cy + (Math.random() * 60 - 30)];
                        } else {
                            node.pos = [250, 250];
                        }

                        if (title) node.title = title;

                        app.graph.add(node);
                        app.canvas.centerOnNode(node);

                        // Visual feedback pulse
                        const origColor = node.color;
                        node.color = "#007AFF";
                        app.canvas.setDirty(true, true);
                        if (app.graph.afterChange) app.graph.afterChange();
                        setTimeout(() => { node.color = origColor; app.canvas.setDirty(true, true); }, 1500);

                        return {
                            success: true,
                            message: `Successfully created and placed Node #${node.id} (${node.title || node.type}) on the canvas.`,
                            nodeId: node.id,
                            type: node.type
                        };
                    }

                    case "connectNodes": {
                        const { fromNodeId, toNodeId, fromSlot = 0, toSlot = 0 } = args;
                        const sourceNode = app.graph.getNodeById(Number(fromNodeId));
                        const targetNode = app.graph.getNodeById(Number(toNodeId));

                        if (!sourceNode) return { success: false, error: `Source Node #${fromNodeId} not found on canvas.` };
                        if (!targetNode) return { success: false, error: `Target Node #${toNodeId} not found on canvas.` };

                        // Slot resolution (number or string search)
                        let outIdx = 0;
                        if (typeof fromSlot === "number") {
                            outIdx = fromSlot;
                        } else if (sourceNode.outputs) {
                            const foundOut = sourceNode.outputs.findIndex(o => o.name && o.name.toLowerCase() === String(fromSlot).toLowerCase());
                            if (foundOut !== -1) outIdx = foundOut;
                        }

                        let inIdx = 0;
                        if (typeof toSlot === "number") {
                            inIdx = toSlot;
                        } else if (targetNode.inputs) {
                            const foundIn = targetNode.inputs.findIndex(i => i.name && i.name.toLowerCase() === String(toSlot).toLowerCase());
                            if (foundIn !== -1) inIdx = foundIn;
                        }

                        const connected = sourceNode.connect(outIdx, targetNode, inIdx);
                        if (connected === false) {
                            return { success: false, error: `LiteGraph refused connection between Node #${fromNodeId} [out ${outIdx}] and Node #${toNodeId} [in ${inIdx}]. Incompatible slot types.` };
                        }

                        // Pulse both nodes in green
                        sourceNode.color = "#34C759";
                        targetNode.color = "#34C759";
                        app.canvas.setDirty(true, true);
                        if (app.graph.afterChange) app.graph.afterChange();
                        setTimeout(() => {
                            sourceNode.color = null;
                            targetNode.color = null;
                            app.canvas.setDirty(true, true);
                        }, 1500);

                        return {
                            success: true,
                            message: `Successfully connected Node #${fromNodeId} (slot ${outIdx}) to Node #${toNodeId} (slot ${inIdx}).`
                        };
                    }

                    case "setWidgetValue": {
                        const { nodeId, widgetName, value } = args;
                        const node = app.graph.getNodeById(Number(nodeId));
                        if (!node) return { success: false, error: `Node #${nodeId} not found.` };

                        if (!node.widgets || node.widgets.length === 0) {
                            return { success: false, error: `Node #${nodeId} has no adjustable widgets.` };
                        }

                        const widget = node.widgets.find(w => w.name && w.name.toLowerCase() === String(widgetName).toLowerCase());
                        if (!widget) {
                            const available = node.widgets.map(w => w.name).join(", ");
                            return { success: false, error: `Widget '${widgetName}' not found on Node #${nodeId}. Available widgets: ${available}` };
                        }

                        // Parse value to match widget type
                        let parsedValue = value;
                        if (typeof widget.value === "number") {
                            parsedValue = Number(value);
                        } else if (typeof widget.value === "boolean") {
                            parsedValue = (value === true || value === "true" || value === "1");
                        }

                        widget.value = parsedValue;

                        // Call widget callback if present
                        if (widget.callback) {
                            try {
                                widget.callback(widget.value, app.canvas, node, app.canvas.current_node, null);
                            } catch (e) {
                                console.warn("Widget callback warning:", e);
                            }
                        }

                        node.color = "#FF9500";
                        app.canvas.setDirty(true, true);
                        if (app.graph.afterChange) app.graph.afterChange();
                        setTimeout(() => { node.color = null; app.canvas.setDirty(true, true); }, 1500);

                        return {
                            success: true,
                            message: `Updated widget '${widget.name}' on Node #${nodeId} to: ${JSON.stringify(widget.value)}`
                        };
                    }

                    case "disconnectSlot": {
                        const { nodeId, slotIndex } = args;
                        const node = app.graph.getNodeById(Number(nodeId));
                        if (!node) return { success: false, error: `Node #${nodeId} not found.` };

                        node.disconnectInput(Number(slotIndex));
                        app.canvas.setDirty(true, true);
                        if (app.graph.afterChange) app.graph.afterChange();

                        return {
                            success: true,
                            message: `Disconnected input slot ${slotIndex} on Node #${nodeId}.`
                        };
                    }

                    case "removeNode": {
                        const { nodeId } = args;
                        const node = app.graph.getNodeById(Number(nodeId));
                        if (!node) return { success: false, error: `Node #${nodeId} not found.` };

                        app.graph.remove(node);
                        app.canvas.setDirty(true, true);
                        if (app.graph.afterChange) app.graph.afterChange();

                        return {
                            success: true,
                            message: `Removed Node #${nodeId} from the canvas.`
                        };
                    }

                    case "arrangeCanvas": {
                        const { focusNodeId } = args;
                        if (focusNodeId) {
                            window.colabBotJump(focusNodeId);
                        } else if (app.graph._nodes && app.graph._nodes.length > 0) {
                            app.canvas.centerOnNode(app.graph._nodes[0]);
                        }
                        return { success: true, message: "Adjusted canvas view." };
                    }

                    default:
                        return { success: false, error: `Unrecognized tool '${name}'.` };
                }
            } catch (err) {
                return { success: false, error: `Tool execution failed: ${err.message}` };
            }
        }

        // WebSocket Listener (Receives commands dispatched from backend / Python API)
        if (window.app && window.app.api) {
            window.app.api.addEventListener("colabbot_graph_action", async (e) => {
                const { tool, args } = e.detail || {};
                console.log("⚡ ColabBot WebSocket received action:", tool, args);
                const result = await executeGraphTool(tool, args);
                appendMessage("ai", `
                    <div class="colabbot-action-card">
                        ⚡ <b>Remote Tool Executed:</b> <code>${tool}</code><br>
                        <small style="color:${result.success ? '#34C759' : '#F87171'};">${result.message || result.error}</small>
                    </div>
                `);
            });
        }

        // Live Canvas Graph Diagnostics
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
                
                if (!isRegistered) {
                    issues.push({
                        level: "error",
                        nodeId: node.id,
                        title,
                        message: `Node #${node.id} (${title}) is missing or unrecognized.`
                    });
                }

                if (node.inputs) {
                    node.inputs.forEach((slot, idx) => {
                        if (slot.link === null && !slot.optional && slot.type !== "IMAGE" && slot.type !== "MASK") {
                            issues.push({
                                level: "warning",
                                nodeId: node.id,
                                slotIndex: idx,
                                slotName: slot.name,
                                title,
                                message: `Node #${node.id} (${title}) is missing connection for slot "${slot.name}".`
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
                    widgets: widgetMap,
                    inputs: (node.inputs || []).map(i => ({ name: i.name, type: i.type, connected: i.link !== null })),
                    outputs: (node.outputs || []).map(o => ({ name: o.name, type: o.type, hasLinks: Boolean(o.links && o.links.length) }))
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

        // Key Configuration
        keyBtn.onclick = () => {
            const currentKey = localStorage.getItem("colabbot_gemini_key") || "";
            const newKey = prompt("Enter your Google Gemini API Key (saved securely in your local browser storage):", currentKey);
            if (newKey !== null) {
                localStorage.setItem("colabbot_gemini_key", newKey.trim());
                appendMessage("ai", "✅ Gemini API Key updated successfully!");
            }
        };

        // -------------------------------------------------------------
        // CONVERSATIONAL MULTI-TURN TOOL CALLING LOOP
        // -------------------------------------------------------------

        async function sendToGeminiWithTools(userPrompt) {
            const apiKey = localStorage.getItem("colabbot_gemini_key");
            if (!apiKey) {
                appendMessage("ai", `
                    ⚠️ <b>Gemini API Key Required</b><br>
                    To enable active tool execution, please click <b>⚙️ Key</b> above and paste your Gemini API key.<br>
                    <i>(Tip: You can get a free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#60A5FA;">aistudio.google.com</a>)</i>
                `);
                return;
            }

            const thinkingBubble = appendMessage("ai", `<i>Analyzing your canvas and planning actions...</i>`);

            try {
                const graphSnapshot = attachGraphCheck.checked ? analyzeCanvasGraph() : null;
                const initialUserMessage = `
User Request: ${userPrompt}

${graphSnapshot ? `Current Canvas State:
- Total Nodes: ${graphSnapshot.totalNodes}
- Groups: ${JSON.stringify(graphSnapshot.groups)}
- Active Issues: ${JSON.stringify(graphSnapshot.issues)}
- Diffusion Model: ${graphSnapshot.unetName}
- Step Count: ${graphSnapshot.stepCount}
- Active Prompt: ${graphSnapshot.promptText}
- Detailed Nodes: ${JSON.stringify(graphSnapshot.nodes.slice(0, 35))}
` : "Canvas snapshot was not attached."}
                `.trim();

                const conversationContents = [
                    {
                        role: "user",
                        parts: [{ text: initialUserMessage }]
                    }
                ];

                const requestBody = {
                    system_instruction: {
                        parts: [{ text: DEFAULT_SYSTEM_PROMPT }]
                    },
                    contents: conversationContents,
                    tools: [
                        {
                            function_declarations: GEMINI_GRAPH_TOOLS
                        }
                    ]
                };

                let loopCount = 0;
                const MAX_TOOL_LOOPS = 6;
                let finalAnswer = "";

                while (loopCount < MAX_TOOL_LOOPS) {
                    loopCount++;

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.error?.message || `HTTP ${response.status}`);
                    }

                    const resData = await response.json();
                    const candidate = resData.candidates?.[0];
                    if (!candidate) throw new Error("No response candidate returned by Gemini.");

                    const candidateParts = candidate.content?.parts || [];
                    
                    // Add model response to conversation history
                    requestBody.contents.push(candidate.content);

                    // Check for function calls
                    const functionCalls = candidateParts.filter(p => p.functionCall);

                    if (functionCalls.length > 0) {
                        for (const fcPart of functionCalls) {
                            const { name, args } = fcPart.functionCall;
                            
                            // Visual indication in chat
                            thinkingBubble.innerHTML = `
                                <div class="colabbot-action-card">
                                    ⚡ <b>ColabBot Action:</b> <code>${name}</code><br>
                                    <small style="color:#CBD5E1;">${JSON.stringify(args)}</small>
                                </div>
                            `;

                            // Execute on canvas
                            const toolResult = await executeGraphTool(name, args);

                            // Append action log
                            const logCard = document.createElement("div");
                            logCard.className = "colabbot-action-card";
                            logCard.innerHTML = `
                                ⚡ <b>Action:</b> <code>${name}</code><br>
                                <span style="color:${toolResult.success ? '#34C759' : '#F87171'}; font-size:12px;">
                                    ${toolResult.success ? '✓' : '✗'} ${toolResult.message || toolResult.error}
                                </span>
                            `;
                            stream.insertBefore(logCard, thinkingBubble);
                            stream.scrollTop = stream.scrollHeight;

                            // Send feedback loop result back to Gemini
                            requestBody.contents.push({
                                role: "function",
                                parts: [
                                    {
                                        functionResponse: {
                                            name: name,
                                            response: toolResult
                                        }
                                    }
                                ]
                            });
                        }
                    } else {
                        // Model provided final text
                        const textParts = candidateParts.filter(p => p.text).map(p => p.text);
                        finalAnswer = textParts.join("\n") || "Actions completed on canvas.";
                        break;
                    }
                }

                // Format markdown text
                finalAnswer = finalAnswer
                    .replace(/\n\n/g, "<br><br>")
                    .replace(/\n/g, "<br>")
                    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                    .replace(/`(.*?)`/g, "<code>$1</code>");

                thinkingBubble.innerHTML = finalAnswer;

            } catch (err) {
                thinkingBubble.innerHTML = `❌ <b>Request Error:</b> ${err.message}<br><small>Please verify your Gemini API key in ⚙️ Key.</small>`;
            }
        }

        // Auto-Fix Action
        autoFixBtn.onclick = () => {
            const data = analyzeCanvasGraph();
            if (data.issues.length === 0) {
                appendMessage("ai", "✨ <b>Canvas Health is 100%!</b> There are no missing connections or error nodes to fix.");
                return;
            }

            const prompt = `Please automatically resolve the following canvas issues by calling the appropriate graph tools:\n` +
                data.issues.map(i => `• ${i.message}`).join("\n");

            appendMessage("user", `✨ Auto-Fix Canvas: Resolve ${data.issues.length} detected issues.`);
            sendToGeminiWithTools(prompt);
        };

        // User Chat Send
        async function handleUserSend() {
            const text = userInput.value.trim();
            if (!text) return;

            appendMessage("user", text);
            userInput.value = "";
            await sendToGeminiWithTools(text);
        }

        sendBtn.onclick = handleUserSend;
        userInput.onkeydown = (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleUserSend();
            }
        };

        console.log("⚡ ColabBot Active Canvas Agent ready.");
    }
});
