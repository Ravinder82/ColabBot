# ⚡ ColabBot: Active AI Canvas Agent & Workflow Tutor for ComfyUI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![ComfyUI: Custom Node](https://img.shields.io/badge/ComfyUI-Custom%20Node-success.svg)](https://github.com/comfyanonymous/ComfyUI)
[![Gemini: 2.5 Flash Function Calling](https://img.shields.io/badge/AI-Gemini%202.5%20Tools-orange.svg)](https://aistudio.google.com)
[![Design: Apple HIG](https://img.shields.io/badge/Design-Apple%20HIG%20Frosted%20Glass-purple.svg)](https://developer.apple.com/design/human-interface-guidelines)

**ColabBot** is an active, in-browser AI creative agent designed specifically for **ComfyUI** and cloud runtimes like **Google Colab**. 

Unlike passive chat bots that only give text instructions, ColabBot has **direct graph manipulation superpowers** powered by **Gemini 2.5 Flash Function Calling (Tool Use)**. It can directly wire outputs to inputs, create and position new nodes, adjust prompt text, configure sampler parameters, and auto-fix disconnected workflows with zero latency right inside your active canvas.

---

## ✨ Superpowers & Capabilities

### 1. Active Graph Modification (Gemini Tool Calling)
ColabBot integrates native function calling. When you give natural language instructions, Gemini returns structured tool calls that ColabBot executes directly against ComfyUI's live LiteGraph DOM:
- **`connectNodes(fromNodeId, fromSlot, toNodeId, toSlot)`**: Wires outputs to inputs between nodes (e.g., connecting a UNETLoader model output to a sampler or video decoder).
- **`addNode(nodeType, title, x, y)`**: Instantiates and places any registered node on the canvas near your current view center.
- **`setWidgetValue(nodeId, widgetName, value)`**: Directly adjusts sampling steps, denoise, seeds, cfg, prompt text, or model dropdowns.
- **`disconnectSlot(nodeId, slotIndex)`**: Disconnects wires from a slot.
- **`removeNode(nodeId)`**: Deletes unnecessary or duplicate nodes.
- **`arrangeCanvas(focusNodeId)`**: Adjusts and centers the camera on target nodes.

### 2. Multi-Turn Autonomous Feedback Loop
Whenever ColabBot executes a graph action, the result (`success`, node IDs, output messages) is automatically fed back to Gemini's context. Gemini verifies the outcome and provides an encouraging summary or continues with subsequent tool calls (up to 6 chained actions).

### 3. One-Click `✨ Auto-Fix`
Click the **`✨ Auto-Fix`** button in the header at any time. ColabBot will run a full diagnostic scan, detect disconnected wires or missing models, and autonomously dispatch the required tool calls to fix your canvas.

### 4. Apple HIG Frosted Glass UI
- Translucent dark glass (`backdrop-filter: blur(28px) saturate(190%)`).
- Minimizes into a floating `⚡ ColabBot` status pill in the bottom corner so canvas pan/zoom is never blocked.
- Draggable header to position the window anywhere on screen.
- Visual pulse highlights (blue for newly added nodes, green for successful connections, orange for widget parameter updates).

### 5. WebSocket & Python HTTP Bridge
ColabBot registers a backend API route at `POST /colabbot/execute_tool`. Python scripts, background tasks, or headless automation can broadcast graph actions to the browser over ComfyUI's native WebSocket connection:
```bash
curl -X POST http://127.0.0.1:8188/colabbot/execute_tool \
  -H "Content-Type: application/json" \
  -d '{"tool": "setWidgetValue", "args": {"nodeId": 3, "widgetName": "steps", "value": "8"}}'
```

---

## 🚀 Installation

### In Google Colab (Recommended)

In your Colab notebook before launching ComfyUI, add this simple cell:

```python
# @title Step 4.5: Install ColabBot Active Agent
import os, subprocess

ai_bot_repo_url = "https://github.com/Ravinder82/ColabBot.git"
target_dir = "/content/ComfyUI/custom_nodes/ColabBot"

if os.path.exists(target_dir):
    print("Updating ColabBot to latest release...")
    subprocess.run(f"git -C {target_dir} pull", shell=True, check=False)
else:
    print(f"Cloning ColabBot from {ai_bot_repo_url}...")
    subprocess.run(f"git clone {ai_bot_repo_url} {target_dir}", shell=True, check=True)

print("✅ ColabBot installed successfully in /content/ComfyUI/custom_nodes/ColabBot!")
```

### Standard Local ComfyUI Installation

Clone into your ComfyUI `custom_nodes` folder:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Ravinder82/ColabBot.git
```

Restart ComfyUI and refresh your browser tab.

---

## 💡 Conversational Examples

Once ComfyUI opens, click **`⚡ ColabBot`** in the bottom-right corner and try:

- *"Connect Node 66 to Node 69"*
- *"Set sampling steps to 8 on Node 3"*
- *"Add a SaveImage node and connect it to the VAE decode output"*
- *"Inspect my canvas and fix any disconnected wires"*
- Or click the **`✨ Auto-Fix`** button in the header!

---

## 🔒 Privacy & Security

- **Private Client-Side Storage**: Your Google Gemini API key is stored strictly in your browser's private `localStorage`. It is never written to disk, exposed in Colab notebook cells, or committed to GitHub.
- **Zero Heavy Dependencies**: Uses ComfyUI's native frontend extension system and LiteGraph DOM APIs.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
