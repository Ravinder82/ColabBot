# ⚡ ColabBot: Intelligent In-Browser Canvas Companion for ComfyUI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![ComfyUI: Custom Node](https://img.shields.io/badge/ComfyUI-Custom%20Node-success.svg)](https://github.com/comfyanonymous/ComfyUI)
[![Gemini: 2.0 Flash](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-orange.svg)](https://aistudio.google.com)
[![Design: Apple HIG](https://img.shields.io/badge/Design-Apple%20HIG%20Frosted%20Glass-purple.svg)](https://developer.apple.com/design/human-interface-guidelines)

**ColabBot** is an intelligent, in-browser AI creative companion designed specifically for **ComfyUI** and cloud runtimes like **Google Colab**. 

Instead of switching back and forth between terminal logs or chat windows, ColabBot lives directly inside your ComfyUI canvas tab as an elegant, non-intrusive floating assistant. It inspects your live workflow nodes, detects disconnected wires and missing models, centers the camera on red error nodes with a single click, and answers your creative questions using Google Gemini.

---

## ✨ Features

- **Apple HIG Frosted Glass Material**: Styled with translucent glass (`backdrop-filter: blur(28px)`), hairline specular highlights, and system typography.
- **Unobtrusive & Draggable**: Collapses into a floating `⚡ ColabBot` pill with a live status indicator so your canvas pan and zoom are never obstructed. Drag the expanded window anywhere on your screen.
- **Live Canvas Graph Diagnostics (`🩺 Scan`)**: Inspects `app.graph` in real time without calling an external API. Detects missing custom nodes, unconnected required input slots, diffusion models, and sampling step counts.
- **1-Click Node Jump & Highlight**: When ColabBot finds an issue (such as an unlinked slot or a red missing node), click `Jump to Node #X`. The canvas camera smoothly glides to that node and pulses with a vivid blue highlight.
- **Gemini 2.0 / 1.5 Flash Reasoning**: Ask questions about your prompt, character reference tags (like `<Picture 1>`), or generation settings. ColabBot automatically injects a token-efficient summary of your active canvas into the conversation.
- **Private Key Management (`⚙️ Key`)**: Your Gemini API key is stored strictly in your browser's private `localStorage`. It is never written to disk, exposed in Colab notebook cells, or committed to GitHub.

---

## 🚀 Installation

### 1. In Google Colab (Recommended)

In your Colab notebook right before launching ComfyUI, add this simple cell:

```python
# @title Step 4.5: Install ColabBot AI Companion
import os, subprocess

repo_url = "https://github.com/Ravinder82/ColabBot.git"  # Replace with your repo link
target_dir = "/content/ComfyUI/custom_nodes/ColabBot"

if not os.path.exists(target_dir):
    print(f"Cloning ColabBot from {repo_url}...")
    subprocess.run(f"git clone {repo_url} {target_dir}", shell=True)
else:
    print("Updating ColabBot to latest version...")
    subprocess.run(f"cd {target_dir} && git pull", shell=True)

print("✅ ColabBot is installed in /content/ComfyUI/custom_nodes/ColabBot!")
```

### 2. Standard Local ComfyUI Installation

Clone this repository into your ComfyUI `custom_nodes` folder:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Ravinder82/ColabBot.git
```

Restart ComfyUI and refresh your browser tab. That's it! ComfyUI automatically detects the `web/` directory and loads the extension.

---

## 💡 How to Use ColabBot

1. **Open ComfyUI**: Launch ComfyUI via your local URL or Cloudflare tunnel.
2. **Locate the Floating Pill**: In the bottom-right corner of your screen, click **`⚡ ColabBot`**.
3. **Run a Canvas Health Check**: Click **`🩺 Scan`**. ColabBot will inspect your workflow and list any missing connections or incorrect step counts.
4. **Jump to Any Problem Node**: If an issue is flagged, click the **`Jump to Node #X`** button to center and highlight that node on your screen.
5. **Chat with AI**: Click **`⚙️ Key`**, paste your free Google Gemini API key once, and ask questions like:
   - *"How should I structure my prompt for character references?"*
   - *"Why is my video decoding node failing?"*
   - *"Are my sampling steps optimal for FastH3 Omni?"*

---

## 🔒 Privacy & Security

- **Client-Side Key Storage**: Your API key stays in your browser's private `localStorage`.
- **Zero Heavy Backend Dependencies**: ColabBot uses ComfyUI's native frontend extension API, meaning no heavy Python packages or extra dependencies are needed.

---

## 📄 License

Distributed under the [MIT License](LICENSE).
